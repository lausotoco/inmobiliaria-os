// /api/whatsapp · los avisos de Meta del WhatsApp de KYRELO (webhook de la API de la nube).
//  GET  → Meta comprueba la conexión (hub.verify_token = WHATSAPP_VERIFY_TOKEN)
//  POST → mensajes que llegan al número. Solo entra lo que viene firmado con la clave
//         secreta de la app (WHATSAPP_APP_SECRET). A Meta siempre se le responde 200,
//         si no, reintenta durante días.
// Qué hace con cada mensaje: lib/videos/whatsapp.ts (pedidos de video por WhatsApp).

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { firmaValida } from "@/lib/whatsapp";
import { atenderMensaje, type MensajeWa } from "@/lib/videos/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (p.get("hub.mode") === "subscribe" && esperado && p.get("hub.verify_token") === esperado)
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  return new NextResponse("No autorizado", { status: 403 });
}

export async function POST(req: NextRequest) {
  const crudo = await req.text();
  if (!firmaValida(crudo, req.headers.get("x-hub-signature-256"))) return new NextResponse("Firma no válida", { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });

  let aviso: any;
  try {
    aviso = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const telefono = process.env.WHATSAPP_PHONE_ID;
  for (const entrada of aviso?.entry ?? []) {
    for (const cambio of entrada?.changes ?? []) {
      // Solo los mensajes que llegan. Los que Laura escribe desde la app (smb_message_echoes)
      // y los estados de entrega (statuses) no se tocan.
      if (cambio?.field !== "messages") continue;
      const v = cambio.value ?? {};
      if (telefono && v.metadata?.phone_number_id && v.metadata.phone_number_id !== telefono) continue;
      const nombres = new Map<string, string>(
        (v.contacts ?? []).map((c: any) => [String(c?.wa_id ?? ""), String(c?.profile?.name ?? "")])
      );
      for (const m of (v.messages ?? []) as MensajeWa[]) {
        await atenderMensaje(admin, m, nombres.get(String(m.from)) ?? "");
      }
    }
  }
  return NextResponse.json({ ok: true });
}
