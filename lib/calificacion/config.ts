/* ============================================================
   Calificación de compradores · configuración
   ------------------------------------------------------------
   REGLA: ningún peso, umbral ni parámetro se escribe en el
   código de las pantallas. Todo vive en la tabla `score_config`
   y se edita desde /configuracion/score sin desplegar nada.

   Lo que hay en este archivo es SOLO el molde (los tipos) y el
   juego de valores con el que se sembró la versión 1. Sirve de
   red de seguridad si la base de datos no responde, no de
   fuente de verdad. La fuente de verdad es la fila activa de
   `score_config`.
   ============================================================ */

export type ParametrosFinancieros = {
  tasa_ea: number;      // 0.15 = 15% efectivo anual
  plazo_meses: number;  // 240 = 20 años
  ltv_maximo: number;   // 0.70 = máximo legal No VIS en Colombia
  tope_carga: number;   // 0.30 = cuota máxima sobre el ingreso
};

export type Parametros = {
  financieros: ParametrosFinancieros;
  bloques: {
    capacidad: {
      max: number;
      preaprobacion_vigente: number;
      contado: number;
      radicada: number;
      inicial_e_ingresos: number;
      nada: number;
      inicial_minima_pct: number;
    };
    coherencia: {
      max: number;
      ambas_cumplen: number;
      una_falla: number;
      ambas_fallan: number;
    };
    urgencia: {
      max: number;
      menos_3_con_evento: number;
      menos_3_sin_evento: number;
      tres_a_seis: number;
      seis_a_doce: number;
      explorando: number;
    };
    venta_previa: {
      max: number;
      no_necesita: number;
      publicado_reciente: number;
      publicado_medio: number;
      publicado_viejo: number;
      no_ha_empezado: number;
      meses_reciente: number;
      meses_limite: number;
    };
    decision: {
      max: number;
      todos: number;
      parcial: number;
      ninguno: number;
    };
    comportamiento: {
      max: number;
      respuesta_rapida: number;
      videollamada: number;
      documentos: number;
      horas_respuesta_rapida: number;
    };
  };
  bandas: { a: number; b: number; c: number };
  descalificadores: {
    ltv_excedido: { activo: boolean; umbral: number; banda_maxima: Banda };
    carga_alta: { activo: boolean; umbral: number; banda_maxima: Banda };
    rechazo_videollamada: { activo: boolean; veces: number; banda_maxima: Banda };
    venta_estancada: { activo: boolean; meses: number; banda_maxima: Banda };
    presupuesto_bajo_minimo: { activo: boolean; banda: Banda };
  };
  minimos_municipio: Record<string, number>;
};

export type Banda = "A" | "B" | "C" | "D";

/* ── Opciones de los desplegables del formulario ──────────── */

export const OPCIONES_ORIGEN = [
  "Google Ads",
  "Instagram",
  "Meta",
  "Referido",
  "Directo",
  "Otro",
];

export const OPCIONES_VIVE_EN = ["Arriendo", "Propio", "Familiar"];

export const OPCIONES_CREDITO = [
  "Carta de preaprobación vigente",
  "Solicitud radicada con número",
  "Habló con banco, sin radicar",
  "No ha empezado",
  "Compra de contado",
];

export const OPCIONES_PLAZO_MUDANZA = [
  "<3 meses",
  "3-6 meses",
  "6-12 meses",
  "Explorando",
];

export const OPCIONES_EVENTO = [
  "Arriendo se vence",
  "Traslado laboral",
  "Cambio de colegio",
  "Nacimiento",
  "Ya vendió",
  "Otro",
];

export const OPCIONES_PARTICIPACION = ["todos", "parcial", "ninguno"];

export const OPCIONES_TIPO_INMUEBLE = [
  "Conjunto cerrado",
  "Campestre con lote",
  "Independiente",
  "Apartamento",
  "Todavía no lo tengo claro",
];

/* ── Valores con los que se sembró la versión 1 ───────────── */

export const PARAMETROS_INICIALES: Parametros = {
  financieros: {
    tasa_ea: 0.15,
    plazo_meses: 240,
    ltv_maximo: 0.7,
    tope_carga: 0.3,
  },
  bloques: {
    capacidad: {
      max: 35,
      preaprobacion_vigente: 35,
      contado: 35,
      radicada: 22,
      inicial_e_ingresos: 12,
      nada: 0,
      inicial_minima_pct: 0.3,
    },
    coherencia: { max: 15, ambas_cumplen: 15, una_falla: 7, ambas_fallan: 0 },
    urgencia: {
      max: 15,
      menos_3_con_evento: 15,
      menos_3_sin_evento: 10,
      tres_a_seis: 10,
      seis_a_doce: 5,
      explorando: 0,
    },
    venta_previa: {
      max: 10,
      no_necesita: 10,
      publicado_reciente: 5,
      publicado_medio: 3,
      publicado_viejo: 0,
      no_ha_empezado: 0,
      meses_reciente: 6,
      meses_limite: 12,
    },
    decision: { max: 10, todos: 10, parcial: 5, ninguno: 0 },
    comportamiento: {
      max: 15,
      respuesta_rapida: 5,
      videollamada: 5,
      documentos: 5,
      horas_respuesta_rapida: 2,
    },
  },
  bandas: { a: 75, b: 50, c: 25 },
  descalificadores: {
    ltv_excedido: { activo: true, umbral: 0.7, banda_maxima: "C" },
    carga_alta: { activo: true, umbral: 0.45, banda_maxima: "C" },
    rechazo_videollamada: { activo: true, veces: 2, banda_maxima: "C" },
    venta_estancada: { activo: true, meses: 12, banda_maxima: "C" },
    presupuesto_bajo_minimo: { activo: true, banda: "D" },
  },
  minimos_municipio: {
    "Chía": 800000000,
    "Cajicá": 800000000,
    "Cota": 800000000,
    "Sopó": 900000000,
    "La Calera": 800000000,
    "Zipaquirá": 500000000,
  },
};

/* Mezcla lo que venga de la base de datos sobre el molde inicial.
   Si alguien guarda una configuración a la que le falta una llave
   nueva, el sistema no se cae: usa el valor inicial para esa. */
export function fusionarParametros(guardados: unknown): Parametros {
  const base = structuredClone(PARAMETROS_INICIALES) as Parametros;
  if (!guardados || typeof guardados !== "object") return base;

  const fusionar = (destino: any, origen: any) => {
    for (const clave of Object.keys(origen ?? {})) {
      const valor = origen[clave];
      if (valor && typeof valor === "object" && !Array.isArray(valor)) {
        destino[clave] = destino[clave] ?? {};
        fusionar(destino[clave], valor);
      } else if (valor !== undefined && valor !== null) {
        destino[clave] = valor;
      }
    }
  };

  fusionar(base, guardados);
  return base;
}
