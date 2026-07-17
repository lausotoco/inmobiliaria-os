import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatoCOP } from "@/lib/utils";
import { APP } from "@/lib/config";
import Carrusel from "@/components/portafolio/Carrusel";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Props = { params: { slug: string } };

// ── Landing pública de un inmueble captado · quiet luxury ──
// Diseñada como página de destino para campañas de Google Ads:
// jerarquía clara, información completa y llamados a la acción.
const C = {
  fondo: "#F1EFE8",
  negro: "#1A1A18",
  gris: "#5F5E5A",
  grisClaro: "#A8A69E",
  linea: "#E0DDD2",
};

function urlImagen(ruta: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/propiedades/${ruta}`;
}

async function obtenerInmueble(slug: string) {
  const supabase = createClient();
  const { data } = await supabase.rpc("captacion_publica", { p_slug: slug });
  return data ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await obtenerInmueble(params.slug);
  if (!p) return { title: `Inmueble no disponible — ${APP.marca}` };

  const ubicacion = [p.barrio, p.ciudad].filter(Boolean).join(", ");
  const titulo = `${p.titulo ?? "Inmueble"}${ubicacion ? ` — ${ubicacion}` : ""}`;
  const descripcion =
    (p.descripcion as string | null)?.slice(0, 155) ??
    `${p.titulo ?? "Inmueble"} en venta. ${ubicacion}. ${APP.marca}.`;
  const imagenes: string[] = p.imagenes ?? [];

  return {
    title: titulo,
    description: descripcion,
    robots: { index: true, follow: true },
    openGraph: {
      title: titulo,
      description: descripcion,
      type: "website",
      images: imagenes.length > 0 ? [urlImagen(imagenes[0])] : undefined,
    },
  };
}

export default async function InmueblePublicoPage({ params }: Props) {
  const p = await obtenerInmueble(params.slug);
  const waDigits = APP.whatsapp.replace(/\D/g, "");

  if (!p) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={{ backgroundColor: C.fondo, fontFamily: "Inter, sans-serif" }}
      >
        <div className="text-center">
          <p
            className="text-2xl font-semibold tracking-tight"
            style={{ color: C.negro }}
          >
            Este inmueble ya no está disponible
          </p>
          <Link
            href="/inmuebles"
            className="mt-6 inline-block rounded-full border px-8 py-3 text-[13px] font-medium"
            style={{ borderColor: C.linea, color: C.negro }}
          >
            Ver inmuebles disponibles
          </Link>
        </div>
      </main>
    );
  }

  const imgs: string[] = (p.imagenes ?? []).map((r: string) => urlImagen(r));
  const amenidades: string[] = p.amenidades ?? [];
  const ubicacion = [p.barrio, p.ciudad].filter(Boolean).join(" · ");
  const noDisponible = p.estado !== "disponible";

  const precioM2 =
    p.precio && p.area ? Math.round(p.precio / p.area) : null;

  const mapsQuery =
    p.lat && p.lng
      ? `${p.lat},${p.lng}`
      : encodeURIComponent(
          [p.barrio, p.ciudad, "Colombia"].filter(Boolean).join(", ")
        );
  const hayUbicacion = (p.lat && p.lng) || p.barrio || p.ciudad;

  const waTexto = encodeURIComponent(
    `Hola, me interesa el inmueble "${p.titulo ?? params.slug}" que vi en tu página. ¿Podemos agendar una visita?`
  );
  const waHref = `https://wa.me/${waDigits}?text=${waTexto}`;

  const datos = [
    { v: p.area ? `${p.area} m²` : null, k: "Área" },
    { v: p.habitaciones, k: "Habitaciones" },
    { v: p.banos, k: "Baños" },
    { v: p.parqueaderos, k: "Parqueaderos" },
    { v: p.estrato ? `Estrato ${p.estrato}` : null, k: "Estrato" },
    {
      v: p.administracion ? formatoCOP(p.administracion) : null,
      k: "Administración",
    },
    { v: precioM2 ? `${formatoCOP(precioM2)}` : null, k: "Precio por m²" },
    { v: p.ciudad, k: "Ciudad" },
    { v: p.barrio, k: "Sector" },
  ].filter((d) => d.v !== null && d.v !== undefined);

  // Datos estructurados para Google (mejora el nivel de calidad de la pauta)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.titulo ?? "Inmueble en venta",
    description:
      (p.descripcion as string | null)?.slice(0, 300) ??
      `Inmueble en venta en ${ubicacion}`,
    image: imgs.slice(0, 3),
    offers: {
      "@type": "Offer",
      price: p.precio ?? undefined,
      priceCurrency: "COP",
      availability: noDisponible
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      seller: { "@type": "Person", name: APP.marca },
    },
  };

  return (
    <main
      className="min-h-screen antialiased"
      style={{
        backgroundColor: C.fondo,
        color: C.negro,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        {/* ── Barra superior ── */}
        <header
          className="flex items-baseline justify-between gap-4 border-b py-6"
          style={{ borderColor: C.linea }}
        >
          <Link
            href="/inmuebles"
            className="text-[11px] font-semibold uppercase transition-opacity hover:opacity-70"
            style={{ color: C.gris, letterSpacing: "0.22em" }}
          >
            ← Inmuebles
          </Link>
          <p
            className="text-[13px] font-semibold"
            style={{ letterSpacing: "-0.01em" }}
          >
            {APP.marca}
          </p>
        </header>

        {/* ── Encabezado editorial ── */}
        <section className="pb-10 pt-12 sm:pt-16">
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: C.gris, letterSpacing: "0.28em" }}
          >
            {noDisponible ? p.estado : "En venta"}
            {ubicacion && ` · ${ubicacion}`}
          </p>
          <h1
            className="mt-5 text-[32px] font-bold leading-[1.08] sm:text-[44px]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {p.titulo || "Inmueble"}
          </h1>
          <div className="mt-7 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p
              className="text-[30px] font-bold leading-none sm:text-[36px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              {formatoCOP(p.precio)}
            </p>
            {precioM2 && (
              <p className="text-[13px] font-light" style={{ color: C.gris }}>
                {formatoCOP(precioM2)} por m²
              </p>
            )}
          </div>

          {/* Resumen en una línea */}
          <p
            className="mt-6 border-t pt-5 text-[13px] font-light"
            style={{ color: C.gris, borderColor: C.linea }}
          >
            {[
              p.area ? `${p.area} m²` : null,
              p.habitaciones
                ? `${p.habitaciones} habitación${p.habitaciones !== 1 ? "es" : ""}`
                : null,
              p.banos ? `${p.banos} baño${p.banos !== 1 ? "s" : ""}` : null,
              p.parqueaderos
                ? `${p.parqueaderos} parqueadero${p.parqueaderos !== 1 ? "s" : ""}`
                : null,
              p.estrato ? `estrato ${p.estrato}` : null,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </section>

        {/* ── Galería principal ── */}
        <div className="overflow-hidden rounded-[6px]">
          <Carrusel imagenes={imgs} alt={p.titulo ?? "Inmueble"} />
        </div>

        {/* ── CTA inmediato ── */}
        {waDigits && !noDisponible && (
          <div
            className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[6px] border px-6 py-5 sm:flex-row"
            style={{ borderColor: C.linea }}
          >
            <p className="text-[14px] font-light" style={{ color: C.gris }}>
              ¿Te gustaría conocerlo? Coordino tu visita personalmente.
            </p>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full shrink-0 rounded-full px-8 py-3.5 text-center text-[13px] font-semibold text-white transition-opacity duration-300 hover:opacity-80 sm:w-auto"
              style={{ backgroundColor: C.negro, letterSpacing: "0.02em" }}
            >
              Agendar una visita
            </a>
          </div>
        )}

        {/* ── Especificaciones ── */}
        <section className="mt-16">
          <p
            className="border-b pb-4 text-[11px] font-semibold uppercase"
            style={{ borderColor: C.linea, letterSpacing: "0.28em" }}
          >
            Especificaciones
          </p>
          <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
            {datos.map((d) => (
              <div
                key={d.k}
                className="border-b py-4"
                style={{ borderColor: C.linea }}
              >
                <p
                  className="text-[10px] font-medium uppercase"
                  style={{ color: C.grisClaro, letterSpacing: "0.12em" }}
                >
                  {d.k}
                </p>
                <p className="mt-1.5 text-[15px] font-semibold">{d.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Descripción ── */}
        {p.descripcion && (
          <section className="mt-16">
            <p
              className="border-b pb-4 text-[11px] font-semibold uppercase"
              style={{ borderColor: C.linea, letterSpacing: "0.28em" }}
            >
              El inmueble
            </p>
            <p
              className="mt-6 max-w-2xl whitespace-pre-line text-[15px] font-light leading-[1.9]"
              style={{ color: "#4A4A46" }}
            >
              {p.descripcion}
            </p>
          </section>
        )}

        {/* ── Amenidades ── */}
        {amenidades.length > 0 && (
          <section className="mt-16">
            <p
              className="border-b pb-4 text-[11px] font-semibold uppercase"
              style={{ borderColor: C.linea, letterSpacing: "0.28em" }}
            >
              Amenidades y características
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {amenidades.map((a) => (
                <span
                  key={a}
                  className="rounded-full border px-4 py-1.5 text-[12px] font-light"
                  style={{ borderColor: C.linea, color: "#4A4A46" }}
                >
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Galería completa ── */}
        {imgs.length > 1 && (
          <section className="mt-16">
            <p
              className="border-b pb-4 text-[11px] font-semibold uppercase"
              style={{ borderColor: C.linea, letterSpacing: "0.28em" }}
            >
              Galería · {imgs.length} fotos
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {imgs.slice(1).map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`${p.titulo ?? "Inmueble"} — foto ${i + 2}`}
                  loading="lazy"
                  className={`w-full rounded-[6px] object-cover ${
                    i % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"
                  }`}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Ubicación ── */}
        {hayUbicacion && (
          <section className="mt-16">
            <p
              className="border-b pb-4 text-[11px] font-semibold uppercase"
              style={{ borderColor: C.linea, letterSpacing: "0.28em" }}
            >
              Ubicación
            </p>
            <p
              className="mt-6 text-[14px] font-light"
              style={{ color: C.gris }}
            >
              {[p.barrio, p.ciudad].filter(Boolean).join(", ")}
              {" — "}la dirección exacta se comparte al coordinar la visita.
            </p>
            <div className="mt-5 overflow-hidden rounded-[6px]">
              <iframe
                title="Ubicación del inmueble"
                src={`https://www.google.com/maps?q=${mapsQuery}&z=15&output=embed`}
                className="h-[320px] w-full border-0 grayscale-[35%]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>
        )}

        {/* ── Asesora ── */}
        <section
          className="mt-20 rounded-[6px] border px-8 py-10 text-center sm:px-14"
          style={{ borderColor: C.linea }}
        >
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: C.gris, letterSpacing: "0.28em" }}
          >
            Acompañamiento personal
          </p>
          <p
            className="mt-5 text-[22px] font-bold"
            style={{ letterSpacing: "-0.02em" }}
          >
            {APP.marca}
          </p>
          <p
            className="mx-auto mt-4 max-w-md text-[14px] font-light leading-[1.8]"
            style={{ color: C.gris }}
          >
            Este inmueble hace parte de mi portafolio de captaciones directas:
            lo conozco personalmente y te acompaño en todo el proceso, desde la
            visita hasta la firma.
          </p>
          {waDigits && (
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-8 py-3.5 text-[13px] font-semibold text-white transition-opacity duration-300 hover:opacity-80"
                style={{ backgroundColor: C.negro, letterSpacing: "0.02em" }}
              >
                Escribirme por WhatsApp
              </a>
              <a
                href={`tel:+${waDigits}`}
                className="rounded-full border px-8 py-3.5 text-[13px] font-medium transition-colors duration-300"
                style={{ borderColor: C.linea, color: C.negro }}
              >
                Llamar
              </a>
            </div>
          )}
        </section>

        {/* ── Pie ── */}
        <footer
          className="mt-20 border-t pb-28 pt-10 text-center sm:pb-16"
          style={{ borderColor: C.linea }}
        >
          <p
            className="text-[10px] font-medium uppercase"
            style={{ color: C.grisClaro, letterSpacing: "0.18em" }}
          >
            <Link href="/inmuebles" className="underline underline-offset-4">
              Ver todos los inmuebles disponibles
            </Link>
          </p>
        </footer>
      </div>

      {/* ── Barra fija de contacto — móvil ── */}
      {waDigits && !noDisponible && (
        <div
          className="fixed inset-x-0 bottom-0 flex items-center justify-between gap-4 border-t px-5 py-3 backdrop-blur sm:hidden"
          style={{
            borderColor: C.linea,
            backgroundColor: "rgba(250,250,247,0.92)",
          }}
        >
          <p
            className="text-[16px] font-bold leading-none"
            style={{ letterSpacing: "-0.02em" }}
          >
            {formatoCOP(p.precio)}
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-6 py-3 text-[12px] font-semibold text-white"
            style={{ backgroundColor: C.negro, letterSpacing: "0.02em" }}
          >
            Agendar visita
          </a>
        </div>
      )}
    </main>
  );
}
