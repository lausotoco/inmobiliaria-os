"use client";

/* ============================================================
   Portada: los perfiles de cliente como una red que sale de la K.
   · Instrucción clara arriba: «Toca tu perfil».
   · Cada cierto tiempo un perfil se ilumina solo (línea cobre y
     halo) para mostrar que se puede tocar; al pasar el mouse,
     manda el que la persona señala.
   · Cada perfil: círculo con su figura + etiqueta con flecha.
   · En celular: la K arriba y tarjetas colgadas de una línea.
   Lleva a /para/<perfil>.
   ============================================================ */

import { useEffect, useState } from "react";
import { C, LogoMarca } from "@/components/sitio/marca";
import { PERFILES, type PerfilId } from "@/lib/perfiles";

/* Figuras de línea (48 × 48) */
export function Figura({ id, className = "h-9 w-9" }: { id: PerfilId; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
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
          <circle cx="35" cy="14" r="3" fill={C.cobre} stroke="none" />
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
          <path d="M10 42V8M10 8h28M34 8v8" />
          <path d="M10 14l8-6" />
          <rect x="22" y="24" width="14" height="18" />
          <path d="M22 30h14M22 36h14M29 24v18" />
        </g>
      )}
    </svg>
  );
}

/* Mano que toca (la instrucción) */
function Mano() {
  return (
    <svg viewBox="0 0 24 24" className="ky-mano h-5 w-5" fill="none" stroke={C.cobre} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 10.5v-1a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 10.5a1.5 1.5 0 0 1 3 0v3.5a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.6-2.2L4 14.6a1.5 1.5 0 0 1 2.3-1.9L9 15" />
    </svg>
  );
}

/* Posiciones en una caja de 1000 × 470 (la K en el centro) */
const CENTRO = { x: 500, y: 205 };
const POS: Record<PerfilId, { x: number; y: number }> = {
  compradores: { x: 150, y: 80 },
  propietarios: { x: 850, y: 80 },
  agentes: { x: 135, y: 320 },
  oficinas: { x: 865, y: 320 },
  constructoras: { x: 500, y: 390 },
};
const W = 1000, Hc = 470;

export default function Constelacion() {
  const [hover, setHover] = useState<PerfilId | null>(null);
  const [auto, setAuto] = useState(0);

  // Recorre los perfiles uno por uno mientras nadie señala ninguno
  useEffect(() => {
    if (hover) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAuto((a) => (a + 1) % PERFILES.length), 2400);
    return () => clearInterval(t);
  }, [hover]);

  const luz: PerfilId = hover ?? PERFILES[auto].id;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kyFluye { to { stroke-dashoffset: -28; } }
        @keyframes kyFlota { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes kyHalo { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(1.65); opacity: 0 } }
        @keyframes kyGira { to { transform: rotate(360deg) } }
        @keyframes kyToca { 0%,100% { transform: translateY(0) } 40% { transform: translateY(3px) scale(.92) } }
        .ky-flota { animation: kyFlota 5s ease-in-out infinite; }
        .ky-mano { animation: kyToca 1.6s ease-in-out infinite; }
        .ky-orbita { animation: kyGira 28s linear infinite; }
        .ky-halo { position: absolute; inset: 0; border-radius: 9999px; border: 2px solid ${C.cobre}; animation: kyHalo 1.6s ease-out infinite; pointer-events: none; }
        .ky-burbuja, .ky-etiqueta, .ky-flecha { transition: background-color .35s ease, color .35s ease, border-color .35s ease, transform .35s ease, box-shadow .35s ease; }
        .ky-nodo.luz .ky-burbuja { border-color: ${C.cobre} !important; color: ${C.cobre} !important; box-shadow: 0 16px 40px -20px rgba(184,115,51,.6); }
        .ky-nodo.luz .ky-etiqueta { border-color: ${C.cobre} !important; }
        .ky-nodo.luz .ky-flecha { background: ${C.cobre} !important; color: #fff !important; }
        .ky-nodo:hover .ky-burbuja, .ky-nodo:focus-visible .ky-burbuja { background: ${C.grafito} !important; color: ${C.hueso} !important; border-color: ${C.grafito} !important; transform: scale(1.07); }
        .ky-nodo:hover .ky-etiqueta, .ky-nodo:focus-visible .ky-etiqueta { background: ${C.grafito} !important; color: ${C.hueso} !important; border-color: ${C.grafito} !important; }
        .ky-nodo:hover .ky-flecha { transform: translateX(2px); }
        .ky-fila { transition: border-color .3s ease, transform .3s ease; } .ky-fila:active { transform: scale(.98); }
        @media (prefers-reduced-motion: reduce) { .ky-flota, .ky-mano, .ky-orbita, .ky-halo { animation: none; } }
      ` }} />

      {/* La instrucción */}
      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-2.5">
        <Mano />
        <p className="text-center text-[15px] sm:text-[16px]" style={{ color: C.grafito }}>
          <span className="font-semibold">¿Quién eres?</span>{" "}
          <span style={{ color: C.piedra }}>Toca tu perfil y mira cómo te ayudamos.</span>
        </p>
      </div>

      {/* Escritorio y tableta: la red */}
      <div className="relative mt-4 hidden w-full md:block" style={{ aspectRatio: `${W} / ${Hc}` }}>
        <svg viewBox={`0 0 ${W} ${Hc}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          {PERFILES.map((p, i) => {
            const d = POS[p.id];
            const on = luz === p.id;
            return (
              <g key={p.id}>
                <line x1={CENTRO.x} y1={CENTRO.y} x2={d.x} y2={d.y} stroke={on ? C.cobre : "rgba(26,26,24,.16)"} strokeWidth={on ? 2.2 : 1.2}
                  strokeDasharray="6 8" style={{ animation: `kyFluye ${on ? 0.7 : 2.4}s linear infinite`, transition: "stroke .4s, stroke-width .4s" }} />
                <circle r={on ? 5 : 3} fill={C.cobre} opacity={on ? 1 : 0.55}>
                  <animateMotion dur={`${2.6 + i * 0.35}s`} repeatCount="indefinite" path={`M${CENTRO.x} ${CENTRO.y}L${d.x} ${d.y}`} />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* La K en el centro, con una órbita */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(CENTRO.x / W) * 100}%`, top: `${(CENTRO.y / Hc) * 100}%` }}>
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg viewBox="0 0 128 128" className="ky-orbita absolute inset-0 h-full w-full" aria-hidden="true">
              <circle cx="64" cy="64" r="62" fill="none" stroke={C.cobre} strokeWidth="1.2" strokeDasharray="2 7" opacity=".7" />
              <circle cx="64" cy="2" r="3.5" fill={C.cobre} />
            </svg>
            <div className="flex h-24 w-24 items-center justify-center rounded-full border bg-white shadow-[0_20px_50px_-26px_rgba(26,26,24,.5)]" style={{ borderColor: C.linea }}>
              <LogoMarca marca="general" className="h-14 w-14" />
            </div>
          </div>
        </div>

        {/* Los perfiles */}
        {PERFILES.map((p, i) => {
          const d = POS[p.id];
          const on = luz === p.id;
          return (
            <a
              key={p.id}
              href={`/para/${p.id}`}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.id)}
              onBlur={() => setHover(null)}
              aria-label={`${p.yo}: ver cómo te ayudamos`}
              className={`ky-nodo absolute w-56 -translate-x-1/2 -translate-y-[40px] outline-none ${on ? "luz" : ""}`}
              style={{ left: `${(d.x / W) * 100}%`, top: `${(d.y / Hc) * 100}%` }}
            >
              <span className="ky-flota flex flex-col items-center" style={{ animationDelay: `${i * 0.7}s` }}>
                <span className="relative">
                  {on && <span className="ky-halo" />}
                  <span className="ky-burbuja relative flex h-20 w-20 items-center justify-center rounded-full border-[1.5px] bg-white" style={{ borderColor: C.linea, color: C.grafito }}>
                    <Figura id={p.id} className="h-10 w-10" />
                  </span>
                </span>
                <span className="ky-etiqueta mt-3 inline-flex items-center gap-2 rounded-full border bg-white py-1.5 pl-4 pr-1.5 text-[13.5px] font-medium leading-tight shadow-[0_8px_24px_-18px_rgba(26,26,24,.5)]" style={{ borderColor: C.linea, color: C.grafito }}>
                  <span className="text-left">{p.yo}</span>
                  <span className="ky-flecha flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px]" style={{ background: "#EFEBE2", color: C.cobre }}>→</span>
                </span>
              </span>
            </a>
          );
        })}
      </div>

      {/* Celular: la K arriba y los perfiles colgados de una línea, como tarjetas */}
      <div className="mt-6 md:hidden">
        <div className="flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg viewBox="0 0 128 128" className="ky-orbita absolute inset-0 h-full w-full" aria-hidden="true">
              <circle cx="64" cy="64" r="62" fill="none" stroke={C.cobre} strokeWidth="1.4" strokeDasharray="2 7" opacity=".7" />
              <circle cx="64" cy="2" r="4" fill={C.cobre} />
            </svg>
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border bg-white" style={{ borderColor: C.linea }}>
              <LogoMarca marca="general" className="h-11 w-11" />
            </div>
          </div>
        </div>
        <div className="relative mx-auto mt-4 max-w-sm">
          <span className="absolute bottom-10 left-[33px] top-0 w-px" style={{ background: `repeating-linear-gradient(${C.cobre} 0 6px, transparent 6px 13px)` }} />
          {PERFILES.map((p) => (
            <a key={p.id} href={`/para/${p.id}`} className="ky-fila relative mt-2.5 flex items-center gap-3.5 rounded-2xl border bg-white py-2.5 pl-2.5 pr-3 text-left shadow-[0_10px_26px_-20px_rgba(26,26,24,.5)]" style={{ borderColor: C.linea }}>
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: C.linea, background: C.hueso, color: C.grafito }}>
                <Figura id={p.id} className="h-7 w-7" />
              </span>
              <span className="text-[15px] font-medium leading-snug" style={{ color: C.grafito }}>{p.yo}</span>
              <span className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] text-white" style={{ background: C.cobre }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
