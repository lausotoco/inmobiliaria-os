// Video por inmueble · ayudas del servidor (rutas /api/videos y /api/wompi).
// El agente solo lee lo suyo en la base; todo cambio pasa por aquí, con el
// cliente de servicio, después de revisar quién pide y en qué estado está.

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET_TOMAS = "videos-tomas";
export const BUCKET_ENTREGAS = "videos-entregas";

export type Sesion = {
  userId: string;
  email: string;
  /** Cuándo se creó la cuenta (para avisar a Laura de agentes nuevos). */
  creadoEn: string | null;
  esInterno: boolean;
  perfil: { nombre: string | null; empresa: string | null; telefono: string | null } | null;
  admin: SupabaseClient;
  /** Huella del navegador que empezó videos sin cuenta (ver invitadoActual). */
  invitado: string | null;
};

/** Quien pide, con o sin cuenta. Sin cuenta solo puede llenar su propio borrador. */
export type Visitante = Omit<Sesion, "userId"> & { userId: string | null };

export function fallo(status: number, mensaje: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: mensaje, ...(extra ?? {}) }, { status });
}

export function sinCache(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });
}

// ── Empezar sin cuenta ──
// El agente puede llenar la ficha y subir su video sin registrarse. El
// navegador guarda una llave al azar (cookie que solo lee el servidor) y en la
// base queda su huella cifrada; al pedir la vista previa crea la cuenta y el
// borrador pasa a su nombre (reclamarBorradores).
export const COOKIE_INVITADO = "kv_invitado";
const DIAS_COOKIE_INVITADO = 30;
/** Un borrador sin cuenta que nadie toca en este tiempo se borra con sus archivos. */
const HORAS_BORRADOR_INVITADO = 24;

const huella = (prefijo: string, valor: string) => createHash("sha256").update(`${prefijo}:${valor}`).digest("hex");

/** La llave del navegador, si ya empezó un video sin cuenta. */
export function tokenInvitado(): string | null {
  const t = cookies().get(COOKIE_INVITADO)?.value ?? "";
  return /^[A-Za-z0-9_-]{32,64}$/.test(t) ? t : null;
}

export function invitadoActual(): string | null {
  const t = tokenInvitado();
  return t ? huella("kv-invitado", t) : null;
}

export const huellaInvitado = (token: string) => huella("kv-invitado", token);
export const nuevoTokenInvitado = () => randomBytes(32).toString("base64url");

export function guardarCookieInvitado(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_INVITADO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_COOKIE_INVITADO * 86400,
  });
  return res;
}

/** Huella de la conexión (para frenar a quien abra muchos borradores seguidos). */
export function huellaRed(req: NextRequest): string | null {
  const ip = (req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return ip ? huella("kv-red", ip) : null;
}

/** Quién está pidiendo, con o sin cuenta. Error si no tiene cuenta ni borrador. */
export async function visitante(): Promise<Visitante | NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const invitado = invitadoActual();
  if (!user && !invitado) return fallo(401, "Inicia sesión para continuar.", { entrar: true });
  const admin = createAdminClient();
  if (!admin) return fallo(500, "Falta configurar el servidor. Avísale a KYRELO.");
  if (!user) return { userId: null, email: "", creadoEn: null, esInterno: false, perfil: null, admin, invitado };
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre, empresa, telefono, rol")
    .eq("id", user.id)
    .maybeSingle();
  return {
    userId: user.id,
    email: user.email ?? "",
    creadoEn: user.created_at ?? null,
    esInterno: !!perfil && perfil.rol !== "broker",
    perfil: perfil
      ? { nombre: perfil.nombre ?? null, empresa: perfil.empresa ?? null, telefono: perfil.telefono ?? null }
      : null,
    admin,
    invitado,
  };
}

/** Quién está pidiendo. Devuelve una respuesta de error si no hay sesión. */
export async function sesion(): Promise<Sesion | NextResponse> {
  const v = await visitante();
  if (v instanceof Response) return v;
  const { userId } = v;
  if (!userId) return fallo(401, "Inicia sesión para continuar.", { entrar: true });
  return { ...v, userId };
}

/** Pasa a la cuenta del agente los borradores que empezó sin cuenta en este navegador. */
export async function reclamarBorradores(s: Visitante): Promise<string[]> {
  if (!s.userId || !s.invitado) return [];
  const { data } = await s.admin
    .from("videos_inmueble")
    .update({ agente_id: s.userId, invitado_hash: null })
    .eq("invitado_hash", s.invitado)
    .is("agente_id", null)
    .eq("estado", "borrador")
    .select("id");
  return (data ?? []).map((v) => v.id as string);
}

/**
 * Borra los borradores sin cuenta abandonados y sus archivos, para cuidar el
 * espacio gratis. Corre cuando alguien empieza un video sin cuenta y cuando
 * Laura abre su panel.
 */
export async function limpiarInvitados(admin: SupabaseClient) {
  const limite = new Date(Date.now() - HORAS_BORRADOR_INVITADO * 3600000).toISOString();
  const { data: viejos } = await admin
    .from("videos_inmueble")
    .select("id")
    .is("agente_id", null)
    .lt("updated_at", limite)
    .limit(20);
  for (const v of viejos ?? []) {
    const { data: tomas } = await admin.from("tomas_inmueble").select("ruta, partes").eq("video_id", v.id);
    await borrarArchivos(admin, BUCKET_TOMAS, (tomas ?? []).flatMap((t) => archivosDeToma(t)));
    const { data: logos } = await admin.storage.from(BUCKET_TOMAS).list(`invitados/${v.id}/marca`, { limit: 50 });
    await borrarArchivos(admin, BUCKET_TOMAS, (logos ?? []).map((l) => `invitados/${v.id}/marca/${l.name}`));
    await admin.from("videos_inmueble").delete().eq("id", v.id).is("agente_id", null).select("id");
  }
}

/** Carpetas de los archivos de un video: las del agente, o las de invitados si aún no tiene cuenta. */
export function carpetasDe(video: { id: string; agente_id: string | null }) {
  return video.agente_id
    ? { tomas: `${video.agente_id}/${video.id}`, marca: `${video.agente_id}/marca` }
    : { tomas: `invitados/${video.id}`, marca: `invitados/${video.id}/marca` };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (v: string) => UUID.test(v);

/**
 * Carga un video si quien pide es su agente, del equipo interno o el navegador
 * que lo empezó sin cuenta. Si ese navegador ya entró con su cuenta, el
 * borrador pasa a su nombre aquí mismo.
 */
export async function cargarVideo(s: Visitante, id: string) {
  if (!esUuid(id)) return null;
  const { data } = await s.admin.from("videos_inmueble").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const delNavegador = !data.agente_id && !!s.invitado && data.invitado_hash === s.invitado;
  if (delNavegador && s.userId) {
    await reclamarBorradores(s);
    // Se vuelve a leer: si otra pestaña lo reclamó primero, igual queda a su nombre
    const { data: suyo } = await s.admin.from("videos_inmueble").select("*").eq("id", id).maybeSingle();
    return suyo && suyo.agente_id === s.userId ? (suyo as Record<string, any>) : null;
  }
  if (s.esInterno || delNavegador || (!!s.userId && data.agente_id === s.userId)) return data as Record<string, any>;
  return null;
}

/**
 * Cambia el estado solo si el video sigue en uno de los estados esperados.
 * Así dos clics seguidos (o dos pestañas) no pisan un cambio.
 */
export async function cambiarVideo(
  admin: SupabaseClient,
  id: string,
  desde: string[],
  cambios: Record<string, unknown>
) {
  const { data, error } = await admin
    .from("videos_inmueble")
    .update(cambios)
    .eq("id", id)
    .in("estado", desde)
    .select();
  if (error) return { ok: false as const, mensaje: error.message };
  if (!data || data.length === 0) return { ok: false as const, mensaje: "El video cambió de estado. Recarga la página." };
  return { ok: true as const, video: data[0] as Record<string, any> };
}

/** Comprueba que un archivo exista en la carpeta y devuelve su peso real. */
export async function pesoArchivo(admin: SupabaseClient, bucket: string, ruta: string): Promise<number | null> {
  const corte = ruta.lastIndexOf("/");
  const carpeta = ruta.slice(0, corte);
  const nombre = ruta.slice(corte + 1);
  const { data, error } = await admin.storage.from(bucket).list(carpeta, { search: nombre, limit: 10 });
  if (error || !data) return null;
  const archivo = data.find((a) => a.name === nombre);
  if (!archivo) return null;
  const tam = Number((archivo.metadata as any)?.size ?? 0);
  return Number.isFinite(tam) ? tam : 0;
}

/** Archivos reales de una toma: uno solo, o las partes del recorrido completo. */
export function archivosDeToma(t: { ruta: string; partes?: number | null }): string[] {
  const n = Number(t.partes ?? 0);
  if (n > 0) return Array.from({ length: n }, (_, i) => `${t.ruta}.part${String(i + 1).padStart(3, "0")}`);
  return [t.ruta];
}

export async function borrarArchivos(admin: SupabaseClient, bucket: string, rutas: (string | null | undefined)[]) {
  const limpias = rutas.filter((r): r is string => !!r);
  if (limpias.length === 0) return;
  await admin.storage.from(bucket).remove(limpias);
}

/** Recalcula cuánto pesan las tomas de un video (para cuidar el espacio gratis). */
export async function recalcularPesoTomas(admin: SupabaseClient, videoId: string) {
  const { data } = await admin.from("tomas_inmueble").select("tamano").eq("video_id", videoId);
  const total = (data ?? []).reduce((s, t) => s + Number(t.tamano ?? 0), 0);
  await admin.from("videos_inmueble").update({ peso_tomas: total }).eq("id", videoId).select("id");
  return total;
}

/** Peso de la vista previa y los finales (todos viven en `entregas`). */
export function pesoEntregas(entregas: Record<string, { tamano?: number } | null | undefined>): number {
  return Object.values(entregas ?? {}).reduce((s, e) => s + Number(e?.tamano ?? 0), 0);
}

const SITIO = "https://kyrelocorp.com";

/**
 * Dirección pública del sitio (enlaces de Telegram y regreso de Wompi).
 * Solo se acepta un host conocido, para que nadie cuele un enlace falso
 * en los avisos cambiando la cabecera de su petición.
 */
export function origenDe(req: NextRequest | Request): string {
  const h = req.headers;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  if (host === "kyrelocorp.com" || host === "www.kyrelocorp.com") return `https://${host}`;
  return SITIO;
}

export function nombreAgente(perfil?: { nombre?: string | null; empresa?: string | null } | null, email?: string) {
  return perfil?.nombre?.trim() || perfil?.empresa?.trim() || email || "Agente";
}
