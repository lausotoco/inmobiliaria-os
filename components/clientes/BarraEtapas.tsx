"use client";

// ============================================================
// KYRELO · Barra de avance del proceso del cliente
// Estética editorial: puntos grafito, acento cobre en la etapa
// actual, conectores hairline. Bifurcación después de la visita:
//   · Sin oferta → vuelve a "Requerimiento enviado" (seguir buscando)
//   · Con oferta → sigue al proceso notarial hasta "Cliente cerrado"
// ============================================================

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente } from "@/lib/types";

const ETAPAS = [
  { clave: "cargando_requerimiento", label: "Cargando requerimiento" },
  { clave: "enviando_requerimiento", label: "Enviando requerimiento" },
  { clave: "requerimiento_enviado", label: "Requerimiento enviado" },
  { clave: "cliente_interesado", label: "Cliente interesado" },
  { clave: "visita_agendada", label: "Visita agendada" },
  { clave: "visita_con_oferta", label: "Visita + oferta" },
  { clave: "borrador_promesa", label: "Borrador de promesa" },
  { clave: "firma_promesa", label: "Firma de promesa" },
  { clave: "escrituracion", label: "Escrituración" },
  { clave: "cerrado", label: "Cliente cerrado" },
] as const;

type ClaveEtapa = (typeof ETAPAS)[number]["clave"] | "no_respondio";

// "no_respondio" es una variante detenida sobre la posición de "cliente_interesado"
function indiceDe(etapa: string): number {
  if (etapa === "no_respondio") {
    return ETAPAS.findIndex((e) => e.clave === "cliente_interesado");
  }
  const i = ETAPAS.findIndex((e) => e.clave === etapa);
  return i === -1 ? 0 : i;
}

export default function BarraEtapas({
  cliente,
  onCambio,
}: {
  cliente: Cliente;
  onCambio: (nuevaEtapa: string) => void;
}) {
  const [guardando, setGuardando] = useState(false);

  const etapaActual = (cliente.etapa || "cargando_requerimiento") as ClaveEtapa;
  const idxActual = indiceDe(etapaActual);
  const detenido = etapaActual === "no_respondio";

  async function irA(nueva: ClaveEtapa, nota?: string) {
    if (guardando) return;
    setGuardando(true);
    const supabase = createClient();

    const cambios: Record<string, unknown> = {
      etapa: nueva,
      etapa_actualizada: new Date().toISOString(),
    };
    // Cerrar el proceso también cierra el estado general del cliente
    if (nueva === "cerrado") cambios.estado = "cerrado";

    const { error } = await supabase
      .from("clientes")
      .update(cambios)
      .eq("id", cliente.id);

    // Deja rastro en las notas cuando hay un giro importante del proceso
    if (!error && nota) {
      await supabase.from("conversaciones").insert({
        cliente_id: cliente.id,
        canal: "proceso",
        direccion: "nota",
        contenido: nota,
      });
    }

    if (!error) onCambio(nueva);
    setGuardando(false);
  }

  return (
    <div className="mt-6 rounded-lg border border-linea bg-superficie px-4 py-5 sm:px-6">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-medium uppercase tracking-widest text-neutro">
          Avance del proceso
        </p>
        {detenido && (
          <span className="rounded-full border border-[#D5BBB5] px-2.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8E3B31]">
            No respondió
          </span>
        )}
      </div>

      {/* Línea de etapas (scroll horizontal en pantallas pequeñas) */}
      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex min-w-max items-start">
          {ETAPAS.map((e, i) => {
            const completada = i < idxActual || etapaActual === "cerrado";
            const actual = i === idxActual && etapaActual !== "cerrado";
            return (
              <li key={e.clave} className="flex items-start">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={`mt-[9px] h-px w-6 sm:w-9 ${
                      i <= idxActual ? "bg-[#1A1A18]" : "bg-linea"
                    }`}
                  />
                )}
                <button
                  onClick={() => irA(e.clave)}
                  disabled={guardando}
                  title={`Marcar: ${e.label}`}
                  className="group flex w-[74px] flex-col items-center text-center sm:w-[86px]"
                >
                  <span
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition ${
                      completada
                        ? "border-[#1A1A18] bg-[#1A1A18]"
                        : actual
                          ? detenido
                            ? "border-[#8E3B31] bg-superficie"
                            : "border-[#B87333] bg-superficie"
                          : "border-linea bg-superficie group-hover:border-[#1A1A18]/40"
                    }`}
                  >
                    {completada && (
                      <svg
                        viewBox="0 0 10 10"
                        className="h-[8px] w-[8px]"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="1.6"
                      >
                        <path d="M1.5 5.2 4 7.5 8.5 2.5" />
                      </svg>
                    )}
                    {actual && (
                      <span
                        className={`h-[7px] w-[7px] rounded-full ${
                          detenido ? "bg-[#8E3B31]" : "bg-[#B87333]"
                        }`}
                      />
                    )}
                  </span>
                  <span
                    className={`mt-2 text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] transition ${
                      actual
                        ? "text-tinta"
                        : completada
                          ? "text-neutro"
                          : "text-neutro/60 group-hover:text-neutro"
                    }`}
                  >
                    {actual && detenido ? "No respondió" : e.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Decisiones según la etapa — aquí viven las bifurcaciones */}
      {etapaActual === "requerimiento_enviado" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linea pt-4">
          <p className="mr-1 text-xs text-neutro">¿El cliente respondió?</p>
          <button
            onClick={() => irA("cliente_interesado")}
            disabled={guardando}
            className="bg-bosque px-4 py-1.5 text-xs"
          >
            Sí, está interesado
          </button>
          <button
            onClick={() => irA("no_respondio")}
            disabled={guardando}
            className="rounded-full border border-[#D5BBB5] px-4 py-1.5 text-xs font-medium text-[#8E3B31] transition hover:opacity-80"
          >
            No respondió
          </button>
        </div>
      )}

      {etapaActual === "no_respondio" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linea pt-4">
          <p className="mr-1 text-xs text-neutro">
            Cuando el cliente responda:
          </p>
          <button
            onClick={() => irA("cliente_interesado")}
            disabled={guardando}
            className="bg-bosque px-4 py-1.5 text-xs"
          >
            Ya respondió · está interesado
          </button>
          <button
            onClick={() =>
              irA(
                "requerimiento_enviado",
                "Sin respuesta al requerimiento — se reenviará o ajustará la búsqueda."
              )
            }
            disabled={guardando}
            className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-neutro transition hover:border-[#1A1A18]/40 hover:text-tinta"
          >
            Reenviar requerimiento
          </button>
        </div>
      )}

      {etapaActual === "visita_agendada" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linea pt-4">
          <p className="mr-1 text-xs text-neutro">¿Cómo salió la visita?</p>
          <button
            onClick={() => irA("visita_con_oferta")}
            disabled={guardando}
            className="bg-bosque px-4 py-1.5 text-xs"
          >
            Hizo oferta
          </button>
          <button
            onClick={() =>
              irA(
                "requerimiento_enviado",
                "Visita realizada sin oferta — seguir buscando inmueble."
              )
            }
            disabled={guardando}
            className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-neutro transition hover:border-[#1A1A18]/40 hover:text-tinta"
          >
            Sin oferta · seguir buscando
          </button>
        </div>
      )}

      {etapaActual === "cerrado" && (
        <p className="mt-4 border-t border-linea pt-4 text-xs text-neutro">
          Proceso completado.{" "}
          <span className="acento-cobre font-medium">Cliente cerrado</span>
          {cliente.etapa_actualizada
            ? ` · ${new Date(cliente.etapa_actualizada).toLocaleDateString("es-CO")}`
            : ""}
          .
        </p>
      )}
    </div>
  );
}
