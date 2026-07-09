"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/lib/types";

const ESTADOS = ["activo", "en pausa", "cerrado", "perdido"];
const URGENCIAS = ["inmediata", "1-3 meses", "+3 meses"];
const FINANCIACIONES = ["crédito aprobado", "en trámite", "recursos propios"];

type Props = {
  cliente?: Cliente;
};

export default function FormCliente({ cliente }: Props) {
  const router = useRouter();
  const esEdicion = !!cliente;

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const datos: Record<string, unknown> = {
      nombre: fd.get("nombre"),
      cedula: fd.get("cedula") || null,
      whatsapp: fd.get("whatsapp") || null,
      email: fd.get("email") || null,
      ciudad: fd.get("ciudad") || null,
      estado: fd.get("estado"),
      urgencia: fd.get("urgencia") || null,
      probabilidad_cierre: fd.get("probabilidad_cierre")
        ? Number(fd.get("probabilidad_cierre"))
        : null,
      credito_aprobado: fd.get("credito_aprobado") === "on",
      banco: fd.get("banco") || null,
      inicial_disponible: fd.get("inicial_disponible")
        ? Number(fd.get("inicial_disponible"))
        : null,
      notas: fd.get("notas") || null,
    };

    const supabase = createClient();

    if (esEdicion) {
      const { error: err } = await supabase
        .from("clientes")
        .update(datos)
        .eq("id", cliente.id);
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      router.push(`/clientes/${cliente.id}`);
    } else {
      const { data, error: err } = await supabase
        .from("clientes")
        .insert(datos)
        .select("id")
        .single();
      if (err) {
        setError(err.message);
        setGuardando(false);
        return;
      }
      router.push(`/clientes/${data.id}`);
    }

    router.refresh();
  }

  const campo =
    "w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave";
  const etiqueta = "block text-sm font-medium text-tinta";

  return (
    <form onSubmit={guardar} className="max-w-2xl space-y-8">
      {/* ── Información personal ── */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Información personal
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={etiqueta}>
            Nombre *
            <input
              name="nombre"
              required
              defaultValue={cliente?.nombre ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="Nombre completo"
            />
          </label>
          <label className={etiqueta}>
            Cédula (opcional)
            <input
              name="cedula"
              defaultValue={cliente?.cedula ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="Número de documento"
            />
          </label>
          <label className={etiqueta}>
            WhatsApp
            <input
              name="whatsapp"
              defaultValue={cliente?.whatsapp ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="+57 300 123 4567"
            />
          </label>
          <label className={etiqueta}>
            Correo
            <input
              name="email"
              type="email"
              defaultValue={cliente?.email ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="correo@ejemplo.com"
            />
          </label>
          <label className={etiqueta}>
            Ciudad
            <input
              name="ciudad"
              defaultValue={cliente?.ciudad ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="Bogotá, Chía, Cajicá…"
            />
          </label>
        </div>
      </fieldset>

      {/* ── Estado y urgencia ── */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Estado y urgencia
        </legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className={etiqueta}>
            Estado
            <select
              name="estado"
              defaultValue={cliente?.estado ?? "activo"}
              className={`mt-1.5 ${campo}`}
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className={etiqueta}>
            Urgencia
            <select
              name="urgencia"
              defaultValue={cliente?.urgencia ?? ""}
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
          <label className={etiqueta}>
            Probabilidad de cierre (%)
            <input
              name="probabilidad_cierre"
              type="number"
              min={0}
              max={100}
              defaultValue={cliente?.probabilidad_cierre ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="0-100"
            />
          </label>
        </div>
      </fieldset>

      {/* ── Financiación ── */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Financiación
        </legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="flex items-center gap-3 text-sm text-tinta sm:col-span-3">
            <input
              name="credito_aprobado"
              type="checkbox"
              defaultChecked={cliente?.credito_aprobado ?? false}
              className="size-4 rounded border-linea text-bosque accent-bosque"
            />
            Crédito aprobado
          </label>
          <label className={etiqueta}>
            Banco
            <input
              name="banco"
              defaultValue={cliente?.banco ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="Bancolombia, Davivienda…"
            />
          </label>
          <label className={etiqueta}>
            Inicial disponible (COP)
            <input
              name="inicial_disponible"
              type="number"
              defaultValue={cliente?.inicial_disponible ?? ""}
              className={`mt-1.5 ${campo}`}
              placeholder="50000000"
            />
          </label>
        </div>
      </fieldset>

      {/* ── Notas ── */}
      <label className={etiqueta}>
        Notas
        <textarea
          name="notas"
          rows={3}
          defaultValue={cliente?.notas ?? ""}
          className={`mt-1.5 ${campo}`}
          placeholder="Cualquier observación importante sobre este cliente…"
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
              : "Crear cliente"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-linea bg-superficie px-5 py-2.5 text-sm text-neutro transition hover:bg-fondo"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
