"use client";

// components/propiedades/PanelCaptacion.tsx
// Panel en la ficha de propiedad para marcarla como captación propia
// y controlar su publicación en el portal público /inmuebles.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Propiedad } from "@/lib/types";

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
        activo ? "bg-[#141414]" : "bg-[#D9D9D3]"
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

export default function PanelCaptacion({
  propiedad,
  onCambio,
}: {
  propiedad: Propiedad;
  onCambio: () => void;
}) {
  const supabase = createClient();
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [descripcion, setDescripcion] = useState(
    propiedad.descripcion_publica ?? ""
  );
  const [guardandoDesc, setGuardandoDesc] = useState(false);
  const [descGuardada, setDescGuardada] = useState(false);

  async function actualizar(campos: Partial<Propiedad>) {
    setGuardando(true);
    await supabase.from("propiedades").update(campos).eq("id", propiedad.id);
    setGuardando(false);
    onCambio();
  }

  async function guardarDescripcion() {
    setGuardandoDesc(true);
    await supabase
      .from("propiedades")
      .update({ descripcion_publica: descripcion || null })
      .eq("id", propiedad.id);
    setGuardandoDesc(false);
    setDescGuardada(true);
    setTimeout(() => setDescGuardada(false), 2000);
  }

  function copiarLink() {
    if (!propiedad.slug) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/inmuebles/${propiedad.slug}`
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="mt-6 rounded-xl border border-linea bg-superficie p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-tinta">Captación propia</p>
          <p className="mt-0.5 text-xs text-neutro">
            Márcala para poder publicarla en tu portal público de inmuebles.
          </p>
        </div>
        <Interruptor
          activo={propiedad.es_captacion}
          deshabilitado={guardando}
          onClick={() =>
            actualizar({
              es_captacion: !propiedad.es_captacion,
              // Al desmarcar, también se despublica
              ...(propiedad.es_captacion ? { publicada_web: false } : {}),
            })
          }
        />
      </div>

      {propiedad.es_captacion && (
        <div className="mt-5 space-y-4 border-t border-linea pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-tinta">Publicada en la web</p>
              <p className="mt-0.5 text-xs text-neutro">
                Visible en /inmuebles y en su página propia.
              </p>
            </div>
            <Interruptor
              activo={propiedad.publicada_web}
              deshabilitado={guardando}
              onClick={() =>
                actualizar({ publicada_web: !propiedad.publicada_web })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-tinta">Destacada</p>
              <p className="mt-0.5 text-xs text-neutro">
                Aparece de primera en el catálogo.
              </p>
            </div>
            <Interruptor
              activo={propiedad.destacada}
              deshabilitado={guardando}
              onClick={() => actualizar({ destacada: !propiedad.destacada })}
            />
          </div>

          {propiedad.slug && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="break-all text-xs text-neutro">
                /inmuebles/{propiedad.slug}
              </p>
              <button
                onClick={copiarLink}
                className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-tinta transition hover:border-[#141414]"
              >
                {copiado ? "Copiado ✓" : "Copiar link público"}
              </button>
            </div>
          )}

          <div>
            <p className="text-sm text-tinta">Descripción pública</p>
            <p className="mt-0.5 text-xs text-neutro">
              Texto comercial para la página pública. Si lo dejas vacío se usa
              la descripción normal.
            </p>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Ej: Apartamento luminoso con vista a la sabana…"
              className="mt-2 w-full rounded-lg border border-linea bg-fondo px-3 py-2 text-sm text-tinta outline-none transition focus:border-[#141414]"
            />
            <button
              onClick={guardarDescripcion}
              disabled={guardandoDesc}
              className="mt-2 rounded-full bg-[#141414] px-5 py-2 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-60"
            >
              {guardandoDesc
                ? "Guardando…"
                : descGuardada
                  ? "Guardada ✓"
                  : "Guardar descripción"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
