// El asistente de KYRELO en WhatsApp (el nuevo KYRELO, fase 3 · 21 oct 2026).
// Atiende a quien le escribe al número de KYRELO y no está pidiendo un video:
//  · compradores y arrendatarios: entiende qué buscan (texto o nota de voz), arma su
//    requerimiento en la plataforma y, cuando Laura aprueba opciones en Telegram, les
//    manda por aquí el enlace de su portafolio privado; lee «me interesa la 2» y avisa a Laura;
//  · propietarios y agentes: toma los datos básicos y se los pasa a Laura.
// La conversación vive en wa_conversaciones (SQL 20). Claude decide qué responder a partir de
// las reglas de abajo; el código decide qué se guarda. Nunca comparte números de nadie.

import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarLaura, avisarLauraBotones, escaparHtml } from "@/lib/telegram";
import type { MensajeWa } from "@/lib/videos/whatsapp";
import { FUERA_DE_VENTANA, descargarMedia, enviarPlantilla, enviarTexto, numeroInternacional, numeroLocal, type Envio } from "@/lib/whatsapp";

const ORG_ID = "00000000-0000-0000-0000-000000000001"; // Mi Inmobiliaria
const SITIO = "https://kyrelocorp.com";
const POLITICA = `${SITIO}/legal/tratamiento-de-datos`;
const MAX_HISTORIAL = 24;
const MODELO = process.env.ASISTENTE_MODELO || "claude-sonnet-4-6";

type Rol = "comprador" | "propietario" | "agente";
type Etapa = "nuevo" | "datos" | "buscando" | "pausado";
type Mensaje = { de: "persona" | "bot"; texto: string; en: string };

type Datos = {
  nombre?: string | null;
  operacion?: "compra" | "arriendo" | null;
  tipos?: string[] | null;
  ciudad?: string | null;
  zonas?: string[] | null;
  presupuesto_min?: number | null;
  presupuesto_max?: number | null;
  habitaciones?: number | null;
  parqueaderos?: number | null;
  para_cuando?: string | null;
  urgencia?: "inmediata" | "1-3 meses" | "+3 meses" | null;
  financiacion?: string | null;
  no_quiere?: string[] | null;
  preferencias?: string | null;
  inmueble?: Record<string, unknown> | null; // propietario o agente con inmueble
  inmobiliaria?: string | null;              // agente
};

type Conversacion = {
  numero: string;
  nombre_perfil: string | null;
  rol: Rol | null;
  etapa: Etapa;
  cliente_id: string | null;
  requerimiento_id: string | null;
  datos: Datos;
  historial: Mensaje[];
  autorizo_datos: boolean;
};

type Decision = {
  respuesta: string;
  rol: Rol | null;
  datos: Datos;
  requerimiento_completo: boolean;
  pasar_a_laura: boolean;
  motivo_laura: string | null;
  no_mas: boolean;
  reacciones: { opcion: number; interesa: boolean; motivo: string | null }[];
};

type Opcion = { item_id: string; propiedad_id: string; numero: number; titulo: string; precio: number | null; barrio: string | null; url: string | null; inmobiliaria: string | null };

const SISTEMA = `Eres el asistente de KYRELO en WhatsApp. KYRELO es una inmobiliaria de Chía, Cajicá, Cota, Sopó y Bogotá norte que trabaja al revés: primero entiende a quien busca y después le consigue el inmueble. Atiendes a tres personas: quien busca comprar o arrendar, quien quiere vender o arrendar su inmueble, y agentes inmobiliarios con un cliente. Laura es la persona de KYRELO que hace las visitas y los cierres.

Cómo hablas:
- Español de Colombia, tuteando a todo el mundo. Palabras sencillas. Sin emojis, sin "soñado", sin "exclusivo", sin frases de relleno ("qué bueno que escribiste", "con mucho gusto").
- Corto: máximo 6 líneas. Una o dos preguntas por mensaje, nunca un formulario. Pregunta solo lo que falta.
- Nunca prometas ventas, compradores, plazos ni precios. Nunca des avalúos ni opinión legal. Nunca digas cómo se verifica a un comprador. Nunca compartas el número ni el nombre de otra persona.
- Si te piden hablar con una persona, si hay una queja, una oferta, una negociación, un tema legal o algo que no entiendes dos veces seguidas, pasas la conversación a Laura (pasar_a_laura) y se lo dices a la persona.
- Si la persona dice que no quiere más mensajes, no_mas = true y te despides en una línea.

Comprador o arrendatario (rol "comprador"):
- Necesitas: compra o arriendo; tipo de inmueble; ciudad y zonas; presupuesto máximo; parqueaderos; para cuándo; cómo paga (recursos propios, crédito aprobado, en trámite, vende otro inmueble); lo que no quiere. Si el primer mensaje ya trae varios datos, no los vuelvas a preguntar.
- Cuando tengas operación, tipo, zona, presupuesto y para cuándo: confirma en dos líneas lo que entendiste, marca requerimiento_completo = true y dile que le llegarán por aquí las opciones que encajen, con un enlace a su portafolio privado. No prometas cuándo.
- Urgencia: "inmediata" si compra en menos de 3 meses; "1-3 meses"; "+3 meses" o null si solo explora.
- Si ya tiene portafolio (te llega la lista numerada de sus opciones) y comenta alguna ("me interesa la 2", "la 3 muy lejos"), marca la reacción en reacciones con el número de la opción, agradece en una línea y, si le interesa, dile que Laura la consigue y le escribe para la visita. Lo que diga que no le gusta se guarda en no_quiere o preferencias para ajustar la búsqueda.

Propietario (rol "propietario"):
- Necesitas: venta o arriendo; tipo; municipio y barrio; precio que pide; área; habitaciones; parqueaderos. Guárdalo en datos.inmueble.
- Dile que KYRELO se lo muestra a sus compradores verificados y que Laura le confirma las condiciones. No digas porcentajes. Cuando tengas tipo, municipio y precio, pasar_a_laura = true con motivo "propietario".

Agente inmobiliario (rol "agente"):
- Si quiere un video de un inmueble, dile que escriba la palabra VIDEO y no hagas nada más.
- Si tiene un cliente que busca, toma el requerimiento igual que a un comprador (los datos van en datos, con datos.inmobiliaria) y marca requerimiento_completo cuando esté.
- Si tiene un inmueble para la red, igual que un propietario.

Responde SOLO con un JSON válido, sin markdown:
{"respuesta": "lo que le escribes a la persona", "rol": "comprador"|"propietario"|"agente"|null, "datos": {solo los campos nuevos o corregidos}, "requerimiento_completo": boolean, "pasar_a_laura": boolean, "motivo_laura": string|null, "no_mas": boolean, "reacciones": [{"opcion": número, "interesa": boolean, "motivo": string|null}]}
Campos de datos: nombre, operacion ("compra"|"arriendo"), tipos (lista: apartamento, apartaestudio, casa, loft, dúplex, lote, local, oficina), ciudad, zonas (lista), presupuesto_min, presupuesto_max (pesos, sin formato: "400 millones" -> 400000000), habitaciones, parqueaderos, para_cuando, urgencia, financiacion, no_quiere (lista), preferencias, inmueble (objeto), inmobiliaria. Nunca inventes: si no lo dijo, no lo pongas.`;

function primerNombre(n: string | null | undefined) {
  return (n || "").trim().split(/\s+/)[0] ?? "";
}

function pesos(n: number) {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

// ── La conversación ──
async function cargar(admin: SupabaseClient, numero: string, nombrePerfil: string): Promise<Conversacion> {
  const { data } = await admin.from("wa_conversaciones").select("*").eq("numero", numero).maybeSingle();
  if (data) return data as Conversacion;
  const nueva = { numero, nombre_perfil: nombrePerfil || null };
  await admin.from("wa_conversaciones").insert(nueva).select("numero");
  return { ...nueva, rol: null, etapa: "nuevo", cliente_id: null, requerimiento_id: null, datos: {}, historial: [], autorizo_datos: false };
}

async function guardar(admin: SupabaseClient, c: Conversacion, cambios: Partial<Conversacion>) {
  const historial = (cambios.historial ?? c.historial).slice(-MAX_HISTORIAL);
  await admin
    .from("wa_conversaciones")
    .update({ ...cambios, historial, actualizado_en: new Date().toISOString() })
    .eq("numero", c.numero)
    .select("numero");
}

// ── Lo que escribió (o dijo) la persona ──
async function transcribir(audio: ArrayBuffer, mime: string): Promise<string | null> {
  const llave = process.env.GROQ_API_KEY;
  if (!llave) return null;
  const form = new FormData();
  form.append("file", new Blob([audio], { type: mime || "audio/ogg" }), "audio.ogg");
  form.append("model", "whisper-large-v3");
  form.append("language", "es");
  try {
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}` },
      body: form,
    });
    if (!r.ok) return null;
    const j = await r.json();
    const texto = String(j?.text ?? "").trim();
    return texto.length > 1 ? texto : null;
  } catch {
    return null;
  }
}

async function textoDe(m: MensajeWa): Promise<{ texto: string | null; aviso?: string }> {
  if (m.type === "text") return { texto: String(m.text?.body ?? "").trim() || null };
  const boton = m.interactive?.button_reply?.title ?? m.button?.text;
  if (boton) return { texto: String(boton).trim() };
  if (m.type === "audio") {
    const media = (m as { audio?: { id?: string; mime_type?: string } }).audio;
    if (!media?.id) return { texto: null };
    const d = await descargarMedia(media.id);
    const t = d ? await transcribir(d.datos, d.mime || media.mime_type || "") : null;
    if (t) return { texto: `[nota de voz] ${t}` };
    return { texto: null, aviso: "No pude escuchar bien la nota de voz. ¿Me lo escribes en un mensaje?" };
  }
  if (m.type === "image" || m.type === "video" || m.type === "document") {
    return { texto: null, aviso: "Por ahora solo puedo leer mensajes de texto y notas de voz. Cuéntame por aquí qué necesitas." };
  }
  return { texto: null };
}

// ── El portafolio del comprador (para que el asistente entienda «me interesa la 2») ──
async function opcionesDe(admin: SupabaseClient, clienteId: string): Promise<{ token: string; opciones: Opcion[] } | null> {
  const { data: pf } = await admin
    .from("portafolios")
    .select("id, token")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pf) return null;
  const { data: items } = await admin
    .from("portafolio_items")
    .select("id, propiedad_id, orden, estatus, propiedades(titulo, precio, barrio, url_original, inmobiliaria)")
    .eq("portafolio_id", pf.id)
    .neq("estatus", "descartada")
    .order("orden", { ascending: true });
  const opciones: Opcion[] = (items ?? []).map((it, i) => {
    const p = (Array.isArray(it.propiedades) ? it.propiedades[0] : it.propiedades) as Record<string, unknown> | null;
    return {
      item_id: it.id,
      propiedad_id: it.propiedad_id,
      numero: i + 1,
      titulo: String(p?.titulo ?? "Inmueble"),
      precio: (p?.precio as number | null) ?? null,
      barrio: (p?.barrio as string | null) ?? null,
      url: (p?.url_original as string | null) ?? null,
      inmobiliaria: (p?.inmobiliaria as string | null) ?? null,
    };
  });
  return { token: pf.token, opciones };
}

// ── Claude decide qué responder ──
async function decidir(c: Conversacion, opciones: Opcion[] | null): Promise<Decision | null> {
  const llave = process.env.ANTHROPIC_API_KEY;
  if (!llave) return null;
  const estado = {
    nombre_en_whatsapp: c.nombre_perfil,
    rol: c.rol,
    etapa: c.etapa,
    ya_tiene_requerimiento: !!c.requerimiento_id,
    datos: c.datos,
    portafolio: opciones?.map((o) => ({ opcion: o.numero, titulo: o.titulo, precio: o.precio, barrio: o.barrio })) ?? null,
  };
  const mensajes = c.historial.map((h) => ({ role: h.de === "persona" ? "user" : "assistant", content: h.texto }));
  // La API exige que empiece con la persona y que no haya dos del mismo lado seguidos
  const alternados: { role: string; content: string }[] = [];
  for (const m of mensajes) {
    const ultimo = alternados[alternados.length - 1];
    if (ultimo && ultimo.role === m.role) ultimo.content += "\n" + m.content;
    else alternados.push({ ...m });
  }
  while (alternados.length && alternados[0].role !== "user") alternados.shift();
  if (!alternados.length) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-api-key": llave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 900,
        system: `${SISTEMA}\n\nESTADO DE ESTA CONVERSACIÓN (lo que ya se sabe; no lo vuelvas a preguntar):\n${JSON.stringify(estado)}`,
        messages: alternados,
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const crudo: string = (j?.content ?? []).map((x: { text?: string }) => x.text ?? "").join("");
    const m = /\{[\s\S]*\}/.exec(crudo);
    if (!m) return null;
    const d = JSON.parse(m[0]) as Partial<Decision>;
    if (!d.respuesta) return null;
    return {
      respuesta: String(d.respuesta).trim(),
      rol: d.rol === "comprador" || d.rol === "propietario" || d.rol === "agente" ? d.rol : null,
      datos: (d.datos && typeof d.datos === "object" ? d.datos : {}) as Datos,
      requerimiento_completo: !!d.requerimiento_completo,
      pasar_a_laura: !!d.pasar_a_laura,
      motivo_laura: d.motivo_laura ? String(d.motivo_laura) : null,
      no_mas: !!d.no_mas,
      reacciones: Array.isArray(d.reacciones) ? d.reacciones.filter((x) => Number.isFinite(Number(x?.opcion))) : [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ── El comprador entra a la plataforma ──
function resumenDatos(d: Datos) {
  const partes = [
    d.operacion ? (d.operacion === "arriendo" ? "Arriendo" : "Compra") : null,
    d.tipos?.length ? d.tipos.join(" o ") : null,
    [d.ciudad, ...(d.zonas ?? [])].filter(Boolean).join(", ") || null,
    d.presupuesto_max ? `hasta ${pesos(d.presupuesto_max)}` : null,
    d.parqueaderos ? `${d.parqueaderos} parqueadero${d.parqueaderos > 1 ? "s" : ""}` : null,
    d.para_cuando ? `para ${d.para_cuando}` : null,
    d.financiacion ? d.financiacion : null,
  ].filter(Boolean);
  return partes.join(" · ");
}

async function crearRequerimiento(admin: SupabaseClient, c: Conversacion): Promise<{ cliente_id: string; requerimiento_id: string } | null> {
  const d = c.datos;
  const esAgente = c.rol === "agente";
  const nombre = (d.nombre || c.nombre_perfil || "Comprador por WhatsApp").trim();
  const { data: cl, error: ec } = await admin
    .from("clientes")
    .insert({
      organization_id: ORG_ID,
      nombre: esAgente ? `Cliente de ${nombre}${d.inmobiliaria ? ` (${d.inmobiliaria})` : ""}` : nombre,
      whatsapp: esAgente ? null : numeroLocal(c.numero),
      urgencia: d.urgencia ?? null,
      credito_aprobado: /aprobad/i.test(d.financiacion ?? ""),
      notas: esAgente ? `Requerimiento de un agente por WhatsApp (${numeroLocal(c.numero)}).` : "Llegó por el asistente de WhatsApp.",
    })
    .select("id")
    .single();
  if (ec || !cl) return null;
  const preferencias = [d.preferencias, d.no_quiere?.length ? `No quiere: ${d.no_quiere.join(", ")}.` : null].filter(Boolean).join(" ");
  const { data: rq, error: er } = await admin
    .from("requerimientos")
    .insert({
      organization_id: ORG_ID,
      cliente_id: cl.id,
      titulo: `${d.operacion === "arriendo" ? "Arriendo" : "Compra"}: ${(d.tipos ?? ["inmueble"]).join(" o ")} en ${[d.ciudad, ...(d.zonas ?? [])].filter(Boolean).slice(0, 3).join(", ") || "la Sabana"}`,
      presupuesto_min: d.presupuesto_min ?? null,
      presupuesto_max: d.presupuesto_max ?? null,
      ciudad: d.ciudad ?? null,
      zonas: d.zonas ?? null,
      habitaciones: d.habitaciones ?? null,
      parqueaderos: d.parqueaderos ?? null,
      tipo_inmueble: d.tipos?.[0] ?? null,
      preferencias: preferencias || null,
      financiacion: d.financiacion ?? null,
      urgencia: d.urgencia ?? null,
      observaciones: `Lo alimenta el buscador de portales. ${d.operacion === "arriendo" ? "ARRIENDO. " : ""}${d.para_cuando ? `Para: ${d.para_cuando}.` : ""}`.trim(),
      estado: "activo",
    })
    .select("id")
    .single();
  if (er || !rq) return null;
  return { cliente_id: cl.id, requerimiento_id: rq.id };
}

// ── Reacciones a las opciones del portafolio ──
async function aplicarReacciones(admin: SupabaseClient, c: Conversacion, lista: { token: string; opciones: Opcion[] }, reacciones: Decision["reacciones"]) {
  const interesan: Opcion[] = [];
  for (const r of reacciones) {
    const o = lista.opciones.find((x) => x.numero === Number(r.opcion));
    if (!o) continue;
    await admin
      .from("portafolio_items")
      .update({
        reaccion: r.interesa ? "interesa" : "no_interesa",
        reaccion_at: new Date().toISOString(),
        estatus: r.interesa ? "le gustó" : "no le gustó",
        estatus_updated_at: new Date().toISOString(),
      })
      .eq("id", o.item_id)
      .select("id");
    if (r.interesa) interesan.push(o);
  }
  const nombre = c.datos.nombre || c.nombre_perfil || numeroLocal(c.numero);
  for (const o of interesan) {
    const borrador = `Hola, soy Laura, de KYRELO. Tengo un comprador verificado interesado en tu inmueble ${o.titulo}${o.precio ? ` (${pesos(o.precio)})` : ""}. ¿Lo compartimos y coordinamos una visita? Trabajamos con comisión compartida por escrito.`;
    await avisarLauraBotones(
      [
        `<b>Le interesa a ${escaparHtml(nombre)}</b> (WhatsApp ${escaparHtml(numeroLocal(c.numero))})`,
        `Opción ${o.numero}: ${escaparHtml(o.titulo)}${o.precio ? ` · ${pesos(o.precio)}` : ""}${o.inmobiliaria ? `\nPublica: ${escaparHtml(o.inmobiliaria)}` : ""}`,
        "",
        "Mensaje listo para el agente del aviso (cópialo):",
        `<code>${escaparHtml(borrador)}</code>`,
      ].join("\n"),
      [[...(o.url ? [{ text: "Ver aviso", url: o.url }] : []), { text: "Portafolio", url: `${SITIO}/p/${lista.token}` }]]
    );
  }
}

/**
 * Atiende un mensaje que no es un pedido de video. El webhook ya guardó el mensaje en
 * whatsapp_mensajes (así no se atiende dos veces). Nunca lanza error.
 */
export async function atenderPersona(admin: SupabaseClient, m: MensajeWa, nombrePerfil: string) {
  const numero = String(m.from ?? "").replace(/\D/g, "");
  if (!numero) return;
  try {
    const c = await cargar(admin, numero, nombrePerfil);
    const ahora = new Date().toISOString();
    const { texto, aviso } = await textoDe(m);
    if (!texto) {
      if (aviso && c.etapa !== "pausado") await enviarTexto(numero, aviso);
      return;
    }
    const historial: Mensaje[] = [...(c.historial ?? []), { de: "persona", texto, en: ahora }];

    // Laura tomó la conversación: el asistente solo escucha
    if (c.etapa === "pausado") {
      await guardar(admin, c, { historial, ultimo_mensaje_en: ahora } as Partial<Conversacion>);
      return;
    }

    // Autorización de datos: el primer mensaje del asistente la pide; si la persona sigue escribiendo, la dio
    const autorizo = c.autorizo_datos || (c.historial ?? []).some((h) => h.de === "bot");
    const lista = c.cliente_id ? await opcionesDe(admin, c.cliente_id) : null;
    const d = await decidir({ ...c, historial }, lista?.opciones ?? null);

    if (!d) {
      await enviarTexto(numero, "Dame un momento, ya te respondo por aquí.");
      await guardar(admin, c, { historial, ultimo_mensaje_en: ahora, autorizo_datos: autorizo } as Partial<Conversacion>);
      await avisarLaura(`<b>WhatsApp: el asistente no pudo responder</b>\nDe ${escaparHtml(nombrePerfil || numeroLocal(numero))} (${escaparHtml(numeroLocal(numero))}): «${escaparHtml(texto.slice(0, 300))}»\nRespóndele tú desde el celular.`);
      return;
    }

    const datos: Datos = { ...(c.datos ?? {}), ...d.datos };
    const rol = d.rol ?? c.rol;
    let etapa: Etapa = c.etapa === "nuevo" ? "datos" : c.etapa;
    let clienteId = c.cliente_id;
    let requerimientoId = c.requerimiento_id;
    let respuesta = d.respuesta;

    // Primer mensaje del asistente: lleva la autorización de datos (Ley 1581)
    if (!(c.historial ?? []).some((h) => h.de === "bot")) {
      respuesta += `\n\nAl seguir escribiendo autorizas a KYRELO a usar tus datos para atenderte y buscarte opciones (${POLITICA}). Si no quieres más mensajes, escribe «no más».`;
    }

    if (d.no_mas) {
      etapa = "pausado";
      respuesta = "Listo, no te escribo más. Si quieres retomar, escríbeme por aquí.";
      await avisarLaura(`<b>WhatsApp:</b> ${escaparHtml(nombrePerfil || numeroLocal(numero))} (${escaparHtml(numeroLocal(numero))}) pidió que no le escribamos más.`);
    }

    // El comprador (o el cliente del agente) entra a la plataforma
    if (!d.no_mas && d.requerimiento_completo && !requerimientoId && (rol === "comprador" || rol === "agente") && autorizo) {
      const creado = await crearRequerimiento(admin, { ...c, rol, datos });
      if (creado) {
        clienteId = creado.cliente_id;
        requerimientoId = creado.requerimiento_id;
        etapa = "buscando";
        await avisarLauraBotones(
          [
            `<b>Nuevo ${rol === "agente" ? "requerimiento de un agente" : "comprador"} por WhatsApp</b>`,
            `${escaparHtml(datos.nombre || nombrePerfil || "Sin nombre")} · ${escaparHtml(numeroLocal(numero))}${datos.inmobiliaria ? ` · ${escaparHtml(datos.inmobiliaria)}` : ""}`,
            escaparHtml(resumenDatos(datos)),
            datos.no_quiere?.length ? `No quiere: ${escaparHtml(datos.no_quiere.join(", "))}` : "",
            "",
            "Ya quedó en la plataforma. El buscador lo toma en la próxima corrida (/buscar-inmuebles).",
          ]
            .filter((l) => l !== "")
            .join("\n"),
          [[{ text: "Ver requerimiento", url: `${SITIO}/requerimientos/${creado.requerimiento_id}` }]]
        );
      }
    }

    if (lista && d.reacciones.length) await aplicarReacciones(admin, { ...c, datos }, lista, d.reacciones);

    if (!d.no_mas && d.pasar_a_laura) {
      etapa = "pausado";
      const ultimos = historial.slice(-6).map((h) => `${h.de === "persona" ? "Persona" : "Bot"}: ${escaparHtml(h.texto.slice(0, 200))}`).join("\n");
      await avisarLauraBotones(
        [
          `<b>WhatsApp: te paso a ${escaparHtml(datos.nombre || nombrePerfil || numeroLocal(numero))}</b> (${escaparHtml(numeroLocal(numero))})`,
          `Quién: ${rol ?? "no sé todavía"} · Motivo: ${escaparHtml(d.motivo_laura ?? "pidió hablar con una persona")}`,
          rol === "propietario" && datos.inmueble ? `Inmueble: ${escaparHtml(JSON.stringify(datos.inmueble).slice(0, 300))}` : "",
          "",
          ultimos,
          "",
          "El asistente queda callado en esta conversación. Respóndele tú desde el celular; cuando termines, toca «Retomar el bot».",
        ]
          .filter((l) => l !== "")
          .join("\n"),
        [[{ text: "Retomar el bot", callback_data: `wa_bot:${numero}` }]]
      );
    }

    const envio = await enviarTexto(numero, respuesta);
    if (envio.ok) historial.push({ de: "bot", texto: respuesta, en: new Date().toISOString() });
    await guardar(admin, c, {
      historial,
      rol,
      etapa,
      datos,
      cliente_id: clienteId,
      requerimiento_id: requerimientoId,
      autorizo_datos: autorizo,
      ultimo_mensaje_en: ahora,
    } as Partial<Conversacion>);
  } catch (e) {
    await avisarLaura(
      `<b>WhatsApp: el asistente falló</b>\nDe ${escaparHtml(numeroLocal(numero))}: ${escaparHtml(String((e as Error)?.message ?? e)).slice(0, 300)}\nRespóndele tú desde el celular.`
    );
  }
}

/** Laura devuelve la conversación al asistente (botón «Retomar el bot» en Telegram). */
export async function retomarBot(admin: SupabaseClient, numero: string): Promise<boolean> {
  const { data } = await admin.from("wa_conversaciones").select("requerimiento_id").eq("numero", numero).maybeSingle();
  if (!data) return false;
  const { data: upd } = await admin
    .from("wa_conversaciones")
    .update({ etapa: data.requerimiento_id ? "buscando" : "datos", actualizado_en: new Date().toISOString() })
    .eq("numero", numero)
    .select("numero");
  return !!upd && upd.length > 0;
}

/**
 * Cuando Laura aprueba una opción en Telegram, el comprador recibe por WhatsApp el enlace de su
 * portafolio. Dentro de las 24 horas va un mensaje normal; después, la plantilla aprobada
 * (WHATSAPP_PLANTILLA_PORTAFOLIO, con 2 variables: nombre y enlace).
 */
export async function avisarPortafolio(admin: SupabaseClient, clienteId: string, token: string, nuevas: number): Promise<Envio> {
  const { data: conv } = await admin.from("wa_conversaciones").select("numero, nombre_perfil, datos, historial").eq("cliente_id", clienteId).maybeSingle();
  let para = conv?.numero ?? null;
  let nombre = primerNombre((conv?.datos as Datos | null)?.nombre || conv?.nombre_perfil);
  if (!para) {
    const { data: cl } = await admin.from("clientes").select("nombre, whatsapp").eq("id", clienteId).maybeSingle();
    para = cl?.whatsapp ? numeroInternacional(cl.whatsapp) : null;
    nombre = nombre || primerNombre(cl?.nombre);
  }
  if (!para) return { ok: false, mensaje: "el comprador no tiene WhatsApp" };
  const enlace = `${SITIO}/p/${token}`;
  const texto =
    `Hola${nombre ? ` ${nombre}` : ""}, ${nuevas === 1 ? "tienes una opción nueva" : `tienes ${nuevas} opciones nuevas`} en tu portafolio KYRELO: ${enlace}\n\n` +
    "Respóndeme por aquí cuál te interesa (por ejemplo «me interesa la 2») o qué no te gustó, y ajusto la búsqueda.";
  let r = await enviarTexto(para, texto);
  if (!r.ok && r.codigo === FUERA_DE_VENTANA) {
    const plantilla = process.env.WHATSAPP_PLANTILLA_PORTAFOLIO;
    if (!plantilla) return { ok: false, codigo: r.codigo, mensaje: "pasaron más de 24 horas desde su último mensaje y no hay plantilla (WHATSAPP_PLANTILLA_PORTAFOLIO)" };
    r = await enviarPlantilla(para, plantilla, [nombre || "hola", enlace], process.env.WHATSAPP_PLANTILLA_IDIOMA || "es");
  }
  if (r.ok && conv) {
    const historial = [...((conv.historial as Mensaje[]) ?? []), { de: "bot" as const, texto, en: new Date().toISOString() }].slice(-MAX_HISTORIAL);
    await admin.from("wa_conversaciones").update({ historial, actualizado_en: new Date().toISOString() }).eq("numero", conv.numero).select("numero");
  }
  return r;
}
