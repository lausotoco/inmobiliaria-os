"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/config";

const ENLACES_AGENTE = [
  { href: "/dashboard", etiqueta: "Dashboard" },
  { href: "/clientes", etiqueta: "Clientes" },
  { href: "/requerimientos", etiqueta: "Requerimientos" },
  { href: "/propiedades", etiqueta: "Propiedades" },
  { href: "/portafolios", etiqueta: "Portafolios" },
  { href: "/postulaciones", etiqueta: "Marketplace" },
  { href: "/agenda", etiqueta: "Agenda" },
  { href: "/tareas", etiqueta: "Tareas" },
  { href: "/comisiones", etiqueta: "Comisiones" },
  { href: "/documentos", etiqueta: "Documentos" },
];

const ENLACES_BROKER = [
  { href: "/marketplace", etiqueta: "Marketplace" },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [rol, setRol] = useState<"agente" | "broker">("agente");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("rol")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.rol === "broker") setRol("broker");
        });
    });
  }, []);

  const ENLACES = rol === "broker" ? ENLACES_BROKER : ENLACES_AGENTE;

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-6">
      {ENLACES.map((e) => {
        const activo = pathname.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            onClick={() => setAbierto(false)}
            className={`border-l-2 py-2.5 pl-4 text-[13px] transition-all duration-300 ${
              activo
                ? "border-[#141414] font-semibold text-[#141414]"
                : "border-transparent font-medium text-[#8C8C86] hover:text-[#141414]"
            }`}
          >
            {e.etiqueta}
          </Link>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="border-t border-[#E6E6E1] px-6 py-5">
      {rol === "broker" && (
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#B9B9B3]">
          Cuenta broker
        </p>
      )}
      <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#B9B9B3]">
        {email}
      </p>
      <button
        onClick={cerrarSesion}
        className="mt-2.5 text-[12px] font-medium text-[#8C8C86] transition hover:text-[#141414]"
      >
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior — solo móvil */}
      <header className="flex items-center justify-between border-b border-[#E6E6E1] bg-[#FAFAF7] px-5 py-4 md:hidden">
        <div>
          <span className="text-[15px] font-bold tracking-tight text-[#141414]">
            {APP.nombre}
          </span>
        </div>
        <button
          onClick={() => setAbierto(!abierto)}
          aria-label="Abrir menú"
          className="text-[#8C8C86] transition hover:text-[#141414]"
        >
          {abierto ? "✕" : "☰"}
        </button>
      </header>

      {abierto && (
        <div className="anim-fade flex flex-col border-b border-[#E6E6E1] bg-[#FAFAF7] pb-2 pt-3 md:hidden">
          {nav}
          {pie}
        </div>
      )}

      {/* Sidebar — escritorio */}
      <aside className="hidden w-[230px] shrink-0 flex-col border-r border-[#E6E6E1] bg-[#FAFAF7] md:flex">
        <div className="px-6 pb-10 pt-8">
          <p className="text-[17px] font-bold tracking-tight text-[#141414]">
            {APP.nombre}
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#B9B9B3]">
            Real Estate
          </p>
        </div>
        {nav}
        {pie}
      </aside>
    </>
  );
}
