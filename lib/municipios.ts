/* ============================================================
   KYRELO — Configuración de las landings de captación de compradores
   ------------------------------------------------------------
   UN SOLO ARCHIVO controla las 7 landings de /casas/*.
   Cambia algo aquí y cambia en todas.

   · activo:     enciende/apaga la landing sin tocar código.
                 false = la ruta responde 404.
   · rangoDesde: OPCIONAL. Si está vacío, el antetítulo omite
                 la parte de "· DESDE $X" (caso Zipaquirá).
   ============================================================ */

export type Municipio = {
  slug: string;
  /** Nombre para títulos y antetítulos. Ej: "Chía", "la Sabana Norte" */
  nombre: string;
  /** Nombre dentro de una frase. Ej: "Chía", "la Sabana Norte" */
  nombreEnFrase: string;
  /** Preposición previa. Ej: "en" → "en Chía" */
  preposicion: string;
  /** Precio de entrada. Vacío = el antetítulo no lo muestra. */
  rangoDesde?: string;
  /** Valor con el que llega prellenado el select del formulario.
   *  Vacío = el usuario elige (caso Sabana Norte). */
  prellenado: string;
  activo: boolean;
};

export const MUNICIPIOS: Municipio[] = [
  {
    slug: "chia",
    nombre: "Chía",
    nombreEnFrase: "Chía",
    preposicion: "en",
    rangoDesde: "$800 millones",
    prellenado: "Chía",
    activo: true,
  },
  {
    slug: "cajica",
    nombre: "Cajicá",
    nombreEnFrase: "Cajicá",
    preposicion: "en",
    rangoDesde: "$800 millones",
    prellenado: "Cajicá",
    activo: true,
  },
  {
    slug: "cota",
    nombre: "Cota",
    nombreEnFrase: "Cota",
    preposicion: "en",
    rangoDesde: "$800 millones",
    prellenado: "Cota",
    activo: true,
  },
  {
    slug: "sopo",
    nombre: "Sopó",
    nombreEnFrase: "Sopó",
    preposicion: "en",
    // Mercado de ticket alto: anclar en $800 traería expectativas que no se cumplen.
    rangoDesde: "$900 millones",
    prellenado: "Sopó",
    activo: true,
  },
  {
    slug: "la-calera",
    nombre: "La Calera",
    nombreEnFrase: "La Calera",
    preposicion: "en",
    rangoDesde: "$800 millones",
    prellenado: "La Calera",
    activo: true,
  },
  {
    slug: "zipaquira",
    nombre: "Zipaquirá",
    nombreEnFrase: "Zipaquirá",
    preposicion: "en",
    // Sin cifra a propósito: otro segmento de precio.
    prellenado: "Zipaquirá",
    activo: true,
  },
  {
    slug: "sabana-norte",
    nombre: "la Sabana Norte",
    nombreEnFrase: "la Sabana Norte",
    preposicion: "en",
    rangoDesde: "$800 millones",
    // Llega vacío: el comprador elige municipio.
    prellenado: "",
    activo: true,
  },
];

export function buscarMunicipio(slug: string): Municipio | undefined {
  return MUNICIPIOS.find((m) => m.slug === slug && m.activo);
}

/* ── Textos derivados de la configuración ────────────────── */

export function antetitulo(m: Municipio): string {
  const base = `Casas en ${m.nombre}`.toUpperCase();
  return m.rangoDesde ? `${base} · DESDE ${m.rangoDesde.toUpperCase()}` : base;
}

export function titular(m: Municipio): string {
  return `Dinos qué casa buscas ${m.preposicion} ${m.nombreEnFrase} y nosotros la encontramos.`;
}

export function tituloSeo(m: Municipio): string {
  const desde = m.rangoDesde ? ` desde ${m.rangoDesde}` : "";
  return `Casas en venta en ${m.nombre}${desde} | KYRELO`;
}

export function descripcionSeo(m: Municipio): string {
  return `Dile a KYRELO qué casa buscas ${m.preposicion} ${m.nombreEnFrase} y nosotros la encontramos. Casas en conjunto cerrado y campestres en la Sabana Norte. Respuesta por WhatsApp en minutos.`;
}

/* ── Opciones del formulario ──────────────────────────────
   El orden es el que ve el comprador. "Varios" siempre al final. */

export const OPCIONES_MUNICIPIO = [
  "Chía",
  "Cajicá",
  "Cota",
  "Sopó",
  "La Calera",
  "Zipaquirá",
  "Varios",
];

export const OPCIONES_PRESUPUESTO = [
  "Hasta $800 millones",
  "$800 a $1.200 millones",
  "$1.200 a $1.800 millones",
  "$1.800 a $2.500 millones",
  "Más de $2.500 millones",
];

export const OPCIONES_TIPO = [
  "Conjunto cerrado",
  "Campestre con lote",
  "Independiente",
  "Todavía no lo tengo claro",
];

export const OPCIONES_PLAZO = [
  "En menos de 3 meses",
  "En 3 a 6 meses",
  "En 6 a 12 meses",
  "Todavía estoy explorando",
];

/* ── Banderas de contenido ────────────────────────────────
   Depende de un aliado hipotecario todavía sin firmar.
   Cuando se firme: cambiar a true y ya. */
export const mostrarBloqueCredito = false;

/* Política de datos aprobada por Laura (agosto de 2026): se indexa
   y /legal/tratamiento-de-datos redirige aquí (ver next.config.mjs).
   Si alguna vez hay que retirarla, poner false y se vuelve a ocultar
   de Google sin dejar de funcionar. */
export const politicaAprobadaPorAbogado = true;

/* Versión exacta del texto de autorización que ve el usuario.
   Se guarda con cada lead como evidencia legal (Ley 1581). */
export const VERSION_AUTORIZACION = "v1-2026-08";
