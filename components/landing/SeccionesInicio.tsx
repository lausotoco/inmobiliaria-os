"use client";

/* ============================================================
   Portada · secciones después de «Qué es KYRELO»
   · Metodo: cómo trabajamos, en tres pasos con íconos, y lo que
     siempre cumplimos.
   · HoyEnKyrelo: datos reales de la plataforma (compradores que
     buscan hoy e inmuebles disponibles).
   · CierreInicio: ¿quién eres? de nuevo, para que nadie se pierda.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { C, wa } from "@/components/sitio/marca";
import { Figura } from "@/components/landing/Constelacion";
import { EnVivo } from "@/components/perfiles/Servicios";
import { PERFILES } from "@/lib/perfiles";

const serif = { fontFamily: '"Fraunces", Georgia, serif' };

function useVisible<T extends HTMLElement>(umbral = 0.2) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: umbral });
    obs.observe(el);
    return () => obs.disconnect();
  }, [umbral]);
  return { ref, visible };
}

const ESTILOS = `
.si-rev { opacity: 0; transform: translateY(24px); transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
.si-in .si-rev { opacity: 1; transform: none; }
.si-paso { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; }
.si-paso:hover { transform: translateY(-4px); border-color: ${C.cobre}; box-shadow: 0 24px 46px -30px rgba(26,26,24,.55); }
.si-paso:hover .si-ico { background: ${C.cobre}; color: #fff; }
.si-ico { transition: background-color .35s ease, color .35s ease; }
.si-perfil { transition: background-color .3s ease, border-color .3s ease, transform .3s ease; }
.si-perfil:hover { background: rgba(241,239,232,.1); border-color: ${C.cobre}; transform: translateY(-2px); }
@media (prefers-reduced-motion: reduce) { .si-rev { opacity: 1; transform: none; transition: none; } }
`;

/* Íconos de línea de los pasos */
const ICONOS = [
  <svg key="a" viewBox="0 0 40 40" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="17" cy="13" r="6" /><path d="M6 34c0-6.5 5-11 11-11 2.5 0 4.8.7 6.6 2" /><circle cx="29" cy="28" r="5" /><path d="M33 32l4 4" /></svg>,
  <svg key="b" viewBox="0 0 40 40" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round"><path d="M7 34V17L20 7l13 10v17Z" /><path d="M16 34v-9h8v9" /></svg>,
  <svg key="c" viewBox="0 0 40 40" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="6" width="22" height="28" rx="2" /><path d="M14 14h12M14 20h12M14 26h6" /><path d="M24 30l3 3 6-7" /></svg>,
];

const PASOS = [
  ["Hablamos con quien quiere comprar", "Qué busca, dónde, con qué presupuesto y para cuándo."],
  ["Buscamos el inmueble", "Entre nuestros inmuebles y los de agentes y oficinas de confianza."],
  ["Acompañamos hasta firmar", "Visitas, promesa, banco y notaría."],
];

const CUMPLIMOS = [
  "Antes de mostrar un comprador, confirmamos que puede comprar.",
  "Los datos de las personas no se publican ni se entregan.",
  "Cada inmueble con precio real y papeles revisados.",
];

export function Metodo() {
  const { ref, visible } = useVisible<HTMLElement>(0.2);
  return (
    <section ref={ref} className={`border-t px-6 py-20 sm:px-10 sm:py-28 ${visible ? "si-in" : ""}`} style={{ borderColor: C.linea }}>
      <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
      <div className="mx-auto max-w-6xl">
        <div className="si-rev max-w-2xl">
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>Cómo trabajamos</p>
          <h2 className="mt-4 text-[32px] leading-[1.1] sm:text-[46px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
            Primero el comprador. <i style={{ color: C.cobre }}>Después el inmueble.</i>
          </h2>
        </div>
        <div className="relative mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {PASOS.map(([t, d], i) => (
            <div key={t} className="si-rev" style={{ transitionDelay: `${150 + i * 160}ms` }}>
              <div className="si-paso relative h-full rounded-3xl border bg-white p-6 sm:p-7" style={{ borderColor: C.linea }}>
                <div className="flex items-center justify-between">
                  <span className="si-ico flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: C.hueso, color: C.grafito }}>{ICONOS[i]}</span>
                  <span className="text-[44px] leading-none" style={{ ...serif, color: "#E2DCCF" }}>{i + 1}</span>
                </div>
                <h3 className="mt-6 text-[21px] leading-snug" style={serif}>{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: C.piedra }}>{d}</p>
              </div>
              {i < 2 && <span className="hidden md:block absolute top-1/2 text-[22px]" style={{ color: C.cobre, left: `calc(${(i + 1) * 33.33}% - 10px)` }} aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
        {/* Lo que siempre cumplimos */}
        <div className="si-rev mt-8 grid gap-3 rounded-3xl p-5 sm:grid-cols-3 sm:p-6" style={{ background: "#E9E4D8", transitionDelay: "600ms" }}>
          {CUMPLIMOS.map((c) => (
            <p key={c} className="flex items-start gap-3 text-[14.5px] leading-snug">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] text-white" style={{ background: C.cobre }}>✓</span>
              {c}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HoyEnKyrelo() {
  const { ref, visible } = useVisible<HTMLElement>(0.15);
  return (
    <section ref={ref} className={`px-6 py-20 sm:px-10 sm:py-28 ${visible ? "si-in" : ""}`} style={{ background: C.grafito, color: C.hueso }}>
      <div className="mx-auto max-w-6xl">
        <div className="si-rev max-w-2xl">
          <p className="text-[11px] font-semibold uppercase" style={{ color: "#D9A36A", letterSpacing: "0.26em" }}>Hoy en KYRELO</p>
          <h2 className="mt-4 text-[32px] leading-[1.1] sm:text-[46px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
            Esto está pasando <i style={{ color: C.cobre }}>ahora mismo.</i>
          </h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="si-rev min-w-0" style={{ transitionDelay: "150ms" }}>
            <div className="rounded-3xl p-1" style={{ background: "rgba(241,239,232,.06)" }}>
              <EnVivo tipo="requerimientos" titulo="Personas buscando comprar" compacto max={3} />
            </div>
            <a href="/plataforma" className="mt-4 inline-flex items-center gap-2 text-[14.5px] font-semibold" style={{ color: "#D9A36A" }}>
              ¿Eres agente u oficina? Ver todos los compradores →
            </a>
          </div>
          <div className="si-rev min-w-0" style={{ transitionDelay: "300ms" }}>
            <div className="rounded-3xl p-1" style={{ background: "rgba(241,239,232,.06)" }}>
              <EnVivo tipo="catalogo" titulo="Inmuebles disponibles" compacto max={3} />
            </div>
            <a href="/inmuebles" className="mt-4 inline-flex items-center gap-2 text-[14.5px] font-semibold" style={{ color: "#D9A36A" }}>
              ¿Buscas casa? Ver todos los inmuebles →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CierreInicio() {
  const { ref, visible } = useVisible<HTMLElement>(0.2);
  return (
    <section ref={ref} className={`relative overflow-hidden border-t px-6 py-24 sm:px-10 sm:py-32 ${visible ? "si-in" : ""}`} style={{ borderColor: "rgba(241,239,232,.08)", background: C.grafito }}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(184,115,51,.22), transparent 60%)" }} />
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="si-rev text-[34px] leading-[1.1] text-white sm:text-[52px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
          Cuéntanos quién eres. <i style={{ color: C.cobre }}>Te mostramos cómo te ayudamos.</i>
        </h2>
        <div className="mt-10 grid gap-2.5 text-left sm:grid-cols-2 lg:grid-cols-3">
          {PERFILES.map((p, i) => (
            <a key={p.id} href={`/para/${p.id}`} className="si-rev si-perfil flex items-center gap-3.5 rounded-2xl border p-3 pr-4 text-[14.5px] font-medium text-white"
              style={{ borderColor: "rgba(241,239,232,.16)", transitionDelay: `${150 + i * 80}ms` }}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(241,239,232,.08)", color: "#D9A36A" }}>
                <Figura id={p.id} className="h-6 w-6" />
              </span>
              <span className="leading-snug">{p.yo}</span>
              <span className="ml-auto" style={{ color: C.cobre }}>→</span>
            </a>
          ))}
          <a href={wa("Hola KYRELO, quiero hablar con ustedes.")} target="_blank" rel="noopener noreferrer"
            className="si-rev flex items-center justify-center gap-2 rounded-2xl p-3 text-[14.5px] font-semibold text-white"
            style={{ background: C.cobre, transitionDelay: "600ms" }}>
            Prefiero escribirles por WhatsApp →
          </a>
        </div>
      </div>
    </section>
  );
}
