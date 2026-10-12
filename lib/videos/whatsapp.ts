// Video por inmueble pedido por WhatsApp (12 oct 2026).
// El agente le escribe al WhatsApp de KYRELO, manda su video (o sus fotos) y un mensaje con
// todo lo que debe salir. Aquí se arma el mismo pedido de la página (videos_inmueble +
// tomas_inmueble), se le confirma con un botón y, al confirmar, arranca el motor.
// Cuando Laura aprueba en Telegram, el agente recibe su vista previa por WhatsApp (avisarListo).
//
// El número de KYRELO también recibe mensajes de compradores, propietarios y clientes, así
// que el bot SOLO responde cuando:
//  · el mensaje pide un video («VIDEO», «quiero hacer mi video»…),
//  · la persona ya tiene un pedido abierto por WhatsApp, o
//  · llega un video suelto (pregunta una vez si quiere que se lo editemos).
// Todo lo demás lo sigue contestando Laura desde su celular.
//
// Los archivos NO se bajan aquí (Netlify corta a los pocos segundos): la toma guarda el
// identificador de Meta (ruta «wa/<id>») y el motor en GitHub lo baja y lo pasa a Supabase.

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarLaura, escaparHtml } from "@/lib/telegram";
import { dispararMotor } from "@/lib/videos/motor";
import { cambiarVideo, enlaceAgente, limpiarInvitados } from "@/lib/videos/servidor";
import {
  ESTADOS_SIN_PAGAR,
  MAX_DESCRIPCION,
  MAX_FOTOS,
  MAX_PREVIAS_SIN_PAGAR,
  MAX_VIDEOS_WHATSAPP,
  MIN_DESCRIPCION,
  MIN_FOTOS,
  TIPOS_INMUEBLE,
  casillaFoto,
  casillaVideoExtra,
  codigoVideo,
  entregaEstimada,
  esCasillaFoto,
  formatoEntrega,
  tituloVideo,
  type Ficha,
  type TipoInmueble,
} from "@/lib/videos/config";
import {
  FUERA_DE_VENTANA,
  enviarBotones,
  enviarPlantilla,
  enviarTexto,
  numeroInternacional,
  numeroLocal,
  type Envio,
} from "@/lib/whatsapp";

const SITIO = "https://kyrelocorp.com";
const POLITICA = `${SITIO}/legal/tratamiento-de-datos`;
/** Los archivos que llegan sin pedido abierto se pueden sumar al pedido durante este tiempo. */
const HORAS_PENDIENTES = 2;

// ── Lo que llega de Meta (solo los campos que se usan) ──
type Media = { id: string; mime_type?: string; caption?: string; filename?: string };
export type MensajeWa = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  image?: Media;
  video?: Media;
  document?: Media;
  interactive?: { type?: string; button_reply?: { id?: string; title?: string } };
  button?: { payload?: string; text?: string };
};

type Archivo = { id: string; mime: string; clase: "video" | "imagen"; caption: string };

type Contexto = { admin: SupabaseClient; numero: string; nombrePerfil: string };

// ── Palabras ──
const normal = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** «VIDEO», «Quiero hacer mi video», «necesito un video para mi apartamento»… */
function pideVideo(texto: string): boolean {
  const t = normal(texto);
  return /^video\b/.test(t) || /\b(hacer|pedir|quiero|necesito|quisiera)( hacer| pedir)? (mi|un) video\b/.test(t) || t.includes("video por inmueble");
}

const esListo = (t: string) => /^(listo|ya|eso es todo|es todo|terminado|termine|enviar|hacer mi video)$/.test(normal(t));
const esCancelar = (t: string) => /^(cancelar|cancela|no quiero el video|borrar pedido)$/.test(normal(t));

function archivoDe(m: MensajeWa): Archivo | null {
  const media = m.video ?? m.image ?? m.document;
  if (!media?.id) return null;
  const mime = String(media.mime_type ?? "").toLowerCase();
  const clase = m.type === "video" || mime.startsWith("video/") ? "video" : m.type === "image" || mime.startsWith("image/") ? "imagen" : null;
  if (!clase) return null;
  return { id: media.id, mime, clase, caption: String(media.caption ?? "").trim() };
}

const extension = (mime: string, clase: Archivo["clase"]) =>
  ({ "video/mp4": "mp4", "video/quicktime": "mov", "video/3gpp": "3gp", "video/webm": "webm", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[
    mime.split(";")[0]
  ] ?? (clase === "video" ? "mp4" : "jpg");

// ── Respuestas ──
async function responder(ctx: Contexto, texto: string): Promise<Envio> {
  return enviarTexto(ctx.numero, texto);
}

function primerNombre(nombre: string) {
  return (nombre || "").trim().split(/\s+/)[0] ?? "";
}

function instrucciones(nombre: string) {
  const n = primerNombre(nombre);
  return [
    `Hola${n ? ` ${n}` : ""}. Hagamos el video de tu inmueble. Envíame por aquí:`,
    "",
    "1. El video del recorrido, o de 6 a 20 fotos. Si puedes, envía el video como documento para que no pierda calidad.",
    "2. En un mensaje, todo lo que quieres que salga en el video: tipo de inmueble, si es venta o arriendo, municipio y barrio, precio, área, habitaciones, baños, parqueaderos y lo que lo hace diferente.",
    "3. El nombre que va al final del video (el tuyo o el de tu oficina). Si quieres tu logo, envíalo como imagen con la palabra «logo».",
    "",
    "La información que no pongas no saldrá en el video. La vista previa es gratis: pagas solo si te gusta.",
  ].join("\n");
}

// ── El pedido abierto ──
async function pedidoAbierto(admin: SupabaseClient, numero: string) {
  const { data } = await admin
    .from("videos_inmueble")
    .select("*")
    .eq("wa_numero", numero)
    .eq("estado", "borrador")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Record<string, any> | null) ?? null;
}

async function crearPedido(ctx: Contexto): Promise<Record<string, any> | null> {
  await limpiarInvitados(ctx.admin);
  const ficha: Ficha = {
    color_principal: "#1A1A18",
    color_secundario: "#B87333",
    diferenciales: ["", "", ""],
    whatsapp: numeroLocal(ctx.numero),
    aviso_nombre: ctx.nombrePerfil.slice(0, 80),
    aviso_whatsapp: numeroLocal(ctx.numero),
  };
  const { data, error } = await ctx.admin
    .from("videos_inmueble")
    .insert({ agente_id: null, ficha, estilo: "directo", wa_numero: ctx.numero })
    .select("*");
  if (!error && data?.[0]) return data[0] as Record<string, any>;
  // Dos mensajes al mismo tiempo (un álbum de fotos): el otro ya lo creó
  return pedidoAbierto(ctx.admin, ctx.numero);
}

async function tomasDe(admin: SupabaseClient, videoId: string) {
  const { data } = await admin.from("tomas_inmueble").select("id, casilla, ruta").eq("video_id", videoId);
  return (data ?? []) as { id: string; casilla: string; ruta: string }[];
}

/** Guarda un archivo de WhatsApp como toma. Si dos llegan a la vez, el segundo toma la casilla siguiente. */
async function agregarArchivo(admin: SupabaseClient, video: Record<string, any>, a: Archivo): Promise<"ok" | "lleno"> {
  for (let intento = 0; intento < 6; intento++) {
    const tomas = await tomasDe(admin, video.id);
    if (tomas.some((t) => t.ruta.startsWith(`wa/${a.id}.`))) return "ok"; // ya estaba
    const usadas = new Set(tomas.map((t) => t.casilla));
    let casilla: string | null = null;
    if (a.clase === "video") {
      if (!usadas.has("recorrido")) casilla = "recorrido";
      else for (let n = 2; n <= MAX_VIDEOS_WHATSAPP && !casilla; n++) if (!usadas.has(casillaVideoExtra(n))) casilla = casillaVideoExtra(n);
    } else {
      for (let n = 1; n <= MAX_FOTOS && !casilla; n++) if (!usadas.has(casillaFoto(n))) casilla = casillaFoto(n);
    }
    if (!casilla) return "lleno";
    const { error } = await admin
      .from("tomas_inmueble")
      .insert({
        video_id: video.id,
        casilla,
        ruta: `wa/${a.id}.${extension(a.mime, a.clase)}`,
        nombre_archivo: `WhatsApp ${a.clase === "video" ? "video" : "foto"}`,
        tamano: 0,
        partes: 0,
        revision: "sin_revisar",
        observaciones: [],
      })
      .select("id");
    if (!error) return "ok";
    if (error.code !== "23505") throw new Error(error.message); // 23505: casilla ocupada en ese instante
  }
  throw new Error("no se pudo guardar el archivo");
}

/** Suma texto a lo que el agente escribió y saca de ahí los datos básicos. */
async function sumarTexto(admin: SupabaseClient, video: Record<string, any>, texto: string) {
  const { data: actual } = await admin.from("videos_inmueble").select("ficha").eq("id", video.id).maybeSingle();
  const ficha = ((actual?.ficha ?? video.ficha ?? {}) as Ficha) || {};
  const descripcion = [ficha.descripcion, texto.trim()].filter(Boolean).join("\n").slice(0, MAX_DESCRIPCION);
  const datos = await leerDatos(descripcion);
  const nueva: Ficha = { ...ficha, descripcion };
  if (datos) {
    if (datos.tipo) nueva.tipo = datos.tipo;
    if (datos.operacion) nueva.operacion = datos.operacion;
    if (datos.municipio) nueva.municipio = datos.municipio.slice(0, 60);
    if (datos.barrio) nueva.barrio = datos.barrio.slice(0, 80);
    for (const k of ["precio", "area_construida", "area_privada", "habitaciones", "banos", "parqueaderos", "estrato", "administracion"] as const)
      if (typeof datos[k] === "number" && Number.isFinite(datos[k])) (nueva as any)[k] = datos[k];
    if (datos.nombre_cierre) nueva.nombre_marca = datos.nombre_cierre.slice(0, 80);
    const wa = datos.whatsapp_cierre ? numeroLocal(datos.whatsapp_cierre) : "";
    if (/^3\d{9}$/.test(wa)) nueva.whatsapp = wa;
  }
  await admin.from("videos_inmueble").update({ ficha: nueva }).eq("id", video.id).eq("estado", "borrador").select("id");
  return nueva;
}

// ── Lectura de los datos básicos con Claude (solo lo que el agente escribió, nada inventado) ──
type Datos = {
  tipo?: TipoInmueble | null;
  operacion?: "venta" | "arriendo" | null;
  municipio?: string | null;
  barrio?: string | null;
  precio?: number | null;
  area_construida?: number | null;
  area_privada?: number | null;
  habitaciones?: number | null;
  banos?: number | null;
  parqueaderos?: number | null;
  estrato?: number | null;
  administracion?: number | null;
  nombre_cierre?: string | null;
  whatsapp_cierre?: string | null;
};

const PROMPT_DATOS = `Lees lo que un agente inmobiliario de Colombia escribió por WhatsApp para pedir el video de un inmueble y devuelves SOLO un JSON con estos campos:
{"tipo": "apartamento"|"casa"|"lote"|"local"|null, "operacion": "venta"|"arriendo"|null, "municipio": string|null, "barrio": string|null, "precio": número en pesos|null, "area_construida": número m²|null, "area_privada": número m²|null, "habitaciones": número|null, "banos": número|null, "parqueaderos": número|null, "estrato": número|null, "administracion": número en pesos|null, "nombre_cierre": string|null, "whatsapp_cierre": string|null}
Reglas:
- NUNCA inventes. Si no está escrito de forma explícita, va null.
- "local" incluye oficinas, bodegas y consultorios. "casa" incluye casas campestres y fincas.
- Precios: "850 millones" -> 850000000; "2.5 millones" -> 2500000.
- municipio es la ciudad o el municipio (Chía, Bogotá, Medellín…), con mayúscula inicial. barrio es el barrio, conjunto, sector o vereda.
- nombre_cierre: solo si pide un nombre para el final del video o firma con su nombre u oficina ("Al final: Inmobiliaria Sabana", "Soy Juan Pérez de Century 21"). whatsapp_cierre: solo si da un número para el final del video.
Responde únicamente el JSON.`;

async function leerDatos(texto: string): Promise<Datos | null> {
  const llave = process.env.ANTHROPIC_API_KEY;
  if (llave && texto.trim()) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-api-key": llave, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: PROMPT_DATOS,
          messages: [{ role: "user", content: texto.slice(0, MAX_DESCRIPCION) }],
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const crudo: string = (j?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
        const m = /\{[\s\S]*\}/.exec(crudo);
        if (m) {
          const d = JSON.parse(m[0]) as Datos;
          if (d.tipo && !TIPOS_INMUEBLE.some((x) => x.v === d.tipo)) d.tipo = null;
          if (d.operacion !== "venta" && d.operacion !== "arriendo") d.operacion = null;
          return d;
        }
      }
    } catch {
      // sigue con la lectura sencilla
    } finally {
      clearTimeout(t);
    }
  }
  // Sin Claude: al menos el tipo y la operación por palabras
  const n = normal(texto);
  const tipo: TipoInmueble | null = /\b(apartamento|apto|apartaestudio)\b/.test(n)
    ? "apartamento"
    : /\b(casa|finca)\b/.test(n)
      ? "casa"
      : /\blote\b/.test(n)
        ? "lote"
        : /\b(local|oficina|bodega|consultorio)\b/.test(n)
          ? "local"
          : null;
  const operacion = /\b(arriendo|arrienda|arrendar|renta)\b/.test(n) ? "arriendo" : /\b(venta|vendo|vende|vender)\b/.test(n) ? "venta" : null;
  return { tipo, operacion };
}

// ── Qué falta para poder hacer el video ──
function faltantes(ficha: Ficha, tomas: { casilla: string }[]) {
  const falta: string[] = [];
  const videos = tomas.filter((t) => !esCasillaFoto(t.casilla)).length;
  const fotos = tomas.filter((t) => esCasillaFoto(t.casilla)).length;
  if (videos === 0 && fotos < MIN_FOTOS)
    falta.push(fotos > 0 ? `más fotos (tengo ${fotos}, necesito al menos ${MIN_FOTOS}) o el video del recorrido` : "el video del recorrido (o de 6 a 20 fotos)");
  const d = (ficha.descripcion ?? "").trim().length;
  if (d < MIN_DESCRIPCION) falta.push("la información del inmueble en un mensaje: todo lo que quieres que salga en el video");
  else {
    if (!ficha.tipo) falta.push("el tipo de inmueble (apartamento, casa, lote, local u oficina)");
    if (!ficha.operacion) falta.push("si es venta o arriendo");
    if (!ficha.municipio?.trim()) falta.push("el municipio");
  }
  return { falta, videos, fotos };
}

function resumenMaterial(videos: number, fotos: number) {
  const partes: string[] = [];
  if (videos) partes.push(videos === 1 ? "1 video" : `${videos} videos`);
  if (fotos) partes.push(fotos === 1 ? "1 foto" : `${fotos} fotos`);
  return partes.join(" y ") || "nada todavía";
}

/**
 * Le dice al agente qué falta o, si ya está todo, le muestra el resumen con el botón «Hacer mi video».
 * Modo «si_cambia»: solo responde si la etapa cambió (así un álbum de 15 fotos no manda 15 mensajes).
 * Modo «callado»: solo anota la etapa.
 */
async function informar(ctx: Contexto, videoId: string, modo: "siempre" | "si_cambia" | "callado") {
  const { data: v } = await ctx.admin.from("videos_inmueble").select("*").eq("id", videoId).maybeSingle();
  if (!v || v.estado !== "borrador") return;
  const ficha = (v.ficha ?? {}) as Ficha;
  const tomas = await tomasDe(ctx.admin, videoId);
  const { falta, videos, fotos } = faltantes(ficha, tomas);
  const etapa = falta.length ? "falta-" + createHash("sha1").update(falta.join("|")).digest("hex").slice(0, 12) : "listo";
  // Cambia la etapa solo si es distinta: si dos mensajes llegan juntos, responde uno solo
  const { data: cambio } = await ctx.admin
    .from("videos_inmueble")
    .update({ wa_etapa: etapa })
    .eq("id", videoId)
    .or(`wa_etapa.is.null,wa_etapa.neq.${etapa}`)
    .select("id");
  if (modo === "callado") return;
  if (modo === "si_cambia" && (!cambio || cambio.length === 0)) return;

  if (falta.length) {
    const recibido = videos || fotos ? `Tengo ${resumenMaterial(videos, fotos)}. ` : "";
    await responder(ctx, `${recibido}Para hacer tu video me falta:\n${falta.map((f) => `· ${f}`).join("\n")}`);
    return;
  }
  const cierre = [ficha.nombre_marca || ficha.aviso_nombre || "", ficha.whatsapp || ""].filter(Boolean).join(" · ");
  const info = (ficha.descripcion ?? "").replace(/\s+/g, " ").trim();
  await enviarBotones(
    ctx.numero,
    [
      "Esto es lo que tengo:",
      `· Material: ${resumenMaterial(videos, fotos)}`,
      `· Inmueble: ${tituloVideo(ficha)}`,
      `· Al final del video: ${cierre || "sin nombre"}`,
      `· Información: «${info.length > 220 ? info.slice(0, 220) + "…" : info}»`,
      "",
      "La información que no pongas no saldrá en el video. Si falta algo, envíalo antes de confirmar.",
      "",
      `Al tocar «Hacer mi video» confirmas que tienes permiso del propietario para usar este material y autorizas a KYRELO a usar tu nombre y tu WhatsApp para hacer el video y avisarte (${POLITICA}).`,
    ].join("\n"),
    [
      { id: `vid_enviar:${videoId}`, titulo: "Hacer mi video" },
      { id: "vid_mas", titulo: "Agregar algo más" },
    ]
  );
}

// ── Confirmar: el pedido pasa a «recibido», arranca el motor y Laura recibe el aviso ──
async function confirmar(ctx: Contexto, videoId: string) {
  const v = await pedidoAbierto(ctx.admin, ctx.numero);
  if (!v || v.id !== videoId) {
    await responder(ctx, "Ese pedido ya se envió o se canceló. Si quieres otro video, escribe VIDEO.");
    return;
  }
  const ficha = (v.ficha ?? {}) as Ficha;
  const tomas = await tomasDe(ctx.admin, v.id);
  const { falta, videos, fotos } = faltantes(ficha, tomas);
  if (falta.length) {
    await informar(ctx, v.id, "siempre");
    return;
  }
  const { count } = await ctx.admin
    .from("videos_inmueble")
    .select("id", { count: "exact", head: true })
    .eq("wa_numero", ctx.numero)
    .in("estado", ESTADOS_SIN_PAGAR);
  if ((count ?? 0) >= MAX_PREVIAS_SIN_PAGAR) {
    await responder(
      ctx,
      `Tienes ${count} videos esperando. Para hacer este, primero desbloquea o descarta uno de ellos. Si necesitas ayuda, escríbeme por aquí.`
    );
    return;
  }
  const ahora = new Date();
  const fichaFinal: Ficha = {
    ...ficha,
    nombre_marca: ficha.nombre_marca || ficha.aviso_nombre || "",
    whatsapp: ficha.whatsapp || numeroLocal(ctx.numero),
    permiso_propietario: true,
    aviso_acepto_at: ahora.toISOString(),
  };
  const r = await cambiarVideo(ctx.admin, v.id, ["borrador"], {
    estado: "recibido",
    enviado_at: ahora.toISOString(),
    ficha: fichaFinal,
    wa_etapa: "enviado",
  });
  if (!r.ok) {
    await responder(ctx, "Ese pedido ya se envió. Te aviso por aquí cuando tu video esté listo.");
    return;
  }
  const entrega = formatoEntrega(entregaEstimada(ahora), ahora);
  await responder(
    ctx,
    `Listo, ya estamos haciendo tu video (${codigoVideo(v.id)}). La vista previa estará lista ${entrega}, y te la envío por aquí. Es gratis: pagas solo si te gusta.`
  );

  const motor = await dispararMotor(v.id);
  const enlace = `${SITIO}/videos/${v.id}`;
  await avisarLaura(
    [
      `<b>Nuevo video por editar (llegó por WhatsApp) · ${codigoVideo(v.id)}</b>`,
      `Agente: ${escaparHtml(ctx.nombrePerfil || "sin nombre")} · WhatsApp ${escaparHtml(numeroLocal(ctx.numero))}`,
      `Inmueble: ${escaparHtml(tituloVideo(fichaFinal))}`,
      `Material: ${resumenMaterial(videos, fotos)} (el motor los baja de WhatsApp).`,
      `Entregar: ${entrega}`,
      motor.ok
        ? "Motor: ya lo está editando. Cuando apruebes, le mando la vista previa por WhatsApp solo."
        : `Motor: NO arrancó (${escaparHtml(motor.motivo ?? "")}). Toca «Editar con el motor» para intentarlo otra vez.`,
      `<a href="${enlace}">${enlace}</a>`,
    ].join("\n"),
    { texto: "Abrir en el panel", url: enlace },
    motor.ok ? undefined : { texto: "Editar con el motor", callback: `vid_motor:${v.id}` }
  );
}

// ── Videos que llegaron sin pedido abierto (las fotos sueltas no: pueden ser un comprobante de pago) ──
async function sumarPendientes(admin: SupabaseClient, numero: string, video: Record<string, any>) {
  const desde = new Date(Date.now() - HORAS_PENDIENTES * 3600000).toISOString();
  const { data } = await admin
    .from("whatsapp_mensajes")
    .select("id, media")
    .eq("numero", numero)
    .is("video_id", null)
    .not("media", "is", null)
    .gte("creado_en", desde)
    .order("creado_en", { ascending: true });
  for (const p of data ?? []) {
    const a = p.media as Archivo;
    if (a?.id && a.clase === "video" && (await agregarArchivo(admin, video, a)) === "ok")
      await admin.from("whatsapp_mensajes").update({ video_id: video.id }).eq("id", p.id).select("id");
  }
}

/** Atiende un mensaje que llegó al WhatsApp de KYRELO. Nunca lanza error. */
export async function atenderMensaje(admin: SupabaseClient, m: MensajeWa, nombrePerfil: string) {
  const numero = String(m.from ?? "").replace(/\D/g, "");
  if (!m.id || !numero) return;
  const archivo = archivoDe(m);

  // Meta reintenta los avisos: cada mensaje se atiende una sola vez
  const { error: repetido } = await admin
    .from("whatsapp_mensajes")
    .insert({ id: m.id, numero, tipo: m.type, media: archivo })
    .select("id");
  if (repetido) return;

  const ctx: Contexto = { admin, numero, nombrePerfil };
  try {
    let video = await pedidoAbierto(admin, numero);
    const marcar = (id: string) => admin.from("whatsapp_mensajes").update({ video_id: id }).eq("id", m.id).select("id");

    // Botones
    const boton = m.interactive?.button_reply?.id ?? m.button?.payload ?? "";
    if (boton) {
      if (boton.startsWith("vid_enviar:")) return await confirmar(ctx, boton.slice(11));
      if (boton === "vid_mas") return void (await responder(ctx, "Listo. Envíame lo que falte y te muestro el resumen otra vez."));
      if (boton === "vid_si") {
        video = video ?? (await crearPedido(ctx));
        if (!video) return;
        await sumarPendientes(admin, numero, video);
        await responder(ctx, instrucciones(nombrePerfil));
        return await informar(ctx, video.id, "siempre");
      }
      if (boton === "vid_no") return;
    }

    // Texto
    if (m.type === "text") {
      const texto = String(m.text?.body ?? "").trim();
      if (!texto) return;
      if (!video) {
        if (!pideVideo(texto)) return; // no es un pedido: lo contesta Laura
        video = await crearPedido(ctx);
        if (!video) return;
        await marcar(video.id);
        await sumarPendientes(admin, numero, video);
        await responder(ctx, instrucciones(nombrePerfil));
        // Si en el mismo mensaje ya contó el inmueble, se guarda y se le dice qué falta
        const largo = normal(texto).length > 40;
        if (largo) await sumarTexto(admin, video, texto);
        await informar(ctx, video.id, largo ? "siempre" : "callado");
        return;
      }
      await marcar(video.id);
      if (esCancelar(texto)) {
        await cambiarVideo(admin, video.id, ["borrador"], { estado: "descartado", descartado_at: new Date().toISOString() });
        return void (await responder(ctx, "Listo, cancelé este pedido. Cuando quieras otro video, escribe VIDEO."));
      }
      // «listo» o «VIDEO» solos piden el resumen; cualquier otro texto es información del inmueble
      if (!esListo(texto) && !(pideVideo(texto) && normal(texto).length <= 40)) await sumarTexto(admin, video, texto);
      return await informar(ctx, video.id, "siempre");
    }

    // Notas de voz: la información va escrita (decisión de Laura, 9 oct 2026)
    if (m.type === "audio") {
      if (video) {
        await marcar(video.id);
        await responder(ctx, "Por ahora no puedo usar notas de voz. Escríbeme la información del inmueble en un mensaje, por favor.");
      }
      return;
    }

    // Videos y fotos
    if (archivo) {
      if (!video) {
        // Video suelto sin pedido: pregunta una vez (en las últimas horas) si quiere que se lo editemos
        if (archivo.clase !== "video") return;
        const desde = new Date(Date.now() - HORAS_PENDIENTES * 3600000).toISOString();
        const { count } = await admin
          .from("whatsapp_mensajes")
          .select("id", { count: "exact", head: true })
          .eq("numero", numero)
          .eq("tipo", "pregunta")
          .gte("creado_en", desde);
        if ((count ?? 0) > 0) return;
        await admin.from("whatsapp_mensajes").insert({ id: `pregunta:${m.id}`, numero, tipo: "pregunta" }).select("id");
        await enviarBotones(
          numero,
          "Recibimos tu video. ¿Quieres que lo editemos como video para redes de tu inmueble? La vista previa es gratis. Si era para otra cosa, ignora este mensaje y te respondemos pronto.",
          [
            { id: "vid_si", titulo: "Sí, hacer mi video" },
            { id: "vid_no", titulo: "No, era otra cosa" },
          ]
        );
        return;
      }
      await marcar(video.id);
      // Logo para el cierre: una imagen con la palabra «logo»
      if (archivo.clase === "imagen" && /\blogo\b/.test(normal(archivo.caption))) {
        const ficha = (video.ficha ?? {}) as Ficha;
        await admin
          .from("videos_inmueble")
          .update({ ficha: { ...ficha, logo_ruta: `wa/${archivo.id}.${extension(archivo.mime, "imagen")}` } })
          .eq("id", video.id)
          .eq("estado", "borrador")
          .select("id");
        await responder(ctx, "Recibí tu logo. Va en el cierre del video.");
        return;
      }
      if ((await agregarArchivo(admin, video, archivo)) === "lleno") {
        await responder(
          ctx,
          archivo.clase === "video"
            ? `Ya tengo ${MAX_VIDEOS_WHATSAPP} videos, el máximo por pedido. Este no lo voy a usar.`
            : `Ya tengo ${MAX_FOTOS} fotos, el máximo por pedido. Esta no la voy a usar.`
        );
        return;
      }
      if (archivo.caption) await sumarTexto(admin, video, archivo.caption);
      return await informar(ctx, video.id, archivo.caption ? "siempre" : "si_cambia");
    }

    // Otros documentos (PDF, Word…) dentro de un pedido
    if (video && m.type === "document") {
      await marcar(video.id);
      await responder(ctx, "Solo puedo usar videos y fotos. Si es información del inmueble, escríbela en un mensaje, por favor.");
    }
  } catch (e) {
    await avisarLaura(
      `<b>WhatsApp: no pude atender un mensaje</b>\nDe ${escaparHtml(numeroLocal(numero))} (${escaparHtml(m.type)}): ${escaparHtml(String((e as Error)?.message ?? e)).slice(0, 300)}\nRespóndele tú desde el celular.`
    );
  }
}

/**
 * Cuando Laura aprueba, el agente que pidió por WhatsApp recibe su vista previa ahí mismo.
 * Dentro de las 24 horas va un mensaje normal (gratis). Después, la plantilla aprobada
 * (WHATSAPP_PLANTILLA_LISTO, con 3 variables: nombre, inmueble y enlace).
 */
export async function avisarListo(video: { id: string; agente_id: string | null; wa_numero?: string | null; ficha?: unknown }): Promise<Envio> {
  const f = (video.ficha ?? {}) as Ficha;
  const para = video.wa_numero || numeroInternacional(f.aviso_whatsapp || f.whatsapp || "");
  if (!para) return { ok: false, mensaje: "no hay número de WhatsApp" };
  const nombre = primerNombre(f.aviso_nombre || "");
  const enlace = enlaceAgente(SITIO, video);
  const titulo = tituloVideo(f);
  const r = await enviarTexto(
    para,
    `Hola${nombre ? ` ${nombre}` : ""}, tu video de ${titulo} ya está listo. Mira la vista previa aquí: ${enlace}\n\nSi te gusta, respóndeme por aquí y te digo cómo pagarlo para descargarlo.`
  );
  if (r.ok || r.codigo !== FUERA_DE_VENTANA) return r;
  const plantilla = process.env.WHATSAPP_PLANTILLA_LISTO;
  if (!plantilla) return { ok: false, codigo: r.codigo, mensaje: "pasaron más de 24 horas desde su último mensaje" };
  return enviarPlantilla(para, plantilla, [nombre || "hola", titulo, enlace], process.env.WHATSAPP_PLANTILLA_IDIOMA || "es");
}
