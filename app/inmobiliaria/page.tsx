import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatoCOP } from "@/lib/utils";
import { CabeceraSitio, PieSitio } from "@/components/sitio/Sitio";
import { C, LogoMarca, wa } from "@/components/sitio/marca";

/* ============================================================
   KYRELO Inmobiliaria (/inmobiliaria)
   Para propietarios (vender o arrendar) y compradores. Muestra
   los inmuebles que ya están en /inmuebles (misma consulta).
   ============================================================ */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KYRELO Inmobiliaria · Vivienda premium en la Sabana",
  description:
    "Venta y arriendo de vivienda premium en Chía, Cajicá, Cota, Sopó y Bogotá norte. Primero conocemos al comprador; después buscamos el inmueble.",
  robots: { index: true, follow: true },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function urlImagen(ruta: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/propiedades/${ruta}`;
}

const PROPIETARIOS = [
  "Ya conocemos personas que buscan inmuebles como el tuyo.",
  "Hacemos las fotos, el video y la ficha de tu inmueble.",
  "Solo te visitan quienes de verdad pueden comprar.",
  "Nos encargamos de los trámites: promesa, banco y notaría.",
];

const COMPRADORES = [
  "Nos dices qué buscas y con qué presupuesto.",
  "Buscamos entre nuestros inmuebles y los de agentes y oficinas de confianza.",
  "Visitas solo lo que te sirve, con precios y papeles revisados. Sin costo para ti.",
];

export default async function InmobiliariaPage() {
  const supabase = createClient();
  const { data } = await supabase.rpc("captaciones_publicas");
  const inmuebles: any[] = (data ?? []).slice(0, 4);

  const serif = { fontFamily: '"Fraunces", Georgia, serif' };

  return (
    <main style={{ background: C.hueso, color: C.grafito, fontFamily: "Inter, system-ui, sans-serif" }} className="min-h-screen">
      <CabeceraSitio activa="/inmobiliaria" />

      {/* Hero */}
      <section className="px-6 pb-16 pt-20 sm:px-10 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <LogoMarca marca="inmobiliaria" className="h-14 w-14" />
            <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.28em" }}>
              KYRELO Inmobiliaria
            </p>
          </div>
          <h1 className="mt-8 text-[44px] leading-[1.04] sm:text-[66px]" style={{ ...serif, letterSpacing: "-0.03em" }}>
            Primero el comprador. <i style={{ color: C.cobre }}>Después el inmueble.</i>
          </h1>
          <p className="mt-7 max-w-2xl text-[17px] leading-[1.7] sm:text-[19px]" style={{ color: C.piedra }}>
            Vendemos y arrendamos casas y apartamentos en la Sabana, a personas que ya sabemos que pueden comprar.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={wa("Hola KYRELO, quiero vender o arrendar mi inmueble.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full px-8 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: C.cobre }}
            >
              Quiero vender o arrendar
            </a>
            <a
              href="/casas/sabana-norte"
              className="inline-flex items-center justify-center rounded-full border px-8 py-4 text-[15px] font-medium"
              style={{ borderColor: C.grafito, color: C.grafito }}
            >
              Busco inmueble
            </a>
          </div>
        </div>
      </section>

      {/* Propietarios y compradores */}
      <section className="border-t px-6 py-20 sm:px-10 sm:py-28" style={{ borderColor: C.linea }}>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
          {[
            ["Si quieres vender o arrendar", "Te traemos compradores serios.", PROPIETARIOS],
            ["Si quieres comprar", "Te buscamos el inmueble que necesitas.", COMPRADORES],
          ].map(([eb, titulo, items]) => (
            <article key={eb as string} className="rounded-2xl border bg-white p-7 sm:p-9" style={{ borderColor: C.linea }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.cobre }}>
                {eb as string}
              </p>
              <h2 className="mt-3 text-[26px] leading-snug" style={serif}>
                {titulo as string}
              </h2>
              <ul className="mt-6 space-y-3.5">
                {(items as string[]).map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px] leading-relaxed" style={{ color: C.piedra }}>
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.cobre }} />
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-[13px]" style={{ color: C.piedra }}>
          Así revisamos compradores e inmuebles:{" "}
          <a href="/verificacion" className="font-semibold underline underline-offset-4" style={{ color: C.grafito }}>
            nuestro estándar
          </a>
          .
        </p>
      </section>

      {/* Inmuebles disponibles */}
      {inmuebles.length > 0 && (
        <section className="border-t px-6 py-20 sm:px-10 sm:py-28" style={{ borderColor: C.linea }}>
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>
                  Inmuebles disponibles
                </p>
                <h2 className="mt-4 text-[32px] leading-[1.1] sm:text-[42px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
                  Inmuebles que ya revisamos.
                </h2>
              </div>
              <Link href="/inmuebles" className="text-[14px] font-semibold underline underline-offset-4">
                Ver todos
              </Link>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {inmuebles.map((p: any) => (
                <Link key={p.slug} href={`/inmuebles/${p.slug}`} className="group block">
                  <div className="overflow-hidden rounded-xl">
                    {p.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={urlImagen(p.imagen)}
                        alt={p.titulo ?? "Inmueble"}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full" style={{ background: "#E8E5DB" }} />
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <p className="text-[20px] font-semibold">{formatoCOP(p.precio)}</p>
                    <p className="text-[10px] font-medium uppercase" style={{ color: C.piedra, letterSpacing: "0.14em" }}>
                      {[p.barrio, p.ciudad].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <h3 className="mt-1.5 text-[15px] font-medium">{p.titulo || "Inmueble"}</h3>
                  <p className="mt-2 border-t pt-2 text-[12.5px]" style={{ color: C.piedra, borderColor: C.linea }}>
                    {[
                      p.area ? `${p.area} m²` : null,
                      p.habitaciones ? `${p.habitaciones} hab` : null,
                      p.banos ? `${p.banos} baños` : null,
                      p.parqueaderos ? `${p.parqueaderos} parq` : null,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PieSitio />
    </main>
  );
}
