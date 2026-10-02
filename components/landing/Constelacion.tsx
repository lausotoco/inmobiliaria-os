"use client";

/* ============================================================
   Portada: los perfiles de cliente como una red que sale de la K.
   Cada nodo es una persona (o empresa) con su figura; al pasar el
   mouse, su línea se enciende en cobre. Lleva a /para/<perfil>.
   En celular, la red se vuelve una lista colgada de una línea.
   ============================================================ */

import { useState } from "react";
import { C, LogoMarca } from "@/components/sitio/marca";
import { PERFILES, type PerfilId } from "@/lib/perfiles";

/* Figuras de línea (48 × 48) */
function Figura({ id }: { id: PerfilId }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden="true">
      {id === "compradores" && (
        <g {...p}>
          <circle cx="19" cy="15" r="6" />
          <path d="M8 38c0-7 5-12 11-12" />
          <circle cx="31" cy="31" r="7" />
          <path d="M36 36l5 5" />
        </g>
      )}
      {id === "propietarios" && (
        <g {...p}>
          <path d="M9 40V22L24 10l15 12v18Z" />
          <path d="M20 40V30h8v10" />
          <circle cx="35" cy="14" r="3" fill="currentColor" stroke="none" />
        </g>
      )}
      {id === "agentes" && (
        <g {...p}>
          <circle cx="18" cy="14" r="6" />
          <path d="M7 38c0-7 5-12 11-12s7 2 9 5" />
          <rect x="28" y="22" width="13" height="20" rx="3" />
          <path d="M33 38h3" />
        </g>
      )}
      {id === "oficinas" && (
        <g {...p}>
          <rect x="9" y="12" width="30" height="28" rx="2" />
          <path d="M9 20h30" />
          <circle cx="17" cy="28" r="2.5" />
          <circle cx="24" cy="28" r="2.5" />
          <circle cx="31" cy="28" r="2.5" />
          <path d="M14 36h20" />
        </g>
      )}
      {id === "constructoras" && (
        <g {...p}>
          <path d="M10 42V8h0M10 8h28M34 8v8" />
          <path d="M10 14l8-6" />
          <rect x="22" y="24" width="14" height="18" />
          <path d="M22 30h14M22 36h14M29 24v18" />
        </g>
      )}
    </svg>
  );
}

/* Posiciones en una caja de 1000 × 500 (la K en el centro) */
const CENTRO = { x: 500, y: 215 };
const POS: Record<PerfilId, { x: number; y: number }> = {
  compradores: { x: 150, y: 90 },
  propietarios: { x: 850, y: 90 },
  agentes: { x: 120, y: 340 },
  oficinas: { x: 880, y: 340 },
  constructoras: { x: 500, y: 430 },
};

export default function Constelacion() {
  const [activo, setActivo] = useState<PerfilId | null>(null);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <style>{`
        @keyframes kyFluye { to { stroke-dashoffset: -28; } }
        @keyframes kyFlota { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        .ky-flota { animation: kyFlota 5s ease-in-out infinite; }
        .ky-nodo .ky-burbuja { transition: background-color .35s ease, color .35s ease, border-color .35s ease, transform .35s ease, box-shadow .35s ease; }
        .ky-nodo:hover .ky-burbuja, .ky-nodo:focus-visible .ky-burbuja { background: ${C.grafito} !important; color: ${C.hueso} !important; border-color: ${C.grafito} !important; transform: scale(1.08); box-shadow: 0 18px 40px -18px rgba(26,26,24,.55); }
        .ky-nodo .ky-etq { transition: color .35s ease; }
        .ky-nodo:hover .ky-etq { color: ${C.cobre}; }
        @media (prefers-reduced-motion: reduce) { .ky-flota { animation: none; } }
      `}</style>

      {/* Escritorio y tableta: la red */}
      <div className="relative hidden aspect-[2/1] w-full md:block">
        <svg viewBox="0 0 1000 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {PERFILES.map((p, i) => {
            const d = POS[p.id];
            const on = activo === p.id;
            return (
              <g key={p.id}>
                <line x1={CENTRO.x} y1={CENTRO.y} x2={d.x} y2={d.y} stroke={on ? C.cobre : "rgba(26,26,24,.18)"} strokeWidth={on ? 2.2 : 1.3}
                  strokeDasharray="6 8" style={{ animation: `kyFluye ${on ? 0.6 : 2.2}s linear infinite`, transition: "stroke .3s" }} />
                {/* pulso que sale de la K hacia cada perfil */}
                <circle r={on ? 5 : 3.5} fill={C.cobre} opacity={on ? 1 : 0.7}>
                  <animateMotion dur={`${2.6 + i * 0.35}s`} repeatCount="indefinite" path={`M${CENTRO.x} ${CENTRO.y}L${d.x} ${d.y}`} />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* La K en el centro */}
        <div className="absolute -translate-x-1/2 -translate-y-[56px]" style={{ left: `${CENTRO.x / 10}%`, top: `${CENTRO.y / 5}%` }}>
          <div className="ky-flota flex h-28 w-28 items-center justify-center rounded-full border bg-white shadow-[0_20px_50px_-28px_rgba(26,26,24,.45)]" style={{ borderColor: C.linea }}>
            <LogoMarca marca="general" className="h-16 w-16" />
          </div>
          <p className="mt-3 text-center text-[10px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>
            ¿Quién eres?
          </p>
        </div>

        {/* Los perfiles */}
        {PERFILES.map((p, i) => {
          const d = POS[p.id];
          return (
            <a
              key={p.id}
              href={`/para/${p.id}`}
              onMouseEnter={() => setActivo(p.id)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(p.id)}
              onBlur={() => setActivo(null)}
              className="ky-nodo absolute flex w-48 -translate-x-1/2 -translate-y-[36px] flex-col items-center text-center outline-none"
              style={{ left: `${d.x / 10}%`, top: `${d.y / 5}%` }}
            >
              <span className="ky-flota flex flex-col items-center" style={{ animationDelay: `${i * 0.7}s` }}>
              <span className="ky-burbuja flex h-[72px] w-[72px] items-center justify-center rounded-full border bg-white" style={{ borderColor: C.linea, color: C.grafito }}>
                <Figura id={p.id} />
              </span>
              <span className="ky-etq mt-3 text-[14.5px] font-medium leading-snug" style={{ color: C.grafito }}>
                {p.yo}
              </span>
              </span>
            </a>
          );
        })}
      </div>

      {/* Celular: la K arriba y los perfiles colgados de una línea */}
      <div className="md:hidden">
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-white" style={{ borderColor: C.linea }}>
            <LogoMarca marca="general" className="h-12 w-12" />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>¿Quién eres?</p>
        </div>
        <div className="relative mx-auto mt-5 max-w-sm pl-2">
          <span className="absolute bottom-8 left-[38px] top-0 w-px" style={{ background: `repeating-linear-gradient(${C.cobre} 0 6px, transparent 6px 13px)` }} />
          {PERFILES.map((p) => (
            <a key={p.id} href={`/para/${p.id}`} className="relative flex items-center gap-4 py-2.5 text-left">
              <span className="relative z-10 flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border bg-white" style={{ borderColor: C.linea, color: C.grafito }}>
                <Figura id={p.id} />
              </span>
              <span className="text-[15px] font-medium leading-snug" style={{ color: C.grafito }}>{p.yo}</span>
              <span className="ml-auto pr-2" style={{ color: C.cobre }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
