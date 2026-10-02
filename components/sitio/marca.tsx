/* ============================================================
   KYRELO — Marca compartida de las páginas públicas
   Sin "use client": la usan tanto páginas del servidor como
   componentes del navegador.
   · LogoMarca: la K original + el marco de cada marca
     (misma geometría del manual de marca)
   ============================================================ */

import { APP } from "@/lib/config";

export const C = {
  grafito: "#1A1A18",
  cobre: "#B87333",
  hueso: "#F1EFE8",
  piedra: "#5F5E5A",
  linea: "#E0DDD2",
};

export const wa = (msg: string) =>
  `https://wa.me/${APP.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

export type Marca = "general" | "inmobiliaria" | "plataforma" | "marketing";

const KPOS: Record<Marca, { x: number; y: number; s: number }> = {
  general: { x: 150, y: 150, s: 1.35 },
  plataforma: { x: 150, y: 150, s: 0.92 },
  inmobiliaria: { x: 150, y: 194, s: 0.95 },
  marketing: { x: 150, y: 160, s: 0.8 },
};

/* Isotipo de cada marca en una caja de 300 × 300 */
export function LogoMarca({
  marca,
  tinta = C.grafito,
  className = "",
}: {
  marca: Marca;
  tinta?: string;
  className?: string;
}) {
  const k = KPOS[marca];
  return (
    <svg viewBox="0 0 300 300" className={className} role="img" aria-label={`KYRELO ${marca === "general" ? "" : marca}`}>
      {marca === "inmobiliaria" && <path d="M44 136L150 37L256 136H235.6L150 56L64.4 136Z" fill={tinta} />}
      {marca === "plataforma" && (
        <g fill="none" stroke={tinta} strokeWidth={14} strokeLinejoin="miter" strokeLinecap="butt">
          <path d="M58 76V40H242V76" />
          <path d="M58 224V260H242V224" />
        </g>
      )}
      {marca === "marketing" && (
        <>
          <path
            d="M98 18h104a36 36 0 0 1 36 36v192a36 36 0 0 1-36 36H98a36 36 0 0 1-36-36V54a36 36 0 0 1 36-36z"
            fill="none"
            stroke={tinta}
            strokeWidth={12}
            strokeLinejoin="round"
          />
          <circle cx={206} cy={52} r={12} fill={C.cobre} />
        </>
      )}
      <g transform={`translate(${k.x - 80 * k.s},${k.y - 95 * k.s}) scale(${k.s})`}>
        <path d="M30 20h20v150h-20z" fill={tinta} />
        <path d="M50 95L130 20H108L50 78Z" fill={tinta} />
        <path d="M50 95L130 170H108L50 113Z" fill={tinta} />
        <circle cx={50} cy={95} r={9} fill={C.cobre} />
      </g>
    </svg>
  );
}

