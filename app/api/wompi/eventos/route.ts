// /api/wompi/eventos · aviso de Wompi cuando cambia una transacción.
// URL para registrar en Wompi › Desarrolladores › URL de eventos:
//   https://kyrelocorp.com/api/wompi/eventos
// Se verifica la firma con WOMPI_EVENTS_SECRET antes de tocar nada.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aplicarTransaccion, configWompi, eventoValido } from "@/lib/videos/wompi";
import { origenDe } from "@/lib/videos/servidor";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const cfg = configWompi();
  const admin = createAdminClient();
  if (!cfg?.eventos || !admin) return NextResponse.json({ error: "no configurado" }, { status: 503 });

  const cuerpo = await req.json().catch(() => null);
  if (!cuerpo || !eventoValido(cuerpo, cfg.eventos, req.headers.get("x-event-checksum"))) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }
  if (cuerpo.event !== "transaction.updated" || !cuerpo.data?.transaction) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const r = await aplicarTransaccion(admin, cuerpo.data.transaction, cuerpo.environment ?? null, origenDe(req));
  // Siempre 200 cuando la firma es válida: así Wompi no reintenta un aviso
  // que ya se procesó (o que no es de un video).
  return NextResponse.json({ ok: r.ok, estado: r.estado ?? null });
}
