// Motor automático de video por inmueble. Corre en GitHub (proyecto privado lausotoco/kyrelo-motor-video):
// cuando el agente envía su material, la plataforma lo dispara; el motor edita, sube las entregas y avisa a
// /api/videos/motor. El video NO se publica solo: Laura lo mira y toca «Aprobar» en Telegram.
// Llaves en Netlify: GITHUB_MOTOR_TOKEN (para disparar) y MOTOR_SECRETO (el motor lo manda al avisar).
// Sin GITHUB_MOTOR_TOKEN todo sigue como antes: Laura edita a mano.
import { timingSafeEqual } from "crypto";

const REPO_MOTOR = "lausotoco/kyrelo-motor-video";

/** Pide a GitHub que edite el video. Nunca lanza error: dice si arrancó y, si no, por qué. */
export async function dispararMotor(id: string): Promise<{ ok: boolean; motivo?: string }> {
  const token = process.env.GITHUB_MOTOR_TOKEN;
  if (!token) return { ok: false, motivo: "falta la variable GITHUB_MOTOR_TOKEN en Netlify" };
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO_MOTOR}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: "pedido", client_payload: { id } }),
    });
    if (r.status === 204) return { ok: true };
    if (r.status === 401) return { ok: false, motivo: "GitHub no aceptó el token (GITHUB_MOTOR_TOKEN vencido o mal copiado)" };
    if (r.status === 403 || r.status === 404)
      return { ok: false, motivo: "el token no tiene permiso sobre kyrelo-motor-video (Contents: Read and write)" };
    return { ok: false, motivo: `GitHub respondió ${r.status}` };
  } catch {
    return { ok: false, motivo: "no hubo conexión con GitHub" };
  }
}

/** El motor se identifica con el secreto compartido (MOTOR_SECRETO, igual en Netlify y en GitHub). */
export function secretoMotorValido(dado: string | null): boolean {
  const esperado = process.env.MOTOR_SECRETO;
  if (!esperado || !dado || dado.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(dado), Buffer.from(esperado));
}

/** Tope de gasto de Claude del motor en el mes (dólares). Al pasar la mitad, Laura recibe un aviso. */
export function limiteMotorUsd(): number {
  const n = Number(process.env.LIMITE_MOTOR_USD ?? "15");
  return Number.isFinite(n) && n > 0 ? n : 15;
}

/** Enlace de WhatsApp con el mensaje para el agente (número colombiano de 10 dígitos). */
export function enlaceWhatsapp(numero: string | null | undefined, texto: string): string | null {
  const n = String(numero ?? "").replace(/\D/g, "");
  const completo = n.length === 10 ? `57${n}` : n.length === 12 && n.startsWith("57") ? n : null;
  return completo ? `https://wa.me/${completo}?text=${encodeURIComponent(texto)}` : null;
}
