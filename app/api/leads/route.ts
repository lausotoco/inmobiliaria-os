import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTelefono, formatearTelefono } from "@/lib/telefono";
import { enlaceWhatsApp } from "@/lib/mensaje-whatsapp";
import {
  OPCIONES_MUNICIPIO,
  OPCIONES_PRESUPUESTO,
  OPCIONES_TIPO,
  OPCIONES_PLAZO,
  VERSION_AUTORIZACION,
} from "@/lib/municipios";

/* ============================================================
   Guardado de leads de compradores (landings /casas/*)
   ------------------------------------------------------------
   Orden que importa: PRIMERO se guarda el lead, DESPUÉS se
   notifica. Si Telegram falla, el lead ya está a salvo.
   ============================================================ */

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Mismo destinatario que el bot de /api/telegram: solo Laura.
const LAURA_TELEGRAM_ID = 5233569330;

function texto(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const limpio = v.trim().slice(0, max);
  return limpio || null;
}

/** IP del visitante. En Netlify llega en x-nf-client-connection-ip. */
function ipDe(request: NextRequest): string | null {
  const nf = request.headers.get("x-nf-client-connection-ip");
  if (nf) return nf;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

async function notificar(lead: Record<string, any>) {
  if (!TELEGRAM_TOKEN) return;

  const donde =
    lead.municipio === "Varios" ? "la Sabana Norte" : lead.municipio;

  // Saludo listo para responderle en dos toques desde la notificación.
  const saludo =
    `Hola, soy Laura de KYRELO. Acabo de recibir tu requerimiento de ` +
    `casa en ${donde}. ¿Te puedo hacer un par de preguntas para empezar a buscar?`;
  const responder = enlaceWhatsApp(saludo, lead.telefono_normalizado);

  const cuerpo = [
    `🔔 <b>Requerimiento nuevo · ${lead.codigo}</b>`,
    ``,
    `<b>Municipio:</b>   ${lead.municipio}`,
    `<b>Presupuesto:</b> ${lead.presupuesto}`,
    `<b>Tipo:</b>        ${lead.tipo_inmueble}`,
    `<b>Plazo:</b>       ${lead.plazo}`,
    `<b>WhatsApp:</b>    ${formatearTelefono(lead.telefono_normalizado)}`,
    `<b>Canal:</b>       ${lead.ref_code}`,
    ``,
    `👉 <a href="${responder}">Responderle ahora</a>`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: LAURA_TELEGRAM_ID,
      text: cuerpo,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
}

export async function POST(request: NextRequest) {
  let datos: Record<string, unknown>;
  try {
    datos = await request.json();
  } catch {
    return NextResponse.json({ mensaje: "Petición inválida." }, { status: 400 });
  }

  // ── 1. Validación en el servidor (nunca confiar en el navegador) ──
  const municipio = texto(datos.municipio, 60);
  const presupuesto = texto(datos.presupuesto, 60);
  const tipo = texto(datos.tipo, 60);
  const plazo = texto(datos.plazo, 60);

  if (
    !municipio || !OPCIONES_MUNICIPIO.includes(municipio) ||
    !presupuesto || !OPCIONES_PRESUPUESTO.includes(presupuesto) ||
    !tipo || !OPCIONES_TIPO.includes(tipo) ||
    !plazo || !OPCIONES_PLAZO.includes(plazo)
  ) {
    return NextResponse.json({ mensaje: "Faltan datos del formulario." }, { status: 400 });
  }

  const telefonoOriginal = texto(datos.telefono, 40);
  const tel = normalizarTelefono(telefonoOriginal ?? "");
  if (!tel.ok) {
    return NextResponse.json({ mensaje: tel.error }, { status: 400 });
  }

  if (datos.autorizacion !== true) {
    return NextResponse.json(
      { mensaje: "Necesitamos tu autorización para poder contactarte." },
      { status: 400 }
    );
  }

  // ── 2. Guardar ──
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { mensaje: "No pudimos guardar tu requerimiento." },
      { status: 500 }
    );
  }

  const atrib = (datos.atribucion ?? {}) as Record<string, unknown>;

  const fila = {
    municipio,
    presupuesto,
    tipo_inmueble: tipo,
    plazo,
    telefono_normalizado: tel.normalizado,
    telefono_original: telefonoOriginal,

    autorizacion_aceptada: true,
    autorizacion_texto_version: VERSION_AUTORIZACION,
    autorizacion_timestamp: new Date().toISOString(),
    ip_origen: ipDe(request),

    gclid: texto(atrib.gclid, 200),
    wbraid: texto(atrib.wbraid, 200),
    gbraid: texto(atrib.gbraid, 200),
    utm_source: texto(atrib.utm_source, 120),
    utm_medium: texto(atrib.utm_medium, 120),
    utm_campaign: texto(atrib.utm_campaign, 200),
    utm_term: texto(atrib.utm_term, 200),
    utm_content: texto(atrib.utm_content, 200),
    landing_url: texto(atrib.landing_url, 1000),
    referrer: texto(atrib.referrer, 1000),
    user_agent: texto(request.headers.get("user-agent"), 500),
    canal_calculado: texto(datos.canal, 20),
    ref_code: texto(datos.refCode, 40),
  };

  const { data, error } = await supabase
    .from("leads_compradores")
    .insert(fila)
    .select("id, codigo")
    .single();

  if (error || !data) {
    console.error("leads_compradores insert:", error?.message);
    return NextResponse.json(
      { mensaje: "No pudimos guardar tu requerimiento." },
      { status: 500 }
    );
  }

  // ── 3. Notificar. Si falla, el lead ya quedó guardado. ──
  try {
    await notificar({ ...fila, codigo: data.codigo });
  } catch (e) {
    console.error("notificación Telegram:", e);
  }

  return NextResponse.json({ ok: true, codigo: data.codigo });
}
