"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/config";

export default function NuevaClavePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ok, setOk] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);

    if (error) {
      setError("El enlace expiró o no es válido. Solicita uno nuevo.");
      return;
    }
    setOk(true);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F1EFE8] px-6">
      <div className="w-full max-w-sm">
        <div className="anim-entrada text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#A8A69E]">
            Nueva contraseña
          </p>
          <h1 className="mt-4 text-[28px] font-bold tracking-tight text-[#1A1A18]">
            {APP.nombre}
          </h1>
        </div>

        {ok ? (
          <p
            className="anim-entrada mt-12 border-t border-[#E0DDD2] pt-10 text-center text-[14px] text-[#1A1A18]"
            style={{ animationDelay: "120ms" }}
          >
            Contraseña actualizada. Redirigiéndote al inicio de sesión…
          </p>
        ) : (
          <form
            onSubmit={guardar}
            className="anim-entrada mt-12 border-t border-[#E0DDD2] pt-10"
            style={{ animationDelay: "120ms" }}
          >
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F5E5A]">
                Nueva contraseña
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#E0DDD2] bg-white px-4 py-3 text-sm text-[#1A1A18] outline-none transition placeholder:text-[#C9C9C3] focus:border-[#1A1A18]"
                placeholder="••••••••"
              />
            </label>

            <label className="mt-6 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F5E5A]">
                Repite la contraseña
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
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
              {cargando ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
