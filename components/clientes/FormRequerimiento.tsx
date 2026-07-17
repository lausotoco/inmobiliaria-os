"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Requerimiento } from "@/lib/types";

const TIPOS = ["apartamento", "casa", "lote", "oficina", "local", "bodega", "finca"];
const URGENCIAS = ["inmediata", "1-3 meses", "+3 meses"];
const ESTADOS = ["activo", "pausado", "cumplido", "cancelado"];
const AMENIDADES_COMUNES = [
  "piscina", "gimnasio", "club house", "jacuzzi", "sauna", "turco",
  "salón social", "BBQ", "parque infantil", "cancha", "portería 24h",
  "ascensor", "terraza", "balcón", "jardín", "estudio", "cuarto útil",
  "depósito", "vigilancia", "citófono",
];

type MatchAlerta = {
  propiedad_id: string;
  score: number;
  probabilidad_cierre: number | null;
  explicacion: string;
  titulo?: string;
  barrio?: string;
  ciudad?: string;
  precio?: number;
};

type Props = {
  clienteId: string;
  requerimiento?: Requerimiento;
  datosIniciales?: Partial<Requerimiento>;
  onGuardado?: () => void;
};

export default function FormRequerimiento({
  clienteId,
  requerimiento,
  datosIniciales,
  onGuardado,
}: Props) {
  const router = useRouter();
  const esEdicion = !!requerimiento;
  const base = requerimiento ?? datosIniciales;

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amenidades, setAmenidades] = useState<string[]>(
    (base?.amenidades as string[]) ?? []
  );

  // ── Estado para auto-matching ──
  const [buscandoMatches, setBuscandoMatches] = useState(false);
  const [matchesAlerta, setMatchesAlerta] = useState<MatchAlerta[]>([]);
  const [nuevoReqId, setNuevoReqId] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  function toggleAmenidad(a: string) {
    setAmenidades((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  // ── Buscar matches automáticamente después de crear ──
  async function buscarMatchesAutomatico(requerimientoId: string) {
    setBuscandoMatches(true);
    setMatchError(null);
    try {
      const res = await fetch("/api/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requerimiento_id: requerimientoId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMatchError(data.mensaje || "No se pudo ejecutar el matching.");
        setBuscandoMatches(false);
        return;
      }

      const data = await res.json();
      const matches: MatchAlerta[] = data.matches ?? [];

      // Filtrar solo los que tienen score >= 60
      const buenos = matches.filter((m) => m.score >= 60);

      if (buenos.length > 0) {
        // Traer datos básicos de las propiedades para mostrar en la alerta
        const supabase = createClient();
        const ids = buenos.map((m) => m.propiedad_id);
        const { data: props } = await supabase
          .from("propiedades")
          .select("id, titulo, barrio, ciudad, precio")
          .in("id", ids);

        const propMap = new Map(
          (props ?? []).map((p) => [p.id, p])
        );

        const conDatos = buenos
          .map((m) => ({
            ...m,
            titulo: propMap.get(m.propiedad_id)?.titulo ?? "Propiedad",
            barrio: propMap.get(m.propiedad_id)?.barrio ?? "",
            ciudad: propMap.get(m.propiedad_id)?.ciudad ?? "",
            precio: propMap.get(m.propiedad_id)?.precio ?? 0,
          }))
          .sort((a, b) => b.score - a.score);

        setMatchesAlerta(conDatos);
      }
    } catch {
      setMatchError("Error de conexión al buscar matches.");
    } finally {
      setBuscandoMatches(false);
    }
  }

  function formatoCOP(valor: number) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setMatchesAlerta([]);
    setNuevoReqId(null);
    setMatchError(null);

    const fd = new FormData(e.currentTarget);
    const zonasTxt = (fd.get("zonas") as string) ?? "";

    const datos: Record<string, unknown> = {
      cliente_id: clienteId,
      titulo: fd.get("titulo") || null,
      presupuesto_min: fd.get("presupuesto_min")
        ? Number(fd.get("presupuesto_min"))
        : null,
      presupuesto_max: fd.get("presupuesto_max")
        ? Number(fd.get("presupuesto_max"))
        : null,
      ciudad: fd.get("ciudad") || null,
      zonas: zonasTxt
        ? zonasTxt.split(",").map((z) => z.trim()).filter(Boolean)
        : null,
      barrio: fd.get("barrio") || null,
      area_min: fd.get("area_min") ? Number(fd.get("area_min")) : null,
      area_max: fd.get("area_max") ? Number(fd.get("area_max")) : null,
      habitaciones: fd.get("habitaciones")
        ? Number(fd.get("habitaciones"))
        : null,
      banos: fd.get("banos") ? Number(fd.get("banos")) : null,
      parqueaderos: fd.get("parqueaderos")
        ? Number(fd.get("parqueaderos"))
        : null,
      tipo_inmueble: fd.get("tipo_inmueble") || null,
      amenidades: amenidades,
      preferencias: fd.get("preferencias") || null,
      urgencia: fd.get("urgencia") || null,
      observaciones: fd.get("observaciones") || null,
      estado: fd.get("estado") ?? "activo",
    };

    const supabase = createClient();

    if (esEdicion) {
      const { error: err } = await supabase
        .from("requerimientos")
        .update(datos)
        .eq("id", requerimiento.id);
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
    } else {
      // ── Insert con .select() para obtener el ID del nuevo requerimiento ──
      const { data: nuevo, error: err } = await supabase
        .from("requerimientos")
        .insert(datos)
        .select("id")
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }

      // ── Disparar matching automático en segundo plano ──
      if (nuevo?.id) {
        setNuevoReqId(nuevo.id);
        buscarMatchesAutomatico(nuevo.id);
      }
    }

    setGuardando(false);
    router.refresh();
    onGuardado?.();
  }

  const campo =
    "w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave";
  const etiqueta = "block text-sm font-medium text-tinta";

  return (
    <>
      <form onSubmit={guardar} className="space-y-8">
        {/* ── General ── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
            General
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={`sm:col-span-2 ${etiqueta}`}>
              Título del requerimiento
              <input
                name="titulo"
                defaultValue={base?.titulo ?? ""}
                className={`mt-1.5 ${campo}`}
                placeholder='Ej. "Apto para vivir con su familia en Chía"'
              />
            </label>
            <label className={etiqueta}>
              Tipo de inmueble
              <select
                name="tipo_inmueble"
                defaultValue={base?.tipo_inmueble ?? ""}
                className={`mt-1.5 ${campo}`}
              >
                <option value="">Sin definir</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className={etiqueta}>
              Estado
              <select
                name="estado"
                defaultValue={base?.estado ?? "activo"}
                className={`mt-1.5 ${campo}`}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {/* ── Presupuesto ── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
            Rango de presupuesto (COP)
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={etiqueta}>
              Mínimo
              <input
                name="presupuesto_min"
                type="number"
                defaultValue={base?.presupuesto_min ?? ""}
                className={`mt-1.5 ${campo}`}
                placeholder="200000000"
              />
            </label>
            <label className={etiqueta}>
              Máximo
              <input
                name="presupuesto_max"
                type="number"
                defaultValue={base?.presupuesto_max ?? ""}
                className={`mt-1.5 ${campo}`}
                placeholder="450000000"
              />
            </label>
          </div>
        </fieldset>

        {/* ── Ubicación ── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
            Ubicación
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={etiqueta}>
              Ciudad
              <input
                name="ciudad"
                defaultValue={base?.ciudad ?? ""}
                className={`mt-1.5 ${campo}`}
                placeholder="Bogotá, Chía…"
              />
            </label>
            <label className={etiqueta}>
              Zonas (separadas por coma)
              <input
                name="zonas"
                defaultValue={base?.zonas?.join(", ") ?? ""}
                className={`mt-1.5 ${campo}`}
                placeholder="Chía, Cajicá, Sopó"
              />
            </label>
            <label className={`sm:col-span-2 ${etiqueta}`}>
              Barrio
              <input
                name="barrio"
                defaultValue={base?.barrio ?? ""}
                className={`mt-1.5 ${campo}`}
                placeholder="Barrio preferido"
              />
            </label>
          </div>
        </fieldset>

        {/* ── Características ── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
            Características
          </legend>
          <div className="grid gap-5 sm:grid-cols-4">
            <label className={etiqueta}>
              Área mín (m²)
              <input
                name="area_min"
                type="number"
                defaultValue={base?.area_min ?? ""}
                className={`mt-1.5 ${campo}`}
              />
            </label>
            <label className={etiqueta}>
              Área máx (m²)
              <input
                name="area_max"
                type="number"
                defaultValue={base?.area_max ?? ""}
                className={`mt-1.5 ${campo}`}
              />
            </label>
            <label className={etiqueta}>
              Habitaciones
              <input
                name="habitaciones"
                type="number"
                min={0}
                defaultValue={base?.habitaciones ?? ""}
                className={`mt-1.5 ${campo}`}
              />
            </label>
            <label className={etiqueta}>
              Baños
              <input
                name="banos"
                type="number"
                min={0}
                defaultValue={base?.banos ?? ""}
                className={`mt-1.5 ${campo}`}
              />
            </label>
            <label className={etiqueta}>
              Parqueaderos
              <input
                name="parqueaderos"
                type="number"
                min={0}
                defaultValue={base?.parqueaderos ?? ""}
                className={`mt-1.5 ${campo}`}
              />
            </label>
          </div>
        </fieldset>

        {/* ── Amenidades ── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
            Amenidades
          </legend>
          <div className="flex flex-wrap gap-2">
            {AMENIDADES_COMUNES.map((a) => {
              const activa = amenidades.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenidad(a)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activa
                      ? "border-bosque bg-bosque text-white"
                      : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ── Preferencias (texto libre para la IA) ── */}
        <label className={etiqueta}>
          Preferencias (texto libre — la IA lo interpreta)
          <textarea
            name="preferencias"
            rows={3}
            defaultValue={base?.preferencias ?? ""}
            className={`mt-1.5 ${campo}`}
            placeholder="Cocina abierta, buena iluminación natural, acepta mascotas, cerca de colegios…"
          />
        </label>

        {/* ── Urgencia ── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
            Urgencia
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={etiqueta}>
              Urgencia
              <select
                name="urgencia"
                defaultValue={base?.urgencia ?? ""}
                className={`mt-1.5 ${campo}`}
              >
                <option value="">Sin definir</option>
                {URGENCIAS.map((u) => (
                  <option key={u} value={u}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {/* ── Observaciones ── */}
        <label className={etiqueta}>
          Observaciones
          <textarea
            name="observaciones"
            rows={2}
            defaultValue={base?.observaciones ?? ""}
            className={`mt-1.5 ${campo}`}
            placeholder="Cualquier detalle adicional…"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-[#F7EFEC] px-4 py-2 text-sm text-[#8E3B31]">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
          >
            {guardando
              ? "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : "Agregar requerimiento"}
          </button>
        </div>
      </form>

      {/* ── Alerta de matching automático ── */}
      {buscandoMatches && (
        <div className="mt-6 rounded-xl border border-[#E0DDD2] bg-[#F1EFE8] p-5">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1A18] border-t-transparent" />
            <p className="text-sm text-[#5F5E5A]">
              Buscando propiedades compatibles en tu banco…
            </p>
          </div>
        </div>
      )}

      {matchError && !buscandoMatches && (
        <div className="mt-6 rounded-xl border border-[#E0DDD2] bg-[#F1EFE8] p-5">
          <p className="text-sm text-[#5F5E5A]">{matchError}</p>
        </div>
      )}

      {matchesAlerta.length > 0 && !buscandoMatches && (
        <div className="mt-6 rounded-xl border border-[#E0DDD2] bg-[#F1EFE8] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5F5E5A]">
                Matches encontrados
              </p>
              <p className="mt-1 text-sm text-[#1A1A18]">
                {matchesAlerta.length} propiedad{matchesAlerta.length > 1 ? "es" : ""} de
                tu banco podrían servirle a este cliente
              </p>
            </div>
            {nuevoReqId && (
              <a
                href={`/requerimientos/${nuevoReqId}`}
                className="rounded-full bg-[#1A1A18] px-4 py-2 text-xs font-medium text-white transition hover:opacity-80"
              >
                Ver matching completo
              </a>
            )}
          </div>

          <div className="space-y-3">
            {matchesAlerta.map((m) => (
              <div
                key={m.propiedad_id}
                className="flex items-start gap-4 rounded-lg border border-[#E0DDD2] bg-white p-4"
              >
                {/* Score visual */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg font-semibold tracking-tight text-[#1A1A18]">
                    {m.score}%
                  </span>
                  <span className="text-[9px] font-medium uppercase tracking-widest text-[#5F5E5A]">
                    Match
                  </span>
                </div>

                {/* Separador */}
                <div className="hidden h-14 w-px bg-[#E0DDD2] sm:block" />

                {/* Info propiedad */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1A1A18]">
                    {m.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-[#5F5E5A]">
                    {[m.barrio, m.ciudad].filter(Boolean).join(", ")}
                    {m.precio ? ` · ${formatoCOP(m.precio)}` : ""}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#A8A69E]">
                    {m.explicacion}
                  </p>
                </div>

                {/* Probabilidad de cierre */}
                {m.probabilidad_cierre != null && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-semibold tracking-tight text-[#5F5E5A]">
                      {m.probabilidad_cierre}%
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-widest text-[#A8A69E]">
                      Cierre
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
