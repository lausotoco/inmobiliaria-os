"use client";

/* ============================================================
   /gracias — puente a WhatsApp
   ------------------------------------------------------------
   Intenta abrir WhatsApp solo y además deja un botón grande.
   Si el mensaje no llega (alguien entró directo), muestra un
   mensaje genérico en vez de romperse.
   ============================================================ */

import Image from "next/image";
import { useEffect, useState } from "react";
import { enlaceWhatsApp } from "@/lib/mensaje-whatsapp";

const C = {
  grafito: "#1A1A18",
  cobre: "#B87333",
  hueso: "#F1EFE8",
  piedra: "#5F5E5A",
  linea: "#E0DDD2",
  /* El cobre de marca (#B87333) da 3.30:1 sobre hueso y 3.79:1 con
     texto blanco encima: no alcanza el mínimo de 4.5:1 en texto
     pequeño. Este es el mismo cobre un punto más oscuro, 4.56:1 y
     5.25:1. El original se queda en lo grande (números de paso). */
  cobreTexto: "#96602A",
};

const GENERICO = "Hola, acabo de dejar mi requerimiento de casa en la página.";

/* El parámetro viene de la URL: puede traer cualquier cosa.
   Se quitan caracteres de control y signos de marcado, y se limita
   el largo. Nunca se inyecta como HTML: solo se codifica dentro del
   enlace de WhatsApp y se usa como texto. */
function sanear(crudo: string | null): string {
  if (!crudo) return GENERICO;
  const limpio = crudo
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  return limpio || GENERICO;
}

function empujar(evento: string, datos: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: evento, ...datos });
}

export default function Gracias({ mensajeCrudo }: { mensajeCrudo: string | null }) {
  const mensaje = sanear(mensajeCrudo);
  const enlace = enlaceWhatsApp(mensaje);
  const [abriendo, setAbriendo] = useState(true);

  useEffect(() => {
    /* Apertura automática. window.location.href, nunca window.open:
       los bloqueadores de ventanas emergentes cancelan window.open.

       1,8 s y no menos: la conversión de Google Ads se dispara desde
       GTM, que carga de forma asíncrona. Si nos vamos a WhatsApp antes
       de que la etiqueta alcance a dispararse, la venta ocurre igual
       pero Google nunca se entera, y la campaña deja de aprender. */
    const abrir = setTimeout(() => {
      empujar("whatsapp_click", { origen: "gracias" });
      window.location.href = enlace;
    }, 1800);
    const fin = setTimeout(() => setAbriendo(false), 3600);
    return () => {
      clearTimeout(abrir);
      clearTimeout(fin);
    };
  }, [enlace]);

  return (
    <main
      className="flex min-h-[100svh] flex-col"
      style={{ background: C.hueso, color: C.grafito }}
    >
      <header className="flex items-center px-5 py-3 sm:px-10 sm:py-4">
        <a href="/" className="flex items-center gap-2.5" aria-label="KYRELO — inicio">
          <Image
            src="/kyrelo-isotipo.png"
            alt=""
            width={64}
            height={64}
            priority
            className="h-7 w-7 rounded-[6px] sm:h-8 sm:w-8"
          />
          <span
            className="font-display text-[16px] sm:text-[18px]"
            style={{ letterSpacing: "0.04em" }}
          >
            KYRELO
          </span>
        </a>
      </header>

      <section className="flex flex-1 items-center px-5 pb-10 sm:px-10">
        <div className="mx-auto w-full max-w-lg text-center">
          <p
            className="text-[10px] font-semibold uppercase sm:text-[11px]"
            style={{ color: C.cobreTexto, letterSpacing: "0.24em" }}
          >
            Requerimiento recibido
          </p>

          <h1
            className="font-display mt-4 text-[32px] leading-[1.06] sm:text-[46px]"
            style={{ letterSpacing: "-0.03em" }}
          >
            Listo. Ya empezamos a buscar.
          </h1>

          <p
            className="mx-auto mt-4 max-w-md text-[14px] leading-[1.65] sm:text-[15px]"
            style={{ color: C.piedra }}
            aria-live="polite"
          >
            {abriendo
              ? "Estamos abriendo WhatsApp para que hablemos ahora mismo…"
              : "Si WhatsApp no se abrió solo, toca el botón. El mensaje ya va escrito."}
          </p>

          <a
            href={enlace}
            onClick={() => empujar("whatsapp_click", { origen: "gracias" })}
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: C.cobreTexto }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.2 1.26-1.96 1.42-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.2-4.98-4.4-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.14 1.02-2.43.24-.26.53-.33.71-.33.18 0 .35 0 .51.01.16.01.38-.06.6.46.23.55.77 1.9.84 2.04.07.14.11.3.02.49-.09.2-.14.32-.27.49-.14.16-.29.36-.41.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.2.69-.81.88-1.08.18-.28.37-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.34Z" />
            </svg>
            Abrir WhatsApp
          </a>

          <p className="mt-8 text-[12.5px] leading-[1.6]" style={{ color: C.piedra }}>
            Te respondemos hoy mismo, en menos de 5 minutos en horario hábil. Buscar
            contigo no tiene ningún costo para ti.
          </p>
        </div>
      </section>

      <footer
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-7 text-[12.5px]"
        style={{ background: C.grafito }}
      >
        <a
          href="/politica-de-datos"
          className="hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          Política de datos
        </a>
        <a
          href="/verificacion"
          className="hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          Cómo verificamos
        </a>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>
          © {new Date().getFullYear()} KYRELO
        </span>
      </footer>
    </main>
  );
}
