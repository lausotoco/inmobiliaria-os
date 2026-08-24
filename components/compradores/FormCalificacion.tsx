"use client";

/* ============================================================
   Formulario de calificación · seis bloques
   ------------------------------------------------------------
   El orden de los campos es el ORDEN DEL GUION de la
   videollamada, no un orden lógico de base de datos. No lo
   reorganices "para que quede más ordenado": está así para que
   se pueda llenar hablando.

   El panel de viabilidad va debajo del bloque 3 y se recalcula
   con cada tecla.
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MUNICIPIOS } from "@/lib/municipios";
import {
  OPCIONES_CREDITO,
  OPCIONES_EVENTO,
  OPCIONES_ORIGEN,
  OPCIONES_PARTICIPACION,
  OPCIONES_PLAZO_MUDANZA,
  OPCIONES_TIPO_INMUEBLE,
  OPCIONES_VIVE_EN,
  type Parametros,
} from "@/lib/calificacion/config";
import { calcularViabilidad } from "@/lib/calificacion/financiero";
import { calcularScore } from "@/lib/calificacion/score";
import {
  anotarHistorial,
  horasDeRespuesta,
} from "@/lib/calificacion/datos";
import { desdeLead, etiquetaLead, type LeadResumen } from "@/lib/calificacion/desde-lead";
import CampoMoneda from "./CampoMoneda";
import PanelViabilidad from "./PanelViabilidad";

type Datos = {
  nombre: string;
  whatsapp: string;
  origen_lead: string;
  lead_id: string | null;
  municipios: string[];
  tipo_inmueble: string;
  motivo_mudanza: string;
  composicion_hogar: string;
  vive_hoy_en: string;
  presupuesto_maximo: number | null;
  ingreso_familiar: number | null;
  cuota_inicial: number | null;
  estado_credito: string;
  carta_fecha: string;
  monto_preaprobado: number | null;
  carta_vigencia: string;
  ingresos_verificables: boolean;
  plazo_mudanza: string;
  evento_forzante: boolean;
  evento_cual: string;
  evento_fecha: string;
  necesita_vender: boolean;
  venta_publicada: boolean;
  venta_meses: number | null;
  venta_precio: number | null;
  venta_enlace: string;
  decisores: string;
  decisores_participaron: string;
  ya_visito: boolean;
  notas_llamada: string;
  videollamada_realizada: boolean;
  documentos_entregados: boolean;
  rechazos_videollamada: number;
  autorizacion_fecha: string | null;
  autorizacion_version: string | null;
};

const VACIO: Datos = {
  nombre: "",
  whatsapp: "",
  origen_lead: "Directo",
  lead_id: null,
  municipios: [],
  tipo_inmueble: "",
  motivo_mudanza: "",
  composicion_hogar: "",
  vive_hoy_en: "",
  presupuesto_maximo: null,
  ingreso_familiar: null,
  cuota_inicial: null,
  estado_credito: "No ha empezado",
  carta_fecha: "",
  monto_preaprobado: null,
  carta_vigencia: "",
  ingresos_verificables: false,
  plazo_mudanza: "Explorando",
  evento_forzante: false,
  evento_cual: "",
  evento_fecha: "",
  necesita_vender: false,
  venta_publicada: false,
  venta_meses: null,
  venta_precio: null,
  venta_enlace: "",
  decisores: "",
  decisores_participaron: "todos",
  ya_visito: false,
  notas_llamada: "",
  videollamada_realizada: false,
  documentos_entregados: false,
  rechazos_videollamada: 0,
  autorizacion_fecha: null,
  autorizacion_version: null,
};

const campo =
  "w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave";
const etiqueta = "block text-sm font-medium text-tinta";
const leyenda =
  "mb-4 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-widest text-laton";

function Bloque({
  numero,
  titulo,
  children,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-linea bg-superficie p-5 sm:p-6">
      <legend className={leyenda}>
        <span className="text-neutro">{numero}</span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

function Interruptor({
  valor,
  onChange,
  texto,
}: {
  valor: boolean;
  onChange: (v: boolean) => void;
  texto: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-tinta">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-linea accent-bosque"
      />
      {texto}
    </label>
  );
}

export default function FormCalificacion({
  parametros,
  configVersion,
  clienteId,
  inicial,
}: {
  parametros: Parametros;
  configVersion: number;
  clienteId?: string;
  inicial?: Partial<Datos>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [d, setD] = useState<Datos>({ ...VACIO, ...inicial });
  const [leads, setLeads] = useState<LeadResumen[]>([]);
  const [horasRespuesta, setHorasRespuesta] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Datos>(clave: K, valor: Datos[K]) =>
    setD((prev) => ({ ...prev, [clave]: valor }));

  /* Leads de la landing todavía sin comprador asociado. */
  useEffect(() => {
    supabase
      .from("leads_compradores")
      .select(
        "id, codigo, municipio, presupuesto, tipo_inmueble, plazo, telefono_normalizado, created_at, autorizacion_timestamp, autorizacion_texto_version, canal_calculado"
      )
      .is("cliente_id", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setLeads((data as LeadResumen[]) ?? []));
  }, []); // eslint-disable-line

  /* La señal de comportamiento sale del lead, no de la memoria. */
  useEffect(() => {
    horasDeRespuesta(supabase, d.lead_id).then(setHorasRespuesta);
  }, [d.lead_id]); // eslint-disable-line

  const contado = d.estado_credito === "Compra de contado";
  const conCarta = d.estado_credito === "Carta de preaprobación vigente";

  /* ── Cálculo en vivo. Con cada tecla, sin botón. ────────── */
  const viabilidad = useMemo(
    () =>
      calcularViabilidad(
        {
          presupuesto_maximo: d.presupuesto_maximo,
          cuota_inicial: d.cuota_inicial,
          ingreso_familiar: d.ingreso_familiar,
          contado,
        },
        parametros.financieros
      ),
    [d.presupuesto_maximo, d.cuota_inicial, d.ingreso_familiar, contado, parametros]
  );

  const resultado = useMemo(
    () =>
      calcularScore(
        {
          municipios: d.municipios,
          presupuesto_maximo: d.presupuesto_maximo,
          ingreso_familiar: d.ingreso_familiar,
          cuota_inicial: d.cuota_inicial,
          estado_credito: d.estado_credito,
          carta_vigencia: d.carta_vigencia || null,
          ingresos_verificables: d.ingresos_verificables,
          plazo_mudanza: d.plazo_mudanza,
          evento_forzante: d.evento_forzante,
          necesita_vender: d.necesita_vender,
          venta_publicada: d.venta_publicada,
          venta_meses: d.venta_meses,
          decisores_participaron: d.decisores_participaron,
          videollamada_realizada: d.videollamada_realizada,
          documentos_entregados: d.documentos_entregados,
          rechazos_videollamada: d.rechazos_videollamada,
        },
        viabilidad,
        parametros,
        { horas_en_responder: horasRespuesta }
      ),
    [d, viabilidad, parametros, horasRespuesta]
  );

  function vincularLead(id: string) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) {
      set("lead_id", null);
      return;
    }
    const l = desdeLead(lead);
    setD((prev) => ({
      ...prev,
      lead_id: l.lead_id,
      municipios: l.municipios,
      presupuesto_maximo: l.presupuesto_maximo,
      tipo_inmueble: l.tipo_inmueble ?? "",
      plazo_mudanza: l.plazo_mudanza ?? prev.plazo_mudanza,
      origen_lead: l.origen_lead,
      autorizacion_fecha: l.autorizacion_fecha,
      autorizacion_version: l.autorizacion_version,
      whatsapp: prev.whatsapp || "+" + lead.telefono_normalizado,
    }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!d.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);

    /* 1. El comprador ES un cliente: no se duplica la persona. */
    let id = clienteId;
    if (!id) {
      const { data, error: err } = await supabase
        .from("clientes")
        .insert({
          nombre: d.nombre.trim(),
          whatsapp: d.whatsapp || null,
          ciudad: d.municipios[0] ?? null,
          estado: "activo",
        })
        .select("id")
        .single();
      if (err || !data) {
        setError(err?.message ?? "No se pudo crear el comprador.");
        setGuardando(false);
        return;
      }
      id = data.id;
    } else {
      await supabase
        .from("clientes")
        .update({ nombre: d.nombre.trim(), whatsapp: d.whatsapp || null })
        .eq("id", id);
    }

    /* 2. La calificación, con el resultado del motor ya adentro. */
    const fila = {
      cliente_id: id,
      origen_lead: d.origen_lead,
      lead_id: d.lead_id,
      municipios: d.municipios.length ? d.municipios : null,
      tipo_inmueble: d.tipo_inmueble || null,
      motivo_mudanza: d.motivo_mudanza || null,
      composicion_hogar: d.composicion_hogar || null,
      vive_hoy_en: d.vive_hoy_en || null,
      presupuesto_maximo: d.presupuesto_maximo,
      ingreso_familiar: d.ingreso_familiar,
      cuota_inicial: d.cuota_inicial,
      estado_credito: d.estado_credito,
      carta_fecha: d.carta_fecha || null,
      monto_preaprobado: d.monto_preaprobado,
      carta_vigencia: d.carta_vigencia || null,
      ingresos_verificables: d.ingresos_verificables,
      plazo_mudanza: d.plazo_mudanza,
      evento_forzante: d.evento_forzante,
      evento_cual: d.evento_cual || null,
      evento_fecha: d.evento_fecha || null,
      necesita_vender: d.necesita_vender,
      venta_publicada: d.venta_publicada,
      venta_meses: d.venta_meses,
      venta_precio: d.venta_precio,
      venta_enlace: d.venta_enlace || null,
      decisores: d.decisores || null,
      decisores_participaron: d.decisores_participaron,
      ya_visito: d.ya_visito,
      notas_llamada: d.notas_llamada || null,
      videollamada_realizada: d.videollamada_realizada,
      documentos_entregados: d.documentos_entregados,
      rechazos_videollamada: d.rechazos_videollamada,
      autorizacion_fecha: d.autorizacion_fecha,
      autorizacion_version: d.autorizacion_version,
      score_calculado: resultado.total,
      banda_calculada: resultado.banda_calculada,
      desglose: resultado.bloques,
      descalificadores: resultado.descalificadores,
      config_version: configVersion,
      updated_at: new Date().toISOString(),
    };

    /* La banda final solo se toca si todavía no hay una decisión
       manual: un recálculo no puede borrar lo que Laura decidió. */
    const { data: previa } = await supabase
      .from("calificaciones")
      .select("id, banda_final, razon_override")
      .eq("cliente_id", id)
      .maybeSingle();

    const conservaOverride = !!previa?.razon_override;
    const aGuardar: Record<string, unknown> = { ...fila };
    if (!conservaOverride) aGuardar.banda_final = resultado.banda_calculada;

    const { data: guardada, error: err2 } = await supabase
      .from("calificaciones")
      .upsert(aGuardar, { onConflict: "cliente_id" })
      .select("id, banda_final")
      .single();

    if (err2 || !guardada) {
      setError(err2?.message ?? "No se pudo guardar la calificación.");
      setGuardando(false);
      return;
    }

    /* 3. Historial: cada recálculo deja constancia. */
    await anotarHistorial(supabase, {
      calificacion_id: guardada.id,
      cliente_id: id!,
      score: resultado.total,
      banda_calculada: resultado.banda_calculada,
      banda_final: guardada.banda_final ?? resultado.banda_calculada,
      desglose: resultado.bloques,
      descalificadores: resultado.descalificadores,
      config_version: configVersion,
      motivo: clienteId ? "recálculo por edición" : "primera calificación",
    });

    /* 4. El lead queda amarrado al comprador. */
    if (d.lead_id) {
      await supabase
        .from("leads_compradores")
        .update({ cliente_id: id, estado: "calificado" })
        .eq("id", d.lead_id);
    }

    router.push(`/compradores/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="max-w-3xl space-y-5 pb-28">
      {/* ══ 1 · Identificación ══ */}
      <Bloque numero={1} titulo="Identificación">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={etiqueta}>
            Nombre *
            <input
              value={d.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              required
              className={`mt-1.5 ${campo}`}
              placeholder="Nombre completo"
            />
          </label>
          <label className={etiqueta}>
            WhatsApp
            <input
              value={d.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              type="tel"
              className={`mt-1.5 ${campo}`}
              placeholder="+57 300 123 4567"
            />
          </label>
          <label className={etiqueta}>
            Origen del lead
            <select
              value={d.origen_lead}
              onChange={(e) => set("origen_lead", e.target.value)}
              className={`mt-1.5 ${campo}`}
            >
              {OPCIONES_ORIGEN.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className={etiqueta}>
            Lead de la landing
            <select
              value={d.lead_id ?? ""}
              onChange={(e) => vincularLead(e.target.value)}
              className={`mt-1.5 ${campo}`}
            >
              <option value="">No viene de la landing</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {etiquetaLead(l)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Ley 1581: un comprador creado a mano no trae autorización. */}
        <div className="mt-5 rounded-lg bg-fondo px-4 py-3">
          {d.autorizacion_fecha ? (
            <p className="text-sm text-neutro">
              Autorización de datos registrada el{" "}
              {new Date(d.autorizacion_fecha).toLocaleDateString("es-CO")}
              {d.autorizacion_version ? ` · versión ${d.autorizacion_version}` : ""}.
            </p>
          ) : (
            <Interruptor
              valor={false}
              onChange={(v) => {
                if (v) {
                  set("autorizacion_fecha", new Date().toISOString());
                  set("autorizacion_version", "verbal-videollamada");
                }
              }}
              texto="Autorizó el tratamiento de sus datos en la llamada"
            />
          )}
        </div>
      </Bloque>

      {/* ══ 2 · Contexto ══ */}
      <Bloque numero={2} titulo="Contexto">
        <p className={etiqueta}>Municipios de interés</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MUNICIPIOS.filter((m) => m.activo && m.slug !== "sabana-norte").map((m) => {
            const activo = d.municipios.includes(m.nombre);
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() =>
                  set(
                    "municipios",
                    activo
                      ? d.municipios.filter((x) => x !== m.nombre)
                      : [...d.municipios, m.nombre]
                  )
                }
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  activo
                    ? "border-bosque bg-bosque text-white"
                    : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
                }`}
              >
                {m.nombre}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={etiqueta}>
            Tipo de inmueble
            <select
              value={d.tipo_inmueble}
              onChange={(e) => set("tipo_inmueble", e.target.value)}
              className={`mt-1.5 ${campo}`}
            >
              <option value="">Sin definir</option>
              {OPCIONES_TIPO_INMUEBLE.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className={etiqueta}>
            Vive hoy en
            <select
              value={d.vive_hoy_en}
              onChange={(e) => set("vive_hoy_en", e.target.value)}
              className={`mt-1.5 ${campo}`}
            >
              <option value="">Sin definir</option>
              {OPCIONES_VIVE_EN.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className={etiqueta}>
            Motivo de la mudanza
            <input
              value={d.motivo_mudanza}
              onChange={(e) => set("motivo_mudanza", e.target.value)}
              className={`mt-1.5 ${campo}`}
              placeholder="Se les quedó pequeño el apartamento"
            />
          </label>
          <label className={etiqueta}>
            Composición del hogar
            <input
              value={d.composicion_hogar}
              onChange={(e) => set("composicion_hogar", e.target.value)}
              className={`mt-1.5 ${campo}`}
              placeholder="Pareja con dos hijos y un perro"
            />
          </label>
        </div>
      </Bloque>

      {/* ══ 3 · Capacidad financiera ══ */}
      <Bloque numero={3} titulo="Capacidad financiera">
        <div className="grid gap-5 sm:grid-cols-3">
          <label className={etiqueta}>
            Presupuesto máximo
            <CampoMoneda
              valor={d.presupuesto_maximo}
              onChange={(v) => set("presupuesto_maximo", v)}
              placeholder="1.300.000.000"
            />
          </label>
          <label className={etiqueta}>
            Ingreso familiar mensual
            <CampoMoneda
              valor={d.ingreso_familiar}
              onChange={(v) => set("ingreso_familiar", v)}
              placeholder="20.000.000"
            />
          </label>
          <label className={etiqueta}>
            Cuota inicial disponible
            <CampoMoneda
              valor={d.cuota_inicial}
              onChange={(v) => set("cuota_inicial", v)}
              placeholder="390.000.000"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={etiqueta}>
            Estado del crédito
            <select
              value={d.estado_credito}
              onChange={(e) => set("estado_credito", e.target.value)}
              className={`mt-1.5 ${campo}`}
            >
              {OPCIONES_CREDITO.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end pb-1">
            <Interruptor
              valor={d.ingresos_verificables}
              onChange={(v) => set("ingresos_verificables", v)}
              texto={
                contado
                  ? "Fondos verificables (extractos, certificación)"
                  : "Ingresos verificables (nómina, renta, extractos)"
              }
            />
          </div>
        </div>

        {conCarta && (
          <div className="mt-5 grid gap-5 rounded-lg bg-fondo p-4 sm:grid-cols-3">
            <label className={etiqueta}>
              Fecha de la carta
              <input
                type="date"
                value={d.carta_fecha}
                onChange={(e) => set("carta_fecha", e.target.value)}
                className={`mt-1.5 ${campo}`}
              />
            </label>
            <label className={etiqueta}>
              Monto preaprobado
              <CampoMoneda
                valor={d.monto_preaprobado}
                onChange={(v) => set("monto_preaprobado", v)}
                placeholder="900.000.000"
              />
            </label>
            <label className={etiqueta}>
              Vigencia de la carta
              <input
                type="date"
                value={d.carta_vigencia}
                onChange={(e) => set("carta_vigencia", e.target.value)}
                className={`mt-1.5 ${campo}`}
              />
            </label>
            <p className="text-xs text-neutro sm:col-span-3">
              No subas la carta. Aquí solo va el resultado de la verificación: el
              documento se queda con el broker hipotecario.
            </p>
          </div>
        )}
      </Bloque>

      {/* ══ EL PANEL, debajo del bloque 3 ══ */}
      <PanelViabilidad
        v={viabilidad}
        p={parametros.financieros}
        ingreso={d.ingreso_familiar}
      />

      {/* ══ 4 · Urgencia ══ */}
      <Bloque numero={4} titulo="Urgencia">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={etiqueta}>
            Plazo para mudarse
            <select
              value={d.plazo_mudanza}
              onChange={(e) => set("plazo_mudanza", e.target.value)}
              className={`mt-1.5 ${campo}`}
            >
              {OPCIONES_PLAZO_MUDANZA.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end pb-1">
            <Interruptor
              valor={d.evento_forzante}
              onChange={(v) => set("evento_forzante", v)}
              texto="Hay un evento que lo obliga"
            />
          </div>
          {d.evento_forzante && (
            <>
              <label className={etiqueta}>
                ¿Cuál?
                <select
                  value={d.evento_cual}
                  onChange={(e) => set("evento_cual", e.target.value)}
                  className={`mt-1.5 ${campo}`}
                >
                  <option value="">Sin definir</option>
                  {OPCIONES_EVENTO.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className={etiqueta}>
                Fecha del evento
                <input
                  type="date"
                  value={d.evento_fecha}
                  onChange={(e) => set("evento_fecha", e.target.value)}
                  className={`mt-1.5 ${campo}`}
                />
              </label>
            </>
          )}
        </div>
      </Bloque>

      {/* ══ 5 · Dependencia de venta previa ══ */}
      <Bloque numero={5} titulo="Dependencia de venta previa">
        <Interruptor
          valor={d.necesita_vender}
          onChange={(v) => set("necesita_vender", v)}
          texto="Necesita vender algo antes de comprar"
        />
        {d.necesita_vender && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="flex items-end pb-1">
              <Interruptor
                valor={d.venta_publicada}
                onChange={(v) => set("venta_publicada", v)}
                texto="Ya está publicado"
              />
            </div>
            {d.venta_publicada && (
              <label className={etiqueta}>
                ¿Hace cuántos meses?
                <input
                  type="number"
                  min={0}
                  value={d.venta_meses ?? ""}
                  onChange={(e) =>
                    set("venta_meses", e.target.value ? Number(e.target.value) : null)
                  }
                  className={`mt-1.5 ${campo}`}
                  placeholder="3"
                />
              </label>
            )}
            <label className={etiqueta}>
              Precio de lista
              <CampoMoneda
                valor={d.venta_precio}
                onChange={(v) => set("venta_precio", v)}
                placeholder="650.000.000"
              />
            </label>
            <label className={etiqueta}>
              Enlace del aviso
              <input
                type="url"
                value={d.venta_enlace}
                onChange={(e) => set("venta_enlace", e.target.value)}
                className={`mt-1.5 ${campo}`}
                placeholder="https://…"
              />
            </label>
          </div>
        )}
      </Bloque>

      {/* ══ 6 · Decisión ══ */}
      <Bloque numero={6} titulo="Decisión">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={etiqueta}>
            ¿Quiénes deciden?
            <input
              value={d.decisores}
              onChange={(e) => set("decisores", e.target.value)}
              className={`mt-1.5 ${campo}`}
              placeholder="Él y la esposa"
            />
          </label>
          <label className={etiqueta}>
            ¿Participaron en la videollamada?
            <select
              value={d.decisores_participaron}
              onChange={(e) => set("decisores_participaron", e.target.value)}
              className={`mt-1.5 ${campo}`}
            >
              {OPCIONES_PARTICIPACION.map((o) => (
                <option key={o} value={o}>
                  {o === "todos" ? "Todos" : o === "parcial" ? "Parcial" : "No participaron"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-2.5">
          <Interruptor
            valor={d.ya_visito}
            onChange={(v) => set("ya_visito", v)}
            texto="Ya visitó propiedades"
          />
          <Interruptor
            valor={d.videollamada_realizada}
            onChange={(v) => set("videollamada_realizada", v)}
            texto="Aceptó y asistió a la videollamada"
          />
          <Interruptor
            valor={d.documentos_entregados}
            onChange={(v) => set("documentos_entregados", v)}
            texto="Entregó lo que se le pidió cuando se le pidió"
          />
          <label className="flex items-center gap-3 text-sm text-tinta">
            Videollamadas que rechazó
            <input
              type="number"
              min={0}
              value={d.rechazos_videollamada}
              onChange={(e) => set("rechazos_videollamada", Number(e.target.value) || 0)}
              className="w-20 rounded-lg border border-linea bg-fondo px-3 py-1.5 text-sm text-tinta outline-none focus:border-bosque"
            />
          </label>
        </div>

        <label className={`mt-5 block ${etiqueta}`}>
          Notas de la llamada
          <textarea
            value={d.notas_llamada}
            onChange={(e) => set("notas_llamada", e.target.value)}
            rows={4}
            className={`mt-1.5 ${campo}`}
            placeholder="Lo que no cabe en ningún campo pero importa…"
          />
        </label>
      </Bloque>

      {error && (
        <p className="rounded-lg bg-[#F7EFEC] px-4 py-2.5 text-sm text-[#8E3B31]">
          {error}
        </p>
      )}

      {/* ══ Barra fija: el score siempre a la vista ══ */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-superficie/95 px-5 py-3 backdrop-blur md:left-[230px]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-medium tabular-nums text-tinta">
              {resultado.total}
            </span>
            <span className="text-xs text-neutro">/100</span>
            <span
              className={`rounded-full border px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] ${
                resultado.banda_calculada === "A"
                  ? "border-[#1A1A18] bg-[#1A1A18] text-white"
                  : resultado.banda_calculada === "D"
                    ? "border-[#D5BBB5] text-[#8E3B31]"
                    : "border-linea text-neutro"
              }`}
            >
              Banda {resultado.banda_calculada}
            </span>
            {resultado.descalificadores.length > 0 && (
              <span className="hidden text-xs text-[#8E3B31] sm:inline">
                {resultado.descalificadores.length} descalificador
                {resultado.descalificadores.length > 1 ? "es" : ""}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={guardando}
            className="shrink-0 rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar calificación"}
          </button>
        </div>
      </div>
    </form>
  );
}
