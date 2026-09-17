"use client";

// components/propiedades/PanelAgentes.tsx
// Panel en la ficha de una captación para ofrecerla a la red de agentes:
// mandato, exclusividad, % que se comparte, kit de venta, foto que verán
// los agentes (de interior, nunca fachada) y el interruptor de publicación.
// La base rechaza publicar sin mandato (constraint propiedades_publicar_requiere_mandato).

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Propiedad, PropiedadImagen } from "@/lib/types";

const ESTADOS_CAPTACION = [
  ["captado_sin_mandato", "Captado sin mandato"],
  ["en_produccion", "En producción de material"],
  ["publicado", "Publicado a agentes"],
  ["con_asociacion", "Con asociación"],
  ["en_visita", "En visita"],
  ["vendido", "Vendido"],
  ["retirado", "Retirado"],
];

function Interruptor({
  activo,
  onClick,
  deshabilitado,
}: {
  activo: boolean;
  onClick: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-pressed={activo}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${
        activo ? "bg-[#1A1A18]" : "bg-[#D9D9D3]"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-all duration-300 ${
          activo ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-linea bg-fondo px-3 py-2 text-sm text-tinta outline-none transition focus:border-[#1A1A18]";

export default function PanelAgentes({
  propiedad,
  imagenes,
  onCambio,
}: {
  propiedad: Propiedad;
  imagenes: PropiedadImagen[];
  onCambio: () => void;
}) {
  const supabase = createClient();
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tipo: propiedad.tipo ?? "",
    matricula: propiedad.matricula_inmobiliaria ?? "",
    sector: propiedad.sector ?? "",
    conjunto: propiedad.conjunto ?? "",
    area_lote: propiedad.area_lote != null ? String(propiedad.area_lote) : "",
    pct_comparte: String(Math.round(Number(propiedad.pct_comparte ?? 0.5) * 100)),
    kit_url: propiedad.kit_url ?? "",
    estado_captacion: propiedad.estado_captacion ?? "captado_sin_mandato",
  });

  if (!propiedad.es_captacion) return null;

  function urlPublica(ruta: string) {
    return supabase.storage.from("propiedades").getPublicUrl(ruta).data.publicUrl;
  }

  async function actualizar(campos: Record<string, unknown>) {
    setGuardando(true);
    setError("");
    const { error: err } = await supabase
      .from("propiedades")
      .update(campos)
      .eq("id", propiedad.id);
    setGuardando(false);
    if (err) {
      setError(
        err.message.includes("publicar_requiere_mandato")
          ? "No se puede publicar a agentes sin mandato firmado."
          : "No se pudo guardar: " + err.message
      );
      return;
    }
    onCambio();
  }

  async function guardarDatos() {
    await actualizar({
      tipo: form.tipo || null,
      matricula_inmobiliaria: form.matricula || null,
      sector: form.sector || null,
      conjunto: form.conjunto || null,
      area_lote: form.area_lote ? Number(form.area_lote) : null,
      pct_comparte: form.pct_comparte ? Number(form.pct_comparte) / 100 : 0.5,
      kit_url: form.kit_url || null,
      estado_captacion: form.estado_captacion,
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  const fotoActual = propiedad.foto_brokers_ruta ?? null;

  return (
    <div className="mt-6 rounded-xl border border-linea bg-superficie p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-tinta">Red de agentes</p>
          <p className="mt-0.5 text-xs text-neutro">
            Ofrece esta captación a los agentes: ven la tarjeta anónima y piden asociación.
          </p>
        </div>
        <Interruptor
          activo={!!propiedad.publicada_brokers}
          deshabilitado={guardando || (!propiedad.tiene_mandato && !propiedad.publicada_brokers)}
          onClick={() => actualizar({ publicada_brokers: !propiedad.publicada_brokers })}
        />
      </div>
      {!propiedad.tiene_mandato && (
        <p className="mt-2 text-[11px] text-[#8E3B31]">
          Sin mandato firmado no se puede publicar a agentes.
        </p>
      )}

      <div className="mt-5 space-y-4 border-t border-linea pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-tinta">Mandato firmado</p>
            <p className="mt-0.5 text-xs text-neutro">Requisito para publicar a agentes.</p>
          </div>
          <Interruptor
            activo={!!propiedad.tiene_mandato}
            deshabilitado={guardando}
            onClick={() =>
              actualizar({
                tiene_mandato: !propiedad.tiene_mandato,
                // Al quitar el mandato, se despublica de agentes
                ...(propiedad.tiene_mandato ? { publicada_brokers: false } : {}),
              })
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-tinta">Exclusividad KYRELO</p>
            <p className="mt-0.5 text-xs text-neutro">Se muestra como garantía en la tarjeta del agente.</p>
          </div>
          <Interruptor
            activo={!!propiedad.tiene_exclusividad}
            deshabilitado={guardando}
            onClick={() => actualizar({ tiene_exclusividad: !propiedad.tiene_exclusividad })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-neutro">
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="lote">Lote</option>
            </select>
          </label>
          <label className="text-xs text-neutro">
            % que compartes
            <input
              inputMode="numeric"
              value={form.pct_comparte}
              onChange={(e) => setForm({ ...form, pct_comparte: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-neutro">
            Matrícula inmobiliaria
            <input
              value={form.matricula}
              onChange={(e) => setForm({ ...form, matricula: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-neutro">
            Área de lote (m²)
            <input
              inputMode="numeric"
              value={form.area_lote}
              onChange={(e) => setForm({ ...form, area_lote: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-neutro">
            Sector amplio (lo ve el agente)
            <input
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              placeholder="Ej: Vía Chía – Cajicá"
              className={inputCls}
            />
          </label>
          <label className="text-xs text-neutro">
            Conjunto (solo tras la asociación)
            <input
              value={form.conjunto}
              onChange={(e) => setForm({ ...form, conjunto: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="col-span-2 text-xs text-neutro">
            Enlace al kit de venta (Drive u otra carpeta externa)
            <input
              type="url"
              value={form.kit_url}
              onChange={(e) => setForm({ ...form, kit_url: e.target.value })}
              placeholder="https://drive.google.com/…"
              className={inputCls}
            />
          </label>
          <label className="col-span-2 text-xs text-neutro">
            Estado
            <select
              value={form.estado_captacion}
              onChange={(e) => setForm({ ...form, estado_captacion: e.target.value })}
              className={inputCls}
            >
              {ESTADOS_CAPTACION.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={guardarDatos}
          disabled={guardando}
          className="rounded-full bg-[#1A1A18] px-5 py-2 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
        >
          {guardando ? "Guardando…" : guardado ? "Guardado ✓" : "Guardar datos para agentes"}
        </button>

        <div>
          <p className="text-sm text-tinta">Foto que verán los agentes</p>
          <p className="mt-0.5 text-xs text-neutro">
            Elige una de interior o detalle. Nunca la fachada: identifica el conjunto.
          </p>
          {imagenes.length === 0 ? (
            <p className="mt-2 text-xs text-neutro">Sube fotos en la galería para poder elegir.</p>
          ) : (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {imagenes.map((img) => {
                const activa = fotoActual === img.ruta_storage;
                return (
                  <button
                    key={img.id}
                    type="button"
                    disabled={guardando}
                    onClick={() => actualizar({ foto_brokers_ruta: activa ? null : img.ruta_storage })}
                    className={`overflow-hidden rounded-lg border-2 transition ${
                      activa ? "border-[#B87333]" : "border-transparent hover:border-linea"
                    }`}
                    aria-pressed={activa}
                  >
                    <img src={urlPublica(img.ruta_storage)} alt="" className="aspect-[4/3] w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-[#8E3B31]">{error}</p>}
      </div>
    </div>
  );
}
