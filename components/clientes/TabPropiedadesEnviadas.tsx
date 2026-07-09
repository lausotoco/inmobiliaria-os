"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, formatoFecha, codigoSabana } from "@/lib/utils";
import Vacio from "@/components/ui/Vacio";
import type { EstatusEnviada } from "@/lib/types";

const ESTATUS: EstatusEnviada[] = [
  "enviada",
  "vista",
  "le gustó",
  "no le gustó",
  "descartada",
];

const COLOR_ESTATUS: Record<EstatusEnviada, string> = {
  enviada: "border-linea bg-fondo text-neutro",
  vista: "border-linea bg-superficie text-tinta",
  "le gustó": "border-bosque bg-bosque text-white",
  "no le gustó": "border-[#C9B37E] bg-[#FBF6EA] text-[#8A7433]",
  descartada: "border-[#E8D8D3] bg-[#F7EFEC] text-[#8E3B31]",
};

type Enviada = {
  id: string;
  estatus: EstatusEnviada;
  estatus_updated_at: string | null;
  propiedad: {
    id: string;
    consecutivo: number | null;
    titulo: string | null;
    precio: number | null;
    barrio: string | null;
    ciudad: string | null;
  } | null;
  portafolio: {
    id: string;
    titulo: string | null;
    created_at: string;
  } | null;
};

export default function TabPropiedadesEnviadas({
  clienteId,
}: {
  clienteId: string;
}) {
  const [enviadas, setEnviadas] = useState<Enviada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase
      .from("portafolio_items")
      .select(
        `id, estatus, estatus_updated_at,
         propiedad:propiedades ( id, consecutivo, titulo, precio, barrio, ciudad ),
         portafolio:portafolios!inner ( id, titulo, created_at, cliente_id )`
      )
      .eq("portafolio.cliente_id", clienteId)
      .order("estatus_updated_at", { ascending: false, nullsFirst: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEnviadas(((data as any) ?? []) as Enviada[]);
    setCargando(false);
  }

  async function cambiarEstatus(itemId: string, nuevo: EstatusEnviada) {
    setGuardando(itemId);
    const { error } = await supabase
      .from("portafolio_items")
      .update({ estatus: nuevo, estatus_updated_at: new Date().toISOString() })
      .eq("id", itemId);

    if (!error) {
      setEnviadas((prev) =>
        prev.map((e) =>
          e.id === itemId
            ? { ...e, estatus: nuevo, estatus_updated_at: new Date().toISOString() }
            : e
        )
      );
    }
    setGuardando(null);
  }

  const total = enviadas.length;
  const vistas = enviadas.filter((e) =>
    ["vista", "le gustó", "no le gustó"].includes(e.estatus)
  ).length;
  const gustaron = enviadas.filter((e) => e.estatus === "le gustó").length;
  const descartadas = enviadas.filter((e) => e.estatus === "descartada").length;

  if (cargando) {
    return <p className="mt-6 text-center text-sm text-neutro">Cargando…</p>;
  }

  if (total === 0) {
    return (
      <Vacio
        icono="⌂"
        titulo="Sin propiedades enviadas"
        descripcion="Cuando crees un portafolio para este cliente, las propiedades aparecerán aquí con su estatus."
      >
        <Link
          href="/portafolios/nuevo"
          className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro"
        >
          + Nuevo portafolio
        </Link>
      </Vacio>
    );
  }

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Enviadas", v: total },
          { k: "Vistas", v: vistas },
          { k: "Le gustaron", v: gustaron },
          { k: "Descartadas", v: descartadas },
        ].map((x) => (
          <div
            key={x.k}
            className="rounded-lg border border-linea bg-superficie px-3 py-2.5"
          >
            <p className="text-xs text-neutro">{x.k}</p>
            <p className="mt-0.5 font-display text-xl font-medium text-tinta">
              {x.v}
            </p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="mt-5 overflow-hidden rounded-xl border border-linea bg-superficie">
        {enviadas.map((e, i) => (
          <div
            key={e.id}
            className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
              i > 0 ? "border-t border-linea" : ""
            } ${e.estatus === "descartada" ? "opacity-60" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {e.propiedad ? (
                  <Link
                    href={`/propiedades/${e.propiedad.id}`}
                    className="text-xs font-semibold uppercase tracking-widest text-bosque underline-offset-2 transition hover:underline"
                  >
                    {codigoSabana(e.propiedad.consecutivo)}
                  </Link>
                ) : (
                  <span className="text-xs text-neutro">—</span>
                )}
                <p className="font-medium text-tinta line-clamp-1">
                  {e.propiedad?.titulo || "Propiedad"}
                </p>
              </div>
              <p className="mt-1 text-xs text-neutro">
                {[
                  e.propiedad?.precio ? formatoCOP(e.propiedad.precio) : null,
                  [e.propiedad?.barrio, e.propiedad?.ciudad]
                    .filter(Boolean)
                    .join(", ") || null,
                  e.portafolio
                    ? `Portafolio: ${e.portafolio.titulo || formatoFecha(e.portafolio.created_at)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </p>
              {e.estatus === "descartada" && (
                <p className="mt-1 text-[11px] text-[#8E3B31]">
                  Oculta del portafolio del cliente
                </p>
              )}
              {e.estatus === "le gustó" && (
                <p className="mt-1 text-[11px] text-bosque">
                  Aparece en «Propiedades con visita agendada» en su portafolio
                </p>
              )}
            </div>

            {/* Selector de estatus */}
            <div className="flex flex-wrap gap-1.5">
              {ESTATUS.map((s) => (
                <button
                  key={s}
                  disabled={guardando === e.id}
                  onClick={() => cambiarEstatus(e.id, s)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition disabled:opacity-50 ${
                    e.estatus === s
                      ? COLOR_ESTATUS[s]
                      : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
