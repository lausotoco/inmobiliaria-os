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

// Transcripción con Groq (gratis). Entender el texto con Claude (más exacto).
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
// Precios "desde" de Marketing: viven en Netlify (variable VENTAS_PRECIOS), no en este archivo público.
const VENTAS_PRECIOS = process.env.VENTAS_PRECIOS;

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
  area_min: number | null;
  area_max: number | null;
  habitaciones: number | null;
  banos: number | null;
  tipo_inmueble: string | null;
  amenidades: string[] | null;
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
 "area_min": number|null (metros cuadrados, si menciona un área o metraje),
 "area_max": number|null (m2; si dice un solo valor "unos 90 metros", ponlo en area_max),
 "habitaciones": number|null,
 "banos": number|null,
 "tipo_inmueble": "apartamento"|"casa"|"lote"|"oficina"|"local"|"bodega"|"finca"|null,
 "amenidades": string[]|null (cosas concretas que pide: "jardín","piscina","gimnasio","terraza","balcón","parqueadero","depósito","zona BBQ"…),
 "preferencias": string|null (lo cualitativo que NO es una amenidad: cocina abierta, buena luz, cerca de colegios, para mascotas, estilo…),
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

Reglas de presupuesto:
- "450 millones" -> 450000000. "mil doscientos" o "1.200 millones" -> 1200000000.
- RANGOS: "entre X y Y", "de X a Y", "X a Y millones" -> presupuesto_min = el menor, presupuesto_max = el mayor. Ejemplo: "de 900 a 1000 millones" -> presupuesto_min 900000000, presupuesto_max 1000000000.
- Un solo tope ("hasta 500") -> presupuesto_max, y presupuesto_min = null.

Reglas de EXACTITUD (muy importante):
- NUNCA inventes ni supongas datos. Si el cliente no lo dice de forma explícita, el campo va en null.
- "urgencia" SOLO se llena si el cliente da un plazo o afán concreto ("ya", "en dos meses", "antes de fin de año"). Si dice que NO tiene afán, que compraría solo si encuentra algo, o no menciona tiempos -> urgencia = null.
- Ante cualquier duda, prefiere null antes que adivinar.`;

async function entender(texto: string): Promise<Extraccion | null> {
  if (!ANTHROPIC_KEY) return null;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: PROMPT,
      messages: [
        {
          role: "user",
          content: `Transcripción del cliente:\n\n"${texto.slice(0, 8000)}"`,
        },
      ],
    }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  let contenido: string = j?.content?.[0]?.text ?? "";
  contenido = contenido.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(contenido) as Extraccion;
  } catch {
    return null;
  }
}

// ── Asistente de ventas y servicio al cliente ──
// Laura pega aquí el mensaje que le llegó y el bot le devuelve la respuesta lista para copiar.
// Sin precios ni procesos internos: los montos siempre van como [monto que confirmas tú].
const VENTAS = `Eres la asistente de ventas y servicio al cliente de KYRELO: la mejor vendedora y la mejor persona de servicio al cliente que KYRELO podría tener. Laura te pega un mensaje que le llegó (de un agente inmobiliario, una oficina, una constructora, un comprador o un propietario) y tú le escribes la respuesta lista para copiar y pegar.

Contexto por defecto: casi todos los mensajes vienen de los anuncios de KYRELO Marketing (para agentes, oficinas y constructoras). Si Laura no dice otra cosa, asume que es alguien interesado en Marketing y habla SOLO de Marketing (no menciones compradores verificados ni la Plataforma). Los mensajes salen a nombre de KYRELO (la marca), nunca de Laura.

Lo que vende KYRELO:
- KYRELO Marketing (mensualidad, mes a mes; 100% remoto: la persona graba con el celular y KYRELO hace el resto): edición de video de inmuebles, recorridos en 3D y piezas para redes. El manejo de la publicidad en redes se cobra aparte y el presupuesto de los anuncios lo paga el cliente directo a Meta. El video de muestra gratis solo se ofrece a oficinas y constructoras, no a agentes.
- KYRELO Plataforma (sin cobro por adelantado): compradores verificados para agentes y oficinas en Chía, Cajicá, Cota, Sopó y Bogotá norte. Comisión con el agente: 40% en sus primeros tres cierres y 50/50 desde el cuarto. Nunca escribas 60% para el agente ni expliques cómo se verifica a un comprador.
- KYRELO Inmobiliaria: boutique de vivienda premium en Chía, Cajicá, Cota, Sopó y Bogotá norte.

Lineamientos (no se negocian):
- Habla como KYRELO, en plural ("hacemos", "trabajamos", "te enviamos"). Nunca te presentes como Laura, como fundadora ni con nombre propio. Si hace falta firmar, firma "Equipo KYRELO". Esto da estatus.
- Tono de marca premium: seguro, breve y directo, sin efusividad. Prohibido: "qué bueno que escribiste", "qué gusto", "me encanta", "excelente pregunta", "gracias por escribirnos", "con mucho gusto te cuento", "quedo atenta", "¿qué tal?". Empieza con el nombre de la persona (si lo hay) y ve directo a lo que preguntó o a lo que KYRELO hace por ella.
- Siempre en español de Colombia (Bogotá) y tuteando con "tú" a todo el mundo, también a oficinas, constructoras y propietarios. Nunca uses "vos", "querés", "tenés" ni "usted".
- Palabras sencillas: "video" (no "reel"), "publicidad en redes" o "anuncios" (no "pauta" ni "ads"), "personas interesadas" (no "leads"). Coloquial pero profesional, cálida, cercana y segura. Sin emojis, sin "soñado" ni "exclusivo".
- Usa el nombre de la persona si aparece. Escucha antes de vender: reconoce lo que te dijo, di en una o dos frases qué hace KYRELO por ella y termina con UNA sola pregunta de cierre que pida el siguiente paso concreto ("¿cuál inmueble quieres mover primero?"), nunca "¿qué te parece?".
- Si solo saluda o es una respuesta automática corta, contesta cálido y con una pregunta fácil.
- Laura no hace llamadas: todo por mensaje o audio. Videollamada solo si la persona la pide, con dos horarios y la opción de seguir por aquí.
- Precios: nunca inventes montos. La primera vez que pregunten, di que depende de lo que incluya y pide el dato que falta para mandar la propuesta. Si insisten, usa el "desde" de la lista de precios de abajo; si no hay lista, escribe "desde [precio]". Nunca des descuentos: si les parece caro, se reduce lo que incluye.
- No prometas ventas, compradores ni plazos. Si alguien no es el público, responde con amabilidad y llévalo a lo que sí le sirve.

Formato de tu respuesta (texto plano, sin markdown ni asteriscos):
CORTA:
(2 a 4 líneas)

LARGA:
(4 a 7 líneas)

PARA AUDIO:
(guion de 30 a 45 segundos para leer en voz alta, como se habla, sin listas ni símbolos)

MEJOR: (texto o audio, y por qué, en una línea)
SIGUIENTE PASO: (una línea: qué hacer cuando responda)`;

const MODELO_VENTAS = process.env.VENTAS_MODELO || "claude-sonnet-4-6"; // calidad; si falla o tarda, responde Haiku
const MODELO_RAPIDO = "claude-haiku-4-5-20251001";

async function llamarClaude(modelo: string, system: string, messages: { role: string; content: string }[], ms: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY ?? "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: modelo, max_tokens: 1100, system, messages }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const out: string = (j?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("").trim();
    return out || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function asistenteVentas(texto: string, previo?: string): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;
  const messages = previo
    ? [
        { role: "user", content: "Mensaje anterior que te pedí responder." },
        { role: "assistant", content: previo.slice(0, 6000) },
        { role: "user", content: texto.slice(0, 6000) },
      ]
    : [{ role: "user", content: texto.slice(0, 6000) }];
  const system = VENTAS + (VENTAS_PRECIOS ? `\n\nLista de precios "desde" (solo para conversaciones privadas): ${VENTAS_PRECIOS}` : "");
  return (await llamarClaude(MODELO_VENTAS, system, messages, 30000)) ?? (await llamarClaude(MODELO_RAPIDO, system, messages, 20000));
}

// Texto plano (sin HTML) y partido en trozos de menos de 4.000 caracteres, el límite de Telegram.
async function enviarPlano(chatId: number, texto: string) {
  for (let i = 0; i < texto.length; i += 3900) {
    await tg("sendMessage", { chat_id: chatId, text: texto.slice(i, i + 3900) });
  }
}

// ── Puntaje transparente a partir de los 5 criterios (0..100) ──
function puntuar(c: Criterios) {
  // La financiación es el mejor predictor de cierre: pesa más que el resto.
  let score = 0;
  if (c.financiacion_resuelta) score += 30;
  if (c.urgencia_real) score += 25;
  if (c.presupuesto_claro) score += 20;
  if (c.sabe_que_y_donde) score += 15;
  if (c.contacto_directo) score += 10;
  if (c.solo_mirando) score = Math.min(score, 20); // "solo mirando" lo baja a banda D
  // Solo la banda A (75 o más) se publica a brokers.
  const nivel = score >= 75 ? "A" : score >= 50 ? "B" : score >= 25 ? "C" : "D";
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

      // Checklist de pendientes: cada toque marca o desmarca la tarea.
      // No guarda nada en la base: el estado vive en los mismos botones.
      if (data.startsWith("chk:")) {
        type Boton = { text: string; callback_data?: string };
        const filas: Boton[][] = cb.message?.reply_markup?.inline_keyboard ?? [];
        const nuevas = filas.map((fila) =>
          fila.map((b) =>
            b.callback_data === data
              ? { ...b, text: b.text.startsWith("✅") ? b.text.replace(/^✅/, "⬜️") : b.text.replace(/^⬜️/, "✅") }
              : b
          )
        );
        await tg("editMessageReplyMarkup", {
          chat_id: chatId,
          message_id: cb.message?.message_id,
          reply_markup: { inline_keyboard: nuevas },
        });
        return NextResponse.json({ ok: true });
      }

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
            area_min: ext.area_min,
            area_max: ext.area_max,
            habitaciones: ext.habitaciones,
            banos: ext.banos,
            tipo_inmueble: ext.tipo_inmueble,
            amenidades: ext.amenidades ?? [],
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
          `Probabilidad de cierre: <b>Banda ${nivel}</b> (${score}/100)` +
          (nivel === "A" ? "" : "\nNo se publica a brokers: solo la banda A (75 o más).") +
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

        // Texto sin nada pendiente → asistente de ventas (o ayuda si es /start)
        if (texto === "/start" || texto === "/ayuda") {
          await enviar(
            chatId,
            "Hola Laura.\n\n• <b>Pega el mensaje que te llegó</b> (y si quieres, quién es: «agente de Bucaramanga, me escribió: …») y te devuelvo la respuesta lista para copiar.\n• Para ajustarla, <b>responde a mi mensaje</b>: «más corto», «ahora dijo que está caro»…\n• <b>Nota de voz de un comprador</b>: te la ordeno con su probabilidad de cierre."
          );
          return NextResponse.json({ ok: true });
        }
        await tg("sendChatAction", { chat_id: chatId, action: "typing" });
        const previo: string | undefined = msg.reply_to_message?.from?.is_bot ? msg.reply_to_message?.text : undefined;
        const respuesta = await asistenteVentas(texto, previo);
        if (!respuesta) {
          await enviar(chatId, "No pude redactar la respuesta en este momento. Intenta de nuevo en un minuto.");
          return NextResponse.json({ ok: true });
        }
        await enviarPlano(chatId, respuesta);
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
