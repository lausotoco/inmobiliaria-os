// /api/videos/[id]/panel · lo que hace Laura (equipo interno) con un video.
//  GET  → ficha, agente, tomas con enlaces de descarga (1 hora), entregas y pagos
//  POST → { accion }: en_edicion · rechazar · firmar_entrega · registrar_entrega ·
//         textos · publicar · desbloquear_manual · liberar_tomas

import { NextRequest } from "next/server";
import {
  BUCKET_ENTREGAS,
  BUCKET_TOMAS,
  archivosDeToma,
  borrarArchivos,
  cambiarVideo,
  cargarVideo,
  fallo,
  origenDe,
  pesoArchivo,
  pesoEntregas,
  sesion,
  sinCache,
} from "@/lib/videos/servidor";
import {
  CASILLAS,
  ENTREGAS,
  PREVIAS_PORTADA,
  MAX_BYTES_ARCHIVO,
  MAX_MB_ARCHIVO,
  MIMES_IMAGEN,
  casillasDe,
  codigoVideo,
  entregaEstimada,
  extensionDe,
  extensionSegura,
  tituloVideo,
  type Ficha,
} from "@/lib/videos/config";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const TIPOS_ENTREGA: string[] = [...ENTREGAS.map((e) => e.v), ...Object.values(PREVIAS_PORTADA)];

export async function GET(_req: NextRequest, { params }: Ctx) {
  const s = await sesion();
  if (s instanceof Response) return s;
  if (!s.esInterno) return fallo(403, "Solo para el equipo de KYRELO.");
  const video = await cargarVideo(s, params.id);
  if (!video) return fallo(404, "No encontramos este video.");
  const ficha = (video.ficha ?? {}) as Ficha;

  const [{ data: tomas }, { data: agente }, { data: pagos }] = await Promise.all([
    s.admin.from("tomas_inmueble").select("*").eq("video_id", video.id),
    s.admin.from("profiles").select("nombre, empresa, telefono, email").eq("id", video.agente_id).maybeSingle(),
    s.admin.from("pagos").select("*").eq("video_id", video.id).order("creado_en", { ascending: false }),
  ]);

  // Tomas en el orden del recorrido, con enlace de descarga de 1 hora
  const orden = casillasDe(ficha.tipo);
  const posicion = (casilla: string) => (orden.includes(casilla) ? orden.indexOf(casilla) : orden.length);
  const ordenadas = (tomas ?? []).sort((a, b) => posicion(a.casilla) - posicion(b.casilla));
  const conEnlace = [];
  for (let i = 0; i < ordenadas.length; i++) {
    const t = ordenadas[i];
    let url: string | null = null;
    const partes: string[] = [];
    if (!video.tomas_borradas_at) {
      if (Number(t.partes ?? 0) > 0) {
        // Recorrido completo en partes: el panel las baja y las une en un solo archivo
        for (const archivo of archivosDeToma(t)) {
          const { data } = await s.admin.storage.from(BUCKET_TOMAS).createSignedUrl(archivo, 3600);
          if (data?.signedUrl) partes.push(data.signedUrl);
        }
      } else {
        const nombre = `${codigoVideo(video.id)}-${String(i + 1).padStart(2, "0")}-${t.casilla}.${extensionDe(t.ruta) || "mp4"}`;
        const { data } = await s.admin.storage.from(BUCKET_TOMAS).createSignedUrl(t.ruta, 3600, { download: nombre });
        url = data?.signedUrl ?? null;
      }
    }
    conEnlace.push({ ...t, nombre_casilla: CASILLAS[t.casilla]?.nombre ?? t.casilla, url, partes_urls: partes });
  }

  let logo_url: string | null = null;
  if (ficha.logo_ruta) {
    const { data } = await s.admin.storage.from(BUCKET_TOMAS).createSignedUrl(ficha.logo_ruta, 3600, { download: true });
    logo_url = data?.signedUrl ?? null;
  }

  const entregas = (video.entregas ?? {}) as Record<string, { ruta?: string; tamano?: number; nombre?: string }>;
  const entregasConEnlace: Record<string, { tamano?: number; nombre?: string; url: string | null }> = {};
  for (const [tipo, e] of Object.entries(entregas)) {
    if (!e?.ruta) continue;
    const { data } = await s.admin.storage.from(BUCKET_ENTREGAS).createSignedUrl(e.ruta, 3600);
    entregasConEnlace[tipo] = { tamano: e.tamano, nombre: e.nombre, url: data?.signedUrl ?? null };
  }

  return sinCache({
    video: { ...video, codigo: codigoVideo(video.id), titulo: tituloVideo(ficha) },
    agente,
    tomas: conEnlace,
    logo_url,
    entregas: entregasConEnlace,
    pagos: pagos ?? [],
    entrega_limite: video.enviado_at ? entregaEstimada(new Date(video.enviado_at)).toISOString() : null,
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const s = await sesion();
  if (s instanceof Response) return s;
  if (!s.esInterno) return fallo(403, "Solo para el equipo de KYRELO.");
  const video = await cargarVideo(s, params.id);
  if (!video) return fallo(404, "No encontramos este video.");
  const cuerpo = await req.json().catch(() => ({}));
  const accion = String(cuerpo.accion ?? "");
  const ahora = new Date().toISOString();

  switch (accion) {
    case "en_edicion": {
      const r = await cambiarVideo(s.admin, video.id, ["recibido"], { estado: "en_edicion", edicion_at: ahora });
      return r.ok ? sinCache({ ok: true }) : fallo(409, r.mensaje);
    }

    case "rechazar": {
      const motivo = String(cuerpo.motivo ?? "").trim().slice(0, 600);
      if (motivo.length < 5) return fallo(400, "Escribe qué tiene que regrabar el agente.");
      const r = await cambiarVideo(s.admin, video.id, ["recibido", "en_edicion"], {
        estado: "rechazado",
        motivo_rechazo: motivo,
        rechazado_at: ahora,
      });
      return r.ok ? sinCache({ ok: true }) : fallo(409, r.mensaje);
    }

    // ── Subir vista previa y finales (enlace firmado directo a la carpeta privada) ──
    case "firmar_entrega": {
      const tipo = String(cuerpo.tipo ?? "");
      if (!TIPOS_ENTREGA.includes(tipo)) return fallo(400, "Tipo de entrega desconocido.");
      if (video.estado === "descartado") return fallo(409, "Este video fue descartado.");
      const mime = String(cuerpo.mime ?? "");
      const esImagen = tipo.startsWith("portada");
      const permitidos = esImagen ? MIMES_IMAGEN : ["video/mp4", "video/quicktime"];
      if (!permitidos.includes(mime))
        return fallo(400, esImagen ? "La portada debe ser JPG, PNG o WEBP." : "El video debe ser MP4 o MOV.");
      const tamano = Number(cuerpo.tamano ?? 0);
      if (!(tamano > 0) || tamano > MAX_BYTES_ARCHIVO)
        return fallo(400, `El archivo pesa más de ${MAX_MB_ARCHIVO} MB (límite del plan gratis). Expórtalo más liviano.`);
      const ruta = `${video.agente_id}/${video.id}/${tipo}-${Date.now()}.${extensionSegura(mime)}`;
      const { data, error } = await s.admin.storage.from(BUCKET_ENTREGAS).createSignedUploadUrl(ruta);
      if (error || !data) return fallo(500, "No se pudo preparar la subida.");
      return sinCache({ url: data.signedUrl, ruta });
    }

    case "registrar_entrega": {
      const tipo = String(cuerpo.tipo ?? "");
      const ruta = String(cuerpo.ruta ?? "");
      if (!TIPOS_ENTREGA.includes(tipo) || !ruta.startsWith(`${video.agente_id}/${video.id}/${tipo}-`) || ruta.includes(".."))
        return fallo(400, "Ruta no válida.");
      const peso = await pesoArchivo(s.admin, BUCKET_ENTREGAS, ruta);
      if (peso === null) return fallo(400, "No encontramos el archivo. Súbelo de nuevo.");
      const entregas = { ...((video.entregas ?? {}) as Record<string, { ruta?: string; tamano?: number; nombre?: string }>) };
      const anterior = entregas[tipo]?.ruta;
      entregas[tipo] = { ruta, tamano: peso, nombre: String(cuerpo.nombre ?? "").slice(0, 160) };
      const { data, error } = await s.admin
        .from("videos_inmueble")
        .update({
          entregas,
          peso_entregas: pesoEntregas(entregas),
          ...(tipo === "vista_previa" ? { ruta_vista_previa: ruta } : {}),
        })
        .eq("id", video.id)
        .neq("estado", "descartado")
        .select("id");
      if (error || !data || data.length === 0) return fallo(409, "No se pudo guardar. Recarga la página.");
      if (anterior && anterior !== ruta) await borrarArchivos(s.admin, BUCKET_ENTREGAS, [anterior]);
      return sinCache({ ok: true });
    }

    case "textos": {
      const { data, error } = await s.admin
        .from("videos_inmueble")
        .update({
          texto_corto: String(cuerpo.texto_corto ?? "").slice(0, 2200),
          texto_largo: String(cuerpo.texto_largo ?? "").slice(0, 5000),
        })
        .eq("id", video.id)
        .select("id");
      if (error || !data || data.length === 0) return fallo(500, "No se pudieron guardar los textos.");
      return sinCache({ ok: true });
    }

    // ── Publicar la vista previa: el agente la ve y puede pagar ──
    case "publicar": {
      const entregas = (video.entregas ?? {}) as Record<string, { ruta?: string }>;
      if (!video.ruta_vista_previa) return fallo(400, "Falta subir la vista previa.");
      if (!entregas.final_vertical?.ruta)
        return fallo(400, "Sube también el video vertical final: queda guardado en privado y se libera solo cuando paguen.");
      const r = await cambiarVideo(s.admin, video.id, ["recibido", "en_edicion"], {
        estado: "vista_previa",
        vista_previa_at: ahora,
      });
      if (!r.ok) return fallo(409, r.mensaje);
      return sinCache({ ok: true, enlace: `${origenDe(req)}/broker/videos/${video.id}` });
    }

    // Pago recibido por fuera de Wompi (Nequi, Bre-B, transferencia) o cortesía
    case "desbloquear_manual": {
      const nota = String(cuerpo.nota ?? "").trim().slice(0, 300);
      if (nota.length < 3) return fallo(400, "Escribe cómo se pagó (ej. «Nequi 6 oct, pago completo»).");
      const r = await cambiarVideo(s.admin, video.id, ["vista_previa"], {
        estado: "desbloqueado",
        metodo: "manual",
        desbloqueado_en: ahora,
        motivo_rechazo: null,
      });
      if (!r.ok) return fallo(409, r.mensaje);
      await s.admin
        .from("videos_inmueble")
        .update({ ficha: { ...(video.ficha ?? {}), nota_desbloqueo: nota } })
        .eq("id", video.id)
        .select("id");
      return sinCache({ ok: true });
    }

    // Libera espacio: borra las tomas originales cuando ya no hacen falta
    case "liberar_tomas": {
      if (!["vista_previa", "desbloqueado", "descartado"].includes(video.estado))
        return fallo(409, "Solo cuando la vista previa ya está publicada.");
      const { data: tomas } = await s.admin.from("tomas_inmueble").select("ruta, partes").eq("video_id", video.id);
      await borrarArchivos(s.admin, BUCKET_TOMAS, (tomas ?? []).flatMap((t) => archivosDeToma(t)));
      const { data } = await s.admin
        .from("videos_inmueble")
        .update({ peso_tomas: 0, tomas_borradas_at: ahora })
        .eq("id", video.id)
        .select("id");
      if (!data || data.length === 0) return fallo(500, "No se pudo marcar el video.");
      return sinCache({ ok: true });
    }

    default:
      return fallo(400, "Acción desconocida.");
  }
}
