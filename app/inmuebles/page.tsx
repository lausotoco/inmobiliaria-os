import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatoCOP } from "@/lib/utils";
import { APP } from "@/lib/config";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Portal público de captaciones · quiet luxury editorial ──
const C = {
  fondo: "#FAFAF7",
  negro: "#141414",
  gris: "#8C8C86",
  grisClaro: "#B9B9B3",
  linea: "#E6E6E1",
};

export const metadata: Metadata = {
  title: `Inmuebles disponibles — ${APP.marca}`,
  description:
    "Selección de inmuebles en venta, presentados con el detalle que merecen. Agenda tu visita.",
  openGraph: {
    title: `Inmuebles disponibles — ${APP.marca}`,
    description:
      "Selección de inmuebles en venta, presentados con el detalle que merecen.",
  },
};

function urlImagen(ruta: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/propiedades/${ruta}`;
}

export default async function InmueblesPage() {
  const supabase = createClient();
  const { data } = await supabase.rpc("captaciones_publicas");
  const inmuebles: any[] = data ?? [];

  const waDigits = APP.whatsapp.replace(/\D/g, "");
  const ciudades = Array.from(
    new Set(inmuebles.map((i) => i.ciudad).filter(Boolean))
  ) as string[];

  return (
    <main
      className="min-h-screen antialiased"
      style={{
        backgroundColor: C.fondo,
        color: C.negro,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        {/* ── Cabecera editorial ── */}
        <header className="pb-14 pt-20 sm:pt-28">
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: C.gris, letterSpacing: "0.28em" }}
          >
            {APP.marca}
          </p>
          <h1
            className="mt-6 max-w-2xl text-[40px] font-bold leading-[1.04] sm:text-[56px]"
            style={{ letterSpacing: "-0.035em" }}
          >
            Inmuebles disponibles
          </h1>
          <p
            className="mt-6 max-w-md text-[15px] font-light leading-[1.8]"
            style={{ color: C.gris }}
          >
            Una selección de propiedades captadas y verificadas personalmente.
            Cada una con su historia, presentada con el detalle que merece.
          </p>

          <div
            className="mt-12 flex flex-wrap items-baseline justify-between gap-3 border-t pt-5"
            style={{ borderColor: C.linea }}
          >
            <p
              className="text-[11px] font-medium uppercase"
              style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
            >
              {inmuebles.length} inmueble{inmuebles.length !== 1 ? "s" : ""}
              {ciudades.length > 0 && ` · ${ciudades.join(" · ")}`}
            </p>
            {waDigits && (
              <a
                href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                  "Hola, vi tu portafolio de inmuebles y me gustaría más información."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold uppercase underline underline-offset-4"
                style={{ letterSpacing: "0.14em" }}
              >
                Escribir por WhatsApp
              </a>
            )}
          </div>
        </header>

        {/* ── Retícula de inmuebles ── */}
        {inmuebles.length === 0 ? (
          <p
            className="pb-32 text-[15px] font-light"
            style={{ color: C.gris }}
          >
            Por ahora no hay inmuebles publicados. Vuelve pronto.
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-16 pb-24 sm:grid-cols-2">
            {inmuebles.map((p: any, idx: number) => (
              <Link
                key={p.slug}
                href={`/inmuebles/${p.slug}`}
                className="group block"
              >
                {/* Imagen */}
                <div className="relative overflow-hidden rounded-[6px]">
                  {p.imagen ? (
                    <img
                      src={urlImagen(p.imagen)}
                      alt={p.titulo ?? "Inmueble"}
                      loading={idx < 4 ? "eager" : "lazy"}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div
                      className="flex aspect-[4/3] w-full items-center justify-center text-5xl"
                      style={{ backgroundColor: "#F0F0EB", color: C.grisClaro }}
                    >
                      ⌂
                    </div>
                  )}
                  {p.destacada && (
                    <span
                      className="absolute left-3 top-3 rounded-full border bg-white/85 px-3 py-1 text-[9px] font-semibold uppercase backdrop-blur"
                      style={{
                        borderColor: C.linea,
                        color: C.negro,
                        letterSpacing: "0.14em",
                      }}
                    >
                      Destacado
                    </span>
                  )}
                </div>

                {/* Datos */}
                <div className="mt-5 flex items-baseline justify-between gap-3">
                  <p
                    className="text-[22px] font-bold leading-none"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {formatoCOP(p.precio)}
                  </p>
                  <p
                    className="text-[10px] font-medium uppercase"
                    style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
                  >
                    {[p.barrio, p.ciudad].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <h2
                  className="mt-2 text-[15px] font-medium"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {p.titulo || "Inmueble"}
                </h2>
                <p
                  className="mt-2.5 border-t pt-2.5 text-[12px] font-light"
                  style={{ color: C.gris, borderColor: C.linea }}
                >
                  {[
                    p.area ? `${p.area} m²` : null,
                    p.habitaciones ? `${p.habitaciones} hab` : null,
                    p.banos ? `${p.banos} baños` : null,
                    p.parqueaderos ? `${p.parqueaderos} parq` : null,
                    p.estrato ? `Estrato ${p.estrato}` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* ── Pie ── */}
        <footer
          className="border-t pb-16 pt-12 text-center"
          style={{ borderColor: C.linea }}
        >
          <p
            className="text-[15px] font-semibold"
            style={{ letterSpacing: "-0.01em" }}
          >
            {APP.marca}
          </p>
          {waDigits && (
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block rounded-full border px-8 py-3 text-[13px] font-medium transition-colors duration-300"
              style={{ borderColor: C.linea, color: C.negro }}
            >
              Escribirme por WhatsApp
            </a>
          )}
        </footer>
      </div>
    </main>
  );
}
