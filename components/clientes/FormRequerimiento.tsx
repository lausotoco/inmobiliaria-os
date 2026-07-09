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

  function toggleAmenidad(a: string) {
    setAmenidades((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

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
      const { error: err } = await supabase
        .from("requerimientos")
        .insert(datos);
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
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
  );
}
