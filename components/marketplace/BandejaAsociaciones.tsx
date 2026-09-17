"use client";

// components/marketplace/BandejaAsociaciones.tsx
// Bandeja de solicitudes de asociación: agentes que piden comercializar
// una captación de KYRELO. Aceptar arranca la vigencia de 30 días (trigger
// en la base). Solo un agente por inmueble puede tener el cupo de portales.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, formatoFecha, codigoSabana } from "@/lib/utils";

const ESTADOS: Record<string, string> = {
  solicitada: "Solicitada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
  cerrada: "Cerrada",
};

const COLOR: Record<string, string> = {
  solicitada: "border-[#EBDBC8] bg-[#F6EFE4] text-[#B87333]",
  aceptada: "border-bosque bg-bosque text-white",
  rechazada: "border-[#E8D8D3] bg-[#F7EFEC] text-[#8E3B31]",
  vencida: "border-linea bg-fondo text-neutro",
  cerrada: "border-linea bg-superficie text-tinta",
};

function linkWhatsApp(tel?: string | null) {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (!d) return null;
  return "https://wa.me/" + (d.length === 10 ? "57" + d : d);
}

function diasHasta(fecha?: string | null) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
}

export default function BandejaAsociaciones() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<"solicitada" | "aceptada" | "todas">("solicitada");

  async function cargar() {
    setCargando(true);
    const { data, error: err } = await supabase.rpc("asociaciones_admin");
    if (err) setError(err.message);
    setItems(Array.isArray(data) ? data : []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function actualizar(id: string, campos: Record<string, unknown>) {
    setError("");
    const { error: err } = await supabase.from("asociaciones").update(campos).eq("id", id);
    if (err) {
      setError(
        err.message.includes("asociaciones_un_cupo_portales")
          ? "Otro agente ya tiene el cupo de portales de este inmueble."
          : err.message
      );
      return;
    }
    cargar();
  }

  const visibles = items.filter((a) => filtro === "todas" || a.estado === filtro);
  const pendientes = items.filter((a) => a.estado === "solicitada").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Asociaciones</h1>
          <p className="mt-1 text-sm text-neutro">
            Agentes que quieren comercializar tus captaciones.
            {pendientes > 0 ? ` ${pendientes} por revisar.` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["solicitada", "aceptada", "todas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition ${
                filtro === f ? "border-bosque bg-bosque text-white" : "border-linea text-neutro hover:text-tinta"
              }`}
            >
              {f === "todas" ? "Todas" : f === "solicitada" ? "Por revisar" : "Aceptadas"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[#8E3B31]">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-sm text-neutro">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="mt-8 text-sm text-neutro">No hay asociaciones en esta vista.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {visibles.map((a) => {
            const p = a.propiedad ?? {};
            const ag = a.agente ?? {};
            const wa = linkWhatsApp(ag.telefono);
            const dias = diasHasta(a.fecha_vence);
            return (
              <article key={a.id} className="rounded-xl border border-linea bg-superficie p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Link
                        href={`/propiedades/${p.id}`}
                        className="text-xs font-semibold uppercase tracking-widest text-bosque underline-offset-2 hover:underline"
                      >
                        {codigoSabana(p.consecutivo)}
                      </Link>
                      <p className="font-medium text-tinta">{p.titulo || "Captación"}</p>
                    </div>
                    <p className="mt-1 text-xs text-neutro">
                      {[p.ciudad, p.precio ? formatoCOP(p.precio) : null, `Comparte ${Math.round(Number(p.pct_comparte ?? 0.5) * 100)}%`]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${COLOR[a.estado] ?? ""}`}>
                    {ESTADOS[a.estado] ?? a.estado}
                    {a.estado === "aceptada" && dias != null ? ` · ${dias <= 0 ? "vence hoy" : `${dias} días`}` : ""}
                  </span>
                </div>

                <div className="mt-4 grid gap-x-6 gap-y-3 border-t border-linea pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-neutro">Agente</p>
                    <p className="mt-0.5 text-tinta">
                      {ag.nombre || ag.email || "—"}
                      {ag.empresa ? ` · ${ag.empresa}` : ""}
                    </p>
                    <p className="text-xs text-neutro">
                      {ag.cierres ?? 0} cierre{Number(ag.cierres ?? 0) === 1 ? "" : "s"} con KYRELO
                      {ag.estado_agente ? ` · ${ag.estado_agente}` : ""}
                      {wa && (
                        <>
                          {"  ·  "}
                          <a href={wa} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-tinta">
                            WhatsApp
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-neutro">Su comprador</p>
                    <p className="mt-0.5 text-tinta">
                      {a.presupuesto_comprador ? formatoCOP(a.presupuesto_comprador) : "Presupuesto sin indicar"}
                      {a.plazo_comprador ? ` · ${a.plazo_comprador}` : ""}
                    </p>
                    <p className="text-xs text-neutro">
                      {[a.forma_pago_comprador, a.comprador_verificado ? "verificado por el agente" : "sin verificar"]
                        .filter(Boolean)
                        .join("  ·  ")}
                      {a.pct_propuesto != null ? `  ·  propone ${Math.round(Number(a.pct_propuesto) * 100)}% para él` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linea pt-4">
                  <span className="mr-auto text-xs text-neutro">Solicitada el {formatoFecha(a.created_at)}</span>
                  {a.estado === "solicitada" && (
                    <>
                      <button
                        onClick={() => actualizar(a.id, { estado: "rechazada" })}
                        className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-neutro transition hover:border-tinta hover:text-tinta"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => actualizar(a.id, { estado: "aceptada" })}
                        className="rounded-full bg-bosque px-5 py-1.5 text-xs font-semibold text-white transition hover:opacity-85"
                      >
                        Aceptar (30 días)
                      </button>
                    </>
                  )}
                  {a.estado === "aceptada" && (
                    <>
                      <button
                        onClick={() => actualizar(a.id, { cupo_portales: !a.cupo_portales })}
                        className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                          a.cupo_portales ? "border-bosque bg-bosque text-white" : "border-linea text-neutro hover:text-tinta"
                        }`}
                      >
                        {a.cupo_portales ? "Tiene el cupo de portales" : "Dar cupo de portales"}
                      </button>
                      <button
                        onClick={() => {
                          const url = prompt("Enlace del acuerdo firmado:", a.acuerdo_url ?? "");
                          if (url === null) return;
                          actualizar(a.id, { acuerdo_url: url || null });
                        }}
                        className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-neutro transition hover:text-tinta"
                      >
                        {a.acuerdo_url ? "Acuerdo ✓" : "Adjuntar acuerdo"}
                      </button>
                      <button
                        onClick={() => actualizar(a.id, { estado: "vencida", cupo_portales: false })}
                        className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-neutro transition hover:text-tinta"
                      >
                        Marcar vencida
                      </button>
                      <button
                        onClick={() => actualizar(a.id, { estado: "cerrada" })}
                        className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-neutro transition hover:text-tinta"
                      >
                        Cerrada (vendido)
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
