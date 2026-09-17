"use client";

// app/(privada)/agentes/page.tsx — Agentes aliados: quiénes son, en qué
// estado están, si firmaron acuerdo y cuánto han cerrado.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ESTADO: Record<string, string> = {
  registrado: "border-linea bg-fondo text-neutro",
  en_videollamada: "border-[#EBDBC8] bg-[#F6EFE4] text-[#B87333]",
  activo: "border-bosque bg-bosque text-white",
  inactivo: "border-linea bg-superficie text-neutro",
  suspendido: "border-[#E8D8D3] bg-[#F7EFEC] text-[#8E3B31]",
};

export default function AgentesPage() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("agentes_admin").then(({ data, error: err }) => {
      if (err) setError(err.message);
      setItems(Array.isArray(data) ? data : []);
      setCargando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = busqueda.toLowerCase();
  const filtrados = items.filter((a) => !q || [a.nombre, a.email, a.empresa, a.telefono].some((x) => String(x ?? "").toLowerCase().includes(q)));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Agentes aliados</h1>
          <p className="mt-1 text-sm text-neutro">{items.length} registrado{items.length !== 1 ? "s" : ""} · {items.filter((a) => a.acuerdo_firmado).length} con acuerdo firmado</p>
        </div>
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, correo o inmobiliaria" className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-sm text-tinta outline-none focus:border-[#1A1A18] sm:w-72" />
      </div>
      {error && <p className="mt-4 text-sm text-[#8E3B31]">{error}</p>}
      {cargando ? (
        <p className="mt-8 text-sm text-neutro">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="mt-8 text-sm text-neutro">Todavía no hay agentes registrados.</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((a) => (
            <Link key={a.id} href={`/agentes/${a.id}`} className="group rounded-xl border border-linea bg-superficie p-5 transition hover:border-bosque/30">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-tinta group-hover:text-bosque">{a.nombre || a.email}</p>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ESTADO[a.estado_agente] ?? ESTADO.registrado}`}>{String(a.estado_agente ?? "registrado").replace("_", " ")}</span>
              </div>
              <p className="mt-1 text-sm text-neutro">{[a.empresa, a.telefono].filter(Boolean).join(" · ") || a.email}</p>
              <p className="mt-3 text-xs text-neutro">
                {a.cierres ?? 0} cierre{Number(a.cierres ?? 0) === 1 ? "" : "s"} · {a.postulaciones} postulaci{Number(a.postulaciones) === 1 ? "ón" : "ones"} · {a.negocios_activos} en curso
                {Number(a.strikes ?? 0) > 0 ? ` · ${a.strikes} strike${a.strikes === 1 ? "" : "s"}` : ""}
              </p>
              <p className="mt-2 text-[11px]">
                {a.acuerdo_firmado ? <span className="text-bosque">Acuerdo firmado</span> : <span className="text-[#B87333]">Sin acuerdo</span>}
                <span className="text-neutro"> · desde {formatoFecha(a.created_at)}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
