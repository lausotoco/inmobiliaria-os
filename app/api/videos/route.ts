// /api/videos · lista y creación de videos por inmueble.
//  GET            → los videos del agente que pide
//  GET ?panel=1   → todos (solo equipo interno), con agente, pagos y espacio usado
//  POST           → crea un video nuevo en borrador, con la marca del último.
//                   Sin cuenta: abre (o retoma) el borrador de este navegador;
//                   la cuenta se crea al pedir la vista previa.

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fallo,
  guardarCookieInvitado,
  huellaInvitado,
  huellaRed,
  limpiarInvitados,
  nuevoTokenInvitado,
  reclamarBorradores,
  sesion,
  sinCache,
  tokenInvitado,
} from "@/lib/videos/servidor";
import { precioDesbloqueo } from "@/lib/videos/wompi";
import type { Ficha } from "@/lib/videos/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await sesion();
  if (s instanceof Response) return s;

  if (req.nextUrl.searchParams.get("panel") === "1") {
    if (!s.esInterno) return fallo(403, "Solo para el equipo de KYRELO.");
    await limpiarInvitados(s.admin);
    const [{ data: videos }, { data: pagos }] = await Promise.all([
      s.admin
        .from("videos_inmueble")
        .select("id, agente_id, ficha, estilo, voz_en_off, estado, motivo_rechazo, enviado_at, edicion_at, vista_previa_at, desbloqueado_en, metodo, peso_tomas, peso_entregas, tomas_borradas_at, created_at, updated_at, tomas_inmueble(count)")
        .neq("estado", "borrador")
        .order("updated_at", { ascending: false })
        .limit(300),
      s.admin
        .from("pagos")
        .select("id, video_id, agente_id, referencia, monto, estado, medio, ambiente, creado_en, aprobado_en")
        .order("creado_en", { ascending: false })
        .limit(100),
    ]);
    const { data: borradores } = await s.admin
      .from("videos_inmueble")
      .select("id, peso_tomas")
      .eq("estado", "borrador");
    const ids = Array.from(
      new Set([...(videos ?? []).map((v) => v.agente_id), ...(pagos ?? []).map((p) => p.agente_id)].filter(Boolean))
    );
    const { data: perfiles } = ids.length
      ? await s.admin.from("profiles").select("id, nombre, empresa, telefono, email").in("id", ids)
      : { data: [] as any[] };
    const pesoBorradores = (borradores ?? []).reduce((t, b) => t + Number(b.peso_tomas ?? 0), 0);
    const pesoTotal =
      (videos ?? []).reduce((t, v) => t + Number(v.peso_tomas ?? 0) + Number(v.peso_entregas ?? 0), 0) + pesoBorradores;
    return sinCache({
      videos: videos ?? [],
      pagos: pagos ?? [],
      perfiles: perfiles ?? [],
      borradores: (borradores ?? []).length,
      pesoTotal,
      precio: precioDesbloqueo(),
    });
  }

  // Lo que empezó sin cuenta en este navegador pasa a su lista
  await reclamarBorradores(s);
  const { data } = await s.admin
    .from("videos_inmueble")
    .select("id, ficha, estado, motivo_rechazo, enviado_at, vista_previa_at, desbloqueado_en, created_at, updated_at, tomas_inmueble(count)")
    .eq("agente_id", s.userId)
    .order("created_at", { ascending: false });
  return sinCache({ videos: data ?? [], precio: precioDesbloqueo() });
}

/** Borradores sin cuenta que se pueden abrir desde una misma conexión en 24 horas. */
const MAX_BORRADORES_POR_RED = 4;

export async function POST(req: NextRequest) {
  const s = await sesion();
  if (s instanceof Response) return s.status === 401 ? crearSinCuenta(req) : s;

  // La marca del agente (nombre, WhatsApp, logo y colores) se copia de su
  // último video para que no la vuelva a escribir.
  const { data: ultimo } = await s.admin
    .from("videos_inmueble")
    .select("ficha")
    .eq("agente_id", s.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const previa = (ultimo?.ficha ?? {}) as Ficha;
  const ficha: Ficha = {
    nombre_marca: previa.nombre_marca || s.perfil?.empresa || s.perfil?.nombre || "",
    whatsapp: previa.whatsapp || s.perfil?.telefono || "",
    logo_ruta: previa.logo_ruta ?? null,
    color_principal: previa.color_principal || "#1A1A18",
    color_secundario: previa.color_secundario || "#B87333",
    diferenciales: ["", "", ""],
  };

  const { data, error } = await s.admin
    .from("videos_inmueble")
    .insert({ agente_id: s.userId, ficha, estilo: "directo" })
    .select("id");
  if (error || !data || data.length === 0) return fallo(500, "No se pudo crear el video. Inténtalo de nuevo.");
  return sinCache({ id: data[0].id });
}

/** Video sin cuenta: retoma el borrador de este navegador o abre uno nuevo. */
async function crearSinCuenta(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) return fallo(500, "Falta configurar el servidor. Avísale a KYRELO.");
  await limpiarInvitados(admin);

  const token = tokenInvitado() ?? nuevoTokenInvitado();
  const invitado = huellaInvitado(token);
  const { data: abierto } = await admin
    .from("videos_inmueble")
    .select("id")
    .eq("invitado_hash", invitado)
    .is("agente_id", null)
    .eq("estado", "borrador")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (abierto) return guardarCookieInvitado(sinCache({ id: abierto.id, sin_cuenta: true }), token);

  const red = huellaRed(req);
  if (red) {
    const { count } = await admin
      .from("videos_inmueble")
      .select("id", { count: "exact", head: true })
      .eq("invitado_red", red)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if ((count ?? 0) >= MAX_BORRADORES_POR_RED)
      return fallo(429, "Ya empezaste varios videos desde esta conexión. Entra o crea tu cuenta para seguir.", { entrar: true });
  }

  const ficha: Ficha = { color_principal: "#1A1A18", color_secundario: "#B87333", diferenciales: ["", "", ""] };
  const { data, error } = await admin
    .from("videos_inmueble")
    .insert({ agente_id: null, invitado_hash: invitado, invitado_red: red, ficha, estilo: "directo" })
    .select("id");
  if (error || !data || data.length === 0) return fallo(500, "No se pudo crear el video. Inténtalo de nuevo.");
  return guardarCookieInvitado(sinCache({ id: data[0].id, sin_cuenta: true, nuevo: true }), token);
}
