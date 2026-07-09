"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { Requerimiento, Propiedad, Match } from "@/lib/types";

type MatchConPropiedad = Match & {
  propiedades: Propiedad | null;
  portada?: string;
};

type ReqConCliente = Requerimiento & {
  clientes: { id: string; nombre: string } | null;
};

export default function RequerimientoDetallePage() {
  const params = useParams();
  const id = params.id as string;

  const [req, setReq] = useState<ReqConCliente | null>(null);
  const [matches, setMatches] = useState<MatchConPropiedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [accionando, setAccionando] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    cargar();
  }, [id]);

  async function cargar() {
    setCargando(true);

    const [reqRes, matchRes] = await Promise.all([
      supabase
        .from("requerimientos")
        .select("*, clientes(id, nombre)")
        .eq("id", id)
        .single(),
      supabase
        .from("matches")
        .select("*, propiedades(*)")
        .eq("requerimiento_id", id)
        .order("score", { ascending: false }),
    ]);

    setReq(reqRes.data as ReqConCliente);

    // Portadas
    const lista = (matchRes.data ?? []) as MatchConPropiedad[];
    const propIds = lista
      .map((m) => m.propiedades?.id)
      .filter(Boolean) as string[];

    if (propIds.length > 0) {
      const { data: imgs } = await supabase
        .from("propiedad_imagenes")
        .select("propiedad_id, ruta_storage, orden")
        .in("propiedad_id", propIds)
        .order("orden");

      const portadas: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imgs ?? []).forEach((img: any) => {
        if (!portadas[img.propiedad_id]) {
          const { data } = supabase.storage
            .from("propiedades")
            .getPublicUrl(img.ruta_storage);
          portadas[img.propiedad_id] = data.publicUrl;
        }
      });

      lista.forEach((m) => {
        if (m.propiedades) m.portada = portadas[m.propiedades.id];
      });
    }

    setMatches(lista);
    setCargando(false);
  }

  async function buscarMatches() {
    setBuscando(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requerimiento_id: id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.mensaje || "Error al buscar coincidencias.");
      } else if (data.total === 0) {
        setMensaje(data.mensaje || "No se encontraron propiedades compatibles.");
      } else {
        setMensaje(`La IA evaluó ${data.total} propiedad${data.total !== 1 ? "es" : ""}.`);
      }
    } catch {
      setMensaje("Error de conexión. Intenta de nuevo.");
    }

    setBuscando(false);
    cargar();
  }

  async function aceptar(matchId: string) {
    setAccionando(matchId);
    await supabase
      .from("matches")
      .update({ estado: "aceptado" })
      .eq("id", matchId);
    setAccionando(null);
    cargar();
  }

  async function descartar(matchId: string) {
    const motivo = prompt(
      "¿Por qué se descarta? (la IA aprende de esto para futuras búsquedas)"
    );
    if (motivo === null) return;

    setAccionando(matchId);
    await supabase
      .from("matches")
      .update({ estado: "descartado", motivo_descarte: motivo || "sin motivo" })
      .eq("id", matchId);
    setAccionando(null);
    cargar();
  }

  function colorScore(score: number | null) {
    if (score === null) return "text-neutro";
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-500";
  }

  if (cargando) {
    return <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>;
  }

  if (!req) {
    return (
      <div className="mt-12 text-center">
        <p className="text-neutro">Requerimiento no encontrado.</p>
        <Link href="/requerimientos" className="mt-3 text-sm text-bosque underline">
          Volver
        </Link>
      </div>
    );
  }

  const sugeridos = matches.filter((m) => m.estado === "sugerido");
  const aceptados = matches.filter((m) => m.estado === "aceptado");
  const descartados = matches.filter((m) => m.estado === "descartado");

  return (
    <div>
      <Link
        href="/requerimientos"
        className="text-sm text-neutro transition hover:text-tinta"
      >
        ← Requerimientos
      </Link>

      {/* Header del requerimiento */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/clientes/${req.clientes?.id}`}
            className="text-sm text-bosque underline"
          >
            {req.clientes?.nombre}
          </Link>
          <h1 className="mt-1 font-display text-3xl font-medium">
            {req.titulo || req.tipo_inmueble || "Requerimiento"}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge texto={req.estado} />
            <Badge texto={req.urgencia} />
            {req.tipo_inmueble && <Badge texto={req.tipo_inmueble} />}
          </div>
        </div>

        <button
          onClick={buscarMatches}
          disabled={buscando}
          className="shrink-0 rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
        >
          {buscando ? "La IA está evaluando…" : "✦ Buscar coincidencias con IA"}
        </button>
      </div>

      {/* Resumen del requerimiento */}
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1.5 rounded-xl border border-linea bg-superficie px-5 py-4 text-sm">
        {(req.presupuesto_min || req.presupuesto_max) && (
          <span>
            <span className="text-neutro">Presupuesto: </span>
            {formatoCOP(req.presupuesto_min)} – {formatoCOP(req.presupuesto_max)}
          </span>
        )}
        {req.ciudad && (
          <span><span className="text-neutro">Ciudad: </span>{req.ciudad}</span>
        )}
        {req.zonas && req.zonas.length > 0 && (
          <span><span className="text-neutro">Zonas: </span>{req.zonas.join(", ")}</span>
        )}
        {req.habitaciones !== null && (
          <span><span className="text-neutro">Hab: </span>{req.habitaciones}</span>
        )}
        {req.banos !== null && (
          <span><span className="text-neutro">Baños: </span>{req.banos}</span>
        )}
        {(req.area_min || req.area_max) && (
          <span>
            <span className="text-neutro">Área: </span>
            {req.area_min ?? "—"}–{req.area_max ?? "—"} m²
          </span>
        )}
      </div>

      {req.preferencias && (
        <p className="mt-3 text-sm italic text-neutro">"{req.preferencias}"</p>
      )}

      {mensaje && (
        <p className="mt-4 rounded-lg bg-bosque-suave px-4 py-2.5 text-sm text-bosque">
          {mensaje}
        </p>
      )}

      {/* Aceptados */}
      {aceptados.length > 0 && (
        <SeccionMatches
          titulo={`Aceptadas (${aceptados.length}) — listas para el portafolio`}
          matches={aceptados}
          colorScore={colorScore}
          accionando={accionando}
          onDescartar={descartar}
        />
      )}

      {/* Sugeridos */}
      {sugeridos.length > 0 && (
        <SeccionMatches
          titulo={`Sugerencias de la IA (${sugeridos.length})`}
          matches={sugeridos}
          colorScore={colorScore}
          accionando={accionando}
          onAceptar={aceptar}
          onDescartar={descartar}
        />
      )}

      {matches.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-linea bg-superficie px-6 py-14 text-center">
          <p className="text-3xl">✦</p>
          <p className="mt-3 font-display text-lg font-medium">
            Sin coincidencias todavía
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutro">
            Pulsa "Buscar coincidencias con IA" y Claude evaluará cada propiedad
            disponible contra este requerimiento, con porcentaje y explicación.
          </p>
        </div>
      )}

      {/* Descartados */}
      {descartados.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-neutro">
            Descartadas ({descartados.length}) — la IA aprende de estos motivos
          </summary>
          <div className="mt-3 space-y-2">
            {descartados.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-linea bg-fondo px-4 py-3 text-sm"
              >
                <span className="font-medium text-tinta">
                  {m.propiedades?.titulo || "Propiedad"}
                </span>
                <span className="text-neutro"> — "{m.motivo_descarte}"</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Sección de matches ──

function SeccionMatches({
  titulo,
  matches,
  colorScore,
  accionando,
  onAceptar,
  onDescartar,
}: {
  titulo: string;
  matches: MatchConPropiedad[];
  colorScore: (s: number | null) => string;
  accionando: string | null;
  onAceptar?: (id: string) => void;
  onDescartar?: (id: string) => void;
}) {
  return (
    <div className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-laton">
        {titulo}
      </h2>
      <div className="mt-3 space-y-4">
        {matches.map((m) => {
          const p = m.propiedades;
          if (!p) return null;
          return (
            <div
              key={m.id}
              className="overflow-hidden rounded-xl border border-linea bg-superficie sm:flex"
            >
              {/* Imagen */}
              {m.portada ? (
                <img
                  src={m.portada}
                  alt={p.titulo ?? "Propiedad"}
                  className="h-44 w-full object-cover sm:h-auto sm:w-52 sm:shrink-0"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-fondo text-4xl text-linea sm:h-auto sm:w-52 sm:shrink-0">
                  ⌂
                </div>
              )}

              {/* Contenido */}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/propiedades/${p.id}`}
                      className="font-medium text-tinta transition hover:text-bosque"
                    >
                      {p.titulo || p.codigo || "Propiedad"}
                    </Link>
                    <p className="mt-0.5 text-sm text-neutro">
                      {[p.barrio, p.ciudad].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-display text-3xl font-medium ${colorScore(m.score)}`}>
                      {m.score}%
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-neutro">
                  {p.precio && (
                    <span className="font-medium text-bosque">
                      {formatoCOP(p.precio)}
                    </span>
                  )}
                  {p.area && <span>{p.area} m²</span>}
                  {p.habitaciones !== null && <span>{p.habitaciones} hab</span>}
                  {p.banos !== null && <span>{p.banos} baños</span>}
                  {p.parqueaderos !== null && <span>{p.parqueaderos} parq</span>}
                </div>

                {m.explicacion && (
                  <p className="mt-3 text-sm leading-relaxed text-tinta">
                    {m.explicacion}
                  </p>
                )}

                {/* Acciones */}
                <div className="mt-4 flex gap-2">
                  {onAceptar && (
                    <button
                      onClick={() => onAceptar(m.id)}
                      disabled={accionando === m.id}
                      className="rounded-lg bg-bosque px-4 py-2 text-xs font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
                    >
                      ✓ Aceptar para portafolio
                    </button>
                  )}
                  {onDescartar && (
                    <button
                      onClick={() => onDescartar(m.id)}
                      disabled={accionando === m.id}
                      className="rounded-lg border border-linea px-4 py-2 text-xs text-neutro transition hover:bg-fondo hover:text-red-600"
                    >
                      ✕ Descartar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
