"use client";

/* ============================================================
   Panel de viabilidad financiera
   ------------------------------------------------------------
   Se recalcula con cada tecla. Sin botón de "calcular": el punto
   entero es saberlo DURANTE la llamada, no después.

   Colores: el sistema de diseño no tiene verde ni ámbar. Se usa
   el mismo lenguaje que los badges — grafito para lo que cumple,
   cobre para la advertencia, rojo apagado para lo que no da.
   ============================================================ */

import type { Viabilidad } from "@/lib/calificacion/financiero";
import type { ParametrosFinancieros } from "@/lib/calificacion/config";
import { formatoCOP } from "@/lib/utils";

const pct = (n: number) => (n * 100).toFixed(1).replace(".", ",") + "%";

const TONO = {
  verde: { borde: "border-[#1A1A18]/25", texto: "text-[#1A1A18]", etiqueta: "Viable" },
  ambar: { borde: "border-[#E3C9A8]", texto: "text-[#96602A]", etiqueta: "Ajustado" },
  rojo: { borde: "border-[#D5BBB5]", texto: "text-[#8E3B31]", etiqueta: "No da" },
  "sin-datos": { borde: "border-linea", texto: "text-neutro", etiqueta: "" },
};

function Linea({
  concepto,
  valor,
  nota,
  cumple,
}: {
  concepto: string;
  valor: string;
  nota?: string;
  cumple?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-neutro">{concepto}</span>
      <span className="flex items-baseline gap-2 text-right">
        <span className="text-sm font-medium tabular-nums text-tinta">{valor}</span>
        {cumple !== undefined && (
          <span
            className={`text-[11px] font-medium ${cumple ? "text-[#1A1A18]" : "text-[#8E3B31]"}`}
          >
            {cumple ? "✓" : "✗"} {nota}
          </span>
        )}
      </span>
    </div>
  );
}

export default function PanelViabilidad({
  v,
  p,
  ingreso,
}: {
  v: Viabilidad;
  p: ParametrosFinancieros;
  ingreso: number | null;
}) {
  /* De contado no hay crédito que analizar. */
  if (v.contado) {
    return (
      <div className="rounded-xl border border-linea bg-superficie p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-laton">
          Compra de contado
        </p>
        <p className="mt-2 text-sm text-neutro">
          No aplica LTV ni carga financiera. Lo único que hay que verificar es el
          origen y la disponibilidad de los fondos, y dejarlo marcado en
          &ldquo;ingresos verificables&rdquo;.
        </p>
      </div>
    );
  }

  if (!v.aplica) {
    return (
      <div className="rounded-xl border border-dashed border-linea bg-superficie/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-laton">
          Viabilidad financiera
        </p>
        <p className="mt-2 text-sm text-neutro">
          Escribe el presupuesto y el ingreso familiar y aparece aquí, sin botones.
        </p>
      </div>
    );
  }

  const tono = TONO[v.semaforo];

  return (
    <div className={`rounded-xl border bg-superficie p-5 ${tono.borde}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-laton">
          Viabilidad financiera
        </p>
        <span
          className={`rounded-full border px-2.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] ${tono.borde} ${tono.texto}`}
        >
          {tono.etiqueta}
        </span>
      </div>

      <div className="mt-3 divide-y divide-linea">
        <Linea concepto="Crédito requerido" valor={formatoCOP(v.credito_requerido)} />
        <Linea
          concepto="LTV"
          valor={pct(v.ltv)}
          cumple={v.ltv_cumple}
          nota={v.ltv_cumple ? "dentro del máximo" : `máximo ${pct(p.ltv_maximo)}`}
        />
        <Linea
          concepto={`Cuota estimada (${pct(p.tasa_ea)} E.A. · ${p.plazo_meses / 12} años)`}
          valor={`${formatoCOP(v.cuota_mensual)} / mes`}
        />
        <Linea
          concepto="Carga sobre ingreso"
          valor={pct(v.carga_financiera)}
          cumple={v.carga_cumple}
          nota={v.carga_cumple ? "dentro del tope" : `supera el ${pct(p.tope_carga)}`}
        />
      </div>

      {!v.carga_cumple && (
        <div className="mt-3 rounded-lg border border-[#D5BBB5] bg-[#F7EFEC] px-4 py-3">
          <p className="text-sm font-medium text-[#8E3B31]">
            Ingreso mínimo necesario: {formatoCOP(v.ingreso_minimo_requerido)}/mes
          </p>
          <p className="mt-0.5 text-sm text-[#8E3B31]/80">
            Declarado: {formatoCOP(ingreso)}/mes
          </p>
        </div>
      )}

      {/* La línea más útil de la llamada: hasta cuánto SÍ puede. */}
      <div className="mt-3 rounded-lg bg-fondo px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutro">
          Presupuesto viable con este ingreso
        </p>
        <p className="mt-1.5 text-sm text-tinta">
          <span className="font-display text-xl font-medium">
            {formatoCOP(v.viable_con_su_inicial)}
          </span>{" "}
          <span className="text-neutro">con la inicial que ya tiene</span>
        </p>
        <p className="mt-1 text-sm text-tinta">
          <span className="font-medium tabular-nums">
            {formatoCOP(v.viable_con_inicial_minima)}
          </span>{" "}
          <span className="text-neutro">
            si mantiene una inicial del {pct(1 - p.ltv_maximo)}
          </span>
        </p>
      </div>
    </div>
  );
}
