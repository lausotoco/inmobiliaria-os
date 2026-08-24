/* ============================================================
   Puente entre el motor y Supabase
   ------------------------------------------------------------
   Aquí vive lo único que toca la base de datos. Los motores
   (financiero.ts y score.ts) siguen siendo puros.
   ============================================================ */

import type { SupabaseClient } from "@supabase/supabase-js";
import { fusionarParametros, type Parametros } from "./config";
import { calcularViabilidad } from "./financiero";
import {
  calcularScore,
  horasEnResponder,
  type DatosCalificacion,
  type ResultadoScore,
} from "./score";

export type ConfigVigente = { parametros: Parametros; version: number };

/** Trae la configuración activa. Si no hay ninguna, usa la inicial. */
export async function cargarConfig(
  supabase: SupabaseClient
): Promise<ConfigVigente> {
  const { data } = await supabase
    .from("score_config")
    .select("version, parametros")
    .eq("activa", true)
    .maybeSingle();

  return {
    parametros: fusionarParametros(data?.parametros),
    version: data?.version ?? 0,
  };
}

/** Guarda una versión nueva y desactiva la anterior. Nunca edita la vieja. */
export async function guardarConfig(
  supabase: SupabaseClient,
  parametros: Parametros,
  nota: string
): Promise<{ error: string | null; version?: number }> {
  const { data: ultima } = await supabase
    .from("score_config")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (ultima?.version ?? 0) + 1;

  const { error: errDesactivar } = await supabase
    .from("score_config")
    .update({ activa: false })
    .eq("activa", true);
  if (errDesactivar) return { error: errDesactivar.message };

  const { error } = await supabase
    .from("score_config")
    .insert({ version, activa: true, parametros, nota: nota || null });

  return error ? { error: error.message } : { error: null, version };
}

/** Recalcula el score de una calificación con la configuración vigente. */
export function recalcular(
  fila: DatosCalificacion & { estado_credito: string | null },
  parametros: Parametros,
  horas_en_responder: number | null
): { resultado: ResultadoScore; viabilidad: ReturnType<typeof calcularViabilidad> } {
  const viabilidad = calcularViabilidad(
    {
      presupuesto_maximo: fila.presupuesto_maximo,
      cuota_inicial: fila.cuota_inicial,
      ingreso_familiar: fila.ingreso_familiar,
      contado: fila.estado_credito === "Compra de contado",
    },
    parametros.financieros
  );

  const resultado = calcularScore(fila, viabilidad, parametros, {
    horas_en_responder,
  });

  return { resultado, viabilidad };
}

/** Horas que tardó en responder, a partir del lead vinculado. */
export async function horasDeRespuesta(
  supabase: SupabaseClient,
  lead_id: string | null
): Promise<number | null> {
  if (!lead_id) return null;
  const { data } = await supabase
    .from("leads_compradores")
    .select("contactado_at, respondio_at")
    .eq("id", lead_id)
    .maybeSingle();
  return horasEnResponder(data?.contactado_at ?? null, data?.respondio_at ?? null);
}

/** Deja constancia en el historial. Append-only: nunca se edita ni se borra. */
export async function anotarHistorial(
  supabase: SupabaseClient,
  fila: {
    calificacion_id: string;
    cliente_id: string;
    score: number;
    banda_calculada: string;
    banda_final: string;
    desglose: unknown;
    descalificadores: unknown;
    config_version: number;
    motivo: string;
  }
) {
  await supabase.from("calificacion_historial").insert(fila);
}
