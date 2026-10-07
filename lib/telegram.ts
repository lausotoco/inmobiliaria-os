// Avisos de la plataforma al Telegram de Laura (bot de KYRELO).
// El token vive en Netlify (TELEGRAM_BOT_TOKEN), nunca en este archivo.
// Solo para el servidor.

const LAURA_TELEGRAM_ID = 5233569330;

export function escaparHtml(texto: string): string {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Manda un aviso a Laura. Nunca lanza error: si falla, devuelve false. */
export async function avisarLaura(
  texto: string,
  boton?: { texto: string; url: string }
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  // Telegram solo acepta botones con enlaces https (no sirve en local).
  const conBoton = boton && boton.url.startsWith("https://");
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: LAURA_TELEGRAM_ID,
        text: texto,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(conBoton
          ? { reply_markup: { inline_keyboard: [[{ text: boton!.texto, url: boton!.url }]] } }
          : {}),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
