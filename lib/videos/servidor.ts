// Video por inmueble · ayudas del servidor (rutas /api/videos y /api/wompi).
// El agente solo lee lo suyo en la base; todo cambio pasa por aquí, con el
// cliente de servicio, después de revisar quién pide y en qué estado está.

import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKET_TOMAS = "videos-tomas";
export const BUCKET_ENTREGAS = "videos-entregas";

export type Sesion = {
  userId: string;
  email: string;
  esInterno: boolean;
  perfil: { nombre: string | null; empresa: string | null; telefono: string | null } | null;
  admin: SupabaseClient;
};

export function fallo(status: number, mensaje: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: mensaje, ...(extra ?? {}) }, { status });
}

export function sinCache(cuerpo: unknown, status = 200) {
  return NextResponse.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });
}

/** Quién está pidiendo. Devuelve una respuesta de error si no hay sesión. */
export async function sesion(): Promise<Sesion | NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallo(401, "Inicia sesión para continuar.");
  const admin = createAdminClient();
  if (!admin) return fallo(500, "Falta configurar el servidor. Avísale a KYRELO.");
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre, empresa, telefono, rol")
    .eq("id", user.id)
    .maybeSingle();
  return {
    userId: user.id,
    email: user.email ?? "",
    esInterno: !!perfil && perfil.rol !== "broker",
    perfil: perfil
      ? { nombre: perfil.nombre ?? null, empresa: perfil.empresa ?? null, telefono: perfil.telefono ?? null }
      : null,
    admin,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (v: string) => UUID.test(v);

/** Carga un video si quien pide es su agente o del equipo interno. */
export async function cargarVideo(s: Sesion, id: string) {
  if (!esUuid(id)) return null;
  const { data } = await s.admin.from("videos_inmueble").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  if (!s.esInterno && data.agente_id !== s.userId) return null;
  return data as Record<string, any>;
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
