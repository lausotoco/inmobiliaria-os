// /api/videos/[id]/vista-previa · enlace de la vista previa que vence en 60 s.
// Solo con sesión iniciada y solo para el agente del video o el equipo interno.
// La vista previa es un archivo aparte, en baja calidad y con marca de agua:
// el video final nunca sale de la carpeta privada antes del pago.

import { NextRequest } from "next/server";
import { BUCKET_ENTREGAS, cargarVideo, fallo, sesion, sinCache } from "@/lib/videos/servidor";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await sesion();
  if (s instanceof Response) return s;
  const video = await cargarVideo(s, params.id);
  if (!video) return fallo(404, "No encontramos este video.");
  const visible = ["vista_previa", "desbloqueado"].includes(video.estado) || s.esInterno;
  if (!visible || !video.ruta_vista_previa) return fallo(409, "La vista previa todavía no está lista.");

  const { data, error } = await s.admin.storage.from(BUCKET_ENTREGAS).createSignedUrl(video.ruta_vista_previa, 60);
  if (error || !data) return fallo(500, "No se pudo cargar la vista previa. Recarga la página.");
  return sinCache({ url: data.signedUrl });
}
