"use client";

// app/(privada)/agentes/[id]/page.tsx — Ficha del agente aliado.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, formatoFecha, codigoSabana } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ESTADOS_AGENTE = ["registrado", "en_videollamada", "activo", "inactivo", "suspendido"];
const NOMBRE_NEGOCIO: Record<string, string> = { conectado: "Conectado", visita_agendada: "Visita agendada", visitado: "Visitado", oferta: "Oferta", promesa: "Promesa", escriturado: "Escriturado", perdido: "Perdido" };

function linkWhatsApp(tel?: string | null) {
  const d = (tel ?? "").replace(/\D/g, "");
  return d ? "https://wa.me/" + (d.length === 10 ? "57" + d : d) : null;
}

export default function AgenteFichaPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [d, setD] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    const { data, error: err } = await supabase.rpc("agente_detalle", { p_id: id });
    if (err) setError(err.message);
    setD(data ?? null);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, [id]); // eslint-disable-line

  async function actualizar(campos: { p_estado?: string | null; p_strikes?: number | null }) {
    setError("");
    const { error: err } = await supabase.rpc("actualizar_agente", { p_id: id, p_estado: campos.p_estado ?? null, p_strikes: campos.p_strikes ?? null });
    if (err) { setError(err.message.includes("actualizar_agente") ? "Falta correr el SQL 10 (actualizar_agente)." : err.message); return; }
    cargar();
  }

  if (cargando) return <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>;
  const p = d?.perfil;
  if (!p) return <div className="mt-12 text-center"><p className="text-neutro">Agente no encontrado.</p>{error && <p className="mt-2 text-sm text-[#8E3B31]">{error}</p>}</div>;
  const wa = linkWhatsApp(p.telefono);
  const pctAgente = Number(p.cierres ?? 0) < 3 ? 40 : 50;

  return (
    <div>
      <Link href="/agentes" className="text-sm text-neutro transition hover:text-tinta">← Agentes aliados</Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium">{p.nombre || p.email}</h1>
          <p className="mt-1 text-sm text-neutro">
            {[p.empresa, p.email, p.telefono].filter(Boolean).join(" · ")}
            {wa && <> · <a href={wa} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-tinta">WhatsApp</a></>}
          </p>
          <p className="mt-1 text-xs text-neutro">Registrado el {formatoFecha(p.created_at)}{p.municipios?.length ? ` · ${p.municipios.join(", ")}` : ""}{p.anos_experiencia ? ` · ${p.anos_experiencia} años de experiencia` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/documentos/acuerdos?agente=${p.id}`} className="rounded-lg bg-bosque px-4 py-2 text-sm font-medium text-white hover:bg-bosque-oscuro">Generar acuerdo</Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[#8E3B31]">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-linea bg-superficie p-4"><p className="text-[10px] uppercase tracking-widest text-neutro">Cierres</p><p className="mt-1 font-display text-2xl">{p.cierres ?? 0}</p><p className="text-[11px] text-neutro">hoy recibe el {pctAgente}%</p></div>
        <div className="rounded-xl border border-linea bg-superficie p-4"><p className="text-[10px] uppercase tracking-widest text-neutro">Acuerdo</p><p className="mt-1 text-sm font-medium">{p.acuerdo_firmado ? <span className="text-bosque">Firmado</span> : <span className="text-[#B87333]">Sin firmar</span>}</p>{p.acuerdo_url && <a href={p.acuerdo_url} target="_blank" rel="noreferrer" className="text-[11px] text-neutro underline">ver</a>}</div>
        <div className="rounded-xl border border-linea bg-superficie p-4">
          <p className="text-[10px] uppercase tracking-widest text-neutro">Estado</p>
          <select value={p.estado_agente ?? "registrado"} onChange={(e) => actualizar({ p_estado: e.target.value })} className="mt-1 w-full rounded-lg border border-linea bg-fondo px-2 py-1.5 text-sm text-tinta outline-none">
            {ESTADOS_AGENTE.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
        <div className="rounded-xl border border-linea bg-superficie p-4">
          <p className="text-[10px] uppercase tracking-widest text-neutro">Strikes</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-2xl">{p.strikes ?? 0}</span>
            <button onClick={() => actualizar({ p_strikes: Number(p.strikes ?? 0) + 1 })} className="rounded-full border border-linea px-2.5 py-0.5 text-xs text-neutro hover:text-[#8E3B31]">+1</button>
            {Number(p.strikes ?? 0) > 0 && <button onClick={() => actualizar({ p_strikes: Number(p.strikes) - 1 })} className="rounded-full border border-linea px-2.5 py-0.5 text-xs text-neutro">−1</button>}
          </div>
        </div>
      </div>

      <Seccion titulo={`Postulaciones (${d.postulaciones.length})`}>
        {d.postulaciones.map((x: any) => (
          <Fila key={x.id} a={x.titulo || "Inmueble"} b={`${x.codigo ? `Comprador #${x.codigo} · ` : ""}${x.precio ? formatoCOP(x.precio) + " · " : ""}${formatoFecha(x.created_at)}${x.motivo_rechazo ? ` · motivo: ${x.motivo_rechazo}` : ""}`} c={x.estado} href={x.requerimiento_id ? `/requerimientos/${x.requerimiento_id}` : undefined} />
        ))}
      </Seccion>
      <Seccion titulo={`Asociaciones (${d.asociaciones.length})`}>
        {d.asociaciones.map((x: any) => (
          <Fila key={x.id} a={`${codigoSabana(x.consecutivo)} · ${x.titulo || "Captación"}`} b={`${formatoFecha(x.created_at)}${x.fecha_vence ? ` · vence ${formatoFecha(x.fecha_vence)}` : ""}${x.cupo_portales ? " · cupo de portales" : ""}`} c={x.estado} href={`/propiedades/${x.propiedad_id}`} />
        ))}
      </Seccion>
      <Seccion titulo={`Negocios (${d.negocios.length})`}>
        {d.negocios.map((x: any) => (
          <Fila key={x.id} a={x.titulo || "Negocio"} b={`${formatoFecha(x.fecha_ultimo_movimiento)}${x.acuerdo_comision_url ? " · acuerdo ✓" : " · sin acuerdo"}`} c={NOMBRE_NEGOCIO[x.estado] ?? x.estado} href="/comisiones" />
        ))}
      </Seccion>
      <Seccion titulo={`Acuerdos (${d.acuerdos.length})`}>
        {d.acuerdos.map((x: any) => (
          <Fila key={x.id} a={x.tipo === "inmueble_kyrelo" ? "Inmueble KYRELO" : x.tipo === "alianza_general" ? "Alianza general" : "Comprador KYRELO"} b={`${formatoFecha(x.created_at)}${x.aceptado_at ? ` · aceptado por ${x.aceptado_nombre} el ${formatoFecha(x.aceptado_at)}` : ""}`} c={x.estado} href={`/acuerdo/${x.token}`} externo />
        ))}
      </Seccion>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: any }) {
  const vacio = !children || (Array.isArray(children) && children.length === 0);
  return (
    <section className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutro">{titulo}</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-linea bg-superficie">
        {vacio ? <p className="p-4 text-sm text-neutro">Nada todavía.</p> : children}
      </div>
    </section>
  );
}

function Fila({ a, b, c, href, externo }: { a: string; b: string; c: string; href?: string; externo?: boolean }) {
  const inner = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linea p-4 first:border-t-0">
      <div className="min-w-0"><p className="truncate text-sm font-medium text-tinta">{a}</p><p className="mt-0.5 text-xs text-neutro">{b}</p></div>
      <span className="rounded-full border border-linea px-3 py-1 text-[11px] font-medium capitalize text-tinta">{String(c).replace(/_/g, " ")}</span>
    </div>
  );
  if (!href) return inner;
  return externo ? <a href={href} target="_blank" rel="noreferrer" className="block hover:bg-fondo">{inner}</a> : <Link href={href} className="block hover:bg-fondo">{inner}</Link>;
}
