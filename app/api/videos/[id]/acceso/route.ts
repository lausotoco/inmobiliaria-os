// /api/videos/[id]/acceso?k=… · el enlace que Laura le manda al agente sin cuenta
// por WhatsApp. Si la firma es correcta, este navegador recuerda el video y lo abre.

import { NextRequest, NextResponse } from "next/server";
import { enlaceValido, esUuid, guardarEnlace, origenDe } from "@/lib/videos/servidor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const origen = origenDe(req);
  const k = req.nextUrl.searchParams.get("k") ?? "";
  if (!esUuid(params.id) || !enlaceValido(params.id, k)) return NextResponse.redirect(`${origen}/video-inmueble`);
  return guardarEnlace(NextResponse.redirect(`${origen}/broker/videos/${params.id}`), params.id, k);
}
