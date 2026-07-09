"use client";

const COLORES: Record<string, string> = {
  // Estados de cliente
  activo: "bg-emerald-50 text-emerald-700",
  "en pausa": "bg-amber-50 text-amber-700",
  cerrado: "bg-sky-50 text-sky-700",
  perdido: "bg-red-50 text-red-700",
  // Urgencia
  inmediata: "bg-red-50 text-red-700",
  "1-3 meses": "bg-amber-50 text-amber-700",
  "+3 meses": "bg-slate-100 text-slate-600",
  // Financiación
  "crédito aprobado": "bg-emerald-50 text-emerald-700",
  "en trámite": "bg-amber-50 text-amber-700",
  "recursos propios": "bg-sky-50 text-sky-700",
  // Requerimientos
  pausado: "bg-amber-50 text-amber-700",
  cumplido: "bg-sky-50 text-sky-700",
  cancelado: "bg-red-50 text-red-700",
  // Portafolios
  borrador: "bg-slate-100 text-slate-600",
  enviado: "bg-sky-50 text-sky-700",
  visto: "bg-violet-50 text-violet-700",
  respondido: "bg-emerald-50 text-emerald-700",
  // Propiedades
  disponible: "bg-emerald-50 text-emerald-700",
  reservada: "bg-amber-50 text-amber-700",
  "en negociación": "bg-violet-50 text-violet-700",
  vendida: "bg-slate-100 text-slate-600",
};

export default function Badge({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null;
  const color = COLORES[texto.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {texto}
    </span>
  );
}
