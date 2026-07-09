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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function contar(tabla: string, filtros?: (q: any) => any) {
    let q = supabase.from(tabla).select("*", { count: "exact", head: true });
    if (filtros) q = filtros(q);
    const { count } = await q;
    return count ?? 0;
  }

  async function cargar() {
    const [
      clientesActivos,
      clientesTotal,
      reqsActivos,
      propsDisponibles,
      matchesSugeridos,
      matchesAceptados,
      portBorrador,
      portEnviados,
      portVistos,
      visitasProximas,
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
        supabase
          .from("tareas")
          .select("*, clientes(id, nombre)")
          .eq("estado", "pendiente")
          .order("fecha_limite", { ascending: true, nullsFirst: false })
          .limit(5),
        supabase
          .from("clientes")
          .select("*")
          .eq("estado", "activo")
          .eq("urgencia", "inmediata")
          .order("ultimo_contacto", { ascending: true, nullsFirst: true })
          .limit(5),
        supabase
          .from("portafolios")
          .select("id, titulo, created_at, clientes(id, nombre)")
          .eq("estado", "borrador")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("conversaciones")
          .select("id, contenido, direccion, fecha, clientes(id, nombre)")
          .order("fecha", { ascending: false })
          .limit(6),
        supabase
          .from("clientes")
          .select("probabilidad_cierre, requerimientos(presupuesto_max)")
          .eq("estado", "activo"),
      ]);

    // Valor estimado del pipeline: presupuesto máx × probabilidad de cierre
    let valorPipeline = 0;
    (pipelineRes.data ?? []).forEach((c: any) => {
      const prob = (c.probabilidad_cierre ?? 0) / 100;
      const maxPresupuesto = Math.max(
        0,
        ...(c.requerimientos ?? []).map((r: any) => r.presupuesto_max ?? 0)
      );
      valorPipeline += maxPresupuesto * prob;
    });

    setD({
      clientesActivos,
      clientesTotal,
      reqsActivos,
      propsDisponibles,
      matchesSugeridos,
      matchesAceptados,
      portBorrador,
      portEnviados,
      portVistos,
      visitasProximas,
      tareasPendientes: tareasRes.data ?? [],
      urgentes: urgentesRes.data ?? [],
      borradores: borradoresRes.data ?? [],
      actividad: actividadRes.data ?? [],
      valorPipeline,
    });
  }

  if (!d) {
    return (
      <div className="mt-20 flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-linea border-t-bosque" />
        <p className="text-sm text-neutro">Cargando tu centro de control…</p>
      </div>
    );
  }

  const kpis = [
    { icono: "👤", valor: d.clientesActivos, etiqueta: "Clientes activos", href: "/clientes", detalle: `${d.clientesTotal} en total` },
    { icono: "◎", valor: d.reqsActivos, etiqueta: "Requerimientos activos", href: "/requerimientos", detalle: "el corazón del negocio" },
    { icono: "⌂", valor: d.propsDisponibles, etiqueta: "Propiedades disponibles", href: "/propiedades", detalle: "en tu inventario" },
    { icono: "▤", valor: d.portEnviados, etiqueta: "Portafolios enviados", href: "/portafolios", detalle: `${d.portVistos} ya vistos` },
  ];

  const embudo = [
    { etapa: "Clientes activos", valor: d.clientesActivos },
    { etapa: "Requerimientos", valor: d.reqsActivos },
    { etapa: "Matches aceptados", valor: d.matchesAceptados },
    { etapa: "Portafolios enviados", valor: d.portEnviados },
    { etapa: "Vistos por el cliente", valor: d.portVistos },
    { etapa: "Visitas programadas", valor: d.visitasProximas },
  ];
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.valor));

  return (
    <div>
      <div className="anim-entrada flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-laton">
            Centro de control
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        {d.valorPipeline > 0 && (
          <div className="text-left sm:text-right">
            <p className="text-xs text-neutro">Pipeline estimado</p>
            <p className="text-xl font-bold tracking-tight text-bosque">
              {formatoCOP(Math.round(d.valorPipeline))}
            </p>
          </div>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link
            key={k.etiqueta}
            href={k.href}
            className="tarjeta-viva anim-entrada rounded-2xl border border-linea bg-superficie p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-xl bg-bosque-suave text-lg">
                {k.icono}
              </span>
              <span className="text-4xl font-bold tracking-tight text-tinta">
                {k.valor}
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-tinta">{k.etiqueta}</p>
            <p className="text-xs text-neutro">{k.detalle}</p>
          </Link>
        ))}
      </div>

      {/* ── Embudo ── */}
      <div className="anim-entrada mt-6 rounded-2xl border border-linea bg-superficie p-6" style={{ animationDelay: "250ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-tinta">Embudo del negocio</h2>
          {d.matchesSugeridos > 0 && (
            <span className="rounded-full bg-bosque-suave px-3 py-1 text-xs font-medium text-bosque">
              ✦ {d.matchesSugeridos} match{d.matchesSugeridos !== 1 ? "es" : ""} por revisar
            </span>
          )}
        </div>
        <div className="mt-5 space-y-3">
          {embudo.map((e, i) => (
            <div key={e.etapa} className="flex items-center gap-3">
              <p className="w-40 shrink-0 text-xs text-neutro sm:w-48 sm:text-sm">
                {e.etapa}
              </p>
              <div className="h-7 flex-1 overflow-hidden rounded-lg bg-fondo">
                <div
                  className="anim-barra flex h-full items-center rounded-lg bg-gradient-to-r from-bosque to-emerald-600 px-2.5"
                  style={{
                    width: `${Math.max(6, (e.valor / maxEmbudo) * 100)}%`,
                    animationDelay: `${300 + i * 90}ms`,
                  }}
                >
                  <span className="text-xs font-bold text-white">{e.valor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Paneles de acción ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Clientes urgentes */}
        <Panel
          titulo="🔥 Clientes urgentes"
          vacio="Sin clientes con urgencia inmediata."
          delay={350}
        >
          {d.urgentes.map((c: any) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-fondo"
            >
              <div>
                <p className="text-sm font-medium text-tinta">{c.nombre}</p>
                <p className="text-xs text-neutro">
                  {c.ultimo_contacto
                    ? `Último contacto: ${formatoFecha(c.ultimo_contacto)}`
                    : "Sin contacto registrado"}
                </p>
              </div>
              <Badge texto="inmediata" />
            </Link>
          ))}
        </Panel>

        {/* Portafolios por enviar */}
        <Panel
          titulo="📤 Portafolios por enviar"
          vacio="No tienes borradores pendientes."
          delay={400}
        >
          {d.borradores.map((p: any) => (
            <Link
              key={p.id}
              href="/portafolios"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition hover:bg-fondo"
            >
              <div>
                <p className="text-sm font-medium text-tinta">
                  {p.titulo || "Portafolio"}
                </p>
                <p className="text-xs text-neutro">
                  Para {p.clientes?.nombre} · {formatoFecha(p.created_at)}
                </p>
              </div>
              <Badge texto="borrador" />
            </Link>
          ))}
        </Panel>

        {/* Tareas pendientes */}
        <Panel
          titulo="✓ Tareas pendientes"
          vacio="Sin tareas pendientes. Las crearás desde el asistente (Módulo 7) o manualmente."
          delay={450}
        >
          {d.tareasPendientes.map((t: any) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl px-3 py-2.5"
            >
              <div>
                <p className="text-sm text-tinta">{t.descripcion}</p>
                <p className="text-xs text-neutro">
                  {t.clientes?.nombre ? `${t.clientes.nombre} · ` : ""}
                  {t.fecha_limite ? `vence ${formatoFecha(t.fecha_limite)}` : "sin fecha"}
                </p>
              </div>
            </div>
          ))}
        </Panel>

        {/* Actividad reciente */}
        <Panel
          titulo="⚡ Actividad reciente"
          vacio="Aquí verás tus últimas notas y envíos."
          delay={500}
        >
          {d.actividad.map((a: any) => (
            <Link
              key={a.id}
              href={`/clientes/${a.clientes?.id}`}
              className="block rounded-xl px-3 py-2.5 transition hover:bg-fondo"
            >
              <p className="text-sm text-tinta line-clamp-1">
                {a.direccion === "enviado" ? "→ " : a.direccion === "recibido" ? "← " : "✎ "}
                {a.contenido}
              </p>
              <p className="text-xs text-neutro">
                {a.clientes?.nombre} · {formatoFecha(a.fecha)}
              </p>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  titulo,
  vacio,
  delay,
  children,
}: {
  titulo: string;
  vacio: string;
  delay: number;
  children: React.ReactNode;
}) {
  const tieneContenido = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <div
      className="anim-entrada rounded-2xl border border-linea bg-superficie p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="px-3 text-sm font-semibold text-tinta">{titulo}</h2>
      <div className="mt-2">
        {tieneContenido ? (
          children
        ) : (
          <p className="px-3 py-4 text-sm text-neutro">{vacio}</p>
        )}
      </div>
    </div>
  );
}
