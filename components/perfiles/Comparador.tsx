"use client";

/* ============================================================
   «Desliza y mira la diferencia»: comparador antes / después.
   Abajo, «Con KYRELO» (grafito y cobre); encima, «Sin KYRELO»
   (gris), recortado hasta donde esté la manija. Cada fila tiene
   el mismo alto en las dos capas, así al deslizar cambia en su
   lugar. Al entrar en pantalla la manija se mueve sola una vez
   para mostrar que se puede arrastrar.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { C } from "@/components/sitio/marca";

/* «Sin» se lee a la izquierda y «Con» a la derecha: con la manija en el medio se ven las dos */
function Fila({ texto, con }: { texto: string; con: boolean }) {
  return (
    <div className={`flex h-[92px] items-center border-b px-4 last:border-b-0 sm:h-[80px] sm:px-8 ${con ? "justify-end" : "justify-start"}`} style={{ borderColor: con ? "rgba(241,239,232,.1)" : "rgba(26,26,24,.08)" }}>
      <div className={`flex max-w-[46%] items-center gap-2.5 sm:gap-3.5 ${con ? "flex-row-reverse text-right" : ""}`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8" style={{ background: con ? C.cobre : "rgba(26,26,24,.08)" }}>
          {con ? (
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4L16 6" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="#8A8880" strokeWidth={2.4} strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
          )}
        </span>
        <span className={con ? "text-[13.5px] font-semibold leading-snug sm:text-[18px]" : "text-[13px] leading-snug sm:text-[16.5px]"} style={{ color: con ? C.hueso : "#7A7870" }}>
          {texto}
        </span>
      </div>
    </div>
  );
}

export default function Comparador({ cambios }: { cambios: [string, string][] }) {
  const caja = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(50);
  const [tocado, setTocado] = useState(false);
  const arrastrando = useRef(false);
  const tocadoRef = useRef(false);

  // Pista de movimiento la primera vez que se ve
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let raf = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const t0 = performance.now();
      const paso = (t: number) => {
        if (tocadoRef.current) return;
        const k = Math.min((t - t0) / 2600, 1);
        setPos(50 + Math.sin(k * Math.PI * 2) * 32 * (1 - k * 0.5));
        if (k < 1) raf = requestAnimationFrame(paso);
        else setPos(50);
      };
      raf = requestAnimationFrame(paso);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  function mover(clientX: number) {
    const r = caja.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  }
  function empezar(e: React.PointerEvent) {
    tocadoRef.current = true;
    setTocado(true);
    arrastrando.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    mover(e.clientX);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.22em" }}>
        <span style={{ color: "#8A8880" }}>← Sin KYRELO</span>
        <span style={{ color: C.cobre }}>Con KYRELO →</span>
      </div>
      <div
        ref={caja}
        className="relative cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-[28px] shadow-[0_30px_70px_-40px_rgba(26,26,24,.6)]"
        onPointerDown={empezar}
        onPointerMove={(e) => arrastrando.current && mover(e.clientX)}
        onPointerUp={() => (arrastrando.current = false)}
        onPointerCancel={() => (arrastrando.current = false)}
      >
        {/* Con KYRELO (abajo) */}
        <div style={{ background: C.grafito }}>
          {cambios.map(([, ahora]) => <Fila key={ahora} texto={ahora} con />)}
        </div>
        {/* Sin KYRELO (encima, recortado) */}
        <div className="absolute inset-0" style={{ background: "#E7E2D7", clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {cambios.map(([antes]) => <Fila key={antes} texto={antes} con={false} />)}
        </div>
        {/* Manija */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
          <div className="absolute inset-y-0 -left-px w-[2px]" style={{ background: C.cobre }} />
          <div
            className={`absolute left-0 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[18px] font-semibold text-white ${tocado ? "" : "pf-latido"}`}
            style={{ background: C.cobre, boxShadow: "0 10px 30px -8px rgba(184,115,51,.7), 0 0 0 6px rgba(241,239,232,.9)" }}
          >
            ⟷
          </div>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => { tocadoRef.current = true; setTocado(true); setPos(Number(e.target.value)); }}
        className="sr-only"
        aria-label="Comparar sin KYRELO y con KYRELO"
      />
      <p className="mt-4 text-center text-[13px]" style={{ color: C.piedra }}>
        Arrastra el círculo para comparar
      </p>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pfLatido { 0%,100% { box-shadow: 0 10px 30px -8px rgba(184,115,51,.7), 0 0 0 6px rgba(241,239,232,.9), 0 0 0 6px rgba(184,115,51,.5) } 50% { box-shadow: 0 10px 30px -8px rgba(184,115,51,.7), 0 0 0 6px rgba(241,239,232,.9), 0 0 0 18px rgba(184,115,51,0) } }
        .pf-latido { animation: pfLatido 1.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .pf-latido { animation: none; } }
      ` }} />
    </div>
  );
}
