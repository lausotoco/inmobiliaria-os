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
      setError("Correo o contraseña incorrectos. Revisa e intenta de nuevo.");
      setCargando(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bosque-oscuro px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-display text-3xl font-medium text-white">
            {APP.nombre}
          </p>
          <p className="mt-2 text-sm text-white/60">{APP.descripcion}</p>
        </div>

        <form
          onSubmit={iniciarSesion}
          className="rounded-2xl bg-superficie p-8 shadow-2xl"
        >
          <label className="block text-sm font-medium text-tinta">
            Correo
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
            />
          </label>

          <label className="mt-5 block text-sm font-medium text-tinta">
            Contraseña
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-6 w-full rounded-lg bg-bosque py-2.5 font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Acceso privado. El registro de nuevas cuentas está deshabilitado.
        </p>
      </div>
    </main>
  );
}
