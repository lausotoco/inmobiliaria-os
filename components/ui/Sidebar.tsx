"use client";

import Image from "next/image";
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
  { href: "/captaciones", etiqueta: "Captaciones" },
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
                ? "border-[#B87333] font-semibold text-[#1A1A18]"
                : "border-transparent font-medium text-[#5F5E5A] hover:text-[#1A1A18]"
            }`}
          >
            {e.etiqueta}
          </Link>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="border-t border-[#E0DDD2] px-6 py-5">
      {rol === "broker" && (
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#A8A69E]">
          Cuenta broker
        </p>
      )}
      <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#A8A69E]">
        {email}
      </p>
      <button
        onClick={cerrarSesion}
        className="mt-2.5 text-[12px] font-medium text-[#5F5E5A] transition hover:text-[#1A1A18]"
      >
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior — solo móvil */}
      <header className="flex items-center justify-between border-b border-[#E0DDD2] bg-[#F1EFE8] px-5 py-4 md:hidden">
        <Image
          src="/kyrelo-logo.png"
          alt={APP.nombre}
          width={497}
          height={441}
          priority
          className="h-8 w-auto"
        />
        <button
          onClick={() => setAbierto(!abierto)}
          aria-label="Abrir menú"
          className="text-[#5F5E5A] transition hover:text-[#1A1A18]"
        >
          {abierto ? "✕" : "☰"}
        </button>
      </header>

      {abierto && (
        <div className="anim-fade flex flex-col border-b border-[#E0DDD2] bg-[#F1EFE8] pb-2 pt-3 md:hidden">
          {nav}
          {pie}
        </div>
      )}

      {/* Sidebar — escritorio */}
      <aside className="hidden w-[230px] shrink-0 flex-col border-r border-[#E0DDD2] bg-[#F1EFE8] md:flex">
        <div className="px-6 pb-10 pt-8">
          <Image
            src="/kyrelo-logo.png"
            alt={APP.nombre}
            width={497}
            height={441}
            priority
            className="h-14 w-auto"
          />
          <p className="mt-3 text-[9px] font-medium uppercase tracking-[0.22em] text-[#B87333]">
            {APP.eslogan}
          </p>
        </div>
        {nav}
        {pie}
      </aside>
    </>
  );
}
