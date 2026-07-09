"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/config";

const ENLACES = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: "⬡" },
  { href: "/clientes", etiqueta: "Clientes", icono: "◉" },
  { href: "/requerimientos", etiqueta: "Requerimientos", icono: "◎" },
  { href: "/propiedades", etiqueta: "Propiedades", icono: "⬢" },
  { href: "/portafolios", etiqueta: "Portafolios", icono: "▣" },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {ENLACES.map((e) => {
        const activo = pathname.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            onClick={() => setAbierto(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300 ${
              activo
                ? "bg-white/[0.06] text-[#F0F4FF] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.08),0_0_20px_rgba(0,212,255,0.06)]"
                : "text-[#6B7B9E] hover:bg-white/[0.03] hover:text-[#F0F4FF]"
            }`}
          >
            <span
              className={`flex size-7 items-center justify-center rounded-lg text-sm transition-all duration-300 ${
                activo
                  ? "grad-acento text-white shadow-[0_0_16px_rgba(0,212,255,0.4)]"
                  : "bg-white/[0.04] text-[#3A4560] group-hover:text-[#6B7B9E]"
              }`}
            >
              {e.icono}
            </span>
            {e.etiqueta}
          </Link>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="border-t border-white/[0.06] px-3 py-4">
      <p className="truncate px-3 text-[11px] text-[#3A4560]">{email}</p>
      <button
        onClick={cerrarSesion}
        className="mt-2 w-full rounded-xl px-3 py-2 text-left text-[13px] text-[#6B7B9E] transition hover:bg-white/[0.03] hover:text-[#F0F4FF]"
      >
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior — solo móvil */}
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#06080F]/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <span className="font-display text-[15px] font-bold tracking-tight text-[#F0F4FF]">
          {APP.nombre}
        </span>
        <button
          onClick={() => setAbierto(!abierto)}
          aria-label="Abrir menú"
          className="rounded-lg px-3 py-1.5 text-[#6B7B9E] hover:bg-white/[0.06]"
        >
          {abierto ? "✕" : "☰"}
        </button>
      </header>

      {abierto && (
        <div className="anim-fade flex flex-col border-b border-white/[0.06] bg-[#06080F] pb-2 md:hidden">
          {nav}
          {pie}
        </div>
      )}

      {/* Sidebar — escritorio */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#06080F]/60 backdrop-blur-xl md:flex">
        <div className="px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-[10px] grad-acento text-sm font-bold text-white shadow-[0_0_20px_rgba(0,212,255,0.35)]">
              S
            </div>
            <div>
              <p className="font-display text-[14px] font-bold tracking-tight text-[#F0F4FF]">
                {APP.nombre}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#3A4560]">
                Real Estate OS
              </p>
            </div>
          </div>
        </div>

        <div className="mx-4 mb-4 rounded-xl border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.08)] px-3 py-2.5 backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#00D4FF]">
            ⬡ Beta v1.0
          </p>
        </div>

        {nav}
        {pie}
      </aside>
    </>
  );
}
