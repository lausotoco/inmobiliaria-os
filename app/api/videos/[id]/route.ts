// /api/videos/[id] · lo que hace el agente con un video.
//  GET   → el video, sus tomas, el precio y la hora de entrega
//  PATCH → guarda la ficha, el estilo y la voz en off (solo sin enviar o por regrabar)
//  POST  → { accion }: firmar_subida · registrar_toma · borrar_toma ·
//          firmar_logo · registrar_logo · enviar · descartar
// Sin cuenta (navegador que empezó el borrador) se puede todo menos enviar:
// para pedir la vista previa hay que crear la cuenta.

import { NextRequest } from "next/server";
import {
  BUCKET_ENTREGAS,
  BUCKET_TOMAS,
  archivosDeToma,
  borrarArchivos,
  cambiarVideo,
  cargarVideo,
  carpetasDe,
  fallo,
  nombreAgente,
  origenDe,
  pesoArchivo,
  recalcularPesoTomas,
  sinCache,
  visitante,
  type Visitante,
} from "@/lib/videos/servidor";
import { configWompi, precioDesbloqueo } from "@/lib/videos/wompi";
import { avisarLaura, escaparHtml } from "@/lib/telegram";
import {
  CASILLAS,
  CASILLA_RECORRIDO,
  ESTADOS_SIN_PAGAR,
  MAX_BYTES_RECORRIDO,
  MAX_MB_RECORRIDO,
  partesDe,
  rutaParte,
  ESTILOS,
  PREVIAS_PORTADA,
  MAX_BYTES_ARCHIVO,
  MAX_BYTES_LOGO,
  MAX_PREVIAS_SIN_PAGAR,
  MIMES_IMAGEN,
  MIMES_VIDEO,
  MINIMO_TOMAS,
  MAX_MB_ARCHIVO,
  TIPOS_INMUEBLE,
  casillasDe,
  codigoVideo,
  dentroDelHorario,
  entregaEstimada,
  esCasillaValida,
  extensionSegura,
  faltantesFicha,
  formatoEntrega,
  obligatoriasDe,
  tituloVideo,
  type Ficha,
} from "@/lib/videos/config";

export const dynamic = "force-dynamic";

const EDITABLE = ["borrador", "rechazado"];

type Ctx = { params: { id: string } };

// ── Ficha: solo se guardan los campos conocidos, con su tipo ──
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : "");
const color = (v: unknown, defecto: string) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : defecto;

function limpiarFicha(entrada: any, anterior: Ficha): Ficha {
  const f = entrada ?? {};
  const tipo = TIPOS_INMUEBLE.some((t) => t.v === f.tipo) ? f.tipo : undefined;
  return {
    tipo,
    operacion: f.operacion === "venta" || f.operacion === "arriendo" ? f.operacion : undefined,
    precio: num(f.precio),
    area_construida: num(f.area_construida),
    area_privada: num(f.area_privada),
    habitaciones: num(f.habitaciones),
    banos: num(f.banos),
    parqueaderos: num(f.parqueaderos),
    deposito: !!f.deposito,
    piso: num(f.piso),
    ascensor: !!f.ascensor,
    estrato: num(f.estrato),
    administracion: num(f.administracion),
    municipio: txt(f.municipio, 60),
    barrio: txt(f.barrio, 80),
    diferenciales: Array.isArray(f.diferenciales)
      ? f.diferenciales.slice(0, 3).map((d: unknown) => txt(d, 90))
      : ["", "", ""],
    nombre_marca: txt(f.nombre_marca, 80),
    whatsapp: txt(f.whatsapp, 20),
    // El logo solo cambia con registrar_logo (se revisa que el archivo exista)
    logo_ruta: anterior.logo_ruta ?? null,
    color_principal: color(f.color_principal, "#1A1A18"),
    color_secundario: color(f.color_secundario, "#B87333"),
    permiso_propietario: !!f.permiso_propietario,
  };
}

/** Comienzo de un texto (cortado en una palabra) para mostrarlo antes de pagar. */
function adelanto(texto: string | null | undefined, largo = 110): string | null {
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= largo) return t;
  const corte = t.lastIndexOf(" ", largo);
  return t.slice(0, corte > 40 ? corte : largo).replace(/[,.;:·\-]+$/, "") + "…";
}

/**
 * Lo que el agente ve del paquete antes de pagar: las copias pequeñas y con marca
 * de las portadas, y el comienzo de cada texto (el resto nunca sale del servidor).
 */
async function paqueteEnVistaPrevia(s: Visitante, video: Record<string, any>) {
  if (video.estado !== "vista_previa") return null;
  const entregas = (video.entregas ?? {}) as Record<string, { ruta?: string }>;
  const portadas: { tipo: string; url: string }[] = [];
  for (const [tipo, previa] of Object.entries(PREVIAS_PORTADA)) {
    const ruta = entregas[previa]?.ruta;
    if (!ruta) continue;
    const { data } = await s.admin.storage.from(BUCKET_ENTREGAS).createSignedUrl(ruta, 600);
    if (data?.signedUrl) portadas.push({ tipo, url: data.signedUrl });
  }
  return {
    portadas,
    textos: { corto: adelanto(video.texto_corto), largo: adelanto(video.texto_largo) },
    con_anuncio: !!entregas.final_anuncio?.ruta,
  };
}

async function enlaceLogo(s: Visitante, ruta?: string | null) {
  if (!ruta) return null;
  const { data } = await s.admin.storage.from(BUCKET_TOMAS).createSignedUrl(ruta, 600);
  return data?.signedUrl ?? null;
}

/** Sin cuenta, un video ajeno pide entrar (puede ser el de un agente que no ha iniciado sesión). */
const noEncontrado = (s: Visitante) =>
  s.userId ? fallo(404, "No encontramos este video.") : fallo(401, "Inicia sesión para ver este video.", { entrar: true });

export async function GET(_req: NextRequest, { params }: Ctx) {
  const s = await visitante();
  if (s instanceof Response) return s;
  const video = await cargarVideo(s, params.id);
  if (!video) return noEncontrado(s);

  const { data: tomas } = await s.admin
    .from("tomas_inmueble")
    .select("id, casilla, nombre_archivo, tamano, duracion, ancho, alto, revision, observaciones, miniatura, partes, created_at")
    .eq("video_id", video.id);
  const { data: perfil } = video.agente_id
    ? await s.admin.from("profiles").select("nombre, empresa, email").eq("id", video.agente_id).maybeSingle()
    : { data: null };
  const { data: pagos } = await s.admin
    .from("pagos")
    .select("id, estado, monto, creado_en, aprobado_en")
    .eq("video_id", video.id)
    .order("creado_en", { ascending: false })
    .limit(5);

  const entregas = (video.entregas ?? {}) as Record<string, unknown>;
  const enviado = video.enviado_at ? new Date(video.enviado_at) : null;
  return sinCache({
    video: {
      id: video.id,
      codigo: codigoVideo(video.id),
      ficha: video.ficha ?? {},
      estilo: video.estilo,
      voz_en_off: video.voz_en_off,
      estado: video.estado,
      motivo_rechazo: video.motivo_rechazo,
      enviado_at: video.enviado_at,
      edicion_at: video.edicion_at,
      vista_previa_at: video.vista_previa_at,
      desbloqueado_en: video.desbloqueado_en,
      metodo: video.metodo,
      texto_corto: video.estado === "desbloqueado" ? video.texto_corto : null,
      texto_largo: video.estado === "desbloqueado" ? video.texto_largo : null,
      tiene_vista_previa: !!video.ruta_vista_previa,
      entregas_listas: Object.keys(entregas).filter((k) => k !== "vista_previa"),
      paquete: await paqueteEnVistaPrevia(s, video),
      tomas_borradas: !!video.tomas_borradas_at,
    },
    tomas: tomas ?? [],
    logo_url: await enlaceLogo(s, (video.ficha as Ficha)?.logo_ruta),
    nombre_agente: nombreAgente(perfil, perfil?.email ?? undefined),
    // Sin cuenta todavía: la cuenta se crea al pedir la vista previa.
    // El precio no se muestra sin cuenta (no hay precios públicos).
    sin_cuenta: !video.agente_id,
    precio: video.agente_id ? precioDesbloqueo() : null,
    pago_en_linea: !!configWompi(),
    pagos: pagos ?? [],
    entrega: enviado ? formatoEntrega(entregaEstimada(enviado)) : null,
    entrega_si_envia_ahora: formatoEntrega(entregaEstimada(new Date())),
    dentro_horario: dentroDelHorario(),
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const s = await visitante();
  if (s instanceof Response) return s;
  const video = await cargarVideo(s, params.id);
  if (!video) return noEncontrado(s);
  if (!EDITABLE.includes(video.estado)) return fallo(409, "Este video ya se envió: no se puede cambiar la ficha.");

  const cuerpo = await req.json().catch(() => ({}));
  const cambios: Record<string, unknown> = {};
  if (cuerpo.ficha) cambios.ficha = limpiarFicha(cuerpo.ficha, (video.ficha ?? {}) as Ficha);
  if (typeof cuerpo.estilo === "string" && ESTILOS.some((e) => e.v === cuerpo.estilo)) cambios.estilo = cuerpo.estilo;
  if (typeof cuerpo.voz_en_off === "boolean") cambios.voz_en_off = cuerpo.voz_en_off;
  if (Object.keys(cambios).length === 0) return sinCache({ ok: true });

  const r = await cambiarVideo(s.admin, video.id, EDITABLE, cambios);
  if (!r.ok) return fallo(409, r.mensaje);
  return sinCache({ ok: true, ficha: r.video.ficha });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const s = await visitante();
  if (s instanceof Response) return s;
  const video = await cargarVideo(s, params.id);
  if (!video) return noEncontrado(s);
  const cuerpo = await req.json().catch(() => ({}));
  const accion = String(cuerpo.accion ?? "");
  const ficha = (video.ficha ?? {}) as Ficha;
  const carpetas = carpetasDe({ id: video.id, agente_id: video.agente_id });
  const carpeta = carpetas.tomas;
  // Lo que se subió antes de crear la cuenta sigue en la carpeta de invitados
  const carpetasValidas = [carpeta, carpetasDe({ id: video.id, agente_id: null }).tomas];

  switch (accion) {
    // ── 1. Pedir permiso para subir una toma (enlace firmado de un solo uso) ──
    case "firmar_subida": {
      if (!EDITABLE.includes(video.estado)) return fallo(409, "Este video ya se envió.");
      const casilla = String(cuerpo.casilla ?? "");
      if (!esCasillaValida(casilla)) return fallo(400, "Casilla desconocida.");
      const mime = String(cuerpo.mime ?? "");
      if (!MIMES_VIDEO.includes(mime)) return fallo(400, "Ese archivo no es un video que podamos usar. Sube un MP4 o MOV.");
      const tamano = Number(cuerpo.tamano ?? 0);
      const ruta = `${carpeta}/${casilla}-${Date.now()}.${extensionSegura(mime)}`;
      // Recorrido completo: un solo video grande que se sube en partes de 45 MB
      if (casilla === CASILLA_RECORRIDO) {
        if (!(tamano > 0) || tamano > MAX_BYTES_RECORRIDO)
          return fallo(400, `El video pesa más de ${MAX_MB_RECORRIDO} MB. Grábalo en 1080p (no en 4K) y en 1 a 3 minutos.`);
        const partes = partesDe(tamano);
        const urls: string[] = [];
        for (let i = 0; i < partes; i++) {
          const { data, error } = await s.admin.storage.from(BUCKET_TOMAS).createSignedUploadUrl(rutaParte(ruta, i));
          if (error || !data) return fallo(500, "No se pudo preparar la subida. Inténtalo de nuevo.");
          urls.push(data.signedUrl);
        }
        return sinCache({ urls, ruta, partes });
      }
      if (!(tamano > 0) || tamano > MAX_BYTES_ARCHIVO)
        return fallo(400, `La toma pesa más de ${MAX_MB_ARCHIVO} MB. Graba en 1080p y de 6 a 10 segundos.`);
      const { data, error } = await s.admin.storage.from(BUCKET_TOMAS).createSignedUploadUrl(ruta);
      if (error || !data) return fallo(500, "No se pudo preparar la subida. Inténtalo de nuevo.");
      return sinCache({ url: data.signedUrl, ruta });
    }

    // ── 2. Registrar la toma ya subida, con lo que encontró la revisión ──
    case "registrar_toma": {
      if (!EDITABLE.includes(video.estado)) return fallo(409, "Este video ya se envió.");
      const casilla = String(cuerpo.casilla ?? "");
      const ruta = String(cuerpo.ruta ?? "");
      if (!esCasillaValida(casilla) || !carpetasValidas.some((c) => ruta.startsWith(`${c}/${casilla}-`)) || ruta.includes(".."))
        return fallo(400, "Ruta de la toma no válida.");
      const partes = casilla === CASILLA_RECORRIDO ? Math.min(20, Math.max(1, Math.floor(Number(cuerpo.partes ?? 1)))) : 0;
      let peso = 0;
      for (const archivo of archivosDeToma({ ruta, partes })) {
        const p = await pesoArchivo(s.admin, BUCKET_TOMAS, archivo);
        if (p === null) return fallo(400, "No encontramos el archivo completo. Vuelve a subir el video.");
        peso += p;
      }

      const revision = ["ok", "advertencia", "sin_revisar"].includes(cuerpo.revision) ? cuerpo.revision : "sin_revisar";
      const observaciones = Array.isArray(cuerpo.observaciones)
        ? cuerpo.observaciones.slice(0, 6).map((o: unknown) => txt(o, 200))
        : [];
      const { data: anterior } = await s.admin
        .from("tomas_inmueble")
        .select("id, ruta, partes")
        .eq("video_id", video.id)
        .eq("casilla", casilla)
        .maybeSingle();
      const fila = {
        partes,
        video_id: video.id,
        casilla,
        ruta,
        nombre_archivo: txt(cuerpo.nombre, 160),
        tamano: peso,
        duracion: num(cuerpo.duracion),
        ancho: num(cuerpo.ancho),
        alto: num(cuerpo.alto),
        revision,
        observaciones,
        miniatura:
          typeof cuerpo.miniatura === "string" &&
          cuerpo.miniatura.startsWith("data:image/jpeg;base64,") &&
          cuerpo.miniatura.length < 40000
            ? cuerpo.miniatura
            : null,
      };
      const { data: guardada, error } = await s.admin
        .from("tomas_inmueble")
        .upsert(fila, { onConflict: "video_id,casilla" })
        .select("id, casilla, nombre_archivo, tamano, duracion, ancho, alto, revision, observaciones, miniatura, created_at");
      if (error || !guardada || guardada.length === 0) return fallo(500, "No se pudo guardar la toma.");
      if (anterior?.ruta && anterior.ruta !== ruta) await borrarArchivos(s.admin, BUCKET_TOMAS, archivosDeToma(anterior));
      await recalcularPesoTomas(s.admin, video.id);
      return sinCache({ toma: guardada[0] });
    }

    case "borrar_toma": {
      if (!EDITABLE.includes(video.estado)) return fallo(409, "Este video ya se envió.");
      const casilla = String(cuerpo.casilla ?? "");
      const { data: toma } = await s.admin
        .from("tomas_inmueble")
        .select("id, ruta, partes")
        .eq("video_id", video.id)
        .eq("casilla", casilla)
        .maybeSingle();
      if (!toma) return sinCache({ ok: true });
      await s.admin.from("tomas_inmueble").delete().eq("id", toma.id).select("id");
      await borrarArchivos(s.admin, BUCKET_TOMAS, archivosDeToma(toma));
      await recalcularPesoTomas(s.admin, video.id);
      return sinCache({ ok: true });
    }

    // ── Logo del agente u oficina (para el cierre del video) ──
    case "firmar_logo": {
      if (!EDITABLE.includes(video.estado)) return fallo(409, "Este video ya se envió.");
      const mime = String(cuerpo.mime ?? "");
      if (!MIMES_IMAGEN.includes(mime)) return fallo(400, "El logo debe ser PNG, JPG o WEBP.");
      const tamano = Number(cuerpo.tamano ?? 0);
      if (!(tamano > 0) || tamano > MAX_BYTES_LOGO) return fallo(400, "El logo pesa más de 5 MB.");
      const ruta = `${carpetas.marca}/logo-${Date.now()}.${extensionSegura(mime)}`;
      const { data, error } = await s.admin.storage.from(BUCKET_TOMAS).createSignedUploadUrl(ruta);
      if (error || !data) return fallo(500, "No se pudo preparar la subida del logo.");
      return sinCache({ url: data.signedUrl, ruta });
    }

    case "registrar_logo": {
      if (!EDITABLE.includes(video.estado)) return fallo(409, "Este video ya se envió.");
      const ruta = String(cuerpo.ruta ?? "");
      if (!ruta.startsWith(`${carpetas.marca}/logo-`) || ruta.includes(".."))
        return fallo(400, "Ruta del logo no válida.");
      if ((await pesoArchivo(s.admin, BUCKET_TOMAS, ruta)) === null)
        return fallo(400, "No encontramos el logo. Súbelo de nuevo.");
      const r = await cambiarVideo(s.admin, video.id, EDITABLE, { ficha: { ...ficha, logo_ruta: ruta } });
      if (!r.ok) return fallo(409, r.mensaje);
      return sinCache({ ok: true, logo_url: await enlaceLogo(s, ruta) });
    }

    // ── 3. Enviar a edición: revisa todo y avisa a Laura por Telegram ──
    case "enviar": {
      if (!EDITABLE.includes(video.estado)) return fallo(409, "Este video ya se envió.");
      if (!s.userId || !video.agente_id)
        return fallo(401, "Crea tu cuenta para pedir tu vista previa.", { necesita_cuenta: true });
      const faltan = faltantesFicha(ficha);
      if (faltan.length) return fallo(400, `Falta en la ficha: ${faltan.join(", ")}.`, { faltan });

      const { data: tomas } = await s.admin
        .from("tomas_inmueble")
        .select("casilla, revision, observaciones, duracion, tamano")
        .eq("video_id", video.id);
      const subidas = new Set((tomas ?? []).map((t) => t.casilla));
      const recorrido = (tomas ?? []).find((t) => t.casilla === CASILLA_RECORRIDO);
      if (!recorrido) {
        const faltanTomas = obligatoriasDe(ficha.tipo).filter((c) => !subidas.has(c));
        if (faltanTomas.length)
          return fallo(400, `Faltan tomas: ${faltanTomas.map((c) => CASILLAS[c]?.nombre ?? c).join(", ")}.`);
        if (subidas.size < MINIMO_TOMAS) return fallo(400, `Sube al menos ${MINIMO_TOMAS} tomas.`);
      }

      const { count } = await s.admin
        .from("videos_inmueble")
        .select("id", { count: "exact", head: true })
        .eq("agente_id", video.agente_id)
        .in("estado", ESTADOS_SIN_PAGAR)
        .neq("id", video.id);
      if ((count ?? 0) >= MAX_PREVIAS_SIN_PAGAR)
        return fallo(
          409,
          `Tienes ${count} videos sin desbloquear. Para enviar este, desbloquea o descarta uno de ellos.`,
          { limite: true }
        );

      const ahora = new Date();
      const reenvio = video.estado === "rechazado";
      const r = await cambiarVideo(s.admin, video.id, EDITABLE, {
        estado: "recibido",
        enviado_at: ahora.toISOString(),
        motivo_rechazo: null,
      });
      if (!r.ok) return fallo(409, r.mensaje);

      const entrega = entregaEstimada(ahora);
      const conAvisos = (tomas ?? []).filter((t) => t.revision !== "ok").length;
      const orden = casillasDe(ficha.tipo);
      const agente = nombreAgente(s.perfil, s.email);
      const estilo = ESTILOS.find((e) => e.v === video.estilo)?.l ?? "Directo";
      const minutosCuenta = s.creadoEn ? Math.round((ahora.getTime() - Date.parse(s.creadoEn)) / 60000) : null;
      const cuentaNueva = minutosCuenta !== null && minutosCuenta >= 0 && minutosCuenta < 180;
      const enlace = `${origenDe(req)}/videos/${video.id}`;
      await avisarLaura(
        [
          `<b>${reenvio ? "Material corregido" : "Nuevo video por editar"} · ${codigoVideo(video.id)}</b>`,
          `Agente: ${escaparHtml(agente)}${s.perfil?.empresa && s.perfil.empresa !== agente ? ` (${escaparHtml(s.perfil.empresa)})` : ""}`,
          cuentaNueva ? `Agente nuevo: creó su cuenta hace ${Math.max(1, minutosCuenta ?? 1)} min para pedir este video.` : "",
          cuentaNueva && s.perfil?.telefono ? `Su WhatsApp: ${escaparHtml(s.perfil.telefono)}` : "",
          `Inmueble: ${escaparHtml(tituloVideo(ficha))}`,
          recorrido
            ? `Material: un solo video del recorrido${recorrido.duracion ? ` de ${Math.round(Number(recorrido.duracion))} s` : ""} (${Math.round(Number(recorrido.tamano ?? 0) / 1048576)} MB). Hay que sacar las tomas.${conAvisos ? " Tiene avisos para revisar." : ""}`
            : `Material completo: ${subidas.size} tomas${conAvisos ? ` (${conAvisos} para revisar)` : ""}`,
          recorrido ? "" : `Tomas: ${orden.filter((c) => subidas.has(c)).map((c) => CASILLAS[c].nombre).join(" · ")}`,
          `Estilo: ${estilo} · Voz en off: ${video.voz_en_off ? "sí" : "no"}`,
          `Entregar: ${formatoEntrega(entrega, ahora)}`,
          `<a href="${enlace}">${enlace}</a>`,
        ]
          .filter(Boolean)
          .join("\n"),
        { texto: "Abrir en el panel", url: enlace }
      );
      return sinCache({ ok: true, entrega: formatoEntrega(entrega, ahora) });
    }

    // ── Descartar: libera el cupo y borra los archivos ──
    case "descartar": {
      const desde = ["borrador", "rechazado", "vista_previa"];
      if (!desde.includes(video.estado)) return fallo(409, "Este video no se puede descartar ahora.");
      const r = await cambiarVideo(s.admin, video.id, desde, {
        estado: "descartado",
        descartado_at: new Date().toISOString(),
      });
      if (!r.ok) return fallo(409, r.mensaje);
      const { data: tomas } = await s.admin.from("tomas_inmueble").select("ruta, partes").eq("video_id", video.id);
      await borrarArchivos(s.admin, BUCKET_TOMAS, (tomas ?? []).flatMap((t) => archivosDeToma(t)));
      const entregas = (video.entregas ?? {}) as Record<string, { ruta?: string }>;
      await borrarArchivos(s.admin, BUCKET_ENTREGAS, Object.values(entregas).map((e) => e?.ruta));
      await s.admin
        .from("videos_inmueble")
        .update({ peso_tomas: 0, peso_entregas: 0, tomas_borradas_at: new Date().toISOString(), entregas: {}, ruta_vista_previa: null })
        .eq("id", video.id)
        .select("id");
      if (video.estado === "vista_previa") {
        await avisarLaura(
          `<b>Vista previa descartada · ${codigoVideo(video.id)}</b>\n${escaparHtml(
            nombreAgente(s.perfil, s.email)
          )} descartó ${escaparHtml(tituloVideo(ficha))} sin pagar. Vale la pena preguntarle por qué.`
        );
      }
      return sinCache({ ok: true });
    }

    default:
      return fallo(400, "Acción desconocida.");
  }
}
