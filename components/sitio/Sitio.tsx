"use client";

/* ============================================================
   KYRELO — Piezas compartidas de las páginas públicas
   · CabeceraSitio: logo + menú (Inmobiliaria · Plataforma ·
     Marketing · Escríbenos) + Entrar
   · PieSitio: marcas, contacto y páginas legales
   ============================================================ */

import Image from "next/image";
import { useState } from "react";
import { C, wa } from "./marca";


const MENU = [
  ["Inmobiliaria", "/inmobiliaria"],
  ["Plataforma", "/plataforma"],
  ["Marketing", "/marketing"],
];

export function CabeceraSitio({
  loggedIn = false,
  panelHref = "/dashboard",
  activa,
}: {
  loggedIn?: boolean;
  panelHref?: string;
  activa?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-sm"
      style={{ borderColor: C.linea, background: "rgba(241,239,232,0.86)" }}
    >
      <div className="flex items-center justify-between px-6 py-3.5 sm:px-10">
        <a href="/" className="flex items-center gap-2.5">
          <Image src="/kyrelo-isotipo.png" alt="KYRELO" width={64} height={64} className="h-8 w-8 rounded-[7px]" />
          <span style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "0.04em" }} className="text-[18px]">
            KYRELO
          </span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {MENU.map(([n, h]) => (
            <a
              key={h}
              href={h}
              className="text-[13.5px] font-medium transition-colors hover:text-[#B87333]"
              style={{ color: activa === h ? C.cobre : C.grafito }}
            >
              {n}
            </a>
          ))}
          <a
            href={wa("Hola KYRELO, quiero más información.")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: C.grafito }}
          >
            Escríbenos
          </a>
          <a href={loggedIn ? panelHref : "/login"} className="text-[13px] font-medium" style={{ color: C.piedra }}>
            {loggedIn ? "Ir a mi panel" : "Entrar"}
          </a>
        </nav>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-full border px-4 py-1.5 text-[13px] font-medium md:hidden"
          style={{ borderColor: C.linea, color: C.grafito }}
          aria-expanded={abierto}
        >
          {abierto ? "Cerrar" : "Menú"}
        </button>
      </div>
      {abierto && (
        <nav className="flex flex-col gap-1 border-t px-6 pb-5 pt-3 md:hidden" style={{ borderColor: C.linea }}>
          {MENU.map(([n, h]) => (
            <a key={h} href={h} className="py-2 text-[16px]" style={{ fontFamily: '"Fraunces", Georgia, serif', color: activa === h ? C.cobre : C.grafito }}>
              {n}
            </a>
          ))}
          <a
            href={wa("Hola KYRELO, quiero más información.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 rounded-full px-5 py-3 text-center text-[14px] font-semibold text-white"
            style={{ background: C.grafito }}
          >
            Escríbenos
          </a>
          <a href={loggedIn ? panelHref : "/login"} className="mt-2 text-center text-[13px]" style={{ color: C.piedra }}>
            {loggedIn ? "Ir a mi panel" : "Entrar"}
          </a>
        </nav>
      )}
    </header>
  );
}

export function PieSitio() {
  const enlace = "text-[13px] transition-opacity hover:opacity-70";
  const tono = { color: "rgba(255,255,255,0.72)" };
  return (
    <footer className="px-6 py-12 sm:px-10" style={{ background: C.grafito, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/kyrelo-isotipo.png" alt="KYRELO" width={64} height={64} className="h-7 w-7 rounded-[6px]" />
            <span className="text-[15px] text-white" style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "0.04em" }}>
              KYRELO
            </span>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            El ecosistema inmobiliario de la Sabana. Chía · Cajicá · Cota · Sopó · Bogotá norte.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.22em" }}>Marcas</p>
          <a href="/inmobiliaria" className={enlace} style={tono}>KYRELO Inmobiliaria</a>
          <a href="/plataforma" className={enlace} style={tono}>KYRELO Plataforma</a>
          <a href="/marketing" className={enlace} style={tono}>KYRELO Marketing</a>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.22em" }}>Contacto</p>
          <a href="https://www.instagram.com/kyrelocorp" target="_blank" rel="noopener noreferrer" className={enlace} style={tono}>
            Instagram · @kyrelocorp
          </a>
          <a href={wa("Hola KYRELO, quiero más información.")} target="_blank" rel="noopener noreferrer" className={enlace} style={tono}>
            WhatsApp · +57 311 801 8295
          </a>
          <a href="/verificacion" className={enlace} style={tono}>Nuestro estándar</a>
          <a href="/politica-de-datos" className={enlace} style={tono}>Tratamiento de datos</a>
        </div>
      </div>
      <p
        className="mx-auto mt-10 max-w-6xl border-t pt-6 text-[12px]"
        style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        Menos búsqueda. Más cierre. · © {new Date().getFullYear()} KYRELO
      </p>
    </footer>
  );
}
