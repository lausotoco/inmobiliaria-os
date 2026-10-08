// /api/videos/[id]/descargas · enlaces de descarga en alta calidad.
// Solo existen después del pago (estado «desbloqueado») y vencen en 10 minutos.

import { NextRequest } from "next/server";
import { BUCKET_ENTREGAS, cargarVideo, fallo, sinCache, visitante } from "@/lib/videos/servidor";
import { ENTREGAS, NOMBRE_DESCARGA, codigoVideo, extensionDe } from "@/lib/videos/config";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const s = await visitante();
  if (s instanceof Response) return s;
  const video = await cargarVideo(s, params.id);
  if (!video) return fallo(404, "No encontramos este video.");
  if (video.estado !== "desbloqueado" && !s.esInterno) return fallo(402, "Desbloquea el video para descargarlo.");

  const entregas = (video.entregas ?? {}) as Record<string, { ruta?: string; tamano?: number }>;
  const archivos = [];
  for (const e of ENTREGAS) {
    if (e.v === "vista_previa") continue;
    const ruta = entregas[e.v]?.ruta;
    if (!ruta) continue;
    const nombre = `KYRELO-${codigoVideo(video.id)}-${NOMBRE_DESCARGA[e.v]}.${extensionDe(ruta) || "mp4"}`;
    const { data } = await s.admin.storage.from(BUCKET_ENTREGAS).createSignedUrl(ruta, 600, { download: nombre });
    if (data?.signedUrl) archivos.push({ tipo: e.v, nombre: e.l, archivo: nombre, url: data.signedUrl, tamano: entregas[e.v]?.tamano ?? null });
  }
  return sinCache({ archivos, texto_corto: video.texto_corto, texto_largo: video.texto_largo });
}
