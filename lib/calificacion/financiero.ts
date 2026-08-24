/* ============================================================
   Motor de viabilidad financiera
   ------------------------------------------------------------
   Funciones puras: entran números, salen números. No tocan la
   base de datos, no leen el DOM, no dependen de React. Así se
   pueden verificar contra un caso conocido y así se garantiza
   que el número que ve Laura en la videollamada es el mismo
   que quedó guardado en el score.

   Caso de referencia (verificable en /configuracion/score):
     presupuesto $1.300.000.000 · inicial $390.000.000
     ingreso $20.000.000 · 15% E.A. · 240 meses
   →  crédito $910.000.000 · LTV 70,0% · tasa mensual 1,171492%
      cuota $11.354.327 · carga 56,8% · ingreso mínimo $37.847.756
   ============================================================ */

import type { ParametrosFinancieros } from "./config";

export type EntradaViabilidad = {
  presupuesto_maximo: number | null;
  cuota_inicial: number | null;
  ingreso_familiar: number | null;
  /** Compra de contado: no aplica LTV ni carga financiera. */
  contado?: boolean;
};

export type Viabilidad = {
  /** false cuando faltan datos o la compra es de contado */
  aplica: boolean;
  contado: boolean;
  credito_requerido: number;
  ltv: number;
  tasa_mensual: number;
  cuota_mensual: number;
  carga_financiera: number;
  ingreso_minimo_requerido: number;
  ltv_cumple: boolean;
  carga_cumple: boolean;
  semaforo: "verde" | "ambar" | "rojo" | "sin-datos";
  /** Presupuesto máximo manteniendo la cuota inicial que YA tiene. */
  viable_con_su_inicial: number;
  /** Presupuesto máximo si además aporta la inicial mínima del precio nuevo. */
  viable_con_inicial_minima: number;
};

/** Tasa efectiva anual → tasa efectiva mensual. */
export function tasaMensual(tasa_ea: number): number {
  return Math.pow(1 + tasa_ea, 1 / 12) - 1;
}

/** Factor de anualidad: cuota = crédito × este factor. */
export function factorCuota(i: number, n: number): number {
  if (i <= 0) return n > 0 ? 1 / n : 0;
  return i / (1 - Math.pow(1 + i, -n));
}

/** Cuota mensual de un crédito a tasa efectiva anual y plazo en meses. */
export function cuotaMensual(
  credito: number,
  tasa_ea: number,
  plazo_meses: number
): number {
  if (credito <= 0) return 0;
  return credito * factorCuota(tasaMensual(tasa_ea), plazo_meses);
}

const VACIA: Viabilidad = {
  aplica: false,
  contado: false,
  credito_requerido: 0,
  ltv: 0,
  tasa_mensual: 0,
  cuota_mensual: 0,
  carga_financiera: 0,
  ingreso_minimo_requerido: 0,
  ltv_cumple: true,
  carga_cumple: true,
  semaforo: "sin-datos",
  viable_con_su_inicial: 0,
  viable_con_inicial_minima: 0,
};

export function calcularViabilidad(
  entrada: EntradaViabilidad,
  p: ParametrosFinancieros
): Viabilidad {
  const presupuesto = Number(entrada.presupuesto_maximo) || 0;
  const inicial = Number(entrada.cuota_inicial) || 0;
  const ingreso = Number(entrada.ingreso_familiar) || 0;

  // De contado no hay crédito que analizar: solo verificación de fondos.
  if (entrada.contado) return { ...VACIA, contado: true };

  if (presupuesto <= 0 || ingreso <= 0) return { ...VACIA };

  const credito = Math.max(0, presupuesto - inicial);
  const ltv = credito / presupuesto;
  const i = tasaMensual(p.tasa_ea);
  const factor = factorCuota(i, p.plazo_meses);
  const cuota = credito * factor;
  const carga = cuota / ingreso;
  const ingresoMinimo = p.tope_carga > 0 ? cuota / p.tope_carga : 0;

  const ltv_cumple = ltv <= p.ltv_maximo;
  const carga_cumple = carga <= p.tope_carga;

  // Semáforo: ámbar si falla por menos de 10 puntos porcentuales.
  const excesoLtv = Math.max(0, ltv - p.ltv_maximo);
  const excesoCarga = Math.max(0, carga - p.tope_carga);
  const peorExceso = Math.max(excesoLtv, excesoCarga);
  const semaforo: Viabilidad["semaforo"] =
    peorExceso === 0 ? "verde" : peorExceso < 0.1 ? "ambar" : "rojo";

  /* ── Invertir la fórmula: ¿hasta cuánto SÍ puede? ────────
     Dos lecturas, ambas útiles en la llamada:

     A) Con la cuota inicial que ya tiene. El crédito máximo sale
        del tope de carga; el presupuesto es ese crédito más su
        inicial, sin pasarse del LTV máximo.

     B) Exigiéndole además la inicial mínima sobre el precio nuevo
        (LTV clavado en el máximo). Más conservador: le deja
        inicial sin usar como colchón.                          */
  const cuotaMax = p.tope_carga * ingreso;
  const creditoMax = factor > 0 ? cuotaMax / factor : 0;

  const topePorLtv =
    p.ltv_maximo < 1 ? inicial / (1 - p.ltv_maximo) : Number.POSITIVE_INFINITY;
  const viable_con_su_inicial = Math.min(creditoMax + inicial, topePorLtv);
  const viable_con_inicial_minima =
    p.ltv_maximo > 0 ? creditoMax / p.ltv_maximo : creditoMax;

  return {
    aplica: true,
    contado: false,
    credito_requerido: credito,
    ltv,
    tasa_mensual: i,
    cuota_mensual: cuota,
    carga_financiera: carga,
    ingreso_minimo_requerido: ingresoMinimo,
    ltv_cumple,
    carga_cumple,
    semaforo,
    viable_con_su_inicial,
    viable_con_inicial_minima,
  };
}

/* ============================================================
   Verificación del motor
   ------------------------------------------------------------
   Corre el caso de referencia del encargo con parámetros FIJOS
   (no con los de la configuración: si Laura sube la tasa al 16%,
   esta prueba debe seguir comprobando la fórmula, no la tasa).
   Se muestra en /configuracion/score.
   ============================================================ */

export type FilaVerificacion = {
  concepto: string;
  esperado: string;
  obtenido: string;
  ok: boolean;
};

const REFERENCIA: ParametrosFinancieros = {
  tasa_ea: 0.15,
  plazo_meses: 240,
  ltv_maximo: 0.7,
  tope_carga: 0.3,
};

export function verificarMotor(): {
  filas: FilaVerificacion[];
  todoOk: boolean;
} {
  const v = calcularViabilidad(
    {
      presupuesto_maximo: 1_300_000_000,
      cuota_inicial: 390_000_000,
      ingreso_familiar: 20_000_000,
    },
    REFERENCIA
  );

  const pesos = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
  const porc = (n: number) => (n * 100).toFixed(1).replace(".", ",") + "%";

  const filas: FilaVerificacion[] = [
    {
      concepto: "Crédito requerido",
      esperado: "$910.000.000",
      obtenido: pesos(v.credito_requerido),
      ok: Math.round(v.credito_requerido) === 910_000_000,
    },
    {
      concepto: "LTV",
      esperado: "70,0%",
      obtenido: porc(v.ltv),
      ok: porc(v.ltv) === "70,0%",
    },
    {
      concepto: "Tasa mensual",
      esperado: "1,171492%",
      obtenido: (v.tasa_mensual * 100).toFixed(6).replace(".", ",") + "%",
      ok: (v.tasa_mensual * 100).toFixed(6) === "1.171492",
    },
    {
      concepto: "Cuota mensual",
      esperado: "$11.354.327",
      obtenido: pesos(v.cuota_mensual),
      ok: Math.round(v.cuota_mensual) === 11_354_327,
    },
    {
      concepto: "Carga sobre ingreso",
      esperado: "56,8%",
      obtenido: porc(v.carga_financiera),
      ok: porc(v.carga_financiera) === "56,8%",
    },
    {
      concepto: "Ingreso mínimo necesario",
      esperado: "$37.847.756",
      obtenido: pesos(v.ingreso_minimo_requerido),
      ok: Math.round(v.ingreso_minimo_requerido) === 37_847_756,
    },
    {
      concepto: "Presupuesto viable · con su inicial",
      esperado: "$870.873.946",
      obtenido: pesos(v.viable_con_su_inicial),
      ok: Math.round(v.viable_con_su_inicial) === 870_873_946,
    },
    {
      concepto: "Presupuesto viable · con inicial mínima",
      esperado: "$686.962.780",
      obtenido: pesos(v.viable_con_inicial_minima),
      ok: Math.round(v.viable_con_inicial_minima) === 686_962_780,
    },
  ];

  return { filas, todoOk: filas.every((f) => f.ok) };
}
