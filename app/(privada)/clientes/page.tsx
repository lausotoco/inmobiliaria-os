"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Badge from "@/components/ui/Badge";
import Vacio from "@/components/ui/Vacio";
import { formatoFecha } from "@/lib/utils";
import type { Cliente } from "@/lib/types";

const ESTADOS = ["todos", "activo", "en pausa", "cerrado", "perdido"];
const PRIORIDADES = ["todas", "alta", "media", "baja"];
const ORDEN_PRIORIDAD: Record<string, number> = { alta: 0, media: 1, baja: 2 };

const ESTILO_PRIORIDAD: Record<string, string> = {
  alta: "border-[#141414] bg-[#141414] text-white",
  media: "border-linea bg-superficie text-tinta",
  baja: "border-linea bg-fondo text-neutro",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });
    setClientes(data ?? []);
    setCargando(false);
  }

  const filtrados = clientes
    .filter((c) => {
      const coincideBusqueda =
        !busqueda ||
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.whatsapp?.includes(busqueda) ||
        c.ciudad?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado =
        filtroEstado === "todos" || c.estado === filtroEstado;
      const coincidePrioridad =
        filtroPrioridad === "todas" || c.prioridad === filtroPrioridad;
      return coincideBusqueda && coincideEstado && coincidePrioridad;
    })
    .sort(
      (a, b) =>
        (ORDEN_PRIORIDAD[a.prioridad] ?? 1) - (ORDEN_PRIORIDAD[b.prioridad] ?? 1)
    );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            CRM
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Clientes</h1>
        </div>
        <Link
          href="/clientes/nuevo"
          className="shrink-0 rounded-lg bg-bosque px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-bosque-oscuro"
        >
          + Nuevo cliente
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, WhatsApp o ciudad…"
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

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-neutro">
          Prioridad
        </span>
        <div className="flex gap-1.5 overflow-x-auto">
          {PRIORIDADES.map((p) => (
            <button
              key={p}
              onClick={() => setFiltroPrioridad(p)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                filtroPrioridad === p
                  ? "border-bosque bg-bosque text-white"
                  : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="👤"
            titulo={clientes.length === 0 ? "Sin clientes" : "Sin resultados"}
            descripcion={
              clientes.length === 0
                ? "Agrega tu primer cliente para empezar a trabajar."
                : "Prueba con otra búsqueda o filtro."
            }
          >
            {clientes.length === 0 && (
              <Link
                href="/clientes/nuevo"
                className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro"
              >
                + Nuevo cliente
              </Link>
            )}
          </Vacio>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="group rounded-xl border border-linea bg-superficie p-5 transition hover:border-bosque/30 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-tinta group-hover:text-bosque transition">
                  {c.nombre}
                </p>
                <span className="flex shrink-0 gap-1.5">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      ESTILO_PRIORIDAD[c.prioridad] ?? ESTILO_PRIORIDAD.media
                    }`}
                  >
                    {c.prioridad}
                  </span>
                  <Badge texto={c.estado} />
                </span>
              </div>
              {c.whatsapp && (
                <p className="mt-1.5 text-sm text-neutro">{c.whatsapp}</p>
              )}
              {c.ciudad && <p className="text-sm text-neutro">{c.ciudad}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge texto={c.urgencia} />
                {c.credito_aprobado && <Badge texto="crédito aprobado" />}
              </div>
              {c.ultimo_contacto && (
                <p className="mt-3 text-xs text-neutro">
                  Último contacto: {formatoFecha(c.ultimo_contacto)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
