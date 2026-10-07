// Wompi · desbloqueo del video por inmueble. Solo para el servidor.
//
// Llaves y precio en Netlify (nunca en este archivo, que es público):
//   WOMPI_PUBLIC_KEY        pub_test_… (pruebas) o pub_prod_… (real)
//   WOMPI_PRIVATE_KEY       prv_test_… o prv_prod_… (para consultar un pago)
//   WOMPI_INTEGRITY_SECRET  test_integrity_… o prod_integrity_…
//   WOMPI_EVENTS_SECRET     test_events_… o prod_events_…
//   VIDEO_PRECIO_DESBLOQUEO precio en pesos, solo números (sin puntos ni signo)
//
// Regla: el video solo se desbloquea con un aviso verificado de Wompi
// (evento firmado o consulta servidor a servidor), nunca por lo que diga
// el navegador.

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarLaura, escaparHtml } from "@/lib/telegram";
import { formatoCOP } from "@/lib/utils";
import { codigoVideo, tituloVideo, type Ficha } from "@/lib/videos/config";

export type ConfigWompi = {
  publica: string;
  privada: string | null;
  integridad: string;
  eventos: string | null;
  precio: number;
  prueba: boolean;
  api: string;
};

export function precioDesbloqueo(): number | null {
  const n = Number(String(process.env.VIDEO_PRECIO_DESBLOQUEO ?? "").replace(/\D/g, ""));
  return n > 0 ? n : null;
}

/** null si falta alguna llave: la plataforma ofrece pagar por WhatsApp. */
export function configWompi(): ConfigWompi | null {
  const publica = process.env.WOMPI_PUBLIC_KEY?.trim();
  const integridad = process.env.WOMPI_INTEGRITY_SECRET?.trim();
  const precio = precioDesbloqueo();
  if (!publica || !integridad || !precio) return null;
  const prueba = publica.startsWith("pub_test_");
  return {
    publica,
    privada: process.env.WOMPI_PRIVATE_KEY?.trim() || null,
    integridad,
    eventos: process.env.WOMPI_EVENTS_SECRET?.trim() || null,
    precio,
    prueba,
    api: prueba ? "https://sandbox.wompi.co/v1" : "https://production.wompi.co/v1",
  };
}

const sha256 = (texto: string) => crypto.createHash("sha256").update(texto).digest("hex");

function igualesSeguro(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function nuevaReferencia(videoId: string): string {
  const azar = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `KV-${videoId.replace(/-/g, "").slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}${azar}`;
}

/** Enlace del checkout web de Wompi, con la firma de integridad. */
export function urlCheckout(
  cfg: ConfigWompi,
  datos: { referencia: string; centavos: number; regreso: string; email?: string; nombre?: string }
): string {
  const firma = sha256(`${datos.referencia}${datos.centavos}COP${cfg.integridad}`);
  const p = new URLSearchParams();
  p.set("public-key", cfg.publica);
  p.set("currency", "COP");
  p.set("amount-in-cents", String(datos.centavos));
  p.set("reference", datos.referencia);
  p.set("signature:integrity", firma);
  p.set("redirect-url", datos.regreso);
  if (datos.email) p.set("customer-data:email", datos.email);
  if (datos.nombre) p.set("customer-data:full-name", datos.nombre);
  return `https://checkout.wompi.co/p/?${p.toString()}`;
}

/** Revisa la firma de un evento de Wompi (cabecera X-Event-Checksum o signature.checksum). */
export function eventoValido(cuerpo: any, secreto: string, cabecera?: string | null): boolean {
  const props: unknown = cuerpo?.signature?.properties;
  const checksum: string = cabecera || cuerpo?.signature?.checksum || "";
  if (!Array.isArray(props) || !checksum || cuerpo?.timestamp == null) return false;
  const valores = props.map((ruta) =>
    String(ruta)
      .split(".")
      .reduce<any>((obj, clave) => (obj == null ? obj : obj[clave]), cuerpo.data)
  );
  if (valores.some((v) => v === undefined || v === null)) return false;
  const calculado = sha256(valores.join("") + String(cuerpo.timestamp) + secreto);
  return igualesSeguro(calculado, checksum);
}

/** Consulta una transacción servidor a servidor (respaldo si el evento tarda). */
export async function consultarTransaccion(cfg: ConfigWompi, id: string): Promise<any | null> {
  if (!/^[\w-]{6,80}$/.test(id)) return null;
  try {
    const r = await fetch(`${cfg.api}/transactions/${encodeURIComponent(id)}`, {
      headers: cfg.privada ? { Authorization: `Bearer ${cfg.privada}` } : {},
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data ?? null;
  } catch {
    return null;
  }
}

const ESTADOS: Record<string, string> = {
  APPROVED: "aprobado",
  DECLINED: "rechazado",
  VOIDED: "anulado",
  ERROR: "error",
  PENDING: "pendiente",
};

/**
 * Aplica una transacción de Wompi: actualiza el pago y, si quedó aprobada con
 * el monto correcto, desbloquea el video. Se puede llamar varias veces con la
 * misma transacción sin efectos dobles.
 */
export async function aplicarTransaccion(
  admin: SupabaseClient,
  tx: any,
  ambiente: string | null,
  origen: string
): Promise<{ ok: boolean; estado?: string; mensaje?: string }> {
  const referencia = String(tx?.reference ?? "");
  if (!referencia) return { ok: false, mensaje: "Transacción sin referencia." };

  const { data: pago } = await admin.from("pagos").select("*").eq("referencia", referencia).maybeSingle();
  if (!pago) return { ok: false, mensaje: "Referencia desconocida." };
  if (pago.estado === "aprobado") return { ok: true, estado: "aprobado" };

  let estado = ESTADOS[String(tx?.status ?? "")] ?? "pendiente";
  const montoCorrecto =
    Number(tx?.amount_in_cents) === Number(pago.monto) * 100 && String(tx?.currency ?? "COP") === pago.moneda;
  if (estado === "aprobado" && !montoCorrecto) estado = "error";

  const { data: actualizado } = await admin
    .from("pagos")
    .update({
      estado,
      transaccion_id: tx?.id ? String(tx.id) : pago.transaccion_id,
      medio: tx?.payment_method_type ?? pago.medio,
      ambiente: ambiente ?? pago.ambiente,
      detalle: { status: tx?.status ?? null, monto_centavos: tx?.amount_in_cents ?? null, moneda: tx?.currency ?? null },
      aprobado_en: estado === "aprobado" ? new Date().toISOString() : null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", pago.id)
    .neq("estado", "aprobado")
    .select();
  if (!actualizado || actualizado.length === 0) return { ok: true, estado: "aprobado" }; // otro aviso ya lo aplicó

  if (estado === "error" && !montoCorrecto && tx?.status === "APPROVED") {
    await avisarLaura(
      `<b>Pago con monto distinto</b>\nReferencia ${escaparHtml(referencia)}: Wompi aprobó ${escaparHtml(
        String(tx?.amount_in_cents)
      )} centavos y se esperaban ${pago.monto * 100}. El video NO se desbloqueó. Revisa en Wompi.`
    );
    return { ok: false, estado, mensaje: "El monto no coincide." };
  }
  if (estado !== "aprobado") return { ok: true, estado };

  // Pago aprobado: desbloquear el video
  const ahora = new Date().toISOString();
  const { data: videos } = await admin
    .from("videos_inmueble")
    .update({ estado: "desbloqueado", metodo: "pago", pago_id: pago.id, desbloqueado_en: ahora })
    .eq("id", pago.video_id)
    .eq("estado", "vista_previa")
    .select("id, ficha, agente_id");

  const { data: video } = await admin
    .from("videos_inmueble")
    .select("id, ficha, estado, metodo, pago_id, agente_id")
    .eq("id", pago.video_id)
    .maybeSingle();
  const { data: perfil } = video
    ? await admin.from("profiles").select("nombre, empresa, email").eq("id", video.agente_id).maybeSingle()
    : { data: null };
  const agente = escaparHtml(perfil?.nombre || perfil?.empresa || perfil?.email || "Agente");
  const titulo = escaparHtml(video ? tituloVideo((video.ficha ?? {}) as Ficha) : "video");
  const codigo = video ? codigoVideo(video.id) : "";
  const enlace = video ? `${origen}/videos/${video.id}` : `${origen}/videos`;

  if (videos && videos.length > 0) {
    await avisarLaura(
      `<b>Pago aprobado · ${formatoCOP(pago.monto)}</b>\n${agente} desbloqueó ${codigo}\n${titulo}` +
        (ambiente === "test" ? "\n<i>(pago de prueba)</i>" : ""),
      { texto: "Ver en el panel", url: enlace }
    );
  } else {
    // Se pagó un video que ya no estaba en vista previa (doble pago o descartado)
    await avisarLaura(
      `<b>Revisar pago</b>\n${agente} pagó ${formatoCOP(pago.monto)} por ${codigo} (${titulo}), pero el video estaba en estado «${escaparHtml(
        video?.estado ?? "sin video"
      )}». Si es un pago doble, toca devolverlo desde Wompi.`,
      { texto: "Ver en el panel", url: enlace }
    );
  }
  return { ok: true, estado: "aprobado" };
}
