"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Propiedad } from "@/lib/types";

const ESTADOS = ["disponible", "reservada", "en negociación", "vendida"];
const AMENIDADES_COMUNES = [
  "piscina", "gimnasio", "club house", "jacuzzi", "sauna", "turco",
  "salón social", "BBQ", "parque infantil", "cancha", "portería 24h",
  "ascensor", "terraza", "balcón", "jardín", "estudio", "cuarto útil",
  "depósito", "vigilancia", "citófono",
];

type Props = {
  propiedad?: Propiedad;
  datosIniciales?: Partial<Propiedad>;
};

export default function FormPropiedad({ propiedad, datosIniciales }: Props) {
  const router = useRouter();
  const esEdicion = !!propiedad;
  const base = propiedad ?? datosIniciales;

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
    const datos: Record<string, unknown> = {
      titulo: fd.get("titulo") || null,
      codigo: fd.get("codigo") || null,
      precio: fd.get("precio") ? Number(fd.get("precio")) : null,
      area: fd.get("area") ? Number(fd.get("area")) : null,
      habitaciones: fd.get("habitaciones") ? Number(fd.get("habitaciones")) : null,
      banos: fd.get("banos") ? Number(fd.get("banos")) : null,
      parqueaderos: fd.get("parqueaderos") ? Number(fd.get("parqueaderos")) : null,
      administracion: fd.get("administracion") ? Number(fd.get("administracion")) : null,
      estrato: fd.get("estrato") ? Number(fd.get("estrato")) : null,
      descripcion: fd.get("descripcion") || null,
      amenidades,
      barrio: fd.get("barrio") || null,
      ciudad: fd.get("ciudad") || null,
      direccion: fd.get("direccion") || null,
      asesor: fd.get("asesor") || null,
      inmobiliaria: fd.get("inmobiliaria") || null,
      telefono: fd.get("telefono") || null,
      url_original: fd.get("url_original") || null,
      estado: fd.get("estado"),
    };

    const supabase = createClient();

    if (esEdicion) {
      const { error: err } = await supabase
        .from("propiedades")
        .update(datos)
        .eq("id", propiedad.id);
      if (err) { setError(err.message); setGuardando(false); return; }
      router.push(`/propiedades/${propiedad.id}`);
    } else {
      const { data, error: err } = await supabase
        .from("propiedades")
        .insert(datos)
        .select("id")
        .single();
      if (err) { setError(err.message); setGuardando(false); return; }
      router.push(`/propiedades/${data.id}`);
    }
    router.refresh();
  }

  const campo =
    "w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave";
  const etiqueta = "block text-sm font-medium text-tinta";

  return (
    <form onSubmit={guardar} className="max-w-3xl space-y-8">
      {/* General */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Información general
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={`sm:col-span-2 ${etiqueta}`}>
            Título
            <input name="titulo" defaultValue={base?.titulo ?? ""} className={`mt-1.5 ${campo}`} placeholder="Ej: Apto moderno en Chía con vista" />
          </label>
          <label className={etiqueta}>
            Código
            <input name="codigo" defaultValue={base?.codigo ?? ""} className={`mt-1.5 ${campo}`} placeholder="Código del portal o interno" />
          </label>
          <label className={etiqueta}>
            Estado
            <select name="estado" defaultValue={base?.estado ?? "disponible"} className={`mt-1.5 ${campo}`}>
              {ESTADOS.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </select>
          </label>
          <label className={`sm:col-span-2 ${etiqueta}`}>
            URL original del anuncio
            <input name="url_original" type="url" defaultValue={base?.url_original ?? ""} className={`mt-1.5 ${campo}`} placeholder="https://www.metrocuadrado.com/…" />
          </label>
        </div>
      </fieldset>

      {/* Números */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Datos del inmueble
        </legend>
        <div className="grid gap-5 sm:grid-cols-4">
          <label className={etiqueta}>
            Precio (COP)
            <input name="precio" type="number" defaultValue={base?.precio ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Área (m²)
            <input name="area" type="number" defaultValue={base?.area ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Habitaciones
            <input name="habitaciones" type="number" min={0} defaultValue={base?.habitaciones ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Baños
            <input name="banos" type="number" min={0} defaultValue={base?.banos ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Parqueaderos
            <input name="parqueaderos" type="number" min={0} defaultValue={base?.parqueaderos ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Administración (COP)
            <input name="administracion" type="number" defaultValue={base?.administracion ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Estrato
            <input name="estrato" type="number" min={1} max={6} defaultValue={base?.estrato ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
        </div>
      </fieldset>

      {/* Ubicación */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Ubicación
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={etiqueta}>
            Ciudad
            <input name="ciudad" defaultValue={base?.ciudad ?? ""} className={`mt-1.5 ${campo}`} placeholder="Bogotá, Chía…" />
          </label>
          <label className={etiqueta}>
            Barrio
            <input name="barrio" defaultValue={base?.barrio ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={`sm:col-span-2 ${etiqueta}`}>
            Dirección
            <input name="direccion" defaultValue={base?.direccion ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
        </div>
      </fieldset>

      {/* Contacto */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Contacto / Inmobiliaria
        </legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className={etiqueta}>
            Asesor
            <input name="asesor" defaultValue={base?.asesor ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Inmobiliaria
            <input name="inmobiliaria" defaultValue={base?.inmobiliaria ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
          <label className={etiqueta}>
            Teléfono
            <input name="telefono" defaultValue={base?.telefono ?? ""} className={`mt-1.5 ${campo}`} />
          </label>
        </div>
      </fieldset>

      {/* Amenidades */}
      <fieldset>
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-laton">
          Amenidades
        </legend>
        <div className="flex flex-wrap gap-2">
          {AMENIDADES_COMUNES.map((a) => {
            const activa = amenidades.includes(a);
            return (
              <button
                key={a} type="button" onClick={() => toggleAmenidad(a)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${activa ? "border-bosque bg-bosque text-white" : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"}`}
              >{a}</button>
            );
          })}
        </div>
      </fieldset>

      {/* Descripción */}
      <label className={etiqueta}>
        Descripción
        <textarea name="descripcion" rows={4} defaultValue={base?.descripcion ?? ""} className={`mt-1.5 ${campo}`} placeholder="Descripción del inmueble…" />
      </label>

      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={guardando} className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60">
          {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear propiedad"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-linea bg-superficie px-5 py-2.5 text-sm text-neutro transition hover:bg-fondo">
          Cancelar
        </button>
      </div>
    </form>
  );
}
