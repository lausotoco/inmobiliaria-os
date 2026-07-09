"use client";

const COLORES: Record<string, string> = {
  // Estados de cliente
  activo: "bg-emerald-500/10 text-[#34D399] ring-emerald-500/20",
  "en pausa": "bg-amber-500/100/10 text-amber-400 ring-amber-500/20",
  cerrado: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  perdido: "bg-red-500/10 text-red-400 ring-red-500/20",
  // Urgencia
  inmediata: "bg-red-500/10 text-red-400 ring-red-500/20",
  "1-3 meses": "bg-amber-500/100/10 text-amber-400 ring-amber-500/20",
  "+3 meses": "bg-white/[0.06] text-[#6B7B9E] ring-white/10",
  // Financiación
  "crédito aprobado": "bg-emerald-500/10 text-[#34D399] ring-emerald-500/20",
  "en trámite": "bg-amber-500/100/10 text-amber-400 ring-amber-500/20",
  "recursos propios": "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  // Requerimientos
  pausado: "bg-amber-500/100/10 text-amber-400 ring-amber-500/20",
  cumplido: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  cancelado: "bg-red-500/10 text-red-400 ring-red-500/20",
  // Portafolios
  borrador: "bg-white/[0.06] text-[#6B7B9E] ring-white/10",
  enviado: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  visto: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
  respondido: "bg-emerald-500/10 text-[#34D399] ring-emerald-500/20",
  // Propiedades
  disponible: "bg-emerald-500/10 text-[#34D399] ring-emerald-500/20",
  reservada: "bg-amber-500/100/10 text-amber-400 ring-amber-500/20",
  "en negociación": "bg-violet-500/10 text-violet-400 ring-violet-500/20",
  vendida: "bg-white/[0.06] text-[#6B7B9E] ring-white/10",
};

export default function Badge({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null;
  const color =
    COLORES[texto.toLowerCase()] ?? "bg-white/[0.06] text-[#6B7B9E] ring-white/10";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset backdrop-blur ${color}`}
    >
      {texto}
    </span>
  );
}
