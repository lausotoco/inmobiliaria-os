/* ============================================================
   Teléfono colombiano · normalización y validación
   ------------------------------------------------------------
   Acepta:  3001234567 · 300 123 4567 · 300-123-4567
            +57 300 123 4567 · 57 300 123 4567
   Devuelve: 573001234567 (indicativo 57, sin +, sin espacios)
   ============================================================ */

export type ResultadoTelefono =
  | { ok: true; normalizado: string }
  | { ok: false; error: string };

const ERROR_FIJO =
  "Necesitamos un número de celular para escribirte por WhatsApp.";
const ERROR_GENERICO =
  "Revisa el número: necesitamos un celular colombiano de 10 dígitos.";

export function normalizarTelefono(entrada: string): ResultadoTelefono {
  const digitos = (entrada || "").replace(/\D/g, "");

  if (!digitos) return { ok: false, error: ERROR_GENERICO };

  // Fijo de Bogotá: 7 dígitos sueltos, o empieza por 60 (indicativo nuevo).
  const esFijo =
    digitos.length === 7 ||
    (digitos.length === 10 && digitos.startsWith("60")) ||
    (digitos.length === 12 && digitos.startsWith("5760"));
  if (esFijo) return { ok: false, error: ERROR_FIJO };

  // Celular sin indicativo: 10 dígitos empezando por 3.
  if (digitos.length === 10 && digitos.startsWith("3")) {
    return { ok: true, normalizado: "57" + digitos };
  }

  // Celular con indicativo: 12 dígitos empezando por 573.
  if (digitos.length === 12 && digitos.startsWith("573")) {
    return { ok: true, normalizado: digitos };
  }

  return { ok: false, error: ERROR_GENERICO };
}

/** Formato legible para las notificaciones: +57 311 801 8295 */
export function formatearTelefono(normalizado: string): string {
  const d = normalizado.replace(/\D/g, "");
  if (d.length !== 12) return normalizado;
  return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}
