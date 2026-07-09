"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Vacio from "@/components/ui/Vacio";

type ReqConCliente = {
  id: string;
  titulo: string | null;
  tipo_inmueble: string | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  ciudad: string | null;
  zonas: string[] | null;
  habitaciones: number | null;
  banos: number | null;
  area_min: number | null;
  area_max: number | null;
  estado: string;
  urgencia: string | null;
  preferencias: string | null;
  clientes: { id: string; nombre: string } | null;
};

const ESTADOS = ["todos", "activo", "pausado", "cumplido", "cancelado"];

export default function RequerimientosPage() {
  const [reqs, setReqs] = useState<ReqConCliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("requerimientos")
      .select(
        "id, titulo, tipo_inmueble, presupuesto_min, presupuesto_max, ciudad, zonas, habitaciones, banos, area_min, area_max, estado, urgencia, preferencias, clientes(id, nombre)"
      )
      .order("created_at", { ascending: false });
    setReqs((data as ReqConCliente[] | null) ?? []);
    setCargando(false);
  }

  const filtrados = reqs.filter((r) => {
    const txt = busqueda.toLowerCase();
    const coincide =
      !busqueda ||
      r.titulo?.toLowerCase().includes(txt) ||
      r.ciudad?.toLowerCase().includes(txt) ||
      r.tipo_inmueble?.toLowerCase().includes(txt) ||
      r.clientes?.nombre.toLowerCase().includes(txt) ||
      r.zonas?.some((z) => z.toLowerCase().includes(txt));
    const estadoOk = filtroEstado === "todos" || r.estado === filtroEstado;
    return coincide && estadoOk;
  });

  return (
    <div>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-laton">
          El corazón del negocio
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium">
          Requerimientos
        </h1>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, ciudad, zona, tipo…"
          className="flex-1 rounded-lg border border-linea bg-superficie px-4 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
        />
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

      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="◎"
            titulo={
              reqs.length === 0
                ? "Sin requerimientos"
                : "Sin resultados"
            }
            descripcion={
              reqs.length === 0
                ? "Los requerimientos se crean desde la ficha de cada cliente."
                : "Prueba con otra búsqueda o filtro."
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtrados.map((r) => (
            <Link
              key={r.id}
              href={`/requerimientos/${r.id}`}
              className="group block rounded-xl border border-linea bg-superficie p-5 transition hover:border-bosque/30 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-neutro">
                    {r.clientes?.nombre ?? "—"}
                  </p>
                  <p className="mt-0.5 font-medium text-tinta group-hover:text-bosque transition">
                    {r.titulo || r.tipo_inmueble || "Requerimiento"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Badge texto={r.estado} />
                  <Badge texto={r.urgencia} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutro">
                {(r.presupuesto_min || r.presupuesto_max) && (
                  <span>
                    {formatoCOP(r.presupuesto_min)} – {formatoCOP(r.presupuesto_max)}
                  </span>
                )}
                {r.ciudad && <span>{r.ciudad}</span>}
                {r.zonas && r.zonas.length > 0 && (
                  <span>{r.zonas.join(", ")}</span>
                )}
                {r.habitaciones !== null && <span>{r.habitaciones} hab</span>}
                {r.banos !== null && <span>{r.banos} baños</span>}
                {(r.area_min || r.area_max) && (
                  <span>
                    {r.area_min ?? "—"}–{r.area_max ?? "—"} m²
                  </span>
                )}
              </div>

              {r.preferencias && (
                <p className="mt-2 text-sm italic text-neutro line-clamp-1">
                  "{r.preferencias}"
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
