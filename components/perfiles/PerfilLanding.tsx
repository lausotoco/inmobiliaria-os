"use client";

/* ============================================================
   Landing de un perfil de cliente (/para/[perfil])
   Hero con gráfico animado · lo que cambia · cómo funciona ·
   qué marca te acompaña · promesas · otros perfiles · cierre
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { CabeceraSitio, PieSitio } from "@/components/sitio/Sitio";
import { C, wa } from "@/components/sitio/marca";
import { PERFILES, buscarPerfil, type PerfilId } from "@/lib/perfiles";
import { ESTILOS_GRAFICOS, GraficoPerfil } from "./Graficos";
import Servicios from "./Servicios";

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

function Boton({ cta, oscuro = false }: { cta: { texto: string; href?: string; whatsapp?: string }; oscuro?: boolean }) {
  const ext = cta.whatsapp ? { href: wa(cta.whatsapp), target: "_blank", rel: "noopener noreferrer" } : { href: cta.href };
  return (
    <a
      {...ext}
      className="pf-btn inline-flex items-center justify-center rounded-full px-8 py-4 text-[15px] font-semibold"
      style={{ background: oscuro ? C.hueso : C.cobre, color: oscuro ? C.grafito : "#fff" }}
    >
      {cta.texto}
    </a>
  );
}

export default function PerfilLanding({ id }: { id: PerfilId }) {
  const p = buscarPerfil(id)!;
  const [montado, setMontado] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMontado(true), 60); return () => clearTimeout(t); }, []);
  const otros = PERFILES.filter((o) => o.id !== id);

  return (
    <main style={{ background: C.hueso, color: C.grafito, fontFamily: "Inter, system-ui, sans-serif" }} className="min-h-screen">
      <style>{`
        ${ESTILOS_GRAFICOS}
        .pf-rev { opacity: 0; transform: translateY(24px); transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
        .pf-rev.in { opacity: 1; transform: none; }
        .pf-btn { transition: transform .3s ease, opacity .3s ease; } .pf-btn:hover { transform: translateY(-1px); opacity: .92; }
          .pf-tachar { -webkit-box-decoration-break: clone; box-decoration-break: clone; background-image: linear-gradient(currentColor, currentColor); background-size: 0% 1.5px; background-repeat: no-repeat; background-position: 0 55%; transition: background-size .9s cubic-bezier(.16,1,.3,1) .35s; }
        .pf-rev.in .pf-tachar { background-size: 100% 1.5px; }
        .pf-linea { transform-origin: left; transform: scaleX(0); transition: transform 2.2s cubic-bezier(.16,1,.3,1); }
        .pf-pasos.in .pf-linea { transform: scaleX(1); }
        .pf-paso { opacity: 0; transform: translateY(18px); transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }
        .pf-pasos.in .pf-paso { opacity: 1; transform: none; }
        .pf-num { transition: background-color .5s ease, color .5s ease; }
        .pf-pasos.in .pf-num { background-color: ${C.cobre}; color: #fff; border-color: ${C.cobre}; }
        .pf-otro { transition: border-color .35s ease, transform .35s ease; } .pf-otro:hover { border-color: ${C.cobre}; transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) { .pf-rev, .pf-paso, .pf-linea { opacity: 1 !important; transform: none !important; transition: none !important; } }
      `}</style>

      <CabeceraSitio />

      {/* ═══ Hero ═══ */}
      <section className="px-6 pb-16 pt-14 sm:px-10 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className={`pf-rev ${montado ? "in" : ""}`}>
            <p
              className="inline-flex rounded-full border px-4 py-1.5 text-[13px] font-medium"
              style={{ borderColor: C.cobre, color: C.cobre }}
            >
              «{p.yo}»
            </p>
            <h1 className="mt-7 text-[40px] leading-[1.04] sm:text-[60px]" style={{ ...serif, letterSpacing: "-0.03em" }}>
              {p.titular} <i style={{ color: C.cobre }}>{p.resalta}</i>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-[1.7] sm:text-[19px]" style={{ color: C.piedra }}>
              {p.bajada}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Boton cta={p.cta} />
              <a href="#servicios" className="text-[15px] font-semibold underline underline-offset-4">
                Ver cómo te ayudamos ↓
              </a>
            </div>
          </div>
          <div
            className={`pf-rev ${montado ? "in" : ""} rounded-[28px] p-6 sm:p-9`}
            style={{ background: C.grafito, transitionDelay: "150ms" }}
          >
            <GraficoPerfil id={id} className="h-auto w-full" />
          </div>
        </div>
      </section>

      {/* ═══ Servicios (lo principal) ═══ */}
      <Servicios perfil={p} />

      {/* ═══ Lo que cambia ═══ */}
      <section className="border-t px-6 py-20 sm:px-10 sm:py-28" style={{ borderColor: C.linea }}>
        <div className="mx-auto max-w-5xl">
          <Aparece>
            <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>Lo que cambia</p>
            <h2 className="mt-4 text-[32px] leading-[1.1] sm:text-[44px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
              Antes y <i style={{ color: C.cobre }}>con KYRELO.</i>
            </h2>
          </Aparece>
          <div className="mt-12 space-y-3">
            {p.cambios.map(([antes, ahora], i) => (
              <Aparece key={antes} delay={i * 110}>
                <div className="grid items-center gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-6 sm:p-6" style={{ borderColor: C.linea }}>
                  <p className="text-[15px] sm:text-[16px]" style={{ color: "#8A8880" }}><span className="pf-tachar">{antes}</span></p>
                  <span className="hidden text-[20px] sm:block" style={{ color: C.cobre }}>→</span>
                  <p className="flex items-center gap-3 text-[16px] font-semibold sm:text-[17px]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: C.cobre }}>
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4L16 6" /></svg>
                    </span>
                    {ahora}
                  </p>
                </div>
              </Aparece>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {p.promesas.map((t, i) => (
              <Aparece key={t} delay={i * 100}>
                <div className="flex items-center gap-3 rounded-2xl px-6 py-5" style={{ background: "#E9E5DA" }}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: C.cobre }} />
                  <p className="text-[15px] font-semibold">{t}</p>
                </div>
              </Aparece>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ Cierre ═══ */}
      <section className="px-6 py-24 text-center sm:px-10" style={{ background: C.grafito }}>
        <Aparece>
          <p className="text-[13px]" style={{ color: "#D9A36A" }}>«{p.yo}»</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-[32px] leading-[1.12] text-white sm:text-[48px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
            {p.titular} <i style={{ color: C.cobre }}>{p.resalta}</i>
          </h2>
          <div className="mt-10">
            <Boton cta={p.cta} oscuro />
          </div>
        </Aparece>
      </section>

      {/* ═══ Otros perfiles ═══ */}
      <section className="px-6 py-16 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.piedra, letterSpacing: "0.22em" }}>¿No eres tú? Elige tu perfil</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {otros.map((o) => (
              <a key={o.id} href={`/para/${o.id}`} className="pf-otro flex items-center justify-between gap-3 rounded-2xl border bg-white px-5 py-4 text-[14.5px] font-medium" style={{ borderColor: C.linea }}>
                {o.yo}
                <span style={{ color: C.cobre }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <PieSitio />
    </main>
  );
}
