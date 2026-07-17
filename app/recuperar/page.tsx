"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/config";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-clave`,
    });

    setCargando(false);
    if (error) {
      setError("No se pudo enviar el correo. Revisa que esté bien escrito.");
      return;
    }
    setEnviado(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F1EFE8] px-6">
      <div className="w-full max-w-sm">
        <div className="anim-entrada text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#A8A69E]">
            Recuperar acceso
          </p>
          <h1 className="mt-4 text-[28px] font-bold tracking-tight text-[#1A1A18]">
            {APP.nombre}
          </h1>
        </div>

        {enviado ? (
          <div
            className="anim-entrada mt-12 border-t border-[#E0DDD2] pt-10 text-center"
            style={{ animationDelay: "120ms" }}
          >
            <p className="text-[14px] text-[#1A1A18] leading-relaxed">
              Te enviamos un correo a <span className="font-semibold">{email}</span> con un enlace para crear una nueva contraseña.
            </p>
            <p className="mt-4 text-[12px] text-[#5F5E5A] leading-relaxed">
              Revisa tu bandeja de entrada y también la carpeta de spam. El enlace expira en una hora.
            </p>
            <a
              href="/login"
              className="mt-8 inline-block text-[13px] font-medium text-[#1A1A18] underline underline-offset-4 transition hover:opacity-70"
            >
              Volver al inicio de sesión
            </a>
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="anim-entrada mt-12 border-t border-[#E0DDD2] pt-10"
            style={{ animationDelay: "120ms" }}
          >
            <p className="mb-6 text-[13px] text-[#5F5E5A] leading-relaxed">
              Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
            </p>
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
              {cargando ? "Enviando…" : "Enviar enlace"}
            </button>

            <div className="mt-6 text-center">
              <a
                href="/login"
                className="text-[12px] text-[#5F5E5A] underline underline-offset-4 transition hover:text-[#1A1A18]"
              >
                Volver al inicio de sesión
              </a>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
