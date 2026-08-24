/* ============================================================
   Prellenar la calificación con lo que el comprador ya dijo
   ------------------------------------------------------------
   El lead de la landing guarda rangos en texto ("$800 a $1.200
   millones"). La calificación necesita números. Aquí se traduce.

   Se toma el TOPE del rango: es lo que el comprador cree que
   puede pagar, y justamente lo que hay que contrastar contra el
   cálculo real. Todo queda editable en el formulario.
   ============================================================ */

export type LeadResumen = {
  id: string;
  codigo: string | null;
  municipio: string;
  presupuesto: string;
  tipo_inmueble: string;
  plazo: string;
  telefono_normalizado: string;
  created_at: string;
  autorizacion_timestamp: string | null;
  autorizacion_texto_version: string | null;
  canal_calculado: string | null;
};

const PRESUPUESTO: Record<string, number> = {
  "Hasta $800 millones": 800_000_000,
  "$800 a $1.200 millones": 1_200_000_000,
  "$1.200 a $1.800 millones": 1_800_000_000,
  "$1.800 a $2.500 millones": 2_500_000_000,
  "Más de $2.500 millones": 2_500_000_000,
};

const PLAZO: Record<string, string> = {
  "En menos de 3 meses": "<3 meses",
  "En 3 a 6 meses": "3-6 meses",
  "En 6 a 12 meses": "6-12 meses",
  "Todavía estoy explorando": "Explorando",
};

const ORIGEN: Record<string, string> = {
  GADS: "Google Ads",
  IG: "Instagram",
  META: "Meta",
  DIR: "Directo",
};

export function desdeLead(lead: LeadResumen) {
  return {
    lead_id: lead.id,
    // "Varios" no es un municipio: se deja que ella elija en la llamada.
    municipios: lead.municipio && lead.municipio !== "Varios" ? [lead.municipio] : [],
    presupuesto_maximo: PRESUPUESTO[lead.presupuesto] ?? null,
    tipo_inmueble: lead.tipo_inmueble || null,
    plazo_mudanza: PLAZO[lead.plazo] ?? null,
    origen_lead: ORIGEN[lead.canal_calculado ?? ""] ?? "Otro",
    autorizacion_fecha: lead.autorizacion_timestamp,
    autorizacion_version: lead.autorizacion_texto_version,
  };
}

/** Etiqueta legible para el selector de leads. */
export function etiquetaLead(lead: LeadResumen): string {
  const partes = [lead.codigo ?? "sin código", lead.municipio, lead.presupuesto];
  return partes.filter(Boolean).join(" · ");
}
