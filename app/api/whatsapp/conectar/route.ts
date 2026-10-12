// /api/whatsapp/conectar · termina la conexión del WhatsApp de KYRELO a la API (coexistencia).
// La pantalla /whatsapp abre el registro de Meta; Laura confirma en su celular y Meta le
// devuelve a la pantalla un código. Aquí, en el servidor y en menos de 30 segundos:
//  1. se cambia el código por un token del negocio,
//  2. la app de KYRELO queda suscrita a la cuenta de WhatsApp (para recibir los mensajes),
//  3. se piden los contactos y el historial (Meta solo da 24 horas y una sola vez).
// Solo el equipo interno. No guarda ningún token.

import { NextRequest } from "next/server";
import { fallo, sesion, sinCache } from "@/lib/videos/servidor";
import { avisarLaura, escaparHtml } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GRAPH = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || "v25.0"}`;

async function graph(metodo: "GET" | "POST", ruta: string, token: string, cuerpo?: Record<string, unknown>) {
  const r = await fetch(`${GRAPH}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j: j as any };
}

export async function POST(req: NextRequest) {
  const s = await sesion();
  if (s instanceof Response) return s;
  if (!s.esInterno) return fallo(403, "Solo para el equipo de KYRELO.");
  const app = process.env.NEXT_PUBLIC_META_APP_ID;
  const secreto = process.env.WHATSAPP_APP_SECRET;
  if (!app || !secreto) return fallo(500, "Faltan NEXT_PUBLIC_META_APP_ID o WHATSAPP_APP_SECRET en Netlify.");

  const cuerpo = await req.json().catch(() => ({}));
  const code = String(cuerpo.code ?? "");
  const waba = String(cuerpo.waba_id ?? "").replace(/\D/g, "");
  if (!code || !waba) return fallo(400, "Meta no devolvió el código o la cuenta de WhatsApp. Inténtalo otra vez.");

  // 1. Código → token del negocio
  const t = await fetch(
    `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(app)}&client_secret=${encodeURIComponent(secreto)}&code=${encodeURIComponent(code)}`
  ).then((r) => r.json().catch(() => ({})));
  const token: string | undefined = t?.access_token;
  if (!token) return fallo(400, `Meta no aceptó el código: ${t?.error?.message ?? "sin detalle"}. Vuelve a tocar el botón.`);

  const pasos: string[] = [];
  // 2. Suscribir la app a la cuenta de WhatsApp
  const sub = await graph("POST", `/${waba}/subscribed_apps`, token);
  pasos.push(sub.ok ? "App suscrita a la cuenta de WhatsApp" : `No se pudo suscribir la app: ${sub.j?.error?.message ?? "error"}`);

  // El número de la cuenta (puede llegar en el mensaje de la pantalla o se busca)
  let telefono = String(cuerpo.phone_number_id ?? "").replace(/\D/g, "");
  let numero = "";
  const nums = await graph("GET", `/${waba}/phone_numbers?fields=id,display_phone_number,verified_name`, token);
  const primero = (nums.j?.data ?? []).find((n: any) => !telefono || n.id === telefono) ?? nums.j?.data?.[0];
  if (primero) {
    telefono = telefono || String(primero.id);
    numero = `${primero.display_phone_number ?? ""} (${primero.verified_name ?? ""})`;
  }
  if (!telefono) return fallo(400, "No encontré el número en la cuenta de WhatsApp.");

  const estado = await graph("GET", `/${telefono}?fields=is_on_biz_app,platform_type`, token);
  const coexistencia = estado.j?.is_on_biz_app === true && estado.j?.platform_type === "CLOUD_API";
  pasos.push(coexistencia ? "Coexistencia activa: el número sigue en tu app y ya está en la API" : `Estado del número: ${JSON.stringify(estado.j).slice(0, 160)}`);

  // 3. Contactos e historial: una sola vez y dentro de las 24 horas
  for (const tipo of ["smb_app_state_sync", "history"]) {
    const r = await graph("POST", `/${telefono}/smb_app_data`, token, { messaging_product: "whatsapp", sync_type: tipo });
    pasos.push(
      r.ok
        ? `${tipo === "history" ? "Historial" : "Contactos"}: sincronización pedida`
        : `${tipo === "history" ? "Historial" : "Contactos"}: ${r.j?.error?.message ?? "error"}`
    );
  }

  await avisarLaura(
    [`<b>WhatsApp conectado a la API</b>`, `Número: ${escaparHtml(numero)}`, `WHATSAPP_PHONE_ID = ${telefono}`, ...pasos.map((p) => `· ${escaparHtml(p)}`)].join("\n")
  );
  return sinCache({ ok: true, phone_number_id: telefono, waba_id: waba, numero, coexistencia, pasos });
}
