"use client";

import Image from "next/image";
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

    // El middleware decide a dónde va cada rol (dashboard u /broker)
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F1EFE8] px-6">
      <div className="w-full max-w-sm">
        <div className="anim-entrada flex flex-col items-center text-center">
          <Image
            src="/kyrelo-logo.png"
            alt={APP.nombre}
            width={497}
            height={441}
            priority
            className="h-24 w-auto"
          />
          <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.22em] text-[#B87333]">
            {APP.eslogan}
          </p>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#A8A69E]">
            Sistema privado
          </p>
        </div>

        <form
          onSubmit={iniciarSesion}
          className="anim-entrada mt-12 border-t border-[#E0DDD2] pt-10"
          style={{ animationDelay: "120ms" }}
        >
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F5E5A]">
              Correo
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[#E0DDD2] bg-white px-4 py-3 text-sm text-[#1A1A18] outline-none transition placeholder:text-[#C9C9C3] focus:border-[#1A1A18]"
              placeholder="tu@correo.com"
            />
          </label>

          <label className="mt-6 block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F5E5A]">
              Contraseña
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[#E0DDD2] bg-white px-4 py-3 text-sm text-[#1A1A18] outline-none transition placeholder:text-[#C9C9C3] focus:border-[#1A1A18]"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="mt-5 border-l-2 border-[#8E3B31] pl-4 text-[13px] text-[#8E3B31]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-8 w-full rounded-full bg-[#1A1A18] py-3.5 text-[13px] font-semibold tracking-[0.02em] text-white transition-all duration-300 hover:opacity-80 disabled:opacity-50"
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>

          <div className="mt-6 text-center">
            <a
              href="/recuperar"
              className="text-[12px] text-[#5F5E5A] underline underline-offset-4 transition hover:text-[#1A1A18]"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </form>

        <div
          className="anim-entrada mt-12 border-t border-[#E0DDD2] pt-6 text-center"
          style={{ animationDelay: "240ms" }}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#C9C9C3]">
            ¿Eres broker o inmobiliaria aliada?
          </p>
          <a
            href="/brokers"
            className="mt-2 inline-block text-[13px] font-medium text-[#1A1A18] underline underline-offset-4 transition hover:opacity-70"
          >
            Crea tu cuenta de broker
          </a>
        </div>
      </div>
    </main>
  );
}
