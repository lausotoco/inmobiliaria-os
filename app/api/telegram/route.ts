import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── Datos NO secretos (pueden vivir aquí sin problema) ──
const ORG_ID = "00000000-0000-0000-0000-000000000001"; // Mi Inmobiliaria
const LAURA_TELEGRAM_ID = 5233569330; // el bot solo le responde a Laura

// ── Llaves (viven en Netlify, JAMÁS en este archivo) ──
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Modelo de Groq que entiende el texto. Si algún día hace falta cambiarlo,
// es solo esta línea (alternativa: "llama-3.1-8b-instant").
const GROQ_LLM_MODEL = "llama-3.3-70b-versatile";

function admin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// ── Helpers de Telegram ──
async function tg(method: string, body: Record<string, unknown>) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function enviar(chatId: number, texto: string, teclado?: unknown) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: texto,
    parse_mode: "HTML",
    ...(teclado ? { reply_markup: teclado } : {}),
  });
}

async function descargarAudio(fileId: string): Promise<Blob | null> {
  if (!TELEGRAM_TOKEN) return null;
  const r = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`
  );
  const j = await r.json();
  const filePath = j?.result?.file_path;
  if (!filePath) return null;
  const fr = await fetch(
    `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`
  );
  if (!fr.ok) return null;
  return await fr.blob();
}

// ── Transcribir con Groq (gratis) ──
async function transcribir(audio: Blob): Promise<string | null> {
  if (!GROQ_KEY) return null;
  const form = new FormData();
  form.append("file", audio, "audio.ogg");
  form.append("model", "whisper-large-v3");
  form.append("language", "es");
  const r = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}` },
      body: form,
    }
  );
  if (!r.ok) return null;
  const j = await r.json();
  const texto = (j?.text ?? "").trim();
  return texto.length > 5 ? texto : null;
}

// ── Entender + puntuar con Groq (gratis) ──
type Criterios = {
  presupuesto_claro: boolean;
  financiacion_resuelta: boolean;
  urgencia_real: boolean;
  sabe_que_y_donde: boolean;
  contacto_directo: boolean;
  solo_mirando: boolean;
};

type Extraccion = {
  titulo: string | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  ciudad: string | null;
  zonas: string[] | null;
  barrio: string | null;
  habitaciones: number | null;
  banos: number | null;
  tipo_inmueble: string | null;
  preferencias: string | null;
  financiacion: string | null;
  urgencia: string | null;
  observaciones: string | null;
  nombre_cliente: string | null;
  criterios: Criterios;
};

const PROMPT = `Eres un asistente inmobiliario colombiano para la Sabana de Bogotá. A partir de la transcripción de una nota de voz donde un comprador describe lo que busca, devuelve SOLO un JSON válido (sin markdown, sin texto extra). Si un dato no se menciona, ponlo en null.

{
 "titulo": "resumen corto, ej: 'Apto para su familia en Chía'",
 "presupuesto_min": number|null (pesos colombianos, sin formato),
 "presupuesto_max": number|null,
 "ciudad": string|null,
 "zonas": string[]|null (zonas o municipios),
 "barrio": string|null,
 "habitaciones": number|null,
 "banos": number|null,
 "tipo_inmueble": "apartamento"|"casa"|"lote"|"oficina"|"local"|"bodega"|"finca"|null,
 "preferencias": string|null (lo cualitativo),
 "financiacion": string|null ("crédito aprobado"|"en trámite"|"recursos propios"),
 "urgencia": "inmediata"|"1-3 meses"|"+3 meses"|null,
 "observaciones": string|null (contexto útil),
 "nombre_cliente": string|null (solo si la persona dice su nombre en el audio),
 "criterios": {
   "presupuesto_claro": boolean (dio un rango realista, no vago),
   "financiacion_resuelta": boolean (paga de contado o crédito preaprobado),
   "urgencia_real": boolean (fecha o motivo concreto para comprar pronto),
   "sabe_que_y_donde": boolean (zona, tipo y alcobas específicos),
   "contacto_directo": boolean (es quien decide, va en serio),
   "solo_mirando": boolean (dijo que solo está mirando, sin afán)
 }
}

Reglas de presupuesto: "450 millones" -> 450000000. "mil doscientos" -> 1200000000. Si dice "hasta 500", es presupuesto_max.`;

async function entender(texto: string): Promise<Extraccion | null> {
  if (!GROQ_KEY) return null;
  const r = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_LLM_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: `Transcripción:\n\n"${texto.slice(0, 6000)}"` },
        ],
      }),
    }
  );
  if (!r.ok) return null;
  const j = await r.json();
  let contenido: string = j?.choices?.[0]?.message?.content ?? "";
  contenido = contenido.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(contenido) as Extraccion;
  } catch {
    return null;
  }
}

// ── Puntaje transparente a partir de los 5 criterios (0..100) ──
function puntuar(c: Criterios) {
  const activos = [
    c.presupuesto_claro,
    c.financiacion_resuelta,
    c.urgencia_real,
    c.sabe_que_y_donde,
    c.contacto_directo,
  ].filter(Boolean).length;
  let score = activos * 20;
  if (c.solo_mirando) score = Math.min(score, 20); // "solo mirando" lo baja a Baja
  const nivel = score >= 80 ? "Alta" : score >= 40 ? "Media" : "Baja";
  return { score, nivel };
}

function moneda(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return "$" + new Intl.NumberFormat("es-CO").format(n);
}

// ── Lee el formulario instantáneo de Meta (o texto suelto) ──
function parsearFormulario(texto: string) {
  const lineas = texto.split("\n");
  const val = (regex: RegExp) => {
    for (const l of lineas) {
      if (regex.test(l) && l.includes(":")) {
        return l.slice(l.indexOf(":") + 1).trim();
      }
    }
    return "";
  };
  const emailMatch = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = texto.match(/(\+?\d[\d\s-]{6,}\d)/);

  let nombre = val(/full name|nombre/i);
  if (!nombre) {
    const primera = (lineas[0] ?? "").split(",")[0].trim();
    if (/^[a-zA-ZáéíóúñÁÉÍÓÚÑ .]{3,}$/.test(primera)) nombre = primera;
  }

  return {
    nombre,
    email: val(/email|correo/i) || (emailMatch ? emailMatch[0] : ""),
    telefono:
      val(/phone|tel[eé]fono|whatsapp|celular/i) ||
      (phoneMatch ? phoneMatch[0].replace(/\s/g, "") : ""),
    otro_asesor: val(/otro asesor|asesor o inmobiliaria/i),
    zonas_form: val(/zonas?|prefieres buscar/i),
  };
}

// ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // A Telegram siempre le devolvemos 200, aunque ignoremos el mensaje.
  try {
    const update = await req.json();
    const msg = update.message;
    const cb = update.callback_query;
    const fromId = msg?.from?.id ?? cb?.from?.id;

    // Candado: el bot solo atiende a Laura.
    if (fromId !== LAURA_TELEGRAM_ID) {
      return NextResponse.json({ ok: true });
    }

    const db = admin();
    if (!db) return NextResponse.json({ ok: true });

    // ── 1. Botones (Aprobar / Descartar) ──
    if (cb) {
      const chatId: number = cb.message?.chat?.id;
      const data: string = cb.data ?? "";
      await tg("answerCallbackQuery", { callback_query_id: cb.id });

      if (data.startsWith("descartar:")) {
        const reqId = data.split(":")[1];
        const { data: r } = await db
          .from("requerimientos")
          .select("cliente_id")
          .eq("id", reqId)
          .single();
        if (r?.cliente_id) {
          await db.from("clientes").delete().eq("id", r.cliente_id);
        }
        await enviar(chatId, "Descartado. No entró a tu plataforma.");
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("aprobar:")) {
        const reqId = data.split(":")[1];
        await db
          .from("requerimientos")
          .update({ estado: "aprobando" })
          .eq("id", reqId);
        await enviar(
          chatId,
          "Listo, lo apruebo. Pásame los datos del cliente (pega el formulario de Meta tal cual, o escribe nombre, teléfono y correo) y lo registro ligado a este requerimiento."
        );
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // ── 2. Mensajes ──
    if (msg) {
      const chatId: number = msg.chat.id;
      const voice = msg.voice ?? msg.audio;

      // 2a. Nota de voz o audio
      if (voice) {
        await enviar(chatId, "Escuchando la nota…");
        const audio = await descargarAudio(voice.file_id);
        if (!audio) {
          await enviar(chatId, "No pude descargar el audio. Intenta reenviarlo.");
          return NextResponse.json({ ok: true });
        }
        const texto = await transcribir(audio);
        if (!texto) {
          await enviar(chatId, "No pude transcribir el audio. ¿Está claro y en español?");
          return NextResponse.json({ ok: true });
        }
        const ext = await entender(texto);
        if (!ext) {
          await enviar(chatId, "Transcribí el audio pero no pude ordenar los datos. Intenta de nuevo.");
          return NextResponse.json({ ok: true });
        }

        const { score, nivel } = puntuar(ext.criterios);

        // Ficha temporal del cliente (se completa al aprobar; si descartas, se borra sola)
        const { data: cli } = await db
          .from("clientes")
          .insert({
            organization_id: ORG_ID,
            nombre: ext.nombre_cliente || "Cliente sin identificar",
            estado: "activo",
          })
          .select("id")
          .single();

        if (!cli) {
          await enviar(chatId, "No pude crear la ficha. Revisa la llave de Supabase en Netlify.");
          return NextResponse.json({ ok: true });
        }

        const { data: reqRow } = await db
          .from("requerimientos")
          .insert({
            organization_id: ORG_ID,
            cliente_id: cli.id,
            titulo: ext.titulo,
            presupuesto_min: ext.presupuesto_min,
            presupuesto_max: ext.presupuesto_max,
            ciudad: ext.ciudad,
            zonas: ext.zonas,
            barrio: ext.barrio,
            habitaciones: ext.habitaciones,
            banos: ext.banos,
            tipo_inmueble: ext.tipo_inmueble,
            preferencias: ext.preferencias,
            financiacion: ext.financiacion,
            urgencia: ext.urgencia,
            observaciones: [ext.observaciones, `Transcripción: ${texto}`]
              .filter(Boolean)
              .join("\n"),
            estado: "por_revisar",
            score,
          })
          .select("id")
          .single();

        if (!reqRow) {
          await enviar(chatId, "No pude guardar el requerimiento. Intenta de nuevo.");
          return NextResponse.json({ ok: true });
        }

        const faltantes: string[] = [];
        if (!ext.presupuesto_max && !ext.presupuesto_min) faltantes.push("presupuesto");
        if (!ext.zonas || ext.zonas.length === 0) faltantes.push("zona");
        if (!ext.tipo_inmueble) faltantes.push("tipo de inmueble");
        if (!ext.habitaciones) faltantes.push("alcobas");

        const resumen =
          `<b>${ext.titulo ?? "Nuevo requerimiento"}</b>\n` +
          `Presupuesto: ${moneda(ext.presupuesto_min)}` +
          `${ext.presupuesto_max ? " – " + moneda(ext.presupuesto_max) : ""}\n` +
          `Zona: ${ext.zonas?.join(", ") || "—"}\n` +
          `Financiación: ${ext.financiacion ?? "—"}\n` +
          `Urgencia: ${ext.urgencia ?? "—"}\n\n` +
          `Probabilidad de cierre: <b>${nivel}</b> (${score}/100)` +
          (faltantes.length ? `\n\nOjo, faltó por confirmar: ${faltantes.join(", ")}.` : "");

        await enviar(chatId, resumen, {
          inline_keyboard: [
            [
              { text: "Aprobar", callback_data: `aprobar:${reqRow.id}` },
              { text: "Descartar", callback_data: `descartar:${reqRow.id}` },
            ],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // 2b. Texto: si hay un requerimiento "aprobando", este texto son los datos del cliente
      const texto = (msg.text ?? "").trim();
      if (texto) {
        const { data: pend } = await db
          .from("requerimientos")
          .select("id, cliente_id")
          .eq("organization_id", ORG_ID)
          .eq("estado", "aprobando")
          .order("updated_at", { ascending: false })
          .limit(1);

        const enCurso = pend?.[0];
        if (enCurso) {
          const datos = parsearFormulario(texto);

          const upd: Record<string, string> = {};
          if (datos.nombre) upd.nombre = datos.nombre;
          if (datos.telefono) upd.whatsapp = datos.telefono;
          if (datos.email) upd.email = datos.email;
          if (Object.keys(upd).length) {
            await db.from("clientes").update(upd).eq("id", enCurso.cliente_id);
          }

          const ref: string[] = [];
          if (datos.otro_asesor) ref.push(`Otro asesor: ${datos.otro_asesor}`);
          if (datos.zonas_form) ref.push(`Zonas (formulario): ${datos.zonas_form}`);
          if (ref.length) {
            const { data: rq } = await db
              .from("requerimientos")
              .select("observaciones")
              .eq("id", enCurso.id)
              .single();
            const obs = [rq?.observaciones, `Referencia (no puntúa): ${ref.join(" · ")}`]
              .filter(Boolean)
              .join("\n");
            await db.from("requerimientos").update({ observaciones: obs }).eq("id", enCurso.id);
          }

          await db.from("requerimientos").update({ estado: "activo" }).eq("id", enCurso.id);

          await enviar(
            chatId,
            `Cliente <b>${datos.nombre || "registrado"}</b> y requerimiento agregado, ligados en tu plataforma.` +
              (ref.length ? `\n\nPara tu referencia (no puntúa): ${ref.join(" · ")}` : "")
          );
          return NextResponse.json({ ok: true });
        }

        // Texto sin nada pendiente → ayuda
        await enviar(
          chatId,
          "Hola Laura. Reenvíame la nota de voz de un cliente y te la ordeno con su probabilidad de cierre. Cuando apruebes, pégame sus datos y lo registro."
        );
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
