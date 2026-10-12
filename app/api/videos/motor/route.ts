// El motor automático (GitHub) avisa aquí cuando terminó un video o cuando no pudo.
// Solo entra quien trae MOTOR_SECRETO. El video queda «en edición» hasta que Laura toca «Aprobar» en Telegram.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarLauraBotones, escaparHtml } from "@/lib/telegram";
import { BUCKET_ENTREGAS } from "@/lib/videos/servidor";
import { codigoVideo, tituloVideo, type Ficha } from "@/lib/videos/config";
import { limiteMotorUsd, secretoMotorValido } from "@/lib/videos/motor";

export const dynamic = "force-dynamic";

const PANEL = "https://kyrelocorp.com/videos";

export async function POST(req: NextRequest) {
  if (!secretoMotorValido(req.headers.get("x-motor-secreto")))
    return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, mensaje: "Sin conexión a la base" }, { status: 500 });

  const cuerpo = await req.json().catch(() => ({}));
  const id = String(cuerpo.id ?? "");
  const { data: video } = await admin.from("videos_inmueble").select("*").eq("id", id).maybeSingle();
  if (!video) return NextResponse.json({ ok: false, mensaje: "No existe el video" }, { status: 404 });
  const ficha = (video.ficha ?? {}) as Ficha;
  const titulo = `${codigoVideo(video.id)} · ${escaparHtml(tituloVideo(ficha))}`;

  if (cuerpo.accion === "fallo") {
    await avisarLauraBotones(
      [`<b>El motor no pudo editar ${titulo}</b>`, "Hay que hacerlo a mano en el panel.", escaparHtml(String(cuerpo.mensaje ?? "")).slice(0, 400)]
        .filter(Boolean)
        .join("\n"),
      [[{ text: "Abrir en el panel", url: `${PANEL}/${video.id}` }]]
    );
    return NextResponse.json({ ok: true });
  }

  if (cuerpo.accion !== "listo") return NextResponse.json({ ok: false, mensaje: "Acción desconocida" }, { status: 400 });

  // Vista previa para que Laura la vea desde el celular (enlace firmado, 3 días)
  let previa: string | null = null;
  if (video.ruta_vista_previa) {
    const { data } = await admin.storage.from(BUCKET_ENTREGAS).createSignedUrl(video.ruta_vista_previa, 3 * 24 * 3600);
    previa = data?.signedUrl ?? null;
  }
  const notas: string[] = Array.isArray(cuerpo.notas) ? cuerpo.notas.map(String).slice(0, 4) : [];
  const minutos = Number(cuerpo.segundos) > 0 ? Math.round(Number(cuerpo.segundos) / 60) : null;
  await avisarLauraBotones(
    [
      `<b>Video listo para aprobar · ${titulo}</b>`,
      minutos ? `El motor lo hizo en ${minutos} min.` : "",
      notas.length ? `Lo que revisó y corrigió:\n${notas.map((n) => `· ${escaparHtml(n)}`).join("\n")}` : "",
      video.wa_numero
        ? "Míralo. Si está bien, toca «Aprobar»: queda publicado y le mando la vista previa por WhatsApp (lo pidió por ahí)."
        : "Míralo. Si está bien, toca «Aprobar»: queda publicado para el agente y te doy el mensaje de WhatsApp.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    [
      ...(previa ? [[{ text: "Ver la vista previa", url: previa }]] : []),
      [{ text: "Aprobar y publicar", callback_data: `vid_ok:${video.id}` }],
      [{ text: "Abrir en el panel", url: `${PANEL}/${video.id}` }],
    ]
  );

  // Gasto de Claude del motor en el mes: aviso cuando pasa la mitad del tope
  const inicioMes = new Date();
  inicioMes.setUTCDate(1);
  inicioMes.setUTCHours(5, 0, 0, 0); // 1.º del mes, medianoche en Colombia
  const { data: delMes } = await admin.from("videos_inmueble").select("motor").gte("edicion_at", inicioMes.toISOString());
  const gasto = (delMes ?? []).reduce((s, v) => s + (Number((v.motor as any)?.costo_usd) || 0), 0);
  const antes = gasto - (Number(cuerpo.costo_usd) || 0);
  const tope = limiteMotorUsd();
  for (const corte of [0.5, 0.8, 1]) {
    if (antes < tope * corte && gasto >= tope * corte)
      await avisarLauraBotones(
        `<b>Gasto de Claude del motor: ${Math.round(corte * 100)} % del tope del mes</b>\nVan US$${gasto.toFixed(2)} de US$${tope.toFixed(0)} (unos $${Math.round(gasto * 4000).toLocaleString("es-CO")} pesos).`,
        []
      );
  }
  return NextResponse.json({ ok: true });
}
