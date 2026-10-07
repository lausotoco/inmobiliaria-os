// /api/videos/[id]/pago · desbloqueo con Wompi.
//  POST → crea el pago y devuelve el enlace del checkout de Wompi
//  PUT  → { transaccion }: al volver de Wompi, consulta la transacción
//         servidor a servidor y desbloquea si quedó aprobada. Es un respaldo:
//         el aviso firmado de Wompi (/api/wompi/eventos) hace lo mismo.

import { NextRequest } from "next/server";
import { cargarVideo, fallo, nombreAgente, origenDe, sesion, sinCache } from "@/lib/videos/servidor";
import { aplicarTransaccion, configWompi, consultarTransaccion, nuevaReferencia, urlCheckout } from "@/lib/videos/wompi";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const s = await sesion();
  if (s instanceof Response) return s;
  const video = await cargarVideo(s, params.id);
  if (!video || video.agente_id !== s.userId) return fallo(404, "No encontramos este video.");
  if (video.estado === "desbloqueado") return fallo(409, "Este video ya está desbloqueado.");
  if (video.estado !== "vista_previa") return fallo(409, "Podrás pagar cuando la vista previa esté lista.");
  const cfg = configWompi();
  if (!cfg) return fallo(503, "El pago en línea todavía no está activo. Escríbenos por WhatsApp para desbloquearlo.");

  const referencia = nuevaReferencia(video.id);
  const { data, error } = await s.admin
    .from("pagos")
    .insert({
      agente_id: s.userId,
      video_id: video.id,
      concepto: "desbloqueo_video",
      referencia,
      monto: cfg.precio,
      ambiente: cfg.prueba ? "test" : "prod",
    })
    .select("id");
  if (error || !data || data.length === 0) return fallo(500, "No se pudo iniciar el pago. Inténtalo de nuevo.");

  const url = urlCheckout(cfg, {
    referencia,
    centavos: cfg.precio * 100,
    regreso: `${origenDe(req)}/broker/videos/${video.id}`,
    email: s.email || undefined,
    nombre: nombreAgente(s.perfil, "") || undefined,
  });
  return sinCache({ url });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const s = await sesion();
  if (s instanceof Response) return s;
  const video = await cargarVideo(s, params.id);
  if (!video) return fallo(404, "No encontramos este video.");
  const cfg = configWompi();
  if (!cfg) return fallo(503, "El pago en línea no está activo.");

  const cuerpo = await req.json().catch(() => ({}));
  const tx = await consultarTransaccion(cfg, String(cuerpo.transaccion ?? ""));
  if (!tx) return sinCache({ estado: "pendiente" });

  // La transacción debe ser de un pago de ESTE video
  const { data: pago } = await s.admin
    .from("pagos")
    .select("id, video_id")
    .eq("referencia", String(tx.reference ?? ""))
    .maybeSingle();
  if (!pago || pago.video_id !== video.id) return fallo(400, "Ese pago no corresponde a este video.");

  const r = await aplicarTransaccion(s.admin, tx, cfg.prueba ? "test" : "prod", origenDe(req));
  return sinCache({ estado: r.estado ?? "pendiente" });
}
