"use client";

/* ============================================================
   Ficha del comprador
   ------------------------------------------------------------
   Regla del encargo: el score RECOMIENDA, Laura DECIDE. Por eso
   aquí siempre se ven tres cosas juntas: el puntaje, el porqué
   de cada bloque, y el selector para sobrescribir la banda con
   una razón obligatoria. Nunca un resultado sin explicación.
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, formatoFecha } from "@/lib/utils";
import type { Banda } from "@/lib/calificacion/config";
import type { BloqueScore, Descalificador } from "@/lib/calificacion/score";

type Calificacion = {
  id: string;
  cliente_id: string;
  score_calculado: number | null;
  banda_calculada: string | null;
  banda_final: string | null;
  razon_override: string | null;
  override_at: string | null;
  desglose: BloqueScore[] | null;
  descalificadores: Descalificador[] | null;
  config_version: number | null;
  municipios: string[] | null;
  presupuesto_maximo: number | null;
  ingreso_familiar: number | null;
  cuota_inicial: number | null;
  estado_credito: string | null;
  carta_vigencia: string | null;
  plazo_mudanza: string | null;
  origen_lead: string | null;
  notas_llamada: string | null;
  autorizacion_fecha: string | null;
  autorizacion_version: string | null;
  lead_id: string | null;
  updated_at: string;
};

type Historial = {
  id: string;
  score: number | null;
  banda_calculada: string | null;
  banda_final: string | null;
  motivo: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  codigo: string | null;
  created_at: string;
  contactado_at: string | null;
  respondio_at: string | null;
};

const BANDAS: Banda[] = ["A", "B", "C", "D"];

const ESTILO_BANDA: Record<string, string> = {
  A: "border-[#1A1A18] bg-[#1A1A18] text-white",
  B: "border-[#1A1A18]/25 text-[#1A1A18]",
  C: "border-linea text-neutro",
  D: "border-[#D5BBB5] text-[#8E3B31]",
};

export default function FichaCompradorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [c, setC] = useState<Calificacion | null>(null);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [reqs, setReqs] = useState<{ id: string; titulo: string | null }[]>([]);
  const [cargando, setCargando] = useState(true);

  const [bandaManual, setBandaManual] = useState<string>("");
  const [razon, setRazon] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, [id]); // eslint-disable-line

  async function cargar() {
    setCargando(true);

    const [cli, cal, req] = await Promise.all([
      supabase.from("clientes").select("nombre, whatsapp").eq("id", id).maybeSingle(),
      supabase.from("calificaciones").select("*").eq("cliente_id", id).maybeSingle(),
      supabase.from("requerimientos").select("id, titulo").eq("cliente_id", id),
    ]);

    setNombre(cli.data?.nombre ?? "");
    setWhatsapp(cli.data?.whatsapp ?? null);
    setReqs(req.data ?? []);

    const cd = cal.data as Calificacion | null;
    setC(cd);
    setBandaManual(cd?.banda_final ?? cd?.banda_calculada ?? "");
    setRazon(cd?.razon_override ?? "");

    if (cd) {
      const { data: h } = await supabase
        .from("calificacion_historial")
        .select("id, score, banda_calculada, banda_final, motivo, created_at")
        .eq("cliente_id", id)
        .order("created_at", { ascending: true });
      setHistorial(h ?? []);

      if (cd.lead_id) {
        const { data: l } = await supabase
          .from("leads_compradores")
          .select("id, codigo, created_at, contactado_at, respondio_at")
          .eq("id", cd.lead_id)
          .maybeSingle();
        setLead(l as Lead | null);
      }
    }

    setCargando(false);
  }

  /* ── Override: la última palabra es de Laura, pero deja rastro ── */
  async function guardarBanda() {
    if (!c) return;
    const difiere = bandaManual !== c.banda_calculada;
    if (difiere && !razon.trim()) {
      setError("Si cambias la banda calculada, la razón es obligatoria.");
      return;
    }
    setGuardando(true);
    setError(null);

    const { data: sesion } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("calificaciones")
      .update({
        banda_final: bandaManual,
        razon_override: difiere ? razon.trim() : null,
        override_por: difiere ? sesion.user?.id ?? null : null,
        override_at: difiere ? new Date().toISOString() : null,
      })
      .eq("id", c.id);

    if (err) {
      setError(err.message);
      setGuardando(false);
      return;
    }

    await supabase.from("calificacion_historial").insert({
      calificacion_id: c.id,
      cliente_id: c.cliente_id,
      score: c.score_calculado,
      banda_calculada: c.banda_calculada,
      banda_final: bandaManual,
      desglose: c.desglose,
      descalificadores: c.descalificadores,
      config_version: c.config_version,
      motivo: difiere ? `override manual: ${razon.trim()}` : "banda confirmada",
    });

    setGuardando(false);
    cargar();
  }

  /* ── Sellos de tiempo: lo que alimenta el bloque de comportamiento ── */
  async function sellar(campo: "contactado_at" | "respondio_at") {
    if (!lead) return;
    await supabase
      .from("leads_compradores")
      .update({ [campo]: new Date().toISOString() })
      .eq("id", lead.id);
    cargar();
  }

  /* ── Derecho del titular: borrar de verdad, no ocultar ── */
  async function eliminar() {
    const confirmado = window.confirm(
      `¿Eliminar a ${nombre} y toda su calificación?\n\nEsto borra de verdad: la calificación, su historial y sus requerimientos. No se puede deshacer.`
    );
    if (!confirmado) return;
    await supabase.from("clientes").delete().eq("id", id);
    router.push("/compradores");
    router.refresh();
  }

  if (cargando) {
    return <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>;
  }

  if (!c) {
    return (
      <div className="mt-12 text-center">
        <p className="text-neutro">
          {nombre ? `${nombre} todavía no está calificado.` : "Comprador no encontrado."}
        </p>
        {nombre && (
          <Link
            href={`/compradores/${id}/editar`}
            className="mt-4 inline-block rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white"
          >
            Calificarlo ahora
          </Link>
        )}
      </div>
    );
  }

  const banda = c.banda_final ?? c.banda_calculada ?? "D";
  const difiere = c.razon_override !== null;

  return (
    <div>
      <Link href="/compradores" className="text-sm text-neutro transition hover:text-tinta">
        ← Compradores
      </Link>

      {/* ── Cabecera ── */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium">{nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutro">
            {whatsapp && <span>{whatsapp}</span>}
            {c.origen_lead && <span>· {c.origen_lead}</span>}
            <span>· Calificado el {formatoFecha(c.updated_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="font-display text-4xl font-medium tabular-nums leading-none text-tinta">
              {c.score_calculado ?? "—"}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-neutro">
              de 100
            </p>
          </div>
          <span
            className={`rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em] ${ESTILO_BANDA[banda]}`}
          >
            {banda}
          </span>
        </div>
      </div>

      {/* ── Descalificadores: siempre con la razón visible ── */}
      {(c.descalificadores ?? []).length > 0 && (
        <div className="mt-6 rounded-xl border border-[#D5BBB5] bg-[#F7EFEC] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8E3B31]">
            Descalificadores
          </p>
          <ul className="mt-2 space-y-1.5">
            {(c.descalificadores ?? []).map((x) => (
              <li key={x.clave} className="text-sm text-[#8E3B31]">
                Banda limitada a {x.banda_maxima} porque {x.razon.charAt(0).toLowerCase()}
                {x.razon.slice(1)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* ── Desglose ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-linea bg-superficie p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-laton">
                Desglose del puntaje
              </p>
              <p className="text-[11px] text-neutro">
                configuración v{c.config_version ?? "—"}
              </p>
            </div>
            <div className="mt-3 divide-y divide-linea">
              {(c.desglose ?? []).map((b) => (
                <div key={b.clave} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-tinta">{b.etiqueta}</p>
                    <p className="shrink-0 text-sm tabular-nums text-tinta">
                      {b.puntos}
                      <span className="text-neutro">/{b.max}</span>
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm text-neutro">{b.razon}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Datos financieros ── */}
          <div className="mt-5 rounded-xl border border-linea bg-superficie p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-laton">
              Capacidad declarada
            </p>
            <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {[
                ["Presupuesto máximo", formatoCOP(c.presupuesto_maximo)],
                ["Ingreso familiar", formatoCOP(c.ingreso_familiar)],
                ["Cuota inicial", formatoCOP(c.cuota_inicial)],
                ["Estado del crédito", c.estado_credito ?? "—"],
                ["Vigencia de la carta", c.carta_vigencia ? formatoFecha(c.carta_vigencia) : "—"],
                ["Plazo para mudarse", c.plazo_mudanza ?? "—"],
                ["Municipios", (c.municipios ?? []).join(", ") || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 text-sm">
                  <span className="text-neutro">{k}</span>
                  <span className="text-right text-tinta">{v}</span>
                </div>
              ))}
            </div>
            {c.notas_llamada && (
              <p className="mt-4 border-t border-linea pt-3 text-sm text-neutro">
                {c.notas_llamada}
              </p>
            )}
          </div>

          {/* ── Requerimientos, con su puerta de publicación ── */}
          {reqs.length > 0 && (
            <div className="mt-5 rounded-xl border border-linea bg-superficie p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-laton">
                Sus requerimientos
              </p>
              <ul className="mt-3 divide-y divide-linea">
                {reqs.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <Link
                      href={`/requerimientos/${r.id}`}
                      className="text-sm text-tinta hover:underline"
                    >
                      {r.titulo || "Requerimiento sin título"}
                    </Link>
                  </li>
                ))}
              </ul>
              {banda !== "A" && (
                <p className="mt-3 text-xs text-neutro">
                  Con banda {banda} no se pueden publicar en el marketplace.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Columna derecha ── */}
        <div className="space-y-5">
          {/* Override */}
          <div className="rounded-xl border border-linea bg-superficie p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-laton">
              Banda final
            </p>
            <p className="mt-2 text-sm text-neutro">
              Calculada: <span className="text-tinta">{c.banda_calculada}</span>
              {difiere && " · la cambiaste a mano"}
            </p>

            <div className="mt-3 flex gap-1.5">
              {BANDAS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBandaManual(b)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition ${
                    bandaManual === b
                      ? ESTILO_BANDA[b]
                      : "border-linea text-neutro hover:border-bosque"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {bandaManual !== c.banda_calculada && (
              <textarea
                value={razon}
                onChange={(e) => setRazon(e.target.value)}
                rows={3}
                placeholder="¿Por qué difiere de lo calculado? (obligatorio)"
                className="mt-3 w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none focus:border-bosque"
              />
            )}

            {error && <p className="mt-2 text-sm text-[#8E3B31]">{error}</p>}

            <button
              onClick={guardarBanda}
              disabled={guardando}
              className="mt-3 w-full rounded-lg bg-bosque py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Guardar banda"}
            </button>

            {difiere && c.razon_override && (
              <p className="mt-3 border-t border-linea pt-3 text-xs text-neutro">
                “{c.razon_override}” · {formatoFecha(c.override_at)}
              </p>
            )}
          </div>

          {/* Sellos de tiempo del lead */}
          {lead && (
            <div className="rounded-xl border border-linea bg-superficie p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-laton">
                Lead {lead.codigo}
              </p>
              <p className="mt-2 text-xs text-neutro">
                Entró el {formatoFecha(lead.created_at)}
              </p>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => sellar("contactado_at")}
                  className="w-full rounded-lg border border-linea py-2 text-sm text-tinta transition hover:border-bosque"
                >
                  {lead.contactado_at
                    ? `Contactado ${formatoFecha(lead.contactado_at)}`
                    : "Lo contacté ahora"}
                </button>
                <button
                  onClick={() => sellar("respondio_at")}
                  disabled={!lead.contactado_at}
                  className="w-full rounded-lg border border-linea py-2 text-sm text-tinta transition hover:border-bosque disabled:opacity-50"
                >
                  {lead.respondio_at
                    ? `Respondió ${formatoFecha(lead.respondio_at)}`
                    : "Respondió"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-neutro">
                La diferencia entre los dos sellos es la señal de comportamiento del
                score. Vuelve a guardar la calificación para que la tome.
              </p>
            </div>
          )}

          {/* Historial */}
          <div className="rounded-xl border border-linea bg-superficie p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-laton">
              Evolución
            </p>
            {historial.length === 0 ? (
              <p className="mt-2 text-sm text-neutro">Sin cambios todavía.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {historial.map((h) => (
                  <li key={h.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-tinta">
                      {h.banda_final ?? h.banda_calculada}{" "}
                      <span className="tabular-nums text-neutro">({h.score})</span>
                    </span>
                    <span className="text-xs text-neutro">{formatoFecha(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Privacidad */}
          <div className="rounded-xl border border-linea bg-superficie p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-laton">
              Datos personales
            </p>
            <p className="mt-2 text-sm text-neutro">
              {c.autorizacion_fecha
                ? `Autorizó el ${formatoFecha(c.autorizacion_fecha)}${
                    c.autorizacion_version ? ` · versión ${c.autorizacion_version}` : ""
                  }.`
                : "Sin autorización de tratamiento registrada."}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/compradores/${id}/editar`}
                className="rounded-lg border border-linea py-2 text-center text-sm text-tinta transition hover:border-bosque"
              >
                Editar calificación
              </Link>
              <button
                onClick={eliminar}
                className="rounded-lg border border-[#D5BBB5] py-2 text-sm text-[#8E3B31] transition hover:bg-[#F7EFEC]"
              >
                Eliminar comprador
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
