"use client";

/* ============================================================
   KYRELO — Página pública (Home)
   Secciones: Hero · Qué es KYRELO · Servicios · Cómo funciona
              · Cobertura · Equipo · CTA final
   Estética: grafito #1A1A18 + cobre #B87333 sobre hueso #F1EFE8
   Tipografía: Fraunces (titulares) · Inter (cuerpo)
   Animaciones: red de nodos (canvas) + parallax, scroll-reveal
                secuencial (IntersectionObserver), count-up,
                fade+zoom del hero al hacer scroll.
   ============================================================ */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { APP } from "@/lib/config";

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

/* ── Íconos geométricos (simples, de línea, sin clipart) ── */
function IconoRequerimientos() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="20" cy="20" r="14" />
      <circle cx="20" cy="20" r="6" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconoCaptacion() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 6 L34 30 H6 Z" />
      <line x1="20" y1="6" x2="20" y2="30" />
    </svg>
  );
}
function IconoCierre() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 14 L20 20 L8 26" />
      <path d="M32 14 L20 20 L32 26" />
      <circle cx="20" cy="20" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
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
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

/* ── Contador animado (count-up) al entrar al viewport ── */
function Contador({ objetivo = 5 }: { objetivo?: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.5);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const inicio = performance.now();
    const dur = 1100;
    const tick = (t: number) => {
      const p = Math.min((t - inicio) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.round(eased * objetivo));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, objetivo]);
  return (
    <div ref={ref} className="text-center">
      <p
        className="font-display text-[64px] leading-none sm:text-[80px]"
        style={{ color: C.grafito, letterSpacing: "-0.03em" }}
      >
        {n}
        <span style={{ color: C.cobre }}> zonas</span>
      </p>
      <p
        className="mt-3 text-[11px] font-semibold uppercase"
        style={{ color: C.piedra, letterSpacing: "0.22em" }}
      >
        Bogotá zona norte y sabana norte
      </p>
    </div>
  );
}

/* ── Datos de contenido ── */
const SERVICIOS = [
  {
    icono: <IconoRequerimientos />,
    titulo: "Requerimientos",
    texto:
      "Recibimos y validamos lo que buscan compradores y arrendatarios: presupuesto, zona, características. Solo entregamos a nuestros brokers aliados requerimientos reales, filtrados y listos para gestionar.",
  },
  {
    icono: <IconoCaptacion />,
    titulo: "Captación",
    texto:
      "Ayudamos a propietarios a poner su inmueble en el mercado de forma profesional, ya sea para venta o arriendo, conectándolo directamente con la red de brokers de KYRELO.",
  },
  {
    icono: <IconoCierre />,
    titulo: "Cierre asistido",
    texto:
      "Acompañamos el proceso desde que se cruza el requerimiento con el inmueble hasta que la transacción se concreta, reduciendo el tiempo y la fricción para todas las partes.",
  },
];

const PASOS = [
  ["Recibimos el requerimiento", "Un comprador o arrendatario nos cuenta exactamente qué busca."],
  ["Validamos la información", "Confirmamos presupuesto, zona y condiciones antes de mover el requerimiento."],
  ["Lo publicamos en la plataforma", "El requerimiento validado queda visible para toda la red de brokers aliados, quienes pueden enviar sus propuestas."],
  ["Seleccionamos las mejores propuestas", "El cliente recibe las mejores opciones de los brokers y arranca su recorrido de visitas."],
  ["Acompañamos el cierre", "Seguimos el proceso hasta que la transacción se concreta."],
];

const ZONAS = ["Bogotá (zona norte)", "Chía", "Cajicá", "Cota", "La Calera", "Zipaquirá"];

const EQUIPO = [
  ["R", "Equipo de Requerimientos", "Reciben, validan y organizan lo que buscan compradores y arrendatarios."],
  ["C", "Equipo de Captación", "Trabajan directamente con propietarios para poner sus inmuebles en el mercado."],
  ["B", "Alianzas con Brokers", "Conectan cada requerimiento y cada inmueble con el broker correcto."],
  ["T", "Tecnología y Datos", "Construyen y mantienen la plataforma que centraliza todo el proceso."],
  ["M", "Mercadeo", "Comunican la marca y posicionan a KYRELO frente a brokers, propietarios y compradores."],
];

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
      <style>{`
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
      `}</style>

      {/* ════════ HEADER (barra fina, opcional) ════════ */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b px-6 py-3.5 backdrop-blur-sm sm:px-10"
        style={{ borderColor: C.linea, background: "rgba(241,239,232,0.82)" }}
      >
        <div className="flex items-center gap-2.5">
          <Image
            src="/kyrelo-isotipo.png"
            alt="KYRELO"
            width={64}
            height={64}
            className="h-8 w-8 rounded-[7px]"
          />
          <span
            className="ky-display text-[18px]"
            style={{ letterSpacing: "0.04em" }}
          >
            KYRELO
          </span>
        </div>
        <a
          href={loggedIn ? panelHref : "/login"}
          className="text-[13px] font-medium"
          style={{ color: C.piedra }}
        >
          {loggedIn ? "Ir a mi panel" : "Entrar"}
        </a>
      </header>

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
          className="relative z-10 mx-auto w-full max-w-3xl py-24 text-center"
        >
          <p
            className={`ky-reveal ${montado ? "in" : ""} text-[11px] font-semibold uppercase`}
            style={{ color: C.cobre, letterSpacing: "0.3em" }}
          >
            Real estate colectivo · Bogotá y sabana norte
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

          <p
            className={`ky-reveal ${montado ? "in" : ""} mx-auto mt-8 max-w-xl text-[16px] leading-[1.7] sm:text-[18px]`}
            style={{ color: C.piedra, transitionDelay: "420ms" }}
          >
            Centralizamos los requerimientos reales de compradores y arrendatarios,
            y los conectamos con brokers e inmobiliarias listos para cerrar. También
            captamos y vendemos inmuebles directamente.
          </p>

          {/* CTAs */}
          <div
            className={`ky-reveal ${montado ? "in" : ""} mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row`}
            style={{ transitionDelay: "560ms" }}
          >
            <a
              href="/oportunidades"
              className="ky-btn inline-flex items-center justify-center rounded-full px-8 py-3.5 text-[14px] font-semibold text-white"
              style={{ background: C.cobre }}
            >
              Ver requerimientos activos
            </a>
            <a
              href={wa("Hola KYRELO, quiero vender o arrendar mi inmueble.")}
              target="_blank"
              rel="noopener noreferrer"
              className="ky-btn inline-flex items-center justify-center rounded-full border px-8 py-3.5 text-[14px] font-medium"
              style={{ borderColor: C.grafito, color: C.grafito }}
            >
              Quiero vender o arrendar mi inmueble
            </a>
          </div>
        </div>

        {/* Indicador de scroll que "respira" */}
        <div
          className="ky-scroll-ind absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          aria-hidden="true"
        >
          <div
            className="h-10 w-[1px]"
            style={{ background: `linear-gradient(${C.grafito}, transparent)` }}
          />
        </div>
      </section>

      {/* ════════ CON QUIÉN TRABAJAMOS: 3 TARGETS ════════ */}
      <section className="px-6 py-20 sm:px-10 sm:py-28" style={{ borderTop: `1px solid ${C.linea}` }}>
        <div className="mx-auto max-w-6xl">
          <Revelar className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: C.cobre }}>
              ¿Con quién trabajamos?
            </p>
            <h2 className="mt-3 text-[26px] leading-tight sm:text-[32px]" style={{ fontFamily: "Fraunces, serif" }}>
              Tres formas de trabajar con nosotros
            </h2>
          </Revelar>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Brokers e inmobiliarias */}
            <Revelar>
              <div className="flex h-full flex-col rounded-2xl border bg-white p-7" style={{ borderColor: C.linea }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.cobre }}>
                  Para brokers e inmobiliarias
                </p>
                <h3 className="mt-3 text-[20px] leading-snug" style={{ fontFamily: "Fraunces, serif", color: C.grafito }}>
                  Tienes inmuebles. Aquí están los compradores.
                </h3>
                <ul className="mt-5 space-y-3">
                  {[
                    "Ve requerimientos reales de compradores verificados en la Sabana.",
                    "Postula tus inmuebles a los que encajan, gratis.",
                    "Solo compartes comisión cuando cierras. Nunca pagas por registrarte.",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[14px] leading-relaxed" style={{ color: C.piedra }}>
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.cobre }} />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <a
                    href="/oportunidades"
                    className="ky-btn inline-flex items-center justify-center rounded-full px-7 py-3 text-[14px] font-semibold text-white"
                    style={{ background: C.grafito }}
                  >
                    Ver requerimientos activos
                  </a>
                </div>
              </div>
            </Revelar>

            {/* Propietarios */}
            <Revelar delay={100}>
              <div className="flex h-full flex-col rounded-2xl border bg-white p-7" style={{ borderColor: C.linea }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.cobre }}>
                  Para propietarios
                </p>
                <h3 className="mt-3 text-[20px] leading-snug" style={{ fontFamily: "Fraunces, serif", color: C.grafito }}>
                  Quieres vender o arrendar. Nosotros lo cerramos.
                </h3>
                <ul className="mt-5 space-y-3">
                  {[
                    "Captamos tu inmueble y lo presentamos a compradores reales.",
                    "Lo movemos dentro de nuestra red de brokers de la Sabana.",
                    "Te acompañamos en todo el proceso, hasta la firma.",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[14px] leading-relaxed" style={{ color: C.piedra }}>
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.cobre }} />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <a
                    href={wa("Hola KYRELO, quiero vender o arrendar mi inmueble.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ky-btn inline-flex items-center justify-center rounded-full border px-7 py-3 text-[14px] font-medium"
                    style={{ borderColor: C.grafito, color: C.grafito }}
                  >
                    Quiero vender o arrendar
                  </a>
                </div>
              </div>
            </Revelar>

            {/* Compradores / quienes buscan inmueble */}
            <Revelar delay={200}>
              <div className="flex h-full flex-col rounded-2xl border bg-white p-7" style={{ borderColor: C.linea }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.cobre }}>
                  Para quienes buscan inmueble
                </p>
                <h3 className="mt-3 text-[20px] leading-snug" style={{ fontFamily: "Fraunces, serif", color: C.grafito }}>
                  Buscas casa o apartamento. Te lo encontramos.
                </h3>
                <ul className="mt-5 space-y-3">
                  {[
                    "Cuéntanos qué buscas: zona, presupuesto y tipo de inmueble.",
                    "Conectamos tu búsqueda con toda la red de brokers de la Sabana.",
                    "Te presentamos opciones que encajan, sin que busques por tu cuenta.",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-[14px] leading-relaxed" style={{ color: C.piedra }}>
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.cobre }} />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-7">
                  <a
                    href={wa("Hola KYRELO, estoy buscando un inmueble.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ky-btn inline-flex items-center justify-center rounded-full border px-7 py-3 text-[14px] font-medium"
                    style={{ borderColor: C.grafito, color: C.grafito }}
                  >
                    Estoy buscando inmueble
                  </a>
                </div>
              </div>
            </Revelar>
          </div>

          {/* Prueba social */}
          <Revelar delay={80}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-2xl px-8 py-6 text-center" style={{ background: C.hueso, border: `1px solid ${C.linea}` }}>
              <p className="text-[13px]" style={{ color: C.piedra }}>
                Brokers e inmobiliarias de la Sabana ya operan dentro de KYRELO.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                <span className="text-[13px] font-medium" style={{ color: C.grafito }}>Chía</span>
                <span className="text-[13px] font-medium" style={{ color: C.grafito }}>Cajicá</span>
                <span className="text-[13px] font-medium" style={{ color: C.grafito }}>Cota</span>
                <span className="text-[13px] font-medium" style={{ color: C.grafito }}>La Calera</span>
                <span className="text-[13px] font-medium" style={{ color: C.grafito }}>Bogotá norte</span>
              </div>
            </div>
          </Revelar>
        </div>
      </section>

      {/* ════════ QUÉ ES KYRELO ════════ */}
      <section className="px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <Revelar>
            <p
              className="text-[11px] font-semibold uppercase"
              style={{ color: C.cobre, letterSpacing: "0.26em" }}
            >
              Qué es KYRELO
            </p>
            <h2
              className="ky-display mt-5 text-[34px] leading-[1.1] sm:text-[48px]"
              style={{ letterSpacing: "-0.025em" }}
            >
              El mercado no se busca, se organiza.
            </h2>
          </Revelar>
          <Revelar delay={120}>
            <p
              className="mt-8 max-w-2xl text-[16px] leading-[1.85] sm:text-[18px]"
              style={{ color: C.piedra }}
            >
              El mercado inmobiliario colombiano ha sido, históricamente, un mercado
              fragmentado: cada broker buscando inventario por su cuenta, cada propietario
              publicando en cinco portales distintos, cada comprador repitiendo la misma
              búsqueda con diez agentes diferentes. KYRELO invierte esa lógica. En vez de
              que el broker busque el inmueble, el requerimiento del cliente llega a él,
              ya validado y listo para avanzar.
            </p>
          </Revelar>
        </div>
      </section>

      {/* ════════ CÓMO FUNCIONA (5 pasos, reveal secuencial) ════════ */}
      <ComoFunciona />

      {/* ════════ COBERTURA ════════ */}
      <section
        className="border-t px-6 py-24 sm:px-10 sm:py-32"
        style={{ borderColor: C.linea }}
      >
        <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2 md:items-center">
          <Revelar>
            <div>
              <p
                className="text-[11px] font-semibold uppercase"
                style={{ color: C.cobre, letterSpacing: "0.26em" }}
              >
                Dónde operamos
              </p>
              <h2
                className="ky-display mt-5 text-[32px] leading-[1.1] sm:text-[44px]"
                style={{ letterSpacing: "-0.025em" }}
              >
                Cobertura
              </h2>
              <p className="mt-6 max-w-md text-[16px] leading-[1.8]" style={{ color: C.piedra }}>
                Actualmente operamos en Bogotá zona norte y la sabana norte: Chía, Cajicá,
                Cota, La Calera y Zipaquirá. Nuestra cobertura se irá expandiendo a otras
                zonas del país.
              </p>
            </div>
          </Revelar>
          <Revelar delay={120}>
            <div className="flex flex-col items-start gap-6">
              {/* Mapa editorial de cobertura */}
              <div className="w-full rounded-2xl border bg-white p-5 sm:p-7" style={{ borderColor: C.linea }}>
                <MapaCobertura />
              </div>
              {/* Listado de zonas de cobertura */}
              <div className="grid w-full grid-cols-2 gap-x-8 gap-y-3.5 sm:grid-cols-3">
                {ZONAS.map((z) => (
                  <div key={z} className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.cobre }} />
                    <span className="text-[14px]" style={{ color: C.grafito }}>{z}</span>
                  </div>
                ))}
              </div>
            </div>
          </Revelar>
        </div>
      </section>

      {/* ════════ EQUIPO (5 roles, sin nombres ni fotos) ════════ */}
      <section
        className="border-t px-6 py-24 sm:px-10 sm:py-32"
        style={{ borderColor: C.linea }}
      >
        <div className="mx-auto max-w-5xl">
          <Revelar>
            <p
              className="text-[11px] font-semibold uppercase"
              style={{ color: C.cobre, letterSpacing: "0.26em" }}
            >
              Equipo
            </p>
            <h2
              className="ky-display mt-5 max-w-xl text-[32px] leading-[1.1] sm:text-[44px]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Detrás de cada cierre.
            </h2>
          </Revelar>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EQUIPO.map(([inicial, rol, texto], i) => (
              <Revelar key={rol} delay={i * 90}>
                <article
                  className="ky-card flex h-full gap-5 rounded-2xl border bg-white p-7"
                  style={{ borderColor: C.linea }}
                >
                  <div
                    className="ky-ico ky-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-[20px]"
                    style={{ borderColor: C.linea, color: C.grafito }}
                  >
                    {inicial}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold" style={{ letterSpacing: "-0.01em" }}>
                      {rol}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.65]" style={{ color: C.piedra }}>
                      {texto}
                    </p>
                  </div>
                </article>
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA FINAL ════════ */}
      <section
        className="border-t px-6 py-28 sm:px-10 sm:py-36"
        style={{ borderColor: C.linea, background: C.grafito }}
      >
        <Revelar>
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="ky-display text-[34px] leading-[1.12] text-white sm:text-[52px]"
              style={{ letterSpacing: "-0.025em" }}
            >
              El mercado ya se está organizando.{" "}
              <span style={{ color: C.cobre }}>¿Entras ahora o después?</span>
            </h2>
            <a
              href={wa("Hola KYRELO, quiero hablar con ustedes.")}
              target="_blank"
              rel="noopener noreferrer"
              className="ky-btn mt-10 inline-flex items-center justify-center rounded-full px-9 py-4 text-[15px] font-semibold"
              style={{ background: C.cobre, color: "#fff" }}
            >
              Habla con nosotros
            </a>
          </div>
        </Revelar>
      </section>

      {/* ════════ FOOTER (mínimo, opcional) ════════ */}
      <footer
        className="flex flex-col gap-6 px-6 py-10 sm:px-10"
        style={{ background: C.grafito, borderTop: `1px solid rgba(255,255,255,0.08)` }}
      >
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Image
              src="/kyrelo-isotipo.png"
              alt="KYRELO"
              width={64}
              height={64}
              className="h-7 w-7 rounded-[6px]"
            />
            <span className="ky-display text-[15px] text-white" style={{ letterSpacing: "0.04em" }}>
              KYRELO
            </span>
          </div>

          {/* Contacto: Instagram + WhatsApp/teléfono */}
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
            <a
              href="https://www.instagram.com/kyrelocorp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Instagram · @kyrelocorp
            </a>
            <a
              href={wa("Hola KYRELO, quiero más información.")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              WhatsApp · +57 311 801 8295
            </a>
          </div>
        </div>

        <p
          className="border-t pt-6 text-[12px]"
          style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          Menos búsqueda. Más cierre. · © {new Date().getFullYear()} KYRELO
        </p>
      </footer>
    </main>
  );
}

/* ── Sección "Cómo funciona" con reveal secuencial de los 5 pasos ── */
function ComoFunciona() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.2);
  return (
    <section className="border-t px-6 py-24 sm:px-10 sm:py-32" style={{ borderColor: C.linea }}>
      <div className="mx-auto max-w-3xl">
        <Revelar>
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: C.cobre, letterSpacing: "0.26em" }}
          >
            Cómo funciona
          </p>
          <h2
            className="ky-display mt-5 text-[32px] leading-[1.1] sm:text-[44px]"
            style={{ letterSpacing: "-0.025em" }}
          >
            Del requerimiento al cierre, en cinco pasos.
          </h2>
        </Revelar>

        <div ref={ref} className={`ky-steps mt-14 ${visible ? "in" : ""}`}>
          {PASOS.map(([titulo, texto], i) => (
            <div
              key={titulo}
              className="ky-step flex gap-6 border-t py-8"
              style={{ borderColor: C.linea, transitionDelay: `${i * 400}ms` }}
            >
              <span
                className="ky-display shrink-0 text-[26px] leading-none"
                style={{ color: C.cobre, letterSpacing: "-0.02em", minWidth: "2.2rem" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[18px] font-semibold" style={{ letterSpacing: "-0.01em" }}>
                  {titulo}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.7]" style={{ color: C.piedra }}>
                  {texto}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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

/* ── Mapa editorial de cobertura: mapamundi de puntos con Colombia iluminada ── */
const MUNDO = {
  W: 104, H: 52,
  rows: ["0", "0", "dffdfc000000", "5003fff98080000", "fe01000003ff004080000", "ffffffffffffffffffffffffff", "2031ffffffffffffffe", "fffffffffffb8060e18bffffc0", "19fffffffffde00080c1fffdf0", "60ffffffffdc40003c3ffe0c0", "21fffffffffca000fefff8000", "3ffffffffff4000dffff8000", "ffffffffff80017ffff0000", "27fffffb0e9e0000ffff0000", "11fffffbf54e00007fff0000", "197ffffff07400003ffe0000", "27fffffc0fe00001ffc0000", "7ffffbfffe000011f00000", "7fffe3bfff000010f00000", "1fff1fbfff800010e00000", "f8e1f7fff800084c00000", "706077fff80000e000000", "d0401ffff800008000000", "10407ffff0003b0000000", "220003ffce001f00000000", "310001ff80003f00000000", "4720000ff80007f60000000", "308400007f8003ffe0000000", "4410000007f0003ffe0000000", "c000000ff0001ffc0000000", "27000006ff8001ffc0000000", "3f8000023f0001ff00000000", "ffe000023f0000ff00000000", "ffe000001f00003f00000000", "ffe000001e00003f80000000", "f8e000000e00001f80000000", "700000000000000f80000000", "40000000000000000380000000", "20400000000000000180000000", "1c0000000", "c0000000", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"] as string[],
  col: [[30, 23], [30.5, 23], [29.5, 23.5], [30, 23.5], [30.5, 23.5], [29.5, 24], [30, 24], [30.5, 24], [31, 24], [31.5, 24], [32, 24], [29.5, 24.5], [30, 24.5], [30.5, 24.5], [31, 24.5], [31.5, 24.5], [32, 24.5], [29.5, 25], [30, 25], [30.5, 25], [31, 25], [31.5, 25], [32, 25], [29.5, 25.5], [30, 25.5], [30.5, 25.5], [31, 25.5], [31.5, 25.5], [30.5, 26], [31, 26], [31.5, 26], [31.5, 26.5]] as [number, number][],
  bog: [30.6, 24.6] as [number, number],
};

function MapaCobertura() {
  const S = 6;
  const pts: [number, number][] = [];
  MUNDO.rows.forEach((hex, y) => {
    for (let i = 0; i < hex.length; i++) {
      const nib = parseInt(hex[hex.length - 1 - i], 16);
      for (let b = 0; b < 4; b++) if (nib & (1 << b)) pts.push([i * 4 + b, y]);
    }
  });
  const bx = MUNDO.bog[0] * S, by = MUNDO.bog[1] * S;
  return (
    <svg
      viewBox={`0 0 ${MUNDO.W * S} ${MUNDO.H * S}`}
      className="h-auto w-full"
      role="img"
      aria-label="Mapamundi de puntos con Colombia iluminada en cobre"
    >
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x * S + S / 2} cy={y * S + S / 2} r={1.8} fill="#D9D5C9" />
      ))}
      {MUNDO.col.map(([x, y], i) => (
        <circle key={`c${i}`} cx={x * S + S / 2} cy={y * S + S / 2} r={2.2} fill={C.cobre} />
      ))}
      <circle cx={bx} cy={by} r={4} fill={C.cobre} />
      <circle cx={bx} cy={by} r={4} fill="none" stroke={C.cobre} strokeWidth={1.4}>
        <animate attributeName="r" values="4;16" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.6;0" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <text x={bx + 14} y={by + 4} fontSize="13" fontWeight={600} fill={C.grafito}>Colombia</text>
    </svg>
  );
}
