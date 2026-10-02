"use client";

/* ============================================================
   Portada · «Qué es KYRELO»: la K en el centro y de ella salen
   las tres marcas. Al pasar por una marca (o solo, cada pocos
   segundos) la K se transforma en el logo de esa marca y su rama
   se enciende. Las ramas se dibujan al entrar en pantalla.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { C, LogoMarca, type Marca } from "@/components/sitio/marca";

const serif = { fontFamily: '"Fraunces", Georgia, serif' };

const MARCAS: { marca: Exclude<Marca, "general">; nombre: string; titulo: string; texto: string; para: string; href: string; boton: string }[] = [
  {
    marca: "inmobiliaria",
    nombre: "KYRELO Inmobiliaria",
    titulo: "Compra, vende o arrienda tu vivienda.",
    texto: "Te buscamos el inmueble que necesitas o le encontramos comprador al tuyo, solo con personas que de verdad pueden comprar.",
    para: "Para compradores y propietarios",
    href: "/inmobiliaria",
    boton: "Conocer más",
  },
  {
    marca: "plataforma",
    nombre: "KYRELO Plataforma",
    titulo: "Compradores para agentes y oficinas.",
    texto: "Publicamos lo que buscan nuestros compradores para que agentes y oficinas les ofrezcan sus inmuebles.",
    para: "Para agentes y oficinas inmobiliarias",
    href: "/plataforma",
    boton: "Ver compradores",
  },
  {
    marca: "marketing",
    nombre: "KYRELO Marketing",
    titulo: "Videos y publicidad para vender más rápido.",
    texto: "Editamos videos, hacemos recorridos en 3D y movemos los inmuebles con publicidad en redes.",
    para: "Para agentes, oficinas y constructoras",
    href: "/marketing",
    boton: "Conocer más",
  },
];

export default function Ecosistema() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [auto, setAuto] = useState(-1); // -1 = la K sola

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // La K muestra sola cada marca: K → Inmobiliaria → Plataforma → Marketing → K…
  useEffect(() => {
    if (!visible || hover !== null) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAuto((a) => (a >= 2 ? -1 : a + 1)), 2200);
    return () => clearInterval(t);
  }, [visible, hover]);

  const activa = hover ?? auto;
  const logoActivo: Marca = activa >= 0 ? MARCAS[activa].marca : "general";
  const xs = [167, 500, 833];

  return (
    <section ref={ref} id="marcas" className="scroll-mt-20 overflow-hidden px-6 py-20 sm:px-10 sm:py-28" style={{ borderTop: `1px solid ${C.linea}` }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ecTraza { to { stroke-dashoffset: 0 } }
        @keyframes ecFluye { to { stroke-dashoffset: -26 } }
        .ec-rama { stroke-dasharray: 700; stroke-dashoffset: 700; }
        .ec-in .ec-rama { animation: ecTraza 1.2s cubic-bezier(.16,1,.3,1) forwards; }
        .ec-col { opacity: 0; transform: translateY(26px); transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1), border-color .35s ease, box-shadow .35s ease; }
        .ec-in .ec-col { opacity: 1; transform: none; }
        .ec-col.on { border-color: ${C.cobre}; box-shadow: 0 26px 50px -30px rgba(184,115,51,.55); }
        .ec-logo { transition: background-color .35s ease; }
        .ec-k > * { transition: opacity .5s ease, transform .6s cubic-bezier(.16,1,.3,1); }
        @keyframes ecHalo { 0% { transform: scale(1); opacity: .5 } 100% { transform: scale(1.5); opacity: 0 } }
        .ec-halo { animation: ecHalo 2.2s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ec-rama { stroke-dashoffset: 0; animation: none !important; } .ec-col { opacity: 1; transform: none; } .ec-halo { animation: none; } }
      ` }} />
      <div className={`mx-auto max-w-6xl ${visible ? "ec-in" : ""}`}>
        {/* Qué es KYRELO, en una frase */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>Qué es KYRELO</p>
          <h2 className="mt-4 text-[34px] leading-[1.08] sm:text-[52px]" style={{ ...serif, letterSpacing: "-0.03em" }}>
            Una K, <i style={{ color: C.cobre }}>tres formas de ayudarte.</i>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-[1.7] sm:text-[18px]" style={{ color: C.piedra }}>
            KYRELO es una empresa inmobiliaria que trabaja al revés: primero conocemos a quien quiere comprar y después
            buscamos el inmueble. Alrededor de esa idea creamos tres marcas.
          </p>
        </div>

        {/* La K protagonista: se transforma en cada marca */}
        <div className="relative mx-auto mt-12 flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
          <span className="ec-halo absolute inset-0 rounded-full" style={{ border: `2px solid ${C.cobre}` }} />
          <div className="ec-k relative flex h-full w-full items-center justify-center rounded-full shadow-[0_30px_60px_-30px_rgba(26,26,24,.7)]" style={{ background: C.grafito }}>
            {(["general", "inmobiliaria", "plataforma", "marketing"] as Marca[]).map((m) => (
              <span key={m} className="absolute inset-0 flex items-center justify-center" style={{ opacity: logoActivo === m ? 1 : 0, transform: logoActivo === m ? "scale(1)" : "scale(.85)" }}>
                <LogoMarca marca={m} tinta={C.hueso} className="h-24 w-24 sm:h-28 sm:w-28" />
              </span>
            ))}
          </div>
        </div>
        <p className="mt-4 h-5 text-center text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.24em" }}>
          {activa >= 0 ? MARCAS[activa].nombre : "KYRELO"}
        </p>

        {/* Las ramas (escritorio) */}
        <svg viewBox="0 0 1000 120" className="mt-2 hidden h-[120px] w-full md:block" preserveAspectRatio="none" aria-hidden="true">
          {xs.map((x, i) => {
            const on = activa === i;
            const d = `M500 0 C500 60, ${x} 50, ${x} 120`;
            return (
              <g key={x}>
                <path className="ec-rama" d={d} fill="none" stroke="rgba(26,26,24,.18)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ animationDelay: `${i * 0.15}s` }} />
                {on && <path d={d} fill="none" stroke={C.cobre} strokeWidth={2.5} strokeDasharray="8 5" vectorEffect="non-scaling-stroke" style={{ animation: "ecFluye .6s linear infinite" }} />}
              </g>
            );
          })}
        </svg>
        {/* La rama (celular) */}
        <div className="mx-auto mt-2 h-10 w-px md:hidden" style={{ background: `repeating-linear-gradient(${C.cobre} 0 6px, transparent 6px 12px)` }} />

        {/* Las tres marcas */}
        <div className="grid gap-5 md:grid-cols-3">
          {MARCAS.map((m, i) => (
            <a
              key={m.marca}
              href={m.href}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={`ec-col group flex flex-col rounded-3xl border bg-white p-7 ${activa === i ? "on" : ""}`}
              style={{ borderColor: C.linea, transitionDelay: visible ? `${300 + i * 150}ms, ${300 + i * 150}ms, 0ms, 0ms` : "0ms" }}
            >
              <div className="flex items-center gap-3.5">
                <span className="ec-logo flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: activa === i ? C.grafito : C.hueso }}>
                  <LogoMarca marca={m.marca} tinta={activa === i ? C.hueso : C.grafito} className="h-10 w-10" />
                </span>
                <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.18em" }}>{m.nombre}</p>
              </div>
              <h3 className="mt-6 text-[24px] leading-snug" style={serif}>{m.titulo}</h3>
              <p className="mt-3 text-[15px] leading-relaxed" style={{ color: C.piedra }}>{m.texto}</p>
              <p className="mt-5 inline-flex self-start rounded-full px-3.5 py-1.5 text-[12.5px] font-medium" style={{ background: "#EFEBE2" }}>{m.para}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-7 text-[14.5px] font-semibold">
                {m.boton}
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] text-white transition-transform group-hover:translate-x-1" style={{ background: C.cobre }}>→</span>
              </span>
            </a>
          ))}
        </div>

        <p className="mt-10 text-center text-[13.5px]" style={{ color: C.piedra }}>
          Trabajamos en vivienda de <span className="font-semibold" style={{ color: C.grafito }}>Chía · Cajicá · Cota · Sopó · Bogotá norte</span>
        </p>
      </div>
    </section>
  );
}
