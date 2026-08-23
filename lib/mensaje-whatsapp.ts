/* ============================================================
   Mensaje de WhatsApp armado desde el formulario
   ------------------------------------------------------------
   Plantilla:
   Hola, busco casa en {MUNICIPIO}, presupuesto {PRESUPUESTO}{TIPO},
   para mudarme {PLAZO}. Ref: {REF}

   Ejemplo:
   "Hola, busco casa en Chía, presupuesto entre $1.200 y $1.800
    millones, en conjunto cerrado, para mudarme en 3 a 6 meses.
    Ref: GADS-CHIA"
   ============================================================ */

import { APP } from "@/lib/config";

const MUNICIPIO: Record<string, string> = {
  "Chía": "Chía",
  "Cajicá": "Cajicá",
  "Cota": "Cota",
  "Sopó": "Sopó",
  "La Calera": "La Calera",
  "Zipaquirá": "Zipaquirá",
  "Varios": "varios municipios de la Sabana Norte",
};

const PRESUPUESTO: Record<string, string> = {
  "Hasta $800 millones": "hasta $800 millones",
  "$800 a $1.200 millones": "entre $800 y $1.200 millones",
  "$1.200 a $1.800 millones": "entre $1.200 y $1.800 millones",
  "$1.800 a $2.500 millones": "entre $1.800 y $2.500 millones",
  "Más de $2.500 millones": "de más de $2.500 millones",
};

/* Se antepone la coma. El último valor deja la frase vacía. */
const TIPO: Record<string, string> = {
  "Conjunto cerrado": ", en conjunto cerrado",
  "Campestre con lote": ", campestre con lote",
  "Independiente": ", casa independiente",
  "Todavía no lo tengo claro": "",
};

const PLAZO: Record<string, string> = {
  "En menos de 3 meses": "en menos de 3 meses",
  "En 3 a 6 meses": "en 3 a 6 meses",
  "En 6 a 12 meses": "en 6 a 12 meses",
  "Todavía estoy explorando": "más adelante",
};

export type DatosMensaje = {
  municipio: string;
  presupuesto: string;
  tipo: string;
  plazo: string;
  refCode: string;
};

export function construirMensaje(d: DatosMensaje): string {
  const municipio = MUNICIPIO[d.municipio] ?? d.municipio;
  const presupuesto = PRESUPUESTO[d.presupuesto] ?? d.presupuesto.toLowerCase();
  const tipo = TIPO[d.tipo] ?? "";
  const plazo = PLAZO[d.plazo] ?? d.plazo.toLowerCase();

  return `Hola, busco casa en ${municipio}, presupuesto ${presupuesto}${tipo}, para mudarme ${plazo}. Ref: ${d.refCode}`;
}

/** Número de WhatsApp de KYRELO, solo dígitos. */
export function numeroKyrelo(): string {
  return APP.whatsapp.replace(/\D/g, "");
}

/* Siempre wa.me, nunca api.whatsapp.com: la medición de conversiones
   depende de que todos los enlaces del sitio compartan la misma cadena. */
export function enlaceWhatsApp(mensaje: string, numero = numeroKyrelo()): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
