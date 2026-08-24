/* ============================================================
   Motor de score y bandas
   ------------------------------------------------------------
   Función pura, igual que el motor financiero: entran los datos
   del formulario y la configuración vigente, sale el puntaje con
   su desglose. Nada de esto se calcula dentro de una pantalla.

   El desglose es tan importante como el número: la ficha tiene
   que poder decir POR QUÉ dio lo que dio, bloque por bloque.
   ============================================================ */

import type { Banda, Parametros } from "./config";
import type { Viabilidad } from "./financiero";

export type DatosCalificacion = {
  municipios: string[] | null;
  presupuesto_maximo: number | null;
  ingreso_familiar: number | null;
  cuota_inicial: number | null;
  estado_credito: string | null;
  carta_vigencia: string | null;
  ingresos_verificables: boolean;
  plazo_mudanza: string | null;
  evento_forzante: boolean;
  necesita_vender: boolean;
  venta_publicada: boolean;
  venta_meses: number | null;
  decisores_participaron: string | null;
  videollamada_realizada: boolean;
  documentos_entregados: boolean;
  rechazos_videollamada: number;
};

/** Señales que el sistema deduce solo, no las marca Laura. */
export type SenalesSistema = {
  /** Horas entre que se le escribió al lead y que el comprador respondió. */
  horas_en_responder: number | null;
};

export type BloqueScore = {
  clave: string;
  etiqueta: string;
  puntos: number;
  max: number;
  razon: string;
};

export type Descalificador = {
  clave: string;
  razon: string;
  banda_maxima: Banda;
};

export type ResultadoScore = {
  total: number;
  bloques: BloqueScore[];
  descalificadores: Descalificador[];
  banda_por_puntaje: Banda;
  banda_calculada: Banda;
  alertas: string[];
};

const ORDEN: Banda[] = ["A", "B", "C", "D"];

/** Devuelve la peor de dos bandas (D es peor que A). */
function peor(a: Banda, b: Banda): Banda {
  return ORDEN.indexOf(a) >= ORDEN.indexOf(b) ? a : b;
}

/** ¿La carta de preaprobación sigue vigente hoy? */
export function cartaVigente(
  carta_vigencia: string | null,
  hoy = new Date()
): boolean {
  if (!carta_vigencia) return false;
  const vence = new Date(carta_vigencia + "T23:59:59");
  return vence.getTime() >= hoy.getTime();
}

export function calcularScore(
  d: DatosCalificacion,
  viabilidad: Viabilidad,
  p: Parametros,
  senales: SenalesSistema = { horas_en_responder: null },
  hoy = new Date()
): ResultadoScore {
  const bloques: BloqueScore[] = [];
  const alertas: string[] = [];
  const b = p.bloques;

  /* ── 1. Capacidad financiera ───────────────────────────── */
  {
    const cfg = b.capacidad;
    let puntos = cfg.nada;
    let razon = "Sin respaldo financiero demostrado.";

    const contado = d.estado_credito === "Compra de contado";
    const presupuesto = Number(d.presupuesto_maximo) || 0;
    const inicial = Number(d.cuota_inicial) || 0;
    const pctInicial = presupuesto > 0 ? inicial / presupuesto : 0;

    if (d.estado_credito === "Carta de preaprobación vigente") {
      if (cartaVigente(d.carta_vigencia, hoy)) {
        puntos = cfg.preaprobacion_vigente;
        razon = "Carta de preaprobación vigente.";
      } else {
        // Regla explícita del encargo: una carta vencida no puede dar el máximo.
        puntos = cfg.radicada;
        const cuando = d.carta_vigencia
          ? new Date(d.carta_vigencia + "T00:00:00").toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "sin fecha registrada";
        razon = `Carta vencida (${cuando}): no puede dar el máximo.`;
        alertas.push(
          `La carta venció el ${cuando}. Pídele una actualizada antes de publicar.`
        );
      }
    } else if (contado) {
      if (d.ingresos_verificables) {
        puntos = cfg.contado;
        razon = "Compra de contado con fondos demostrables.";
      } else {
        puntos = cfg.radicada;
        razon = "Compra de contado declarada, pero sin fondos verificados.";
        alertas.push(
          "Dice que compra de contado pero no hay verificación de fondos. Pídesela antes de publicar."
        );
      }
    } else if (d.estado_credito === "Solicitud radicada con número") {
      puntos = cfg.radicada;
      razon = "Solicitud de crédito radicada.";
    } else if (pctInicial >= cfg.inicial_minima_pct && d.ingresos_verificables) {
      puntos = cfg.inicial_e_ingresos;
      razon = `Inicial del ${(pctInicial * 100).toFixed(0)}% e ingresos verificables, pero sin crédito en trámite.`;
    }

    bloques.push({
      clave: "capacidad",
      etiqueta: "Capacidad financiera",
      puntos,
      max: cfg.max,
      razon,
    });
  }

  /* ── 2. Coherencia del presupuesto ─────────────────────── */
  {
    const cfg = b.coherencia;
    let puntos: number;
    let razon: string;

    if (viabilidad.contado) {
      puntos = cfg.ambas_cumplen;
      razon = "Compra de contado: no hay crédito que pueda desbordarse.";
    } else if (!viabilidad.aplica) {
      puntos = cfg.ambas_fallan;
      razon = "Faltan el presupuesto o el ingreso para poder evaluarlo.";
    } else {
      const fallan =
        (viabilidad.ltv_cumple ? 0 : 1) + (viabilidad.carga_cumple ? 0 : 1);
      if (fallan === 0) {
        puntos = cfg.ambas_cumplen;
        razon = `LTV ${(viabilidad.ltv * 100).toFixed(1)}% y carga ${(viabilidad.carga_financiera * 100).toFixed(1)}%: ambas dentro del límite.`;
      } else if (fallan === 1) {
        puntos = cfg.una_falla;
        razon = viabilidad.ltv_cumple
          ? `La carga financiera es del ${(viabilidad.carga_financiera * 100).toFixed(1)}%, por encima del tope.`
          : `El LTV requerido es del ${(viabilidad.ltv * 100).toFixed(1)}%, por encima del máximo.`;
      } else {
        puntos = cfg.ambas_fallan;
        razon = `LTV ${(viabilidad.ltv * 100).toFixed(1)}% y carga ${(viabilidad.carga_financiera * 100).toFixed(1)}%: las dos por encima del límite.`;
      }
    }

    bloques.push({
      clave: "coherencia",
      etiqueta: "Coherencia del presupuesto",
      puntos,
      max: cfg.max,
      razon,
    });
  }

  /* ── 3. Evento forzante ────────────────────────────────── */
  {
    const cfg = b.urgencia;
    let puntos = cfg.explorando;
    let razon = "Todavía está explorando: no hay nada que lo empuje.";

    if (d.plazo_mudanza === "<3 meses") {
      if (d.evento_forzante) {
        puntos = cfg.menos_3_con_evento;
        razon = "Se muda en menos de 3 meses y hay un evento que lo obliga.";
      } else {
        puntos = cfg.menos_3_sin_evento;
        razon = "Se muda en menos de 3 meses, pero sin evento que lo obligue.";
      }
    } else if (d.plazo_mudanza === "3-6 meses") {
      puntos = cfg.tres_a_seis;
      razon = "Plazo de 3 a 6 meses.";
    } else if (d.plazo_mudanza === "6-12 meses") {
      puntos = cfg.seis_a_doce;
      razon = "Plazo de 6 a 12 meses.";
    }

    bloques.push({
      clave: "urgencia",
      etiqueta: "Evento forzante",
      puntos,
      max: cfg.max,
      razon,
    });
  }

  /* ── 4. Dependencia de venta previa ────────────────────── */
  {
    const cfg = b.venta_previa;
    let puntos: number;
    let razon: string;

    if (!d.necesita_vender) {
      puntos = cfg.no_necesita;
      razon = "No depende de vender nada primero.";
    } else if (!d.venta_publicada) {
      puntos = cfg.no_ha_empezado;
      razon = "Necesita vender y todavía no ha publicado.";
    } else {
      const meses = Number(d.venta_meses) || 0;
      if (meses <= cfg.meses_reciente) {
        puntos = cfg.publicado_reciente;
        razon = `Necesita vender y lleva ${meses} mes(es) publicado.`;
      } else if (meses <= cfg.meses_limite) {
        puntos = cfg.publicado_medio;
        razon = `Necesita vender y lleva ${meses} meses publicado sin vender.`;
      } else {
        puntos = cfg.publicado_viejo;
        razon = `Necesita vender y lleva ${meses} meses publicado: el precio está mal.`;
      }
    }

    bloques.push({
      clave: "venta_previa",
      etiqueta: "Dependencia de venta previa",
      puntos,
      max: cfg.max,
      razon,
    });
  }

  /* ── 5. Estructura de decisión ─────────────────────────── */
  {
    const cfg = b.decision;
    let puntos = cfg.ninguno;
    let razon = "Los decisores no participaron en la videollamada.";

    if (d.decisores_participaron === "todos") {
      puntos = cfg.todos;
      razon = "Todos los que deciden estuvieron en la videollamada.";
    } else if (d.decisores_participaron === "parcial") {
      puntos = cfg.parcial;
      razon = "Solo parte de los decisores participó.";
    }

    bloques.push({
      clave: "decision",
      etiqueta: "Estructura de decisión",
      puntos,
      max: cfg.max,
      razon,
    });
  }

  /* ── 6. Comportamiento observado (lo calcula el sistema) ─ */
  {
    const cfg = b.comportamiento;
    let puntos = 0;
    const partes: string[] = [];

    const horas = senales.horas_en_responder;
    if (horas !== null && horas <= cfg.horas_respuesta_rapida) {
      puntos += cfg.respuesta_rapida;
      partes.push(`respondió en ${horas.toFixed(1)} h`);
    } else if (horas !== null) {
      partes.push(`tardó ${horas.toFixed(1)} h en responder`);
    } else {
      partes.push("sin medición de respuesta");
    }

    if (d.videollamada_realizada) {
      puntos += cfg.videollamada;
      partes.push("asistió a la videollamada");
    } else {
      partes.push("sin videollamada");
    }

    if (d.documentos_entregados) {
      puntos += cfg.documentos;
      partes.push("entregó lo que se le pidió");
    } else {
      partes.push("no entregó lo que se le pidió");
    }

    bloques.push({
      clave: "comportamiento",
      etiqueta: "Comportamiento observado",
      puntos,
      max: cfg.max,
      razon: partes.join(" · "),
    });
  }

  /* ── Total y banda por puntaje ─────────────────────────── */
  const total = Math.max(
    0,
    Math.min(100, bloques.reduce((s, x) => s + x.puntos, 0))
  );

  const banda_por_puntaje: Banda =
    total >= p.bandas.a ? "A" : total >= p.bandas.b ? "B" : total >= p.bandas.c ? "C" : "D";

  /* ── Descalificadores duros ────────────────────────────────
     No restan puntos: le ponen un techo a la banda. Cada uno
     lleva su razón en texto claro, porque una ficha nunca puede
     mostrar un resultado sin explicación.                     */
  const descalificadores: Descalificador[] = [];
  const dq = p.descalificadores;
  const pct = (n: number) => (n * 100).toFixed(1).replace(".", ",") + "%";

  if (dq.ltv_excedido.activo && viabilidad.aplica && viabilidad.ltv > dq.ltv_excedido.umbral) {
    descalificadores.push({
      clave: "ltv_excedido",
      razon: `El crédito necesario es el ${pct(viabilidad.ltv)} del valor del inmueble y el máximo No VIS es ${pct(dq.ltv_excedido.umbral)}.`,
      banda_maxima: dq.ltv_excedido.banda_maxima,
    });
  }

  if (dq.carga_alta.activo && viabilidad.aplica && viabilidad.carga_financiera > dq.carga_alta.umbral) {
    descalificadores.push({
      clave: "carga_alta",
      razon: `La carga financiera estimada es del ${pct(viabilidad.carga_financiera)}, por encima del ${pct(dq.carga_alta.umbral)}.`,
      banda_maxima: dq.carga_alta.banda_maxima,
    });
  }

  if (dq.rechazo_videollamada.activo && d.rechazos_videollamada >= dq.rechazo_videollamada.veces) {
    descalificadores.push({
      clave: "rechazo_videollamada",
      razon: `Rechazó la videollamada ${d.rechazos_videollamada} veces.`,
      banda_maxima: dq.rechazo_videollamada.banda_maxima,
    });
  }

  if (
    dq.venta_estancada.activo &&
    d.necesita_vender &&
    d.venta_publicada &&
    (Number(d.venta_meses) || 0) > dq.venta_estancada.meses
  ) {
    descalificadores.push({
      clave: "venta_estancada",
      razon: `Depende de vender un inmueble que lleva ${d.venta_meses} meses publicado.`,
      banda_maxima: dq.venta_estancada.banda_maxima,
    });
  }

  if (dq.presupuesto_bajo_minimo.activo && d.municipios?.length) {
    // Si le interesan varios municipios, se compara contra el más barato:
    // solo queda descalificado si no alcanza ni para el más accesible.
    const minimos = d.municipios
      .map((m) => p.minimos_municipio[m])
      .filter((n): n is number => typeof n === "number");

    if (minimos.length > 0) {
      const minimo = Math.min(...minimos);
      const presupuesto = Number(d.presupuesto_maximo) || 0;
      if (presupuesto > 0 && presupuesto < minimo) {
        const cop = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
        descalificadores.push({
          clave: "presupuesto_bajo_minimo",
          razon: `Su presupuesto (${cop(presupuesto)}) está por debajo del mínimo de mercado (${cop(minimo)}). Derivar a obra nueva.`,
          banda_maxima: dq.presupuesto_bajo_minimo.banda,
        });
      }
    }
  }

  const banda_calculada = descalificadores.reduce<Banda>(
    (banda, x) => peor(banda, x.banda_maxima),
    banda_por_puntaje
  );

  return {
    total,
    bloques,
    descalificadores,
    banda_por_puntaje,
    banda_calculada,
    alertas,
  };
}

/** Horas entre que se le escribió y que respondió. null si falta un sello. */
export function horasEnResponder(
  contactado_at: string | null,
  respondio_at: string | null
): number | null {
  if (!contactado_at || !respondio_at) return null;
  const ms = new Date(respondio_at).getTime() - new Date(contactado_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3_600_000;
}
