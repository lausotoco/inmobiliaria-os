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
// Sirve como página de destino para campañas de Google Ads.
const C = {
  fondo: "#FAFAF7",
  negro: "#141414",
  gris: "#8C8C86",
  grisClaro: "#B9B9B3",
  linea: "#E6E6E1",
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

  const mapsQuery =
    p.lat && p.lng
      ? `${p.lat},${p.lng}`
      : encodeURIComponent(
          [p.barrio, p.ciudad, "Colombia"].filter(Boolean).join(", ")
        );

  const waTexto = encodeURIComponent(
    `Hola, me interesa el inmueble "${p.titulo ?? params.slug}" que vi en tu página.`
  );

  const datos = [
    { v: p.area ? `${p.area} m²` : null, k: "Área" },
    { v: p.habitaciones, k: "Habitaciones" },
    { v: p.banos, k: "Baños" },
    { v: p.parqueaderos, k: "Parqueaderos" },
    {
      v: p.administracion ? formatoCOP(p.administracion) : null,
      k: "Administración",
    },
    { v: p.estrato ? `Estrato ${p.estrato}` : null, k: "Estrato" },
  ].filter((d) => d.v !== null && d.v !== undefined);

  return (
    <main
      className="min-h-screen antialiased"
      style={{
        backgroundColor: C.fondo,
        color: C.negro,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        {/* ── Cabecera ── */}
        <header className="pb-10 pt-14 sm:pt-20">
          <div className="flex items-baseline justify-between gap-4">
            <Link
              href="/inmuebles"
              className="text-[11px] font-semibold uppercase transition-opacity hover:opacity-70"
              style={{ color: C.gris, letterSpacing: "0.28em" }}
            >
              ← Todos los inmuebles
            </Link>
            <p
              className="text-[11px] font-medium uppercase"
              style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
            >
              {APP.marca}
            </p>
          </div>
        </header>

        {/* ── Imagen ── */}
        <div className="overflow-hidden rounded-[6px]">
          <Carrusel imagenes={imgs} alt={p.titulo ?? "Inmueble"} />
        </div>

        {/* ── Precio + título ── */}
        <div className="mt-10">
          {noDisponible && (
            <span
              className="mb-4 inline-block rounded-full border px-3 py-1 text-[10px] font-semibold uppercase"
              style={{
                borderColor: C.negro,
                color: C.negro,
                letterSpacing: "0.14em",
              }}
            >
              {p.estado}
            </span>
          )}
          <p
            className="text-[36px] font-bold leading-none sm:text-[44px]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {formatoCOP(p.precio)}
          </p>
          <h1
            className="mt-4 text-[22px] font-medium leading-snug"
            style={{ letterSpacing: "-0.015em" }}
          >
            {p.titulo || "Inmueble"}
          </h1>
          {ubicacion && (
            <p
              className="mt-2 text-[11px] font-medium uppercase"
              style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
            >
              {ubicacion}
            </p>
          )}
        </div>

        {/* ── Datos — tabla suiza ── */}
        {datos.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-x-8 sm:grid-cols-3">
            {datos.map((d) => (
              <div
                key={d.k}
                className="border-t py-3.5"
                style={{ borderColor: C.linea }}
              >
                <p
                  className="text-[10px] font-medium uppercase"
                  style={{ color: C.grisClaro, letterSpacing: "0.12em" }}
                >
                  {d.k}
                </p>
                <p className="mt-1 text-[14px] font-semibold">{d.v}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Descripción ── */}
        {p.descripcion && (
          <p
            className="mt-10 max-w-xl whitespace-pre-line text-[14px] font-light leading-[1.85]"
            style={{ color: C.gris }}
          >
            {p.descripcion}
          </p>
        )}

        {/* ── Amenidades ── */}
        {amenidades.length > 0 && (
          <p
            className="mt-6 text-[12px] font-light leading-[2]"
            style={{ color: C.grisClaro, letterSpacing: "0.02em" }}
          >
            {amenidades.join("  ·  ")}
          </p>
        )}

        {/* ── Acciones ── */}
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          {waDigits && !noDisponible && (
            <a
              href={`https://wa.me/${waDigits}?text=${waTexto}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-8 py-3.5 text-center text-[13px] font-semibold text-white transition-opacity duration-300 hover:opacity-80"
              style={{ backgroundColor: C.negro, letterSpacing: "0.02em" }}
            >
              Agendar una visita
            </a>
          )}
          {(p.lat && p.lng) || p.barrio || p.ciudad ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border px-8 py-3.5 text-center text-[13px] font-medium transition-colors duration-300"
              style={{ borderColor: C.linea, color: C.negro }}
            >
              Ver zona en el mapa
            </a>
          ) : null}
        </div>

        {/* ── Pie ── */}
        <footer
          className="mt-20 border-t pb-16 pt-12 text-center"
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
          <p
            className="mt-10 text-[10px] font-medium uppercase"
            style={{ color: C.grisClaro, letterSpacing: "0.18em" }}
          >
            <Link href="/inmuebles" className="underline underline-offset-4">
              Ver todos los inmuebles disponibles
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
