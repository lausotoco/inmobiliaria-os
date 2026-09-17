// lib/requerimientos-formato.ts
// El texto libre del requerimiento se escribe una sola vez y aquí se
// convierte en viñetas limpias. La forma de pago y el plazo tienen campo
// propio, así que si quedaron escritos dentro del texto viejo se omiten.

const PREFIJOS_DUPLICADOS = /^(forma de pago|plazo|presupuesto|urgencia)\s*[:.-]/i;

export function vinetas(texto?: string | null): string[] {
  if (!texto) return [];
  return String(texto)
    .replace(/preferencias del cliente\s*:/gi, "\n")
    .replace(/\s+-\s*/g, "\n")
    .split(/[\n\r]+/)
    .map((t) => t.trim().replace(/^[-•·*]\s*/, "").replace(/[;,]\s*$/, ""))
    .filter((t) => t.length > 1 && !PREFIJOS_DUPLICADOS.test(t));
}

/** Primera línea del texto, para el adelanto en la tarjeta. */
export function resumenPreferencias(texto?: string | null, max = 90): string | null {
  const lista = vinetas(texto);
  if (lista.length === 0) return null;
  const unido = lista.join(" · ");
  return unido.length > max ? unido.slice(0, max).trimEnd() + "…" : unido;
}
