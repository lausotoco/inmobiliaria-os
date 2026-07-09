"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, formatoFecha } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Datos = {
  clientesActivos: number;
  clientesTotal: number;
  reqsActivos: number;
  propsDisponibles: number;
  matchesSugeridos: number;
  matchesAceptados: number;
  portBorrador: number;
  portEnviados: number;
  portVistos: number;
  visitasProximas: number;
  tareasPendientes: any[];
  urgentes: any[];
  borradores: any[];
  actividad: any[];
  valorPipeline: number;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [d, setD] = useState<Datos | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function contar(tabla: string, filtros?: (q: any) => any) {
    let q = supabase.from(tabla).select("*", { count: "exact", head: true });
    if (filtros) q = filtros(q);
    const { count } = await q;
    return count ?? 0;
  }

  async function cargar() {
    const [
      clientesActivos, clientesTotal, reqsActivos, propsDisponibles,
      matchesSugeridos, matchesAceptados,
      portBorrador, portEnviados, portVistos, visitasProximas,
    ] = await Promise.all([
      contar("clientes", (q) => q.eq("estado", "activo")),
      contar("clientes"),
      contar("requerimientos", (q) => q.eq("estado", "activo")),
      contar("propiedades", (q) => q.eq("estado", "disponible")),
      contar("matches", (q) => q.eq("estado", "sugerido")),
      contar("matches", (q) => q.eq("estado", "aceptado")),
      contar("portafolios", (q) => q.eq("estado", "borrador")),
      contar("portafolios", (q) => q.in("estado", ["enviado", "visto", "respondido"])),
      contar("portafolios", (q) => q.in("estado", ["visto", "respondido"])),
      contar("visitas", (q) => q.eq("estado", "programada")),
    ]);

    const [tareasRes, urgentesRes, borradoresRes, actividadRes, pipelineRes] =
      await Promise.all([
        supabase.from("tareas").select("*, clientes(id, nombre)").eq("estado", "pendiente").order("fecha_limite", { ascending: true, nullsFirst: false }).limit(5),
        supabase.from("clientes").select("*").eq("estado", "activo").eq("urgencia", "inmediata").order("ultimo_contacto", { ascending: true, nullsFirst: true }).limit(5),
        supabase.from("portafolios").select("id, titulo, created_at, clientes(id, nombre)").eq("estado", "borrador").order("created_at", { ascending: false }).limit(5),
        supabase.from("conversaciones").select("id, contenido, direccion, fecha, clientes(id, nombre)").order("fecha", { ascending: false }).limit(6),
        supabase.from("clientes").select("probabilidad_cierre, requerimientos(presupuesto_max)").eq("estado", "activo"),
      ]);

    let valorPipeline = 0;
    (pipelineRes.data ?? []).forEach((c: any) => {
      const prob = (c.probabilidad_cierre ?? 0) / 100;
      const maxPresupuesto = Math.max(0, ...(c.requerimientos ?? []).map((r: any) => r.presupuesto_max ?? 0));
      valorPipeline += maxPresupuesto * prob;
    });

    setD({
      clientesActivos, clientesTotal, reqsActivos, propsDisponibles,
      matchesSugeridos, matchesAceptados,
      portBorrador, portEnviados, portVistos, visitasProximas,
      tareasPendientes: tareasRes.data ?? [],
      urgentes: urgentesRes.data ?? [],
      borradores: borradoresRes.data ?? [],
      actividad: actividadRes.data ?? [],
      valorPipeline,
    });
  }

  if (!d) {
    return (
      <div className="mt-32 flex flex-col items-center gap-4">
        <div className="relative size-10">
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
        </div>
        <p className="text-sm text-neutro">Cargando tu centro de control…</p>
      </div>
    );
  }

  const kpis = [
    { icono: "◉", valor: d.clientesActivos, etiqueta: "Clientes activos", href: "/clientes", detalle: `${d.clientesTotal} en total`, color: "from-cyan-400 to-blue-500" },
    { icono: "◎", valor: d.reqsActivos, etiqueta: "Requerimientos", href: "/requerimientos", detalle: "activos buscando", color: "from-blue-500 to-indigo-500" },
    { icono: "⬢", valor: d.propsDisponibles, etiqueta: "Propiedades", href: "/propiedades", detalle: "disponibles", color: "from-violet-500 to-purple-500" },
    { icono: "▣", valor: d.portEnviados, etiqueta: "Portafolios", href: "/portafolios", detalle: `${d.portVistos} vistos`, color: "from-emerald-400 to-teal-500" },
  ];

  const embudo = [
    { etapa: "Clientes activos", valor: d.clientesActivos, color: "from-cyan-400 to-cyan-300" },
    { etapa: "Requerimientos", valor: d.reqsActivos, color: "from-sky-500 to-sky-400" },
    { etapa: "Matches aceptados", valor: d.matchesAceptados, color: "from-sky-500 to-sky-400" },
    { etapa: "Portafolios enviados", valor: d.portEnviados, color: "from-indigo-500 to-indigo-400" },
    { etapa: "Vistos por cliente", valor: d.portVistos, color: "from-violet-500 to-violet-400" },
    { etapa: "Visitas programadas", valor: d.visitasProximas, color: "from-purple-500 to-fuchsia-400" },
  ];
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.valor));

  return (
    <div>
      {/* Header */}
      <div className="anim-entrada flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutro">
            Centro de control
          </p>
          <h1 className="mt-0.5 text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        {d.valorPipeline > 0 && (
          <div className="anim-entrada text-left sm:text-right" style={{ animationDelay: "150ms" }}>
            <p className="text-[11px] font-medium text-neutro">Pipeline estimado</p>
            <p className="grad-acento-texto text-2xl font-bold tracking-tight">
              {formatoCOP(Math.round(d.valorPipeline))}
            </p>
          </div>
        )}
      </div>

      {/* Alerta de matches */}
      {d.matchesSugeridos > 0 && (
        <Link
          href="/requerimientos"
          className="anim-entrada mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-violet-500/5 to-transparent border border-cyan-500/20 px-5 py-3.5 transition hover:border-cyan-500/40"
          style={{ animationDelay: "80ms" }}
        >
          <span className="flex size-8 items-center justify-center rounded-xl grad-acento text-xs font-bold text-white shadow-lg shadow-cyan-500/30">✦</span>
          <span className="text-sm">
            <span className="font-semibold text-cyan-300">{d.matchesSugeridos} match{d.matchesSugeridos !== 1 ? "es" : ""}</span>
            <span className="text-neutro"> por revisar — la IA encontró propiedades compatibles</span>
          </span>
        </Link>
      )}

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link
            key={k.etiqueta}
            href={k.href}
            className="tarjeta-viva anim-entrada group rounded-2xl bg-superficie p-5"
            style={{ animationDelay: `${100 + i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${k.color} text-sm text-white shadow-lg`}>
                {k.icono}
              </span>
              <span className="text-3xl font-bold tracking-tight text-tinta">
                {k.valor}
              </span>
            </div>
            <p className="mt-3 text-[13px] font-semibold text-tinta">{k.etiqueta}</p>
            <p className="text-[11px] text-neutro">{k.detalle}</p>
          </Link>
        ))}
      </div>

      {/* Embudo */}
      <div className="anim-entrada mt-5 rounded-2xl border border-linea bg-superficie p-6" style={{ animationDelay: "350ms" }}>
        <h2 className="text-[13px] font-bold text-tinta">Embudo del negocio</h2>
        <div className="mt-5 space-y-2.5">
          {embudo.map((e, i) => (
            <div key={e.etapa} className="flex items-center gap-3">
              <p className="w-36 shrink-0 text-[12px] font-medium text-neutro sm:w-44">
                {e.etapa}
              </p>
              <div className="h-8 flex-1 overflow-hidden rounded-xl bg-fondo">
                <div
                  className={`anim-barra flex h-full items-center rounded-xl bg-gradient-to-r ${e.color} px-3`}
                  style={{
                    width: `${Math.max(8, (e.valor / maxEmbudo) * 100)}%`,
                    animationDelay: `${400 + i * 80}ms`,
                  }}
                >
                  <span className="text-[12px] font-bold text-white drop-shadow-sm">
                    {e.valor}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paneles de acción */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel titulo="🔥 Clientes urgentes" vacio="Sin clientes con urgencia inmediata." delay={500}>
          {d.urgentes.map((c: any) => (
            <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-fondo">
              <div>
                <p className="text-[13px] font-semibold text-tinta">{c.nombre}</p>
                <p className="text-[11px] text-neutro">
                  {c.ultimo_contacto ? `Último contacto: ${formatoFecha(c.ultimo_contacto)}` : "Sin contacto registrado"}
                </p>
              </div>
              <Badge texto="inmediata" />
            </Link>
          ))}
        </Panel>

        <Panel titulo="📤 Portafolios por enviar" vacio="No tienes borradores pendientes." delay={560}>
          {d.borradores.map((p: any) => (
            <Link key={p.id} href="/portafolios" className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-fondo">
              <div>
                <p className="text-[13px] font-semibold text-tinta">{p.titulo || "Portafolio"}</p>
                <p className="text-[11px] text-neutro">Para {p.clientes?.nombre} · {formatoFecha(p.created_at)}</p>
              </div>
              <Badge texto="borrador" />
            </Link>
          ))}
        </Panel>

        <Panel titulo="✓ Tareas pendientes" vacio="Sin tareas pendientes." delay={620}>
          {d.tareasPendientes.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl px-3 py-2.5">
              <div>
                <p className="text-[13px] text-tinta">{t.descripcion}</p>
                <p className="text-[11px] text-neutro">
                  {t.clientes?.nombre ? `${t.clientes.nombre} · ` : ""}
                  {t.fecha_limite ? `vence ${formatoFecha(t.fecha_limite)}` : "sin fecha"}
                </p>
              </div>
            </div>
          ))}
        </Panel>

        <Panel titulo="⚡ Actividad reciente" vacio="Aquí verás tus últimas notas y envíos." delay={680}>
          {d.actividad.map((a: any) => (
            <Link key={a.id} href={`/clientes/${a.clientes?.id}`} className="block rounded-xl px-3 py-2.5 transition hover:bg-fondo">
              <p className="text-[13px] text-tinta line-clamp-1">
                {a.direccion === "enviado" ? "→ " : a.direccion === "recibido" ? "← " : "✎ "}
                {a.contenido}
              </p>
              <p className="text-[11px] text-neutro">{a.clientes?.nombre} · {formatoFecha(a.fecha)}</p>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ titulo, vacio, delay, children }: { titulo: string; vacio: string; delay: number; children: React.ReactNode; }) {
  const tieneContenido = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="anim-entrada rounded-2xl border border-linea bg-superficie p-5" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="px-3 text-[13px] font-bold text-tinta">{titulo}</h2>
      <div className="mt-2.5">{tieneContenido ? children : <p className="px-3 py-5 text-[13px] text-neutro">{vacio}</p>}</div>
    </div>
  );
}
