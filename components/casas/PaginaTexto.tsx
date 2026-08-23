/* ============================================================
   Marco para las páginas de texto públicas (comprador)
   ------------------------------------------------------------
   Mismo lenguaje visual que app/legal/_ui.tsx, pero pensado para
   quien llega de un anuncio: el enlace de volver va a la home, no
   al panel de brokers, y el pie no menciona la plataforma.
   ============================================================ */

import Image from "next/image";
import { APP } from "@/lib/config";

export function PaginaTexto({
  titulo,
  antetitulo,
  actualizado,
  children,
}: {
  titulo: string;
  antetitulo: string;
  actualizado?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F1EFE8]">
      <header className="border-b border-[#E0DDD2]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5" aria-label="KYRELO — inicio">
            <Image
              src="/kyrelo-isotipo.png"
              alt=""
              width={64}
              height={64}
              className="h-7 w-7 rounded-[6px]"
            />
            <span
              className="font-display text-[16px] text-[#1A1A18]"
              style={{ letterSpacing: "0.04em" }}
            >
              {APP.marca}
            </span>
          </a>
          <a
            href="/"
            className="text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18]"
          >
            Volver
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        {/* #96602A y no el cobre de marca: en 10px el original no llega
            al contraste mínimo de 4.5:1 sobre el fondo hueso. */}
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#96602A]">{antetitulo}</p>
        <h1
          className="font-display mt-3 text-[30px] leading-tight tracking-tight text-[#1A1A18] sm:text-[38px]"
          style={{ letterSpacing: "-0.025em" }}
        >
          {titulo}
        </h1>
        {actualizado && (
          <p className="mt-2 text-[12px] text-[#5F5E5A]">Última actualización: {actualizado}</p>
        )}
        <div className="mt-10 space-y-7 text-[14.5px] leading-relaxed text-[#3A3A36]">
          {children}
        </div>
      </main>

      <footer className="border-t border-[#E0DDD2]">
        <div className="mx-auto max-w-3xl px-6 py-8 text-[12.5px] text-[#5F5E5A]">
          <p className="font-medium text-[#1A1A18]">Kyrelocorp · {APP.eslogan}</p>
          <p className="mt-2">
            Contacto:{" "}
            <a
              href={`https://wa.me/${APP.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[#1A1A18]"
            >
              WhatsApp +57 311 801 8295
            </a>
          </p>
          <div className="mt-4 flex flex-wrap gap-5">
            <a href="/politica-de-datos" className="underline underline-offset-4 hover:text-[#1A1A18]">
              Política de datos
            </a>
            <a href="/verificacion" className="underline underline-offset-4 hover:text-[#1A1A18]">
              Cómo verificamos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[17px] font-semibold tracking-tight text-[#1A1A18]">{children}</h2>
  );
}
