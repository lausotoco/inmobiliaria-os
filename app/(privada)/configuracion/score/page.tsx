"use client";

/* ============================================================
   Editor de pesos, umbrales y parámetros
   ------------------------------------------------------------
   Todo lo que mueve el score se cambia aquí, sin desplegar nada.
   Guardar NO edita la configuración vigente: crea una versión
   nueva y desactiva la anterior. Los scores ya calculados
   guardan con qué versión se calcularon, así que cambiar los
   pesos hoy no reescribe la historia de ayer.
   ============================================================ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  fusionarParametros,
  PARAMETROS_INICIALES,
  type Parametros,
} from "@/lib/calificacion/config";
import { verificarMotor } from "@/lib/calificacion/financiero";
import { cargarConfig, guardarConfig } from "@/lib/calificacion/datos";
import { formatoFecha } from "@/lib/utils";

type Version = {
  version: number;
  activa: boolean;
  nota: string | null;
  created_at: string;
};

type Override = {
  banda_calculada: string | null;
  banda_final: string | null;
  razon_override: string;
  override_at: string | null;
  clientes: { nombre: string } | null;
};

const ORDEN: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

const campo =
  "w-24 rounded-lg border border-linea bg-fondo px-3 py-2 text-sm tabular-nums text-tinta outline-none transition focus:border-bosque";

function Num({
  etiqueta,
  valor,
  onChange,
  sufijo,
  paso = 1,
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
  sufijo?: string;
  paso?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-neutro">{etiqueta}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          type="number"
          step={paso}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className={campo}
        />
        {sufijo && <span className="w-8 text-xs text-neutro">{sufijo}</span>}
      </span>
    </label>
  );
}

function Tarjeta({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-linea bg-superficie p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-laton">{titulo}</p>
      {nota && <p className="mt-1.5 text-xs text-neutro">{nota}</p>}
      <div className="mt-3 divide-y divide-linea">{children}</div>
    </div>
  );
}

export default function ConfiguracionScorePage() {
  const supabase = createClient();
  const [p, setP] = useState<Parametros>(PARAMETROS_INICIALES);
  const [versionActual, setVersionActual] = useState(0);
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const verificacion = verificarMotor();

  useEffect(() => {
    cargar();
  }, []); // eslint-disable-line

  async function cargar() {
    setCargando(true);
    const cfg = await cargarConfig(supabase);
    setP(cfg.parametros);
    setVersionActual(cfg.version);

    const [{ data: vs }, { data: ov }] = await Promise.all([
      supabase
        .from("score_config")
        .select("version, activa, nota, created_at")
        .order("version", { ascending: false })
        .limit(15),
      supabase
        .from("calificaciones")
        .select("banda_calculada, banda_final, razon_override, override_at, clientes(nombre)")
        .not("razon_override", "is", null)
        .order("override_at", { ascending: false }),
    ]);

    setVersiones(vs ?? []);
    setOverrides((ov as unknown as Override[]) ?? []);
    setCargando(false);
  }

  /* Edita una rama del objeto sin tocar el resto. */
  function set(ruta: string[], valor: number | boolean | string) {
    setP((prev) => {
      const copia = structuredClone(prev) as any;
      let nodo = copia;
      for (const clave of ruta.slice(0, -1)) nodo = nodo[clave];
      nodo[ruta[ruta.length - 1]] = valor;
      return copia;
    });
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    const { error, version } = await guardarConfig(supabase, p, nota);
    setGuardando(false);
    if (error) {
      setMensaje("No se pudo guardar: " + error);
      return;
    }
    setNota("");
    setMensaje(
      `Guardado como versión ${version}. Los scores ya calculados no cambiaron: se recalculan cuando vuelvas a guardar cada comprador.`
    );
    cargar();
  }

  function restaurarIniciales() {
    setP(fusionarParametros(PARAMETROS_INICIALES));
    setMensaje("Valores iniciales cargados. Todavía no se ha guardado nada.");
  }

  const subidas = overrides.filter(
    (o) =>
      (ORDEN[o.banda_final ?? "D"] ?? 3) < (ORDEN[o.banda_calculada ?? "D"] ?? 3)
  );
  const bajadas = overrides.filter(
    (o) =>
      (ORDEN[o.banda_final ?? "D"] ?? 3) > (ORDEN[o.banda_calculada ?? "D"] ?? 3)
  );

  const b = p.bloques;

  if (cargando) {
    return <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>;
  }

  return (
    <div className="pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            Configuración
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Motor de score</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutro">
            Estos pesos son una hipótesis, no una verdad. Cámbialos cuando tengas
            operaciones cerradas que digan qué predijo de verdad el cierre.
          </p>
        </div>
        <Link
          href="/compradores"
          className="shrink-0 text-sm text-neutro transition hover:text-tinta"
        >
          Compradores →
        </Link>
      </div>

      {/* ── Verificación del motor ── */}
      <div
        className={`mt-6 rounded-xl border p-5 ${
          verificacion.todoOk ? "border-[#1A1A18]/25 bg-superficie" : "border-[#D5BBB5] bg-[#F7EFEC]"
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-laton">
            Verificación del motor
          </p>
          <span
            className={`text-xs font-semibold ${
              verificacion.todoOk ? "text-[#1A1A18]" : "text-[#8E3B31]"
            }`}
          >
            {verificacion.todoOk ? "✓ correcto" : "✗ revisar"}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-neutro">
          Caso de referencia: casa de $1.300.000.000, inicial de $390.000.000, ingreso
          de $20.000.000, al 15% E.A. a 20 años. Se comprueba con parámetros fijos, no
          con los de abajo: prueba la fórmula, no la tasa.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <tbody className="divide-y divide-linea">
              {verificacion.filas.map((f) => (
                <tr key={f.concepto}>
                  <td className="py-1.5 pr-3 text-neutro">{f.concepto}</td>
                  <td className="py-1.5 text-right tabular-nums text-tinta">{f.obtenido}</td>
                  <td className="w-8 py-1.5 pl-3 text-right">
                    <span className={f.ok ? "text-[#1A1A18]" : "text-[#8E3B31]"}>
                      {f.ok ? "✓" : "✗"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* ── Parámetros financieros ── */}
        <Tarjeta
          titulo="Parámetros financieros"
          nota="Los que mueven la cuota, el LTV y el presupuesto viable. Cambia la tasa cuando cambie el mercado."
        >
          <Num
            etiqueta="Tasa No VIS de referencia"
            valor={+(p.financieros.tasa_ea * 100).toFixed(2)}
            onChange={(v) => set(["financieros", "tasa_ea"], v / 100)}
            sufijo="% E.A."
            paso={0.25}
          />
          <Num
            etiqueta="Plazo del crédito"
            valor={p.financieros.plazo_meses}
            onChange={(v) => set(["financieros", "plazo_meses"], v)}
            sufijo="meses"
            paso={12}
          />
          <Num
            etiqueta="LTV máximo"
            valor={+(p.financieros.ltv_maximo * 100).toFixed(1)}
            onChange={(v) => set(["financieros", "ltv_maximo"], v / 100)}
            sufijo="%"
          />
          <Num
            etiqueta="Tope de carga sobre el ingreso"
            valor={+(p.financieros.tope_carga * 100).toFixed(1)}
            onChange={(v) => set(["financieros", "tope_carga"], v / 100)}
            sufijo="%"
          />
        </Tarjeta>

        {/* ── Cortes de banda ── */}
        <Tarjeta titulo="Cortes de banda" nota="Puntaje mínimo para cada banda. Debajo del corte de C, es D.">
          <Num etiqueta="Banda A desde" valor={p.bandas.a} onChange={(v) => set(["bandas", "a"], v)} sufijo="pts" />
          <Num etiqueta="Banda B desde" valor={p.bandas.b} onChange={(v) => set(["bandas", "b"], v)} sufijo="pts" />
          <Num etiqueta="Banda C desde" valor={p.bandas.c} onChange={(v) => set(["bandas", "c"], v)} sufijo="pts" />
        </Tarjeta>

        {/* ── Bloques del score ── */}
        <Tarjeta titulo="1 · Capacidad financiera" nota={`Máximo ${b.capacidad.max} puntos`}>
          <Num etiqueta="Máximo del bloque" valor={b.capacidad.max} onChange={(v) => set(["bloques", "capacidad", "max"], v)} sufijo="pts" />
          <Num etiqueta="Carta de preaprobación vigente" valor={b.capacidad.preaprobacion_vigente} onChange={(v) => set(["bloques", "capacidad", "preaprobacion_vigente"], v)} sufijo="pts" />
          <Num etiqueta="Contado demostrable" valor={b.capacidad.contado} onChange={(v) => set(["bloques", "capacidad", "contado"], v)} sufijo="pts" />
          <Num etiqueta="Solicitud radicada" valor={b.capacidad.radicada} onChange={(v) => set(["bloques", "capacidad", "radicada"], v)} sufijo="pts" />
          <Num etiqueta="Inicial suficiente + ingresos verificables" valor={b.capacidad.inicial_e_ingresos} onChange={(v) => set(["bloques", "capacidad", "inicial_e_ingresos"], v)} sufijo="pts" />
          <Num etiqueta="Inicial mínima para ese caso" valor={+(b.capacidad.inicial_minima_pct * 100).toFixed(0)} onChange={(v) => set(["bloques", "capacidad", "inicial_minima_pct"], v / 100)} sufijo="%" />
        </Tarjeta>

        <Tarjeta titulo="2 · Coherencia del presupuesto" nota="Sale del panel de viabilidad. Ya no se calcula a ojo.">
          <Num etiqueta="Máximo del bloque" valor={b.coherencia.max} onChange={(v) => set(["bloques", "coherencia", "max"], v)} sufijo="pts" />
          <Num etiqueta="LTV y carga dentro del límite" valor={b.coherencia.ambas_cumplen} onChange={(v) => set(["bloques", "coherencia", "ambas_cumplen"], v)} sufijo="pts" />
          <Num etiqueta="Una de las dos falla" valor={b.coherencia.una_falla} onChange={(v) => set(["bloques", "coherencia", "una_falla"], v)} sufijo="pts" />
          <Num etiqueta="Las dos fallan" valor={b.coherencia.ambas_fallan} onChange={(v) => set(["bloques", "coherencia", "ambas_fallan"], v)} sufijo="pts" />
        </Tarjeta>

        <Tarjeta titulo="3 · Evento forzante" nota={`Máximo ${b.urgencia.max} puntos`}>
          <Num etiqueta="Máximo del bloque" valor={b.urgencia.max} onChange={(v) => set(["bloques", "urgencia", "max"], v)} sufijo="pts" />
          <Num etiqueta="Menos de 3 meses CON evento" valor={b.urgencia.menos_3_con_evento} onChange={(v) => set(["bloques", "urgencia", "menos_3_con_evento"], v)} sufijo="pts" />
          <Num etiqueta="Menos de 3 meses sin evento" valor={b.urgencia.menos_3_sin_evento} onChange={(v) => set(["bloques", "urgencia", "menos_3_sin_evento"], v)} sufijo="pts" />
          <Num etiqueta="De 3 a 6 meses" valor={b.urgencia.tres_a_seis} onChange={(v) => set(["bloques", "urgencia", "tres_a_seis"], v)} sufijo="pts" />
          <Num etiqueta="De 6 a 12 meses" valor={b.urgencia.seis_a_doce} onChange={(v) => set(["bloques", "urgencia", "seis_a_doce"], v)} sufijo="pts" />
          <Num etiqueta="Explorando" valor={b.urgencia.explorando} onChange={(v) => set(["bloques", "urgencia", "explorando"], v)} sufijo="pts" />
        </Tarjeta>

        <Tarjeta titulo="4 · Dependencia de venta previa" nota={`Máximo ${b.venta_previa.max} puntos`}>
          <Num etiqueta="Máximo del bloque" valor={b.venta_previa.max} onChange={(v) => set(["bloques", "venta_previa", "max"], v)} sufijo="pts" />
          <Num etiqueta="No necesita vender" valor={b.venta_previa.no_necesita} onChange={(v) => set(["bloques", "venta_previa", "no_necesita"], v)} sufijo="pts" />
          <Num etiqueta="Publicado hace poco" valor={b.venta_previa.publicado_reciente} onChange={(v) => set(["bloques", "venta_previa", "publicado_reciente"], v)} sufijo="pts" />
          <Num etiqueta="Publicado hace un tiempo" valor={b.venta_previa.publicado_medio} onChange={(v) => set(["bloques", "venta_previa", "publicado_medio"], v)} sufijo="pts" />
          <Num etiqueta="Publicado hace demasiado" valor={b.venta_previa.publicado_viejo} onChange={(v) => set(["bloques", "venta_previa", "publicado_viejo"], v)} sufijo="pts" />
          <Num etiqueta="No ha empezado a venderlo" valor={b.venta_previa.no_ha_empezado} onChange={(v) => set(["bloques", "venta_previa", "no_ha_empezado"], v)} sufijo="pts" />
          <Num etiqueta="&ldquo;Hace poco&rdquo; es hasta" valor={b.venta_previa.meses_reciente} onChange={(v) => set(["bloques", "venta_previa", "meses_reciente"], v)} sufijo="meses" />
          <Num etiqueta="&ldquo;Demasiado&rdquo; es más de" valor={b.venta_previa.meses_limite} onChange={(v) => set(["bloques", "venta_previa", "meses_limite"], v)} sufijo="meses" />
        </Tarjeta>

        <Tarjeta titulo="5 · Estructura de decisión" nota={`Máximo ${b.decision.max} puntos`}>
          <Num etiqueta="Máximo del bloque" valor={b.decision.max} onChange={(v) => set(["bloques", "decision", "max"], v)} sufijo="pts" />
          <Num etiqueta="Participaron todos" valor={b.decision.todos} onChange={(v) => set(["bloques", "decision", "todos"], v)} sufijo="pts" />
          <Num etiqueta="Participación parcial" valor={b.decision.parcial} onChange={(v) => set(["bloques", "decision", "parcial"], v)} sufijo="pts" />
          <Num etiqueta="No participaron" valor={b.decision.ninguno} onChange={(v) => set(["bloques", "decision", "ninguno"], v)} sufijo="pts" />
        </Tarjeta>

        <Tarjeta titulo="6 · Comportamiento observado" nota="Lo calcula el sistema con los sellos de tiempo, no la memoria.">
          <Num etiqueta="Máximo del bloque" valor={b.comportamiento.max} onChange={(v) => set(["bloques", "comportamiento", "max"], v)} sufijo="pts" />
          <Num etiqueta="Respondió rápido" valor={b.comportamiento.respuesta_rapida} onChange={(v) => set(["bloques", "comportamiento", "respuesta_rapida"], v)} sufijo="pts" />
          <Num etiqueta="&ldquo;Rápido&rdquo; es antes de" valor={b.comportamiento.horas_respuesta_rapida} onChange={(v) => set(["bloques", "comportamiento", "horas_respuesta_rapida"], v)} sufijo="horas" />
          <Num etiqueta="Asistió a la videollamada" valor={b.comportamiento.videollamada} onChange={(v) => set(["bloques", "comportamiento", "videollamada"], v)} sufijo="pts" />
          <Num etiqueta="Entregó lo que se le pidió" valor={b.comportamiento.documentos} onChange={(v) => set(["bloques", "comportamiento", "documentos"], v)} sufijo="pts" />
        </Tarjeta>

        {/* ── Descalificadores ── */}
        <Tarjeta
          titulo="Descalificadores duros"
          nota="No restan puntos: le ponen un techo a la banda, con la razón visible en la ficha."
        >
          <Num etiqueta="LTV por encima de" valor={+(p.descalificadores.ltv_excedido.umbral * 100).toFixed(1)} onChange={(v) => set(["descalificadores", "ltv_excedido", "umbral"], v / 100)} sufijo="%" />
          <Num etiqueta="Carga financiera por encima de" valor={+(p.descalificadores.carga_alta.umbral * 100).toFixed(1)} onChange={(v) => set(["descalificadores", "carga_alta", "umbral"], v / 100)} sufijo="%" />
          <Num etiqueta="Videollamadas rechazadas" valor={p.descalificadores.rechazo_videollamada.veces} onChange={(v) => set(["descalificadores", "rechazo_videollamada", "veces"], v)} sufijo="veces" />
          <Num etiqueta="Venta estancada más de" valor={p.descalificadores.venta_estancada.meses} onChange={(v) => set(["descalificadores", "venta_estancada", "meses"], v)} sufijo="meses" />
          <div className="pt-3">
            {(["ltv_excedido", "carga_alta", "rechazo_videollamada", "venta_estancada", "presupuesto_bajo_minimo"] as const).map(
              (clave) => (
                <label key={clave} className="flex items-center gap-3 py-1 text-sm text-tinta">
                  <input
                    type="checkbox"
                    checked={p.descalificadores[clave].activo}
                    onChange={(e) => set(["descalificadores", clave, "activo"], e.target.checked)}
                    className="size-4 rounded border-linea accent-bosque"
                  />
                  {clave.replace(/_/g, " ")}
                </label>
              )
            )}
          </div>
        </Tarjeta>

        {/* ── Mínimos por municipio ── */}
        <Tarjeta
          titulo="Mínimo de mercado por municipio"
          nota="Por debajo de esto, el comprador va a banda D con sugerencia de derivarlo a obra nueva. Revisa estas cifras: son un punto de partida, no un dato de mercado auditado."
        >
          {Object.keys(p.minimos_municipio).map((m) => (
            <label key={m} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-sm text-neutro">{m}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <input
                  type="number"
                  step={50}
                  value={Math.round(p.minimos_municipio[m] / 1_000_000)}
                  onChange={(e) =>
                    set(["minimos_municipio", m], Number(e.target.value) * 1_000_000)
                  }
                  className={campo}
                />
                <span className="w-8 text-xs text-neutro">M</span>
              </span>
            </label>
          ))}
        </Tarjeta>
      </div>

      {/* ── Brecha entre lo calculado y lo decidido ── */}
      <div className="mt-5 rounded-xl border border-linea bg-superficie p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-laton">
          Cuando sobrescribiste la banda
        </p>
        <p className="mt-1.5 text-xs text-neutro">
          Esta brecha es la señal de qué peso está mal. Si subes la banda una y otra
          vez por la misma razón, ese bloque vale más puntos de los que tiene.
        </p>
        <div className="mt-3 flex gap-6">
          {[
            ["Sobrescritas", overrides.length],
            ["Subiste la banda", subidas.length],
            ["Bajaste la banda", bajadas.length],
          ].map(([k, v]) => (
            <div key={k as string}>
              <p className="font-display text-2xl font-medium tabular-nums text-tinta">{v as number}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-neutro">{k as string}</p>
            </div>
          ))}
        </div>
        {overrides.length > 0 && (
          <ul className="mt-4 divide-y divide-linea border-t border-linea">
            {overrides.slice(0, 10).map((o, i) => (
              <li key={i} className="py-2.5 text-sm">
                <span className="text-tinta">{o.clientes?.nombre ?? "—"}</span>
                <span className="text-neutro">
                  {" "}
                  · {o.banda_calculada} → {o.banda_final} · {formatoFecha(o.override_at)}
                </span>
                <p className="mt-0.5 text-neutro">“{o.razon_override}”</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Versiones ── */}
      <div className="mt-5 rounded-xl border border-linea bg-superficie p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-laton">
          Versiones
        </p>
        <ul className="mt-3 divide-y divide-linea">
          {versiones.map((v) => (
            <li key={v.version} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="text-tinta">
                v{v.version}
                {v.activa && (
                  <span className="ml-2 rounded-full border border-[#1A1A18]/25 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wider text-[#1A1A18]">
                    activa
                  </span>
                )}
                {v.nota && <span className="ml-2 text-neutro">{v.nota}</span>}
              </span>
              <span className="shrink-0 text-xs text-neutro">{formatoFecha(v.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>

      {mensaje && (
        <p className="mt-5 rounded-lg border border-linea bg-fondo px-4 py-3 text-sm text-tinta">
          {mensaje}
        </p>
      )}

      {/* ── Barra de guardado ── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-superficie/95 px-5 py-3 backdrop-blur md:left-[230px]">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="¿Qué cambiaste y por qué? (queda en el historial)"
            className="min-w-0 flex-1 rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none focus:border-bosque"
          />
          <button
            onClick={restaurarIniciales}
            className="hidden shrink-0 rounded-lg border border-linea px-4 py-2.5 text-sm text-neutro transition hover:text-tinta sm:block"
          >
            Valores iniciales
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="shrink-0 rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
          >
            {guardando ? "Guardando…" : `Guardar como v${versionActual + 1}`}
          </button>
        </div>
      </div>
    </div>
  );
}
