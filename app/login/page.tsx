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
    <main className="flex min-h-screen items-center justify-center bg-[#111714] px-6">
      {/* Efecto de fondo sutil */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,117,86,0.15),transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.08),transparent_50%)]" />

      <div className="relative w-full max-w-sm">
        <div className="anim-entrada mb-10 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl grad-acento text-2xl font-bold text-white shadow-xl shadow-emerald-500/20">
            S
          </div>
          <p className="mt-5 text-2xl font-bold tracking-tight text-white">
            {APP.nombre}
          </p>
          <p className="mt-1 text-sm text-white/40">{APP.descripcion}</p>
        </div>

        <form
          onSubmit={iniciarSesion}
          className="anim-entrada rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl"
          style={{ animationDelay: "100ms" }}
        >
          <label className="block text-[13px] font-medium text-white/70">
            Correo
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="tu@correo.com"
            />
          </label>

          <label className="mt-5 block text-[13px] font-medium text-white/70">
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-6 w-full rounded-xl grad-acento py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="anim-entrada mt-8 text-center text-[11px] text-white/20" style={{ animationDelay: "200ms" }}>
          Sistema privado · El registro de nuevas cuentas está deshabilitado
        </p>
      </div>
    </main>
  );
}
