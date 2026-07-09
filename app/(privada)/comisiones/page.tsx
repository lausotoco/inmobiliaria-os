"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, codigoSabana } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Vacio from "@/components/ui/Vacio";

/* eslint-disable @typescript-eslint/no-explicit-any */

type PropComision = {
  id: string;
  consecutivo: number | null;
  titulo: string | null;
  precio: number | null;
  comision_pct: number | null;
  estado: string;
  barrio: string | null;
  ciudad: string | null;
};

const ESTADOS = ["todos", "disponible", "reservada", "en negociación", "vendida"];

function comisionDe(p: PropComision): number {
  if (!p.precio) return 0;
  return (p.precio * (p.comision_pct ?? 1.5)) / 100;
}

export default function ComisionesPage() {
  const [propiedades, setPropiedades] = useState<PropComision[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase
      .from("propiedades")
      .select("id, consecutivo, titulo, precio, comision_pct, estado, barrio, ciudad")
      .order("consecutivo");
    setPropiedades((data as any) ?? []);
    setCargando(false);
  }

  async function cambiarPct(id: string, valor: string) {
    const pct = valor === "" ? null : Number(valor);
    if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) return;
    setGuardando(id);
    const { error } = await supabase
      .from("propiedades")
      .update({ comision_pct: pct ?? 1.5 })
      .eq("id", id);
    if (!error) {
      setPropiedades((prev) =>
        prev.map((p) => (p.id === id ? { ...p, comision_pct: pct ?? 1.5 } : p))
      );
    }
    setGuardando(null);
  }

  // ── KPIs ──
  const enJuego = propiedades.filter((p) =>
    ["disponible", "reservada", "en negociación"].includes(p.estado)
  );
  const negociacion = propiedades.filter((p) => p.estado === "en negociación");
  const vendidas = propiedades.filter((p) => p.estado === "vendida");

  const potencial = enJuego.reduce((s, p) => s + comisionDe(p), 0);
  const enNegociacion = negociacion.reduce((s, p) => s + comisionDe(p), 0);
  const ganada = vendidas.reduce((s, p) => s + comisionDe(p), 0);

  const filtradas = propiedades.filter(
    (p) => filtroEstado === "todos" || p.estado === filtroEstado
  );
  const totalFiltradas = filtradas.reduce((s, p) => s + comisionDe(p), 0);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            Proyección de ingresos
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Comisiones</h1>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                filtroEstado === e
                  ? "border-bosque bg-bosque text-white"
                  : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            k: "Comisión potencial",
            v: potencial,
            d: `Si vendes las ${enJuego.length} propiedades activas`,
          },
          {
            k: "En negociación",
            v: enNegociacion,
            d: `${negociacion.length} ${negociacion.length === 1 ? "propiedad" : "propiedades"} cerca de cerrar`,
          },
          {
            k: "Comisión ganada",
            v: ganada,
            d: `${vendidas.length} ${vendidas.length === 1 ? "propiedad vendida" : "propiedades vendidas"}`,
          },
        ].map((x) => (
          <div
            key={x.k}
            className="rounded-xl border border-linea bg-superficie p-5"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-neutro">
              {x.k}
            </p>
            <p className="mt-2 font-display text-2xl font-medium text-tinta">
              {formatoCOP(x.v)}
            </p>
            <p className="mt-1 text-xs text-neutro">{x.d}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="◈"
            titulo="Sin propiedades"
            descripcion="Cuando registres propiedades con precio, aquí verás la comisión proyectada de cada una."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-linea bg-superficie">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-linea bg-fondo text-left">
                {["Código", "Propiedad", "Precio", "%", "Comisión", "Estado"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-neutro"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => (
                <tr key={p.id} className="border-b border-linea last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/propiedades/${p.id}`}
                      className="text-xs font-semibold uppercase tracking-wider text-bosque underline-offset-2 hover:underline"
                    >
                      {codigoSabana(p.consecutivo)}
                    </Link>
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="truncate font-medium text-tinta">
                      {p.titulo || "Propiedad"}
                    </p>
                    <p className="truncate text-xs text-neutro">
                      {[p.barrio, p.ciudad].filter(Boolean).join(", ")}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-tinta">
                    {formatoCOP(p.precio)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        max={100}
                        defaultValue={p.comision_pct ?? 1.5}
                        onBlur={(e) => cambiarPct(p.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                        }}
                        disabled={guardando === p.id}
                        className="w-16 rounded-lg border border-linea bg-fondo px-2 py-1.5 text-sm text-tinta outline-none transition focus:border-bosque disabled:opacity-50"
                      />
                      <span className="text-xs text-neutro">%</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-display font-medium text-bosque">
                    {formatoCOP(comisionDe(p))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge texto={p.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-linea bg-fondo">
                <td
                  colSpan={4}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-neutro"
                >
                  Total ({filtradas.length}{" "}
                  {filtradas.length === 1 ? "propiedad" : "propiedades"})
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-display font-semibold text-tinta">
                  {formatoCOP(totalFiltradas)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-neutro">
        El porcentaje se edita directamente en la tabla (Enter o clic afuera para
        guardar). El cálculo es precio × porcentaje. Marca una propiedad como
        «vendida» en su ficha para que pase a comisión ganada.
      </p>
    </div>
  );
}
