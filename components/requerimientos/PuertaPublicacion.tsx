"use client";

/* ============================================================
   Puerta de publicación al marketplace
   ------------------------------------------------------------
   Un requerimiento solo sale a los brokers si su comprador es
   banda A. Cuando no se puede, el interruptor no se esconde: se
   deshabilita y dice EXACTAMENTE qué falta, porque un botón
   apagado sin explicación es una pared.

   Si Laura pone la banda A a mano, se puede publicar: la
   decisión es suya. Pero queda registrado quién, cuándo y con
   qué razón, y aquí se muestra.
   ============================================================ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/utils";

type Requerimiento = {
  cliente_id: string;
  presupuesto_max: number | null;
  ciudad: string | null;
  zonas: string[] | null;
  tipo_inmueble: string | null;
};

type Calificacion = {
  banda_final: string | null;
  banda_calculada: string | null;
  razon_override: string | null;
  override_at: string | null;
  estado_credito: string | null;
  carta_vigencia: string | null;
  autorizacion_fecha: string | null;
};

export default function PuertaPublicacion({
  req,
  publicado,
  guardando,
  onAlternar,
}: {
  req: Requerimiento;
  publicado: boolean | null;
  guardando: boolean;
  onAlternar: () => void;
}) {
  const [cal, setCal] = useState<Calificacion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("calificaciones")
      .select(
        "banda_final, banda_calculada, razon_override, override_at, estado_credito, carta_vigencia, autorizacion_fecha"
      )
      .eq("cliente_id", req.cliente_id)
      .maybeSingle()
      .then(({ data }) => {
        setCal(data as Calificacion | null);
        setCargando(false);
      });
  }, [req.cliente_id]);

  /* ── El checklist completo, en orden de importancia ── */
  const bloqueos: string[] = [];

  if (!cargando) {
    if (!cal) {
      bloqueos.push("Este comprador todavía no está calificado.");
    } else {
      const banda = cal.banda_final ?? cal.banda_calculada ?? "D";
      if (banda !== "A") {
        bloqueos.push(`Banda ${banda}: al marketplace solo salen los compradores banda A.`);
      }

      if (
        cal.estado_credito === "Carta de preaprobación vigente" &&
        (!cal.carta_vigencia ||
          new Date(cal.carta_vigencia + "T23:59:59").getTime() < Date.now())
      ) {
        bloqueos.push(
          cal.carta_vigencia
            ? `La carta de preaprobación venció el ${formatoFecha(cal.carta_vigencia)}.`
            : "La carta de preaprobación no tiene fecha de vigencia registrada."
        );
      }

      if (!cal.autorizacion_fecha) {
        bloqueos.push("No hay autorización de tratamiento de datos registrada.");
      }
    }

    const faltan: string[] = [];
    if (!req.presupuesto_max) faltan.push("presupuesto");
    if (!req.ciudad && !(req.zonas ?? []).length) faltan.push("ciudad o zonas");
    if (!req.tipo_inmueble) faltan.push("tipo de inmueble");
    if (faltan.length) {
      bloqueos.push(`Al requerimiento le falta: ${faltan.join(", ")}.`);
    }
  }

  /* Ya publicado siempre se puede retirar: bloquear la salida
     dejaría anuncios vivos que no se pueden bajar. */
  const puede = bloqueos.length === 0 || publicado === true;
  const manual = cal?.razon_override && (cal.banda_final ?? "") === "A";

  return (
    <div className="mt-4 rounded-xl border border-linea bg-superficie px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-tinta">Visible para brokers</p>
          <p className="mt-0.5 text-xs text-neutro">
            {cargando
              ? "Revisando la calificación del comprador…"
              : publicado
                ? "Aparece en la plataforma pública de brokers."
                : puede
                  ? "Listo para publicar: el comprador está verificado."
                  : "Bloqueado hasta que se cumpla el checklist."}
          </p>
        </div>
        {publicado !== null && (
          <button
            role="switch"
            aria-checked={publicado}
            onClick={onAlternar}
            disabled={guardando || cargando || !puede}
            title={puede ? undefined : bloqueos[0]}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              publicado ? "bg-bosque" : "bg-linea"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                publicado ? "left-6" : "left-1"
              }`}
            />
          </button>
        )}
      </div>

      {!cargando && bloqueos.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-linea pt-3">
          {bloqueos.map((b) => (
            <li key={b} className="text-sm text-[#8E3B31]">
              {b}
            </li>
          ))}
          <li className="pt-1">
            <Link
              href={`/compradores/${req.cliente_id}`}
              className="text-xs text-neutro underline transition hover:text-tinta"
            >
              Ver la calificación del comprador
            </Link>
          </li>
        </ul>
      )}

      {!cargando && manual && (
        <p className="mt-3 border-t border-linea pt-3 text-xs text-neutro">
          Banda A puesta a mano el {formatoFecha(cal!.override_at)}: “{cal!.razon_override}”
        </p>
      )}
    </div>
  );
}
