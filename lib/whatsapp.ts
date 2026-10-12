// WhatsApp Business (API de la nube de Meta) · el número de KYRELO.
// Llaves en Netlify, JAMÁS en este archivo (el repositorio es público):
//   WHATSAPP_TOKEN          token permanente del usuario del sistema (Meta Business)
//   WHATSAPP_PHONE_ID       identificador del número en la API (no es el número)
//   WHATSAPP_APP_SECRET     clave secreta de la app de Meta (firma de los avisos)
//   WHATSAPP_VERIFY_TOKEN   palabra que se escribe en Meta al conectar el webhook
//   WHATSAPP_PLANTILLA_LISTO (opcional) plantilla aprobada para avisar después de 24 h
// Solo para el servidor.

import { createHmac, timingSafeEqual } from "crypto";

const VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v25.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;

export function whatsappConfigurado(): boolean {
  return !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_ID;
}

/** Meta firma cada aviso con la clave secreta de la app (cabecera X-Hub-Signature-256). */
export function firmaValida(cuerpo: string, cabecera: string | null): boolean {
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!secreto || !cabecera?.startsWith("sha256=")) return false;
  const esperada = createHmac("sha256", secreto).update(cuerpo, "utf8").digest("hex");
  const dada = cabecera.slice(7);
  if (dada.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(dada), Buffer.from(esperada));
}

/** "573001234567" → "3001234567" (celular colombiano). Otro país: se deja igual. */
export function numeroLocal(waId: string): string {
  const d = String(waId ?? "").replace(/\D/g, "");
  return d.length === 12 && d.startsWith("57") ? d.slice(2) : d;
}

/** "3001234567" → "573001234567" (lo que pide la API). */
export function numeroInternacional(numero: string): string | null {
  const d = String(numero ?? "").replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}

export type Envio = { ok: boolean; codigo?: number; mensaje?: string };

async function enviar(cuerpo: Record<string, unknown>): Promise<Envio> {
  const token = process.env.WHATSAPP_TOKEN;
  const telefono = process.env.WHATSAPP_PHONE_ID;
  if (!token || !telefono) return { ok: false, mensaje: "faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID en Netlify" };
  try {
    const r = await fetch(`${GRAPH}/${telefono}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...cuerpo }),
    });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => ({}));
    return { ok: false, codigo: j?.error?.code, mensaje: j?.error?.message ?? `Meta respondió ${r.status}` };
  } catch {
    return { ok: false, mensaje: "no hubo conexión con Meta" };
  }
}

/** Texto normal. Solo llega si la persona escribió en las últimas 24 horas. */
export function enviarTexto(para: string, texto: string): Promise<Envio> {
  return enviar({ to: para, type: "text", text: { body: texto.slice(0, 4096), preview_url: true } });
}

/** Mensaje con hasta 3 botones de respuesta (títulos de máximo 20 caracteres). */
export function enviarBotones(para: string, texto: string, botones: { id: string; titulo: string }[]): Promise<Envio> {
  return enviar({
    to: para,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: texto.slice(0, 1024) },
      action: {
        buttons: botones.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: b.titulo.slice(0, 20) } })),
      },
    },
  });
}

/** Plantilla aprobada en WhatsApp Manager (la única forma de escribir después de 24 horas). */
export function enviarPlantilla(para: string, nombre: string, variables: string[], idioma = "es"): Promise<Envio> {
  return enviar({
    to: para,
    type: "template",
    template: {
      name: nombre,
      language: { code: idioma },
      components: [{ type: "body", parameters: variables.map((v) => ({ type: "text", text: v.slice(0, 900) })) }],
    },
  });
}

/** Código de Meta cuando ya pasaron las 24 horas desde el último mensaje de la persona. */
export const FUERA_DE_VENTANA = 131047;
