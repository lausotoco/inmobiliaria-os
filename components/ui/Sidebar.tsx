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
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
              activo
                ? "bg-white/[0.08] text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.1)]"
                : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            <span
              className={`flex size-7 items-center justify-center rounded-lg text-sm transition-all ${
                activo
                  ? "grad-acento text-white shadow-lg shadow-emerald-500/20"
                  : "bg-white/[0.06] text-white/40 group-hover:text-white/60"
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
      <p className="truncate px-3 text-[11px] text-white/30">{email}</p>
      <button
        onClick={cerrarSesion}
        className="mt-2 w-full rounded-xl px-3 py-2 text-left text-[13px] text-white/40 transition hover:bg-white/[0.04] hover:text-white/70"
      >
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior — solo móvil */}
      <header className="flex items-center justify-between bg-[#111714] px-4 py-3 md:hidden">
        <span className="text-[15px] font-bold text-white tracking-tight">
          {APP.nombre}
        </span>
        <button
          onClick={() => setAbierto(!abierto)}
          aria-label="Abrir menú"
          className="rounded-lg px-3 py-1.5 text-white/60 hover:bg-white/10"
        >
          {abierto ? "✕" : "☰"}
        </button>
      </header>

      {abierto && (
        <div className="anim-fade flex flex-col bg-[#111714] pb-2 md:hidden">
          {nav}
          {pie}
        </div>
      )}

      {/* Sidebar — escritorio */}
      <aside className="hidden w-[240px] shrink-0 flex-col bg-[#111714] md:flex">
        <div className="px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl grad-acento text-sm font-bold text-white shadow-lg shadow-emerald-500/20">
              S
            </div>
            <div>
              <p className="text-[14px] font-bold tracking-tight text-white">
                {APP.nombre}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/30">
                CRM
              </p>
            </div>
          </div>
        </div>

        <div className="mx-4 mb-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-sky-500/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/70">
            Beta v1.0
          </p>
        </div>

        {nav}
        {pie}
      </aside>
    </>
  );
}
