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
      clientesActivos, clientesTotal, reqsActivos, propsDisponibles,
      matchesSugeridos, matchesAceptados, portEnviados, portVistos, visitasProximas,
    ] = await Promise.all([
      contar("clientes", (q) => q.eq("estado", "activo")),
      contar("clientes"),
      contar("requerimientos", (q) => q.eq("estado", "activo")),
      contar("propiedades", (q) => q.eq("estado", "disponible")),
      contar("matches", (q) => q.eq("estado", "sugerido")),
      contar("matches", (q) => q.eq("estado", "aceptado")),
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
      matchesSugeridos, matchesAceptados, portEnviados, portVistos, visitasProximas,
      tareasPendientes: tareasRes.data ?? [],
      urgentes: urgentesRes.data ?? [],
      borradores: borradoresRes.data ?? [],
      actividad: actividadRes.data ?? [],
      valorPipeline,
    });
  }

  if (!d) {
    return (
      <div className="mt-40 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#B9B9B3]">
          Cargando
        </p>
      </div>
    );
  }

  const kpis = [
    { valor: d.clientesActivos, etiqueta: "Clientes activos", href: "/clientes", detalle: `${d.clientesTotal} en total` },
    { valor: d.reqsActivos, etiqueta: "Requerimientos", href: "/requerimientos", detalle: "activos buscando" },
    { valor: d.propsDisponibles, etiqueta: "Propiedades", href: "/propiedades", detalle: "disponibles" },
    { valor: d.portEnviados, etiqueta: "Portafolios", href: "/portafolios", detalle: `${d.portVistos} vistos` },
  ];

  const embudo = [
    { etapa: "Clientes activos", valor: d.clientesActivos },
    { etapa: "Requerimientos", valor: d.reqsActivos },
    { etapa: "Matches aceptados", valor: d.matchesAceptados },
    { etapa: "Portafolios enviados", valor: d.portEnviados },
    { etapa: "Vistos por cliente", valor: d.portVistos },
    { etapa: "Visitas programadas", valor: d.visitasProximas },
  ];
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.valor));

  return (
    <div>
      {/* ── Cabecera editorial ── */}
      <div className="anim-entrada flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#B9B9B3]">
            Centro de control
          </p>
          <h1 className="mt-2 text-[40px] font-bold leading-none tracking-tight">
            Dashboard
          </h1>
        </div>
        {d.valorPipeline > 0 && (
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B9B9B3]">
              Pipeline estimado
            </p>
            <p className="mt-1 text-[26px] font-bold tracking-tight">
              {formatoCOP(Math.round(d.valorPipeline))}
            </p>
          </div>
        )}
      </div>

      {/* ── Alerta de matches ── */}
      {d.matchesSugeridos > 0 && (
        <Link
          href="/requerimientos"
          className="anim-entrada mt-10 flex items-baseline justify-between border-b border-t border-[#141414] py-4 transition-opacity hover:opacity-70"
          style={{ animationDelay: "80ms" }}
        >
          <span className="text-[14px] font-medium">
            {d.matchesSugeridos} match{d.matchesSugeridos !== 1 ? "es" : ""} por
            revisar — la IA encontró propiedades compatibles
          </span>
          <span className="text-[13px]">→</span>
        </Link>
      )}

      {/* ── KPIs: retícula suiza ── */}
      <div className="mt-10 grid grid-cols-2 gap-x-8 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link
            key={k.etiqueta}
            href={k.href}
            className="anim-entrada group border-t border-[#E6E6E1] pb-8 pt-5 transition-colors hover:border-[#141414]"
            style={{ animationDelay: `${120 + i * 60}ms` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C8C86]">
              {k.etiqueta}
            </p>
            <p className="mt-3 text-[52px] font-bold leading-none tracking-tight">
              {k.valor}
            </p>
            <p className="mt-2 text-[12px] font-light text-[#B9B9B3]">
              {k.detalle}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Embudo monocromo ── */}
      <div
        className="anim-entrada border-t border-[#E6E6E1] pt-8"
        style={{ animationDelay: "380ms" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C8C86]">
          Embudo del negocio
        </p>
        <div className="mt-6 space-y-3">
          {embudo.map((e, i) => (
            <div key={e.etapa} className="flex items-center gap-5">
              <p className="w-40 shrink-0 text-[12px] font-light text-[#8C8C86] sm:w-48">
                {e.etapa}
              </p>
              <div className="h-7 flex-1 overflow-hidden rounded-[3px] bg-[#F0F0EB]">
                <div
                  className="anim-barra flex h-full items-center bg-[#141414] px-3"
                  style={{
                    width: `${Math.max(7, (e.valor / maxEmbudo) * 100)}%`,
                    animationDelay: `${450 + i * 80}ms`,
                  }}
                >
                  <span className="text-[11px] font-semibold text-white">
                    {e.valor}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Paneles ── */}
      <div className="mt-14 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <Panel titulo="Clientes urgentes" vacio="Sin clientes con urgencia inmediata." delay={520}>
          {d.urgentes.map((c: any) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="flex items-center justify-between py-3.5 transition-opacity hover:opacity-60"
            >
              <div>
                <p className="text-[13px] font-medium">{c.nombre}</p>
                <p className="mt-0.5 text-[11px] font-light text-[#B9B9B3]">
                  {c.ultimo_contacto
                    ? `Último contacto: ${formatoFecha(c.ultimo_contacto)}`
                    : "Sin contacto registrado"}
                </p>
              </div>
              <Badge texto="inmediata" />
            </Link>
          ))}
        </Panel>

        <Panel titulo="Portafolios por enviar" vacio="No tienes borradores pendientes." delay={580}>
          {d.borradores.map((p: any) => (
            <Link
              key={p.id}
              href="/portafolios"
              className="flex items-center justify-between py-3.5 transition-opacity hover:opacity-60"
            >
              <div>
                <p className="text-[13px] font-medium">{p.titulo || "Portafolio"}</p>
                <p className="mt-0.5 text-[11px] font-light text-[#B9B9B3]">
                  Para {p.clientes?.nombre} · {formatoFecha(p.created_at)}
                </p>
              </div>
              <Badge texto="borrador" />
            </Link>
          ))}
        </Panel>

        <Panel titulo="Tareas pendientes" vacio="Sin tareas pendientes." delay={640}>
          {d.tareasPendientes.map((t: any) => (
            <div key={t.id} className="py-3.5">
              <p className="text-[13px]">{t.descripcion}</p>
              <p className="mt-0.5 text-[11px] font-light text-[#B9B9B3]">
                {t.clientes?.nombre ? `${t.clientes.nombre} · ` : ""}
                {t.fecha_limite ? `vence ${formatoFecha(t.fecha_limite)}` : "sin fecha"}
              </p>
            </div>
          ))}
        </Panel>

        <Panel titulo="Actividad reciente" vacio="Aquí verás tus últimas notas y envíos." delay={700}>
          {d.actividad.map((a: any) => (
            <Link
              key={a.id}
              href={`/clientes/${a.clientes?.id}`}
              className="block py-3.5 transition-opacity hover:opacity-60"
            >
              <p className="text-[13px] line-clamp-1">{a.contenido}</p>
              <p className="mt-0.5 text-[11px] font-light text-[#B9B9B3]">
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
    <div className="anim-entrada" style={{ animationDelay: `${delay}ms` }}>
      <p className="border-b border-[#E6E6E1] pb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C8C86]">
        {titulo}
      </p>
      <div className="divide-y divide-[#EDEDE8]">
        {tieneContenido ? (
          children
        ) : (
          <p className="py-5 text-[13px] font-light text-[#B9B9B3]">{vacio}</p>
        )}
      </div>
    </div>
  );
}
