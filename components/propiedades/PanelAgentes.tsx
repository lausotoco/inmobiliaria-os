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
    comision_pct: String(propiedad.comision_pct ?? 3),
    kit_url: propiedad.kit_url ?? "",
    estado_captacion: propiedad.estado_captacion ?? "captado_sin_mandato",
    margen_negociacion: propiedad.margen_negociacion ?? "",
    nota_juridica: propiedad.nota_juridica ?? "",
    ocupacion: propiedad.ocupacion ?? "",
    entrega: propiedad.entrega ?? "",
    anio_construccion: propiedad.anio_construccion != null ? String(propiedad.anio_construccion) : "",
    descripcion_brokers: propiedad.descripcion_brokers ?? "",
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
      comision_pct: form.comision_pct ? Number(form.comision_pct) : 3,
      kit_url: form.kit_url || null,
      estado_captacion: form.estado_captacion,
      margen_negociacion: form.margen_negociacion || null,
      nota_juridica: form.nota_juridica || null,
      ocupacion: form.ocupacion || null,
      entrega: form.entrega || null,
      anio_construccion: form.anio_construccion ? Number(form.anio_construccion) : null,
      descripcion_brokers: form.descripcion_brokers || null,
    });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  const fotosAgentes: string[] = propiedad.fotos_brokers_rutas ?? (propiedad.foto_brokers_ruta ? [propiedad.foto_brokers_ruta] : []);

  function alternarFoto(ruta: string) {
    const yaEsta = fotosAgentes.includes(ruta);
    if (!yaEsta && fotosAgentes.length >= 3) {
      setError("Máximo 3 fotos para agentes. Quita una antes de agregar otra.");
      return;
    }
    const nuevas = yaEsta ? fotosAgentes.filter((r) => r !== ruta) : [...fotosAgentes, ruta];
    actualizar({ fotos_brokers_rutas: nuevas, foto_brokers_ruta: nuevas[0] ?? null });
  }

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

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["precio_negociable", "Precio negociable", "El agente sabrá que hay margen."],
            ["acepta_permuta", "Acepta permuta", "Recibe otro inmueble como parte de pago."],
            ["acepta_credito", "Acepta crédito", "Bancario o leasing habitacional."],
            ["acepta_subsidio", "Acepta subsidio", "Vivienda con subsidio o cesantías."],
            ["libre_gravamenes", "Libre de gravámenes", "Sin hipotecas, embargos ni limitaciones."],
          ].map(([campo, titulo, ayuda]) => (
            <div key={campo} className="flex items-center justify-between gap-3 rounded-lg border border-linea bg-fondo px-3 py-2.5">
              <div>
                <p className="text-sm text-tinta">{titulo}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-neutro">{ayuda}</p>
              </div>
              <Interruptor
                activo={!!(propiedad as unknown as Record<string, boolean>)[campo]}
                deshabilitado={guardando}
                onClick={() =>
                  actualizar({ [campo]: !(propiedad as unknown as Record<string, boolean>)[campo] })
                }
              />
            </div>
          ))}
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
            Comisión total del negocio (%)
            <input
              inputMode="decimal"
              value={form.comision_pct}
              onChange={(e) => setForm({ ...form, comision_pct: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-neutro">
            % que compartes con el agente
            <input
              inputMode="numeric"
              value={form.pct_comparte}
              onChange={(e) => setForm({ ...form, pct_comparte: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="text-xs text-neutro">
            Ocupación
            <select
              value={form.ocupacion}
              onChange={(e) => setForm({ ...form, ocupacion: e.target.value })}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="Desocupada">Desocupada</option>
              <option value="Habitada por el propietario">Habitada por el propietario</option>
              <option value="Arrendada">Arrendada</option>
            </select>
          </label>
          <label className="text-xs text-neutro">
            Entrega
            <select
              value={form.entrega}
              onChange={(e) => setForm({ ...form, entrega: e.target.value })}
              className={inputCls}
            >
              <option value="">—</option>
              <option value="Inmediata">Inmediata</option>
              <option value="30 días">30 días</option>
              <option value="60 días">60 días</option>
              <option value="A convenir">A convenir</option>
            </select>
          </label>
          <label className="text-xs text-neutro">
            Margen de negociación (si el precio es negociable)
            <input
              value={form.margen_negociacion}
              onChange={(e) => setForm({ ...form, margen_negociacion: e.target.value })}
              placeholder="Hasta $30 millones"
              className={inputCls}
            />
          </label>
          <label className="text-xs text-neutro">
            Año de construcción
            <input
              inputMode="numeric"
              value={form.anio_construccion}
              onChange={(e) => setForm({ ...form, anio_construccion: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="col-span-2 text-xs text-neutro">
            Estado jurídico (lo ve el agente)
            <input
              value={form.nota_juridica}
              onChange={(e) => setForm({ ...form, nota_juridica: e.target.value })}
              placeholder="Escritura al día, sin embargos, impuestos al día"
              className={inputCls}
            />
          </label>
          <label className="col-span-2 text-xs text-neutro">
            Descripción para agentes (sin nombrar el conjunto)
            <textarea
              rows={3}
              value={form.descripcion_brokers}
              onChange={(e) => setForm({ ...form, descripcion_brokers: e.target.value })}
              placeholder="Casa de dos pisos en conjunto cerrado sobre la vía Chía–Cajicá. Cocina con isla, sala con doble altura, jardín privado. Conjunto con piscina y cancha múltiple."
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
          <p className="text-sm text-tinta">
            Fotos que verán los agentes ({fotosAgentes.length} de 3)
          </p>
          <p className="mt-0.5 text-xs text-neutro">
            Elige hasta 3 de interior o detalle. Nunca la fachada: identifica el conjunto.
            La primera es la portada.
          </p>
          {imagenes.length === 0 ? (
            <p className="mt-2 text-xs text-neutro">Sube fotos en la galería para poder elegir.</p>
          ) : (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {imagenes.map((img) => {
                const orden = fotosAgentes.indexOf(img.ruta_storage);
                const activa = orden >= 0;
                return (
                  <button
                    key={img.id}
                    type="button"
                    disabled={guardando}
                    onClick={() => alternarFoto(img.ruta_storage)}
                    className={`relative overflow-hidden rounded-lg border-2 transition ${
                      activa ? "border-[#B87333]" : "border-transparent hover:border-linea"
                    }`}
                    aria-pressed={activa}
                  >
                    <img src={urlPublica(img.ruta_storage)} alt="" className="aspect-[4/3] w-full object-cover" />
                    {activa && (
                      <span className="absolute left-1 top-1 rounded-full bg-[#B87333] px-1.5 text-[10px] font-semibold text-white">
                        {orden + 1}
                      </span>
                    )}
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
