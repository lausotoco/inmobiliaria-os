"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/config";

export default function LoginPage() {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06080F] px-6">
      {/* Orbes ambientales */}
      <div
        className="pointer-events-none fixed -right-40 -top-40 size-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,212,255,0.08), transparent 70%)",
          animation: "pulseGlow 8s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none fixed -bottom-32 -left-32 size-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)",
          animation: "pulseGlow 10s ease-in-out infinite 2s",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="anim-entrada mb-10 text-center">
          <div className="anim-float mx-auto flex size-16 items-center justify-center rounded-[18px] grad-acento text-2xl font-bold text-white shadow-[0_0_40px_rgba(0,212,255,0.35)]">
            S
          </div>
          <p className="mt-6 font-display text-3xl font-bold tracking-tight text-[#F0F4FF]">
            {APP.nombre}
          </p>
          <p className="mt-1.5 text-sm text-[#6B7B9E]">{APP.descripcion}</p>
        </div>

        <form
          onSubmit={iniciarSesion}
          className="anim-entrada rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-[20px]"
          style={{ animationDelay: "120ms" }}
        >
          <label className="block text-[13px] font-medium text-[#6B7B9E]">
            Correo
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#F0F4FF] outline-none transition placeholder:text-[#3A4560] focus:border-[#00D4FF]/50 focus:shadow-[0_0_20px_rgba(0,212,255,0.1)]"
              placeholder="tu@correo.com"
            />
          </label>

          <label className="mt-5 block text-[13px] font-medium text-[#6B7B9E]">
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-[#F0F4FF] outline-none transition placeholder:text-[#3A4560] focus:border-[#00D4FF]/50 focus:shadow-[0_0_20px_rgba(0,212,255,0.1)]"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-6 w-full rounded-full py-3.5 font-display text-[15px] font-semibold text-[#020617] transition-all duration-[400ms] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #00D4FF, #0EA5E9)",
              boxShadow: "0 0 15px rgba(0,212,255,0.15), 0 4px 16px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #00D4FF, #8B5CF6)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15), 0 8px 32px rgba(0,0,0,0.4)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #00D4FF, #0EA5E9)";
              e.currentTarget.style.boxShadow = "0 0 15px rgba(0,212,255,0.15), 0 4px 16px rgba(0,0,0,0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="anim-entrada mt-8 text-center text-[11px] text-[#3A4560]" style={{ animationDelay: "240ms" }}>
          Sistema privado · El registro de nuevas cuentas está deshabilitado
        </p>
      </div>
    </main>
  );
}
