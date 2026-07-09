"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/config";

const ENLACES = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: "◫" },
  { href: "/clientes", etiqueta: "Clientes", icono: "👤" },
  { href: "/requerimientos", etiqueta: "Requerimientos", icono: "◎" },
  { href: "/propiedades", etiqueta: "Propiedades", icono: "⌂" },
  { href: "/portafolios", etiqueta: "Portafolios", icono: "▤" },
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
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {ENLACES.map((e) => {
        const activo = pathname.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            onClick={() => setAbierto(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              activo
                ? "bg-white/10 font-medium text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span aria-hidden className="w-5 text-center">
              {e.icono}
            </span>
            {e.etiqueta}
          </Link>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="border-t border-white/10 px-3 py-4">
      <p className="truncate px-3 text-xs text-white/40">{email}</p>
      <button
        onClick={cerrarSesion}
        className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
      >
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior — solo móvil */}
      <header className="flex items-center justify-between bg-bosque-oscuro px-4 py-3 md:hidden">
        <span className="font-display text-lg text-white">{APP.nombre}</span>
        <button
          onClick={() => setAbierto(!abierto)}
          aria-label="Abrir menú"
          className="rounded-lg px-3 py-1.5 text-white/80 hover:bg-white/10"
        >
          {abierto ? "✕" : "☰"}
        </button>
      </header>

      {abierto && (
        <div className="flex flex-col bg-bosque-oscuro pb-2 md:hidden">
          {nav}
          {pie}
        </div>
      )}

      {/* Sidebar — escritorio */}
      <aside className="hidden w-60 shrink-0 flex-col bg-bosque-oscuro md:flex">
        <div className="px-6 py-7">
          <p className="font-display text-xl font-medium text-white">
            {APP.nombre}
          </p>
        </div>
        {nav}
        {pie}
      </aside>
    </>
  );
}
