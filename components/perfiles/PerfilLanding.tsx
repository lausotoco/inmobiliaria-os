"use client";

/* ============================================================
   Landing de un perfil de cliente (/para/[perfil])
   Barra de progreso · hero con gráfico animado y sellos de
   beneficios · ¿qué necesitas hoy? (servicios) · desliza y mira
   la diferencia · cierre · otros perfiles · botón fijo en celular
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { CabeceraSitio, PieSitio } from "@/components/sitio/Sitio";
import { C, wa } from "@/components/sitio/marca";
import { Figura } from "@/components/landing/Constelacion";
import { PERFILES, buscarPerfil, type PerfilId } from "@/lib/perfiles";
import { ESTILOS_GRAFICOS, GraficoPerfil } from "./Graficos";
import Servicios from "./Servicios";
import Comparador from "./Comparador";

const serif = { fontFamily: '"Fraunces", Georgia, serif' };

function useVisible<T extends HTMLElement>(umbral = 0.2) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }), { threshold: umbral });
    obs.observe(el);
    return () => obs.disconnect();
  }, [umbral]);
  return { ref, visible };
}

function Aparece({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useVisible<HTMLDivElement>(0.15);
  return (
    <div ref={ref} className={`pf-rev ${visible ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

type Cta = { texto: string; href?: string; whatsapp?: string };
const enlace = (cta: Cta) => (cta.whatsapp ? { href: wa(cta.whatsapp), target: "_blank", rel: "noopener noreferrer" } : { href: cta.href });

function Boton({ cta, claro = false, className = "" }: { cta: Cta; claro?: boolean; className?: string }) {
  return (
    <a
      {...enlace(cta)}
      className={`pf-btn pf-brillo relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-4 text-[15px] font-semibold ${className}`}
      style={{ background: claro ? C.hueso : C.cobre, color: claro ? C.grafito : "#fff", boxShadow: claro ? "none" : "0 14px 30px -14px rgba(184,115,51,.8)" }}
    >
      {cta.texto} <span aria-hidden="true">→</span>
    </a>
  );
}

export default function PerfilLanding({ id }: { id: PerfilId }) {
  const p = buscarPerfil(id)!;
  const [montado, setMontado] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [fijo, setFijo] = useState(false);
  const [activo, setActivo] = useState(p.servicios[0].id);
  function abrirForma(sid: string) {
    setActivo(sid);
    setTimeout(() => document.getElementById("formas")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  const otros = PERFILES.filter((o) => o.id !== id);

  useEffect(() => { const t = setTimeout(() => setMontado(true), 60); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const f = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgreso(h > 0 ? window.scrollY / h : 0);
      setFijo(window.scrollY > 520 && window.scrollY < h - 700);
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  return (
    <main style={{ background: C.hueso, color: C.grafito, fontFamily: "Inter, system-ui, sans-serif" }} className="min-h-screen overflow-x-clip">
      <style dangerouslySetInnerHTML={{ __html: `
        ${ESTILOS_GRAFICOS}
        .pf-rev { opacity: 0; transform: translateY(24px); transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
        .pf-rev.in { opacity: 1; transform: none; }
        .pf-btn { transition: transform .3s ease, box-shadow .3s ease; } .pf-btn:hover { transform: translateY(-2px) scale(1.02); }
        @keyframes pfBrillo { 0%, 70% { transform: translateX(-120%) skewX(-20deg) } 100% { transform: translateX(220%) skewX(-20deg) } }
        .pf-brillo::after { content: ""; position: absolute; inset: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: pfBrillo 3.2s ease-in-out infinite; }
        @keyframes pfOrbe { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(30px,-20px) scale(1.08) } }
        .pf-orbe { animation: pfOrbe 12s ease-in-out infinite; }
        .pf-forma { transition: border-color .3s ease, transform .3s ease, box-shadow .3s ease, opacity .8s cubic-bezier(.16,1,.3,1); }
        .pf-forma:hover { border-color: ${C.cobre}; transform: translateX(4px); box-shadow: 0 14px 30px -22px rgba(26,26,24,.55); }
        .pf-forma-n { background: ${C.hueso}; color: ${C.cobre}; border: 1.5px solid ${C.cobre}; transition: background-color .3s ease, color .3s ease; }
        .pf-forma:hover .pf-forma-n { background: ${C.cobre}; color: #fff; }
        .pf-forma-f { transition: transform .3s ease; } .pf-forma:hover .pf-forma-f { transform: translateX(3px); }
        .pf-otro { transition: border-color .35s ease, transform .35s ease, box-shadow .35s ease; }
        .pf-otro:hover { border-color: ${C.cobre}; transform: translateY(-4px); box-shadow: 0 18px 40px -26px rgba(26,26,24,.5); }
        .pf-otro:hover .pf-otro-ico { background: ${C.grafito}; color: ${C.hueso}; }
        .pf-otro-ico { transition: background-color .35s ease, color .35s ease; }
        @media (prefers-reduced-motion: reduce) { .pf-rev { opacity: 1 !important; transform: none !important; transition: none !important; } .pf-brillo::after, .pf-orbe { animation: none; } }
      ` }} />

      {/* Barra de progreso de lectura */}
      <div className="fixed left-0 top-0 z-50 h-[3px] w-full" aria-hidden="true">
        <div className="h-full origin-left" style={{ background: C.cobre, transform: `scaleX(${progreso})` }} />
      </div>

      <CabeceraSitio />

      {/* ═══ Hero ═══ */}
      <section className="relative px-6 pb-16 pt-14 sm:px-10 sm:pb-24 sm:pt-20">
        <div className="pf-orbe pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, rgba(184,115,51,.28), transparent 65%)" }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className={`pf-rev ${montado ? "in" : ""}`}>
            <p className="inline-flex items-center gap-2.5 rounded-full border bg-white/70 py-1.5 pl-1.5 pr-4 text-[13.5px] font-medium backdrop-blur" style={{ borderColor: C.linea }}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: C.grafito, color: C.hueso }}>
                <Figura id={id} className="h-4 w-4" />
              </span>
              «{p.yo}»
            </p>
            <h1 className="mt-7 text-[40px] leading-[1.04] sm:text-[60px]" style={{ ...serif, letterSpacing: "-0.03em" }}>
              {p.titular} <i style={{ color: C.cobre }}>{p.resalta}</i>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-[1.7] sm:text-[19px]" style={{ color: C.piedra }}>{p.bajada}</p>
            {/* Las formas de trabajar con KYRELO (las mismas de «¿Qué necesitas hoy?») */}
            <div className={`mt-6 grid gap-2.5 ${p.servicios.length === 3 ? "" : "sm:grid-cols-2"}`}>
              {p.servicios.map((s, i) => (
                <button key={s.id} type="button" onClick={() => abrirForma(s.id)}
                  className={`pf-forma pf-rev ${montado ? "in" : ""} group flex items-center gap-4 rounded-2xl border bg-white/80 p-3.5 pr-5 text-left backdrop-blur`}
                  style={{ borderColor: C.linea, transitionDelay: `${300 + i * 110}ms` }}>
                  <span className="pf-forma-n flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold" style={serif}>{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-semibold leading-snug">{s.nombre}</span>
                    <span className="block text-[13.5px] leading-snug" style={{ color: C.piedra }}>{s.corto}</span>
                  </span>
                  <span className="pf-forma-f ml-auto text-[18px]" style={{ color: C.cobre }}>→</span>
                </button>
              ))}
            </div>
          </div>
          <div className={`pf-rev ${montado ? "in" : ""} relative rounded-[32px] p-6 shadow-[0_40px_80px_-40px_rgba(26,26,24,.7)] sm:p-9`} style={{ background: C.grafito, transitionDelay: "150ms" }}>
            <div className="pointer-events-none absolute inset-0 rounded-[32px]" style={{ background: "radial-gradient(circle at 80% 10%, rgba(217,163,106,.18), transparent 55%)" }} />
            <GraficoPerfil id={id} className="relative h-auto w-full" />
          </div>
        </div>
      </section>

      {/* ═══ ¿Qué necesitas hoy? ═══ */}
      <Servicios perfil={p} activo={activo} setActivo={setActivo} />

      {/* ═══ Desliza y mira la diferencia ═══ */}
      <section className="px-6 py-20 sm:px-10 sm:py-28" style={{ background: "#E9E4D8" }}>
        <div className="mx-auto max-w-4xl">
          <Aparece className="text-center">
            <h2 className="text-[32px] leading-[1.1] sm:text-[46px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
              Desliza y mira <i style={{ color: C.cobre }}>la diferencia.</i>
            </h2>
          </Aparece>
          <Aparece delay={120} className="mt-10">
            <Comparador cambios={p.cambios} />
          </Aparece>
        </div>
      </section>

      {/* ═══ Cierre ═══ */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:px-10 sm:py-28" style={{ background: C.grafito }}>
        <div className="pf-orbe pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(184,115,51,.25), transparent 60%)" }} />
        <Aparece className="relative">
          <p className="inline-flex items-center gap-2 text-[13px]" style={{ color: "#D9A36A" }}>
            <Figura id={id} className="h-5 w-5" /> «{p.yo}»
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl text-[32px] leading-[1.12] text-white sm:text-[50px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
            {p.titular} <i style={{ color: C.cobre }}>{p.resalta}</i>
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {p.promesas.map((t) => (
              <span key={t} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] text-white" style={{ borderColor: "rgba(241,239,232,.2)" }}>
                <span style={{ color: "#D9A36A" }}>✓</span> {t}
              </span>
            ))}
          </div>
          <div className="mt-10">
            <Boton cta={p.cta} />
          </div>
        </Aparece>
      </section>

      {/* ═══ Otros perfiles ═══ */}
      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.piedra, letterSpacing: "0.22em" }}>¿No eres tú? Elige tu perfil</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {otros.map((o) => (
              <a key={o.id} href={`/para/${o.id}`} className="pf-otro flex items-center gap-3.5 rounded-2xl border bg-white p-3.5 pr-5 text-[14.5px] font-medium" style={{ borderColor: C.linea }}>
                <span className="pf-otro-ico flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: C.hueso, color: C.grafito }}>
                  <Figura id={o.id} className="h-6 w-6" />
                </span>
                <span className="leading-snug">{o.yo}</span>
                <span className="ml-auto" style={{ color: C.cobre }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <PieSitio />

      {/* Botón fijo en celular */}
      <div
        className="fixed inset-x-3 bottom-3 z-40 transition-all duration-500 md:hidden"
        style={{ opacity: fijo ? 1 : 0, transform: fijo ? "translateY(0)" : "translateY(120%)", pointerEvents: fijo ? "auto" : "none" }}
      >
        <a
          {...enlace(p.cta)}
          className="pf-brillo relative flex items-center justify-between overflow-hidden rounded-full py-2 pl-2 pr-5 text-[14.5px] font-semibold text-white shadow-[0_18px_40px_-14px_rgba(26,26,24,.7)]"
          style={{ background: C.grafito }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: C.cobre }}>
            <Figura id={id} className="h-5 w-5" />
          </span>
          {p.cta.texto}
          <span style={{ color: "#D9A36A" }}>→</span>
        </a>
      </div>
    </main>
  );
}
