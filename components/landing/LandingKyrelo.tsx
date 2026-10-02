"use client";

/* ============================================================
   KYRELO — Página pública (Home)
   Secciones: Hero (¿quién eres?) · Qué es KYRELO (la K y sus tres
              marcas) · Cómo trabajamos · Hoy en KYRELO · Cierre
   Regla: la portada no habla de cobros. Cada marca explica el suyo
   en su página (Plataforma no cobra por adelantado; Marketing es
   un servicio pago). Así no se mezclan los dos mensajes.
   Estética: grafito #1A1A18 + cobre #B87333 sobre hueso #F1EFE8
   Tipografía: Fraunces (titulares) · Inter (cuerpo)
   Animaciones: red de nodos (canvas) + parallax, scroll-reveal
                secuencial (IntersectionObserver), count-up,
                fade+zoom del hero al hacer scroll.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { APP } from "@/lib/config";
import { CabeceraSitio, PieSitio } from "@/components/sitio/Sitio";
import Constelacion from "./Constelacion";
import Ecosistema from "./Ecosistema";
import { CierreInicio, HoyEnKyrelo, Metodo } from "./SeccionesInicio";

/* ── Paleta de marca ── */
const C = {
  grafito: "#1A1A18",
  cobre: "#B87333",
  hueso: "#F1EFE8",
  piedra: "#5F5E5A",
  linea: "#E0DDD2",
};

/* Enlace de WhatsApp con mensaje pre-armado */
const wa = (msg: string) =>
  `https://wa.me/${APP.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

/* ── Hook: revela un elemento cuando entra al viewport ── */
function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Fondo animado: red de nodos con parallax al mover el mouse ── */
function RedDeNodos() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    type Nodo = { x: number; y: number; vx: number; vy: number; cobre: boolean };
    let nodos: Nodo[] = [];

    function medir() {
      if (!canvas || !ctx) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Menos nodos en mobile para cuidar el rendimiento
      const base = w < 768 ? 26 : 60;
      nodos = Array.from({ length: base }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        cobre: i % 7 === 0, // ~1 de cada 7 en cobre
      }));
    }

    const DIST = 132;
    function dibujar() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      // Parallax suave hacia la posición del mouse
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const ox = mouse.x * 14;
      const oy = mouse.y * 14;

      for (const n of nodos) {
        if (!reduce) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      }

      // Líneas
      for (let i = 0; i < nodos.length; i++) {
        for (let j = i + 1; j < nodos.length; j++) {
          const a = nodos[i];
          const b = nodos[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < DIST) {
            const alpha = (1 - d / DIST) * 0.5;
            ctx.strokeStyle = `rgba(26,26,24,${alpha * 0.5})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x + ox, a.y + oy);
            ctx.lineTo(b.x + ox, b.y + oy);
            ctx.stroke();
          }
        }
      }
      // Nodos
      for (const n of nodos) {
        ctx.beginPath();
        ctx.arc(n.x + ox, n.y + oy, n.cobre ? 2.6 : 1.7, 0, Math.PI * 2);
        ctx.fillStyle = n.cobre
          ? "rgba(184,115,51,0.9)"
          : "rgba(26,26,24,0.42)";
        ctx.fill();
      }
      raf = requestAnimationFrame(dibujar);
    }

    function onMove(e: MouseEvent) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouse.tx = (e.clientX - cx) / cx;
      mouse.ty = (e.clientY - cy) / cy;
    }

    medir();
    dibujar();
    window.addEventListener("resize", medir);
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", medir);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
    />
  );
}

/* ── Datos de contenido ── */
/* ── Bloque envoltorio con scroll-reveal ── */
function Revelar({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`ky-reveal ${visible ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingKyrelo({
  loggedIn = false,
  panelHref = "/dashboard",
}: {
  loggedIn?: boolean;
  panelHref?: string;
}) {
  // Animación del titular (entra al montar) y fade+zoom del hero al hacer scroll
  const [montado, setMontado] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const heroInnerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMontado(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const hero = heroRef.current;
        const inner = heroInnerRef.current;
        if (!hero || !inner) return;
        const alto = hero.offsetHeight || 1;
        const p = Math.min(Math.max(window.scrollY / alto, 0), 1);
        inner.style.opacity = String(1 - p * 1.1);
        inner.style.transform = `translateY(${p * -24}px) scale(${1 - p * 0.06})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className="ky-wrap" style={{ background: C.hueso, color: C.grafito }}>
      {/* Estilos y keyframes de la landing */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ky-wrap { font-family: Inter, system-ui, sans-serif; }
        .ky-display { font-family: "Fraunces", Georgia, serif; }
        .ky-reveal { opacity: 0; transform: translateY(26px);
          transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
        .ky-reveal.in { opacity: 1; transform: none; }
        .ky-line { display: inline-block; opacity: 0; transform: translateY(115%); }
        .ky-line.in { animation: kyLineUp .9s cubic-bezier(.16,1,.3,1) forwards; }
        @keyframes kyLineUp { to { opacity: 1; transform: none; } }
        .ky-steps .ky-step { opacity: 0; transform: translateY(22px);
          transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .ky-steps.in .ky-step { opacity: 1; transform: none; }
        .ky-card { transition: transform .55s cubic-bezier(.16,1,.3,1), border-color .5s ease, box-shadow .55s ease; }
        .ky-card:hover { transform: translateY(-5px); border-color: #CFC9BB;
          box-shadow: 0 22px 46px -30px rgba(26,26,24,.28); }
        .ky-card:hover .ky-ico { color: ${C.cobre}; border-color: ${C.cobre}; }
        .ky-ico { transition: color .5s ease, border-color .5s ease; }
        .ky-chip { transition: border-color .4s ease, color .4s ease; }
        .ky-chip:hover { border-color: ${C.cobre}; color: ${C.cobre}; }
        .ky-btn { transition: opacity .35s ease, transform .35s ease, background-color .35s ease, color .35s ease; }
        .ky-btn:hover { transform: translateY(-1px); }
        @keyframes kyBreathe { 0%,100% { transform: translateY(0); opacity:.45 } 50% { transform: translateY(7px); opacity:1 } }
        .ky-scroll-ind { animation: kyBreathe 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ky-reveal, .ky-line, .ky-steps .ky-step { opacity: 1 !important; transform: none !important; animation: none !important; }
          .ky-scroll-ind { animation: none; }
        }
      ` }} />

      {/* ════════ CABECERA con el menú de las tres marcas ════════ */}
      <CabeceraSitio loggedIn={loggedIn} panelHref={panelHref} />

      <HablaFlotante />

      {/* ════════ HERO ════════ */}
      <section
        ref={heroRef}
        className="relative flex min-h-[92vh] items-center overflow-hidden px-6 sm:px-10"
      >
        {/* Fondo: red de nodos con parallax */}
        <RedDeNodos />

        <div
          ref={heroInnerRef}
          className="relative z-10 mx-auto w-full max-w-5xl pb-16 pt-10 text-center"
        >
          <p
            className={`ky-reveal ${montado ? "in" : ""} text-[11px] font-semibold uppercase`}
            style={{ color: C.cobre, letterSpacing: "0.3em" }}
          >
            El ecosistema inmobiliario de la Sabana
          </p>

          {/* Titular: entra línea por línea */}
          <h1
            className="ky-display mx-auto mt-6 max-w-2xl text-[46px] leading-[1.02] sm:text-[76px]"
            style={{ letterSpacing: "-0.03em" }}
            aria-label="Menos búsqueda. Más cierre."
          >
            <span className="overflow-hidden pb-1 block">
              <span
                className={`ky-line ${montado ? "in" : ""}`}
                style={{ animationDelay: "120ms" }}
              >
                Menos búsqueda.
              </span>
            </span>
            <span className="overflow-hidden pb-1 block">
              <span
                className={`ky-line ${montado ? "in" : ""}`}
                style={{ animationDelay: "300ms", color: C.cobre }}
              >
                Más cierre.
              </span>
            </span>
          </h1>

          {/* ¿Quién eres? La red de perfiles que sale de la K (cada uno abre /para/...) */}
          <div className={`ky-reveal ${montado ? "in" : ""} mt-6`} style={{ transitionDelay: "480ms" }}>
            <Constelacion />
          </div>
        </div>

        {/* Indicador de scroll que "respira" */}
        <div
          className="ky-scroll-ind absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2"
          aria-hidden="true"
        >
          <div
            className="h-10 w-[1px]"
            style={{ background: `linear-gradient(${C.grafito}, transparent)` }}
          />
        </div>
      </section>

      {/* ════════ QUÉ ES KYRELO: la K y sus tres marcas ════════ */}
      <Ecosistema />

      {/* ════════ CÓMO TRABAJAMOS · HOY EN KYRELO · ¿QUIÉN ERES? ════════ */}
      <Metodo />
      <HoyEnKyrelo />
      <CierreInicio />

      <PieSitio />
    </main>
  );
}

/* ── Botón flotante "Habla con nosotros" (aparece al hacer scroll) ── */
function HablaFlotante() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const f = () => setVisible(window.scrollY > 480);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <a
      href={wa("Hola KYRELO, quiero hablar con ustedes.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Habla con nosotros por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-5 py-3 text-[14px] font-semibold transition-all duration-300"
      style={{
        background: C.grafito,
        color: C.hueso,
        boxShadow: "0 14px 34px -16px rgba(26,26,24,0.5)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke={C.cobre} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.38-4.1-1.05L3 20l1.1-5.2A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
      Habla con nosotros
    </a>
  );
}
