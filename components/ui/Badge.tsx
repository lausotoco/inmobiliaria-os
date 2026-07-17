"use client";

// Badges editoriales: monocromo, hairline, tipografía en mayúsculas espaciadas.
// Los estados críticos se distinguen con negro pleno o un rojo apagado.

const DESTACADOS: Record<string, string> = {
  // Negro pleno — estados positivos/activos
  activo: "border-[#1A1A18]/25 text-[#1A1A18]",
  disponible: "border-[#1A1A18]/25 text-[#1A1A18]",
  respondido: "border-[#1A1A18]/25 text-[#1A1A18]",
  "crédito aprobado": "border-[#1A1A18]/25 text-[#1A1A18]",
  // Rojo apagado — atención
  inmediata: "border-[#D5BBB5] text-[#8E3B31]",
  perdido: "border-[#D5BBB5] text-[#8E3B31]",
  cancelado: "border-[#D5BBB5] text-[#8E3B31]",
};

export default function Badge({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null;
  const estilo =
    DESTACADOS[texto.toLowerCase()] ?? "border-[#E0DDD2] text-[#5F5E5A]";
  return (
    <span
      className={`inline-flex items-center rounded-full border bg-transparent px-2.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] ${estilo}`}
    >
      {texto}
    </span>
  );
}
