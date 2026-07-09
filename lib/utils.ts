/** Formatea un número como pesos colombianos: 450000000 → "$450.000.000" */
export function formatoCOP(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Código interno de Sabana OS: 11 → "SAB-011" */
export function codigoSabana(consecutivo: number | null | undefined): string {
  if (consecutivo === null || consecutivo === undefined) return "—";
  return `SAB-${String(consecutivo).padStart(3, "0")}`;
}

/** Formatea una fecha ISO a formato local legible: "8 jul 2026" */
export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
