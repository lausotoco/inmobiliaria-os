"use client";

/* Lista de compradores calificados. Banda A primero: el orden de
   la lista es el orden en que hay que trabajarlos. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Vacio from "@/components/ui/Vacio";
import { formatoCOP, formatoFecha } from "@/lib/utils";
import { MUNICIPIOS } from "@/lib/municipios";
import { OPCIONES_ORIGEN, type Banda } from "@/lib/calificacion/config";

type Fila = {
  id: string;
  cliente_id: string;
  score_calculado: number | null;
  banda_calculada: string | null;
  banda_final: string | null;
  razon_override: string | null;
  municipios: string[] | null;
  presupuesto_maximo: number | null;
  origen_lead: string | null;
  carta_vigencia: string | null;
  updated_at: string;
  clientes: { id: string; nombre: string; estado: string } | null;
};

const BANDAS: Banda[] = ["A", "B", "C", "D"];
const ORDEN_BANDA: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

const DIAS_ESTANCADO = 30;
const DIAS_AVISO_CARTA = 15;

const ESTILO_BANDA: Record<string, string> = {
  A: "border-[#1A1A18] bg-[#1A1A18] text-white",
  B: "border-[#1A1A18]/25 text-[#1A1A18]",
  C: "border-linea text-neutro",
  D: "border-[#D5BBB5] text-[#8E3B31]",
};

const dias = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

export default function CompradoresPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [banda, setBanda] = useState<string>("todas");
  const [municipio, setMunicipio] = useState("todos");
  const [origen, setOrigen] = useState("todos");
  const [soloAtencion, setSoloAtencion] = useState<"" | "estancados" | "carta">("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("calificaciones")
      .select(
        "id, cliente_id, score_calculado, banda_calculada, banda_final, razon_override, municipios, presupuesto_maximo, origen_lead, carta_vigencia, updated_at, clientes(id, nombre, estado)"
      )
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setFilas((data as unknown as Fila[]) ?? []);
        setCargando(false);
      });
  }, []);

  const estancado = (f: Fila) => (dias(f.updated_at) ?? 0) >= DIAS_ESTANCADO;
  const cartaPorVencer = (f: Fila) => {
    if (!f.carta_vigencia) return false;
    const faltan = Math.ceil(
      (new Date(f.carta_vigencia + "T23:59:59").getTime() - Date.now()) / 86_400_000
    );
    return faltan <= DIAS_AVISO_CARTA;
  };

  const filtradas = useMemo(() => {
    return filas
      .filter((f) => {
        const b = f.banda_final ?? f.banda_calculada ?? "D";
        if (banda !== "todas" && b !== banda) return false;
        if (municipio !== "todos" && !(f.municipios ?? []).includes(municipio))
          return false;
        if (origen !== "todos" && f.origen_lead !== origen) return false;
        if (soloAtencion === "estancados" && !estancado(f)) return false;
        if (soloAtencion === "carta" && !cartaPorVencer(f)) return false;
        if (busqueda) {
          const t = busqueda.toLowerCase();
          if (!f.clientes?.nombre.toLowerCase().includes(t)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ba = ORDEN_BANDA[a.banda_final ?? a.banda_calculada ?? "D"] ?? 3;
        const bb = ORDEN_BANDA[b.banda_final ?? b.banda_calculada ?? "D"] ?? 3;
        if (ba !== bb) return ba - bb;
        return +new Date(b.updated_at) - +new Date(a.updated_at);
      });
  }, [filas, banda, municipio, origen, soloAtencion, busqueda]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    filas.forEach((f) => {
      const b = f.banda_final ?? f.banda_calculada ?? "D";
      c[b] = (c[b] ?? 0) + 1;
    });
    return c;
  }, [filas]);

  const filtro =
    "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition";
  const activo = "border-bosque bg-bosque text-white";
  const inactivo =
    "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            Calificación
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Compradores</h1>
        </div>
        <Link
          href="/compradores/nuevo"
          className="shrink-0 rounded-lg bg-bosque px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-bosque-oscuro"
        >
          + Calificar comprador
        </Link>
      </div>

      {/* Contadores por banda */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        {BANDAS.map((b) => (
          <button
            key={b}
            onClick={() => setBanda(banda === b ? "todas" : b)}
            className={`rounded-xl border bg-superficie px-4 py-3 text-left transition ${
              banda === b ? "border-bosque" : "border-linea hover:border-bosque/40"
            }`}
          >
            <p className="font-display text-2xl font-medium tabular-nums text-tinta">
              {conteo[b] ?? 0}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutro">
              Banda {b}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre…"
          className="flex-1 rounded-lg border border-linea bg-superficie px-4 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
        />
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSoloAtencion(soloAtencion === "estancados" ? "" : "estancados")}
            className={`${filtro} ${soloAtencion === "estancados" ? activo : inactivo}`}
          >
            Estancados
          </button>
          <button
            onClick={() => setSoloAtencion(soloAtencion === "carta" ? "" : "carta")}
            className={`${filtro} ${soloAtencion === "carta" ? activo : inactivo}`}
          >
            Carta por vencer
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <select
          value={municipio}
          onChange={(e) => setMunicipio(e.target.value)}
          className="rounded-full border border-linea bg-superficie px-3.5 py-1.5 text-xs text-neutro outline-none"
        >
          <option value="todos">Todos los municipios</option>
          {MUNICIPIOS.filter((m) => m.activo && m.slug !== "sabana-norte").map((m) => (
            <option key={m.slug} value={m.nombre}>
              {m.nombre}
            </option>
          ))}
        </select>
        <select
          value={origen}
          onChange={(e) => setOrigen(e.target.value)}
          className="rounded-full border border-linea bg-superficie px-3.5 py-1.5 text-xs text-neutro outline-none"
        >
          <option value="todos">Todos los orígenes</option>
          {OPCIONES_ORIGEN.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="◎"
            titulo={filas.length === 0 ? "Sin compradores calificados" : "Sin resultados"}
            descripcion={
              filas.length === 0
                ? "Califica al primero durante tu próxima videollamada."
                : "Prueba con otro filtro."
            }
          >
            {filas.length === 0 && (
              <Link
                href="/compradores/nuevo"
                className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro"
              >
                + Calificar comprador
              </Link>
            )}
          </Vacio>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-linea bg-superficie">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-linea text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-neutro">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-3 py-3">Banda</th>
                <th className="px-3 py-3 text-right">Score</th>
                <th className="px-3 py-3">Municipio</th>
                <th className="px-3 py-3 text-right">Presupuesto</th>
                <th className="px-3 py-3">Actualizado</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {filtradas.map((f) => {
                const b = f.banda_final ?? f.banda_calculada ?? "D";
                return (
                  <tr key={f.id} className="transition hover:bg-fondo">
                    <td className="px-5 py-3">
                      <Link
                        href={`/compradores/${f.cliente_id}`}
                        className="font-medium text-tinta hover:underline"
                      >
                        {f.clientes?.nombre ?? "Sin nombre"}
                      </Link>
                      {f.razon_override && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-laton">
                          manual
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] ${ESTILO_BANDA[b]}`}
                      >
                        {b}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-tinta">
                      {f.score_calculado ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-neutro">
                      {(f.municipios ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-neutro">
                      {formatoCOP(f.presupuesto_maximo)}
                    </td>
                    <td className="px-3 py-3 text-neutro">
                      {formatoFecha(f.updated_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {estancado(f) && (
                          <span className="rounded-full border border-linea px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wider text-neutro">
                            Estancado
                          </span>
                        )}
                        {cartaPorVencer(f) && (
                          <span className="rounded-full border border-[#D5BBB5] px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wider text-[#8E3B31]">
                            Carta por vencer
                          </span>
                        )}
                        {!estancado(f) && !cartaPorVencer(f) && (
                          <span className="text-xs text-neutro">
                            {f.clientes?.estado ?? "—"}
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
