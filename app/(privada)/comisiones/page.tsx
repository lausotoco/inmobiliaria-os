"use client";

// app/(privada)/comisiones/page.tsx — Negocios y comisiones.
// Los negocios nacen solos (postulación aprobada o asociación aceptada) y
// al escriturarse crean su comisión. Aquí se mueven de etapa y se cierra la
// plata: precio, entre cuántas partes se divide y estado de pago.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, formatoFecha, codigoSabana } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ETAPAS = ["conectado", "visita_agendada", "visitado", "oferta", "promesa", "escriturado"] as const;
const NOMBRES: Record<string, string> = {
  conectado: "Conectado",
  visita_agendada: "Visita agendada",
  visitado: "Visitado",
  oferta: "Oferta",
  promesa: "Promesa",
  escriturado: "Escriturado",
  perdido: "Perdido",
};
const ESTADO_COMISION = ["por_facturar", "facturada", "pagada"] as const;

export default function NegociosPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"tablero" | "comisiones">("tablero");
  const [items, setItems] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<Record<string, any>>({});

  async function cargar() {
    setCargando(true);
    const { data, error: err } = await supabase.rpc("negocios_admin");
    if (err) setError(err.message);
    setItems(Array.isArray(data) ? data : []);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line

  async function mover(n: any, estado: string, extra: Record<string, unknown> = {}) {
    setError("");
    if (estado !== "conectado" && estado !== "perdido" && !n.acuerdo_comision_url && !extra.acuerdo_comision_url) {
      const url = prompt("Este negocio no tiene acuerdo de comisión firmado. Pega el enlace del acuerdo (o genera uno en Documentos → Acuerdos):", "");
      if (!url) return;
      extra.acuerdo_comision_url = url;
    }
    const { error: err } = await supabase.from("negocios").update({ estado, ...extra }).eq("id", n.id);
    if (err) {
      setError(err.message.includes("visita_requiere_acuerdo") ? "No se puede agendar visita sin acuerdo de comisión." : err.message);
      return;
    }
    cargar();
  }

  async function guardarComision(c: any, campos: Record<string, unknown>) {
    setError("");
    const { error: err } = await supabase.from("comisiones").update(campos).eq("id", c.id);
    if (err) { setError(err.message); return; }
    cargar();
  }

  const activos = items.filter((n) => n.estado !== "perdido");
  const conComision = items.filter((n) => n.comision);
  const totalKyrelo = conComision.reduce((s, n) => s + Number(n.comision?.monto_kyrelo ?? 0), 0);
  const pendienteKyrelo = conComision.filter((n) => n.comision?.estado !== "pagada").reduce((s, n) => s + Number(n.comision?.monto_kyrelo ?? 0), 0);

  function Tarjeta({ n }: { n: any }) {
    const i = ETAPAS.indexOf(n.estado);
    const siguiente = i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1] : null;
    return (
      <div className="rounded-xl border border-linea bg-superficie p-4">
        <p className="text-sm font-medium text-tinta">{n.titulo || n.propiedad?.titulo || "Negocio"}</p>
        <p className="mt-1 text-xs text-neutro">
          {n.requerimiento?.codigo ? `Comprador #${n.requerimiento.codigo}` : n.propiedad?.consecutivo ? codigoSabana(n.propiedad.consecutivo) : ""}
          {n.requerimiento?.cliente_nombre ? ` · ${n.requerimiento.cliente_nombre}` : ""}
          {n.precio_estimado ? ` · ${formatoCOP(n.precio_estimado)}` : ""}
        </p>
        <p className="mt-1 text-xs text-neutro">
          Agente: <Link href={`/agentes/${n.agente?.id}`} className="text-bosque underline-offset-2 hover:underline">{n.agente?.nombre || "—"}</Link>
          {n.agente?.empresa ? ` · ${n.agente.empresa}` : ""}
        </p>
        <p className="mt-1 text-[11px] text-neutro">
          {n.acuerdo_comision_url ? (
            <a href={n.acuerdo_comision_url} target="_blank" rel="noreferrer" className="underline underline-offset-2">Acuerdo ✓</a>
          ) : (
            <span className="text-[#B87333]">Sin acuerdo firmado</span>
          )}
          {" · "}{formatoFecha(n.fecha_ultimo_movimiento)}
        </p>
        {n.estado !== "escriturado" && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {siguiente && (
              <button onClick={() => mover(n, siguiente)} className="rounded-full bg-bosque px-3 py-1 text-[11px] font-semibold text-white hover:opacity-85">
                → {NOMBRES[siguiente]}
              </button>
            )}
            {i > 0 && (
              <button onClick={() => mover(n, ETAPAS[i - 1])} className="rounded-full border border-linea px-3 py-1 text-[11px] text-neutro hover:text-tinta">← atrás</button>
            )}
            <button
              onClick={() => { const m = prompt("¿Por qué se perdió?", ""); if (m === null) return; mover(n, "perdido", { motivo_perdida: m || null }); }}
              className="rounded-full border border-linea px-3 py-1 text-[11px] text-neutro hover:text-[#8E3B31]"
            >
              Perdido
            </button>
          </div>
        )}
        {n.estado === "escriturado" && n.comision && (
          <p className="mt-3 text-[11px] font-medium text-bosque">Comisión creada · {formatoCOP(n.comision.monto_kyrelo)} para KYRELO · <button onClick={() => setTab("comisiones")} className="underline">ver</button></p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Negocios</h1>
          <p className="mt-1 text-sm text-neutro">{activos.length} en curso · {conComision.length} con comisión</p>
        </div>
        <div className="flex gap-1.5">
          {(["tablero", "comisiones"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition ${tab === t ? "border-bosque bg-bosque text-white" : "border-linea text-neutro hover:text-tinta"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[#8E3B31]">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-sm text-neutro">Cargando…</p>
      ) : tab === "tablero" ? (
        items.length === 0 ? (
          <p className="mt-8 text-sm text-neutro">Todavía no hay negocios. Nacen solos cuando apruebas una postulación (Red de agentes) o aceptas una asociación.</p>
        ) : (
          <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
            {[...ETAPAS, "perdido"].map((estado) => {
              const col = items.filter((n) => n.estado === estado);
              return (
                <div key={estado} className="min-w-[250px] flex-1">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-neutro">{NOMBRES[estado]} · {col.length}</p>
                  <div className="space-y-3">{col.map((n) => <Tarjeta key={n.id} n={n} />)}</div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-linea bg-superficie p-4"><p className="text-[10px] uppercase tracking-widest text-neutro">Comisiones de KYRELO</p><p className="mt-1 font-display text-2xl">{formatoCOP(totalKyrelo)}</p></div>
            <div className="rounded-xl border border-linea bg-superficie p-4"><p className="text-[10px] uppercase tracking-widest text-neutro">Pendiente de pago</p><p className="mt-1 font-display text-2xl text-[#B87333]">{formatoCOP(pendienteKyrelo)}</p></div>
            <div className="rounded-xl border border-linea bg-superficie p-4"><p className="text-[10px] uppercase tracking-widest text-neutro">Negocios escriturados</p><p className="mt-1 font-display text-2xl">{conComision.length}</p></div>
          </div>

          {conComision.length === 0 ? (
            <p className="mt-8 text-sm text-neutro">Cuando un negocio pase a «Escriturado», su comisión aparece aquí calculada sola.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {conComision.map((n) => {
                const c = n.comision;
                const e = editando[c.id] ?? { precio_venta: c.precio_venta, partes: c.partes ?? 1, nota_reparto: c.nota_reparto ?? "" };
                const setE = (k: string, v: any) => setEditando({ ...editando, [c.id]: { ...e, [k]: v } });
                return (
                  <div key={c.id} className="rounded-xl border border-linea bg-superficie p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-tinta">{n.titulo || n.propiedad?.titulo || "Negocio"}</p>
                        <p className="mt-0.5 text-xs text-neutro">
                          Agente {n.agente?.nombre} · {Math.round(Number(c.pct_kyrelo) * 100)}% KYRELO / {Math.round((1 - Number(c.pct_kyrelo)) * 100)}% agente
                          {c.fecha_escritura ? ` · escritura ${formatoFecha(c.fecha_escritura)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        {ESTADO_COMISION.map((s) => (
                          <button key={s} onClick={() => guardarComision(c, { estado: s, ...(s === "pagada" ? { fecha_pago_kyrelo: c.fecha_pago_kyrelo ?? new Date().toISOString().slice(0, 10) } : {}) })}
                            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${c.estado === s ? "border-bosque bg-bosque text-white" : "border-linea text-neutro hover:text-tinta"}`}>
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <label className="text-xs text-neutro">Precio de venta
                        <input inputMode="numeric" value={e.precio_venta ?? ""} onChange={(ev) => setE("precio_venta", ev.target.value)} className="mt-1 w-full rounded-lg border border-linea bg-fondo px-3 py-2 text-sm text-tinta outline-none focus:border-[#1A1A18]" /></label>
                      <label className="text-xs text-neutro">Entre cuántas partes
                        <input inputMode="numeric" value={e.partes ?? 1} onChange={(ev) => setE("partes", ev.target.value)} className="mt-1 w-full rounded-lg border border-linea bg-fondo px-3 py-2 text-sm text-tinta outline-none focus:border-[#1A1A18]" /></label>
                      <label className="text-xs text-neutro sm:col-span-2">Nota del reparto
                        <input value={e.nota_reparto ?? ""} onChange={(ev) => setE("nota_reparto", ev.target.value)} placeholder="Ej: Inmobiliaria Sabana aporta el inmueble" className="mt-1 w-full rounded-lg border border-linea bg-fondo px-3 py-2 text-sm text-tinta outline-none focus:border-[#1A1A18]" /></label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-neutro">
                        Total {formatoCOP(c.monto_total)} ({Math.round(Number(c.pct_comision) * 100)}%)
                        {c.partes && Number(c.partes) > 1 ? ` · KYRELO + agente ${formatoCOP(c.monto_kyrelo_agente)}` : ""}
                        {" · "}<span className="font-semibold text-tinta">KYRELO {formatoCOP(c.monto_kyrelo)}</span> · agente {formatoCOP(c.monto_agente)}
                      </p>
                      <button onClick={() => guardarComision(c, { precio_venta: Number(e.precio_venta) || 0, partes: Math.max(1, Number(e.partes) || 1), nota_reparto: e.nota_reparto || null })}
                        className="rounded-full bg-bosque px-4 py-1.5 text-xs font-semibold text-white hover:opacity-85">Guardar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
