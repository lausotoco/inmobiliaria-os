"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP } from "@/lib/config";

// Menú condensado: cada comprador se trabaja completo desde su ficha
// (/clientes/[id]: requerimiento, calificación, portafolios, enviadas, notas).
const ENLACES_AGENTE = [
  { href: "/dashboard", etiqueta: "Dashboard" },
  { href: "/clientes", etiqueta: "Compradores" },
  { href: "/propiedades", etiqueta: "Propiedades" },
  { href: "/postulaciones", etiqueta: "Red de agentes" },
  { href: "/agentes", etiqueta: "Agentes aliados" },
  { href: "/comisiones", etiqueta: "Negocios" },
  { href: "/documentos", etiqueta: "Documentos" },
  { href: "/configuracion/score", etiqueta: "Configuración" },
];

const ENLACES_BROKER = [
  { href: "/marketplace", etiqueta: "Marketplace" },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [rol, setRol] = useState<"agente" | "broker">("agente");
  const [pendientes, setPendientes] = useState(0);

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
      supabase.rpc("marketplace_resumen").then(({ data }) => {
        if (data && typeof data.pendientes === "number") setPendientes(data.pendientes);
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
        const activo =
          pathname.startsWith(e.href) ||
          (e.href === "/propiedades" && pathname.startsWith("/captaciones")) ||
          (e.href === "/clientes" && (pathname.startsWith("/compradores") || pathname.startsWith("/requerimientos") || pathname.startsWith("/portafolios"))) ||
          (e.href === "/postulaciones" && pathname.startsWith("/asociaciones"));
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
            <span className="flex items-center justify-between gap-2">
              {e.etiqueta}
              {e.href === "/postulaciones" && pendientes > 0 && (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#B87333] px-1.5 text-[10px] font-semibold text-white">
                  {pendientes}
                </span>
              )}
            </span>
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
