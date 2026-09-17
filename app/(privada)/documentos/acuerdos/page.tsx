"use client";

// app/(privada)/documentos/acuerdos/page.tsx — Acuerdos con agentes:
// se generan con los datos ya puestos, se envían por enlace y el agente
// los acepta en línea. Llega con ?agente=<id> desde la ficha del agente.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/utils";
import { FIRMANTE_KYRELO, REGLAS } from "@/lib/acuerdos";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TIPOS = [
  { v: "comprador_kyrelo", l: "Comprador referido por KYRELO (60/40 → 50/50)" },
  { v: "inmueble_kyrelo", l: "Inmueble captado por KYRELO (50/50)" },
  { v: "alianza_general", l: "Alianza general (sin negocio específico)" },
];

export default function AcuerdosPage() {
  const supabase = createClient();
  const [acuerdos, setAcuerdos] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({
    agente_id: "", tipo: "comprador_kyrelo", requerimiento_id: "", propiedad_id: "", agente_documento: "",
    firmante_nombre: FIRMANTE_KYRELO.nombre, firmante_documento: FIRMANTE_KYRELO.documento, firmante_ciudad: FIRMANTE_KYRELO.ciudad,
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      const [a, ag, r, p] = await Promise.all([
        supabase.rpc("acuerdos_admin"),
        supabase.rpc("agentes_admin"),
        supabase.from("requerimientos").select("id, codigo, ciudad, titulo").order("created_at", { ascending: false }).limit(200),
        supabase.from("propiedades").select("id, consecutivo, titulo, ciudad, pct_comparte").eq("es_captacion", true).order("created_at", { ascending: false }),
      ]);
      if (a.error) setError(a.error.message);
      setAcuerdos(Array.isArray(a.data) ? a.data : []);
      setAgentes(Array.isArray(ag.data) ? ag.data : []);
      setReqs(r.data ?? []);
      setProps(p.data ?? []);
      try {
        const g = JSON.parse(localStorage.getItem("kyrelo_firmante") || "null");
        if (g) setForm((f) => ({ ...f, ...g }));
      } catch {}
      const pre = new URLSearchParams(window.location.search).get("agente");
      if (pre) { setForm((f) => ({ ...f, agente_id: pre })); setNuevo(true); }
      setCargando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function recargar() {
    const { data } = await supabase.rpc("acuerdos_admin");
    setAcuerdos(Array.isArray(data) ? data : []);
  }

  async function crear() {
    setError("");
    const ag = agentes.find((x) => x.id === form.agente_id);
    if (!ag) { setError("Elige el agente."); return; }
    if (!form.firmante_nombre.trim()) { setError("Escribe quién firma por KYRELO."); return; }
    const req = reqs.find((x) => x.id === form.requerimiento_id);
    const prop = props.find((x) => x.id === form.propiedad_id);
    const cierres = Number(ag.cierres ?? 0);
    const pct_kyrelo = form.tipo === "inmueble_kyrelo" ? 1 - Number(prop?.pct_comparte ?? 0.5) : cierres < 3 ? 0.6 : 0.5;
    const referencia = form.tipo === "comprador_kyrelo" && req ? `comprador #${req.codigo}` : form.tipo === "inmueble_kyrelo" && prop ? `inmueble SAB-${String(prop.consecutivo ?? "").padStart(3, "0")}` : null;
    const firmante = { marca: FIRMANTE_KYRELO.marca, nombre: form.firmante_nombre.trim(), documento: form.firmante_documento.trim(), ciudad: form.firmante_ciudad.trim() };
    try { localStorage.setItem("kyrelo_firmante", JSON.stringify({ firmante_nombre: firmante.nombre, firmante_documento: firmante.documento, firmante_ciudad: firmante.ciudad })); } catch {}
    setGuardando(true);
    const { error: err } = await supabase.from("acuerdos").insert({
      agente_id: ag.id,
      tipo: form.tipo,
      requerimiento_id: form.tipo === "comprador_kyrelo" ? form.requerimiento_id || null : null,
      propiedad_id: form.tipo === "inmueble_kyrelo" ? form.propiedad_id || null : null,
      pct_comision: REGLAS.pctComision,
      pct_kyrelo,
      datos: {
        agente_nombre: ag.nombre || ag.email, agente_documento: form.agente_documento || null, agente_empresa: ag.empresa, agente_telefono: ag.telefono, agente_email: ag.email,
        referencia, firmante,
      },
    });
    setGuardando(false);
    if (err) { setError(err.message); return; }
    setNuevo(false);
    recargar();
  }

  const url = (t: string) => `${window.location.origin}/acuerdo/${t}`;
  async function copiar(a: any) { await navigator.clipboard.writeText(url(a.token)); setCopiado(a.id); setTimeout(() => setCopiado(null), 2000); }
  function whatsapp(a: any) {
    const d = String(a.agente?.telefono ?? "").replace(/\D/g, "");
    const tel = d.length === 10 ? "57" + d : d;
    const txt = encodeURIComponent(`Hola ${String(a.agente?.nombre ?? "").split(" ")[0]}, te comparto el acuerdo de alianza con KYRELO para que lo leas y lo aceptes: ${url(a.token)}`);
    window.open(`https://wa.me/${tel}?text=${txt}`, "_blank", "noopener,noreferrer");
  }
  async function anular(a: any) {
    if (!confirm("¿Anular este acuerdo? El enlace dejará de aceptar firmas.")) return;
    await supabase.from("acuerdos").update({ estado: "anulado" }).eq("id", a.id);
    recargar();
  }

  const inputCls = "mt-1 w-full rounded-lg border border-linea bg-fondo px-3 py-2 text-sm text-tinta outline-none focus:border-[#1A1A18]";
  const agenteSel = agentes.find((x) => x.id === form.agente_id);

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-linea">
        <Link href="/documentos" className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-neutro hover:text-tinta">Analizar documentos</Link>
        <span className="border-b-2 border-bosque px-4 py-2.5 text-sm font-medium text-bosque">Acuerdos con agentes</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Acuerdos con agentes</h1>
          <p className="mt-1 text-sm text-neutro">Se generan con los datos del agente y se aceptan en línea con nombre, cédula, fecha y hora.</p>
        </div>
        <button onClick={() => setNuevo(!nuevo)} className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white hover:bg-bosque-oscuro">{nuevo ? "Cerrar" : "+ Nuevo acuerdo"}</button>
      </div>

      {error && <p className="mt-4 text-sm text-[#8E3B31]">{error}</p>}

      {nuevo && (
        <div className="mt-6 rounded-xl border border-linea bg-superficie p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-neutro">Agente
              <select value={form.agente_id} onChange={(e) => setForm({ ...form, agente_id: e.target.value })} className={inputCls}>
                <option value="">Elige…</option>
                {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre || a.email}{a.empresa ? ` · ${a.empresa}` : ""}{a.acuerdo_firmado ? " (ya firmó uno)" : ""}</option>)}
              </select></label>
            <label className="text-xs text-neutro">Cédula del agente (opcional; él la confirma al aceptar)
              <input value={form.agente_documento} onChange={(e) => setForm({ ...form, agente_documento: e.target.value })} className={inputCls} /></label>
            <label className="text-xs text-neutro sm:col-span-2">Tipo de acuerdo
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select></label>
            {form.tipo === "comprador_kyrelo" && (
              <label className="text-xs text-neutro sm:col-span-2">Comprador (requerimiento)
                <select value={form.requerimiento_id} onChange={(e) => setForm({ ...form, requerimiento_id: e.target.value })} className={inputCls}>
                  <option value="">Sin especificar</option>
                  {reqs.map((r) => <option key={r.id} value={r.id}>#{r.codigo} · {r.titulo || r.ciudad || ""}</option>)}
                </select></label>
            )}
            {form.tipo === "inmueble_kyrelo" && (
              <label className="text-xs text-neutro sm:col-span-2">Inmueble captado
                <select value={form.propiedad_id} onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })} className={inputCls}>
                  <option value="">Sin especificar</option>
                  {props.map((p) => <option key={p.id} value={p.id}>SAB-{String(p.consecutivo ?? "").padStart(3, "0")} · {p.titulo || p.ciudad || ""}</option>)}
                </select></label>
            )}
            <p className="text-xs text-neutro sm:col-span-2">
              Reparto que saldrá en el documento: {form.tipo === "inmueble_kyrelo" ? "50% agente / 50% KYRELO" : agenteSel && Number(agenteSel.cierres ?? 0) >= 3 ? "50% agente / 50% KYRELO (ya tiene 3 cierres)" : "40% agente / 60% KYRELO (tres primeros cierres)"} · comisión total {Math.round(REGLAS.pctComision * 100)}%.
            </p>
            <div className="sm:col-span-2 border-t border-linea pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutro">Quién firma por KYRELO</p>
              <div className="mt-2 grid gap-4 sm:grid-cols-3">
                <label className="text-xs text-neutro">Nombre<input value={form.firmante_nombre} onChange={(e) => setForm({ ...form, firmante_nombre: e.target.value })} className={inputCls} /></label>
                <label className="text-xs text-neutro">Cédula o NIT<input value={form.firmante_documento} onChange={(e) => setForm({ ...form, firmante_documento: e.target.value })} placeholder="C.C. 1.000.000.000" className={inputCls} /></label>
                <label className="text-xs text-neutro">Ciudad<input value={form.firmante_ciudad} onChange={(e) => setForm({ ...form, firmante_ciudad: e.target.value })} className={inputCls} /></label>
              </div>
            </div>
          </div>
          <button onClick={crear} disabled={guardando} className="mt-5 rounded-full bg-bosque px-6 py-2.5 text-sm font-semibold text-white hover:opacity-85 disabled:opacity-60">{guardando ? "Generando…" : "Generar acuerdo"}</button>
        </div>
      )}

      {cargando ? (
        <p className="mt-8 text-sm text-neutro">Cargando…</p>
      ) : acuerdos.length === 0 ? (
        <p className="mt-8 text-sm text-neutro">Todavía no has generado acuerdos.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {acuerdos.map((a) => (
            <div key={a.id} className="rounded-xl border border-linea bg-superficie p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-tinta">
                    <Link href={`/agentes/${a.agente?.id}`} className="hover:text-bosque">{a.agente?.nombre || a.agente?.email}</Link>
                    {a.agente?.empresa ? <span className="text-neutro"> · {a.agente.empresa}</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-neutro">
                    {TIPOS.find((t) => t.v === a.tipo)?.l.split(" (")[0]}{a.datos?.referencia ? ` · ${a.datos.referencia}` : ""} · {Math.round((1 - Number(a.pct_kyrelo)) * 100)}% agente · generado el {formatoFecha(a.created_at)}
                  </p>
                  <p className="mt-1 text-xs">
                    {a.estado === "aceptado" ? <span className="text-bosque">Aceptado por {a.aceptado_nombre} (C.C. {a.aceptado_documento}) el {formatoFecha(a.aceptado_at)}</span>
                      : a.estado === "anulado" ? <span className="text-[#8E3B31]">Anulado</span>
                      : <span className="text-[#B87333]">Pendiente de aceptación</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`/acuerdo/${a.token}`} target="_blank" rel="noreferrer" className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-tinta hover:border-[#1A1A18]">Abrir / PDF</a>
                  <button onClick={() => copiar(a)} className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-tinta hover:border-[#1A1A18]">{copiado === a.id ? "Copiado ✓" : "Copiar enlace"}</button>
                  {a.estado !== "aceptado" && a.estado !== "anulado" && (
                    <>
                      {a.agente?.telefono && <button onClick={() => whatsapp(a)} className="rounded-full bg-bosque px-4 py-1.5 text-xs font-semibold text-white hover:opacity-85">Enviar por WhatsApp</button>}
                      <button onClick={() => anular(a)} className="rounded-full border border-linea px-4 py-1.5 text-xs text-neutro hover:text-[#8E3B31]">Anular</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
