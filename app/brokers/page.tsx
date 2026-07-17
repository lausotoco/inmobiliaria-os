"use client";

/* ============================================================
   KYRELO — Página pública de BROKERS (/brokers)
   Explica el negocio a brokers e inmobiliarias y les permite
   registrarse o iniciar sesión. Al iniciar sesión entran directo
   a sus requerimientos (/broker).
   ============================================================ */

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const C = {
  grafito: "#1A1A18",
  cobre: "#B87333",
  hueso: "#F1EFE8",
  piedra: "#5F5E5A",
  linea: "#E0DDD2",
};

/* Beneficios para el broker */
const BENEFICIOS = [
  ["Registro sin costo", "Unirte a KYRELO no tiene ningún cargo."],
  [
    "Solo pagas si cierras",
    "Cobramos únicamente cuando la negociación se concreta — 50% sobre el valor de la comisión total del inmueble.",
  ],
  ["Te acompañamos en todo el proceso", "Desde que recibes el requerimiento hasta el cierre."],
  [
    "No es competencia, es red",
    "Varias oficinas e inmobiliarias operan dentro de KYRELO al mismo tiempo. Entre más requerimientos puedas atender, más cierres puedes lograr.",
  ],
];

export default function BrokersPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }
    // El broker entra directo a sus requerimientos
    router.push("/broker");
    router.refresh();
  }

  return (
    <main
      style={{ background: C.hueso, color: C.grafito, fontFamily: "Inter, system-ui, sans-serif" }}
      className="min-h-screen"
    >
      <style>{`.bk-serif{font-family:"Fraunces",Georgia,serif;}`}</style>

      {/* Header con retorno a la home */}
      <header
        className="flex items-center justify-between border-b px-6 py-3.5 sm:px-10"
        style={{ borderColor: C.linea }}
      >
        <a href="/" className="flex items-center gap-2.5">
          <Image src="/kyrelo-isotipo.png" alt="KYRELO" width={64} height={64} className="h-8 w-8 rounded-[7px]" />
          <span className="bk-serif text-[18px]" style={{ letterSpacing: "0.04em" }}>KYRELO</span>
        </a>
        <a href="/" className="text-[13px] font-medium" style={{ color: C.piedra }}>
          Volver al inicio
        </a>
      </header>

      <div className="mx-auto grid max-w-6xl gap-16 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2 lg:items-start lg:gap-20">
        {/* ── Columna izquierda: propuesta para el broker ── */}
        <div>
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: C.cobre, letterSpacing: "0.28em" }}
          >
            Para brokers e inmobiliarias
          </p>
          <h1
            className="bk-serif mt-5 text-[42px] leading-[1.05] sm:text-[58px]"
            style={{ letterSpacing: "-0.03em" }}
          >
            Más requerimientos.{" "}
            <span style={{ color: C.cobre }}>Más cierres.</span>
          </h1>
          <p className="mt-5 text-[17px]" style={{ color: C.piedra }}>
            Regístrate gratis.
          </p>

          {/* Cómo funciona para ti */}
          <div className="mt-12">
            <p
              className="text-[11px] font-semibold uppercase"
              style={{ color: C.piedra, letterSpacing: "0.2em" }}
            >
              Cómo funciona para ti
            </p>
            <ul className="mt-6 space-y-6">
              {BENEFICIOS.map(([titulo, texto]) => (
                <li key={titulo} className="flex gap-4 border-t pt-6" style={{ borderColor: C.linea }}>
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: C.cobre }}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[16px] font-semibold" style={{ letterSpacing: "-0.01em" }}>
                      {titulo}
                    </p>
                    <p className="mt-1.5 text-[14.5px] leading-[1.65]" style={{ color: C.piedra }}>
                      {texto}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA principal a registro */}
          <a
            href="/registro-broker"
            className="mt-12 inline-flex items-center justify-center rounded-full px-8 py-4 text-[15px] font-semibold text-white transition-all duration-300 hover:opacity-80"
            style={{ background: C.cobre }}
          >
            Regístrate y ve los requerimientos
          </a>
        </div>

        {/* ── Columna derecha: login del broker ── */}
        <div
          className="rounded-2xl border bg-white p-8 sm:p-10 lg:sticky lg:top-16"
          style={{ borderColor: C.linea }}
        >
          <h2 className="bk-serif text-[24px]" style={{ letterSpacing: "-0.02em" }}>
            Inicia sesión
          </h2>
          <p className="mt-1.5 text-[13px]" style={{ color: C.piedra }}>
            Si ya tienes cuenta de broker, entra aquí.
          </p>

          <form onSubmit={iniciarSesion} className="mt-8">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.piedra }}>
                Correo
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: C.linea, color: C.grafito }}
                placeholder="tu@correo.com"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.piedra }}>
                Contraseña
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition"
                style={{ borderColor: C.linea, color: C.grafito }}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="mt-5 border-l-2 pl-4 text-[13px]" style={{ borderColor: "#8E3B31", color: "#8E3B31" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="mt-8 w-full rounded-full py-3.5 text-[13px] font-semibold tracking-[0.02em] text-white transition-all duration-300 hover:opacity-80 disabled:opacity-50"
              style={{ background: C.grafito }}
            >
              {cargando ? "Entrando…" : "Iniciar sesión"}
            </button>

            <div className="mt-5 text-center">
              <a
                href="/recuperar"
                className="text-[12px] underline underline-offset-4"
                style={{ color: C.piedra }}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </form>

          <div className="mt-8 border-t pt-6 text-center" style={{ borderColor: C.linea }}>
            <p className="text-[13px]" style={{ color: C.piedra }}>
              ¿No tienes cuenta todavía?
            </p>
            <a
              href="/registro-broker"
              className="mt-1.5 inline-block text-[13px] font-semibold underline underline-offset-4"
              style={{ color: C.cobre }}
            >
              Regístrate gratis
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
