import { createClient } from "@/lib/supabase/server";
import { formatoCOP } from "@/lib/utils";
import { APP } from "@/lib/config";
import Carrusel from "@/components/portafolio/Carrusel";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Estética: minimalismo editorial · quiet luxury · diseño suizo ──
// Paleta reducida: blanco cálido, negro profundo, grises suaves.
const C = {
  fondo: "#FAFAF7",
  negro: "#141414",
  gris: "#8C8C86",
  grisClaro: "#B9B9B3",
  linea: "#E6E6E1",
};

export default async function PortafolioPublicoPage({ params }: Props) {
  const supabase = createClient();

  const { data: portafolio, error } = await supabase.rpc(
    "portafolio_publico",
    { p_token: params.token }
  );

  if (error || !portafolio) {
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
            Este portafolio no está disponible
          </p>
          <p className="mt-3 text-sm" style={{ color: C.gris }}>
            El enlace puede ser incorrecto o haber sido retirado.
          </p>
        </div>
      </main>
    );
  }

  const propiedades: any[] = portafolio.propiedades ?? [];
  const primerNombre =
    (portafolio.cliente_nombre as string | null)?.split(" ")[0] ?? "";
  const waDigits = APP.whatsapp.replace(/\D/g, "");

  function urlImagen(ruta: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/propiedades/${ruta}`;
  }

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
        {/* ── Cabecera editorial ── */}
        <header className="pb-16 pt-20 sm:pt-28">
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ color: C.gris, letterSpacing: "0.28em" }}
          >
            Portafolio privado
          </p>

          <h1
            className="mt-6 text-[40px] font-bold leading-[1.04] sm:text-[56px]"
            style={{ letterSpacing: "-0.035em" }}
          >
            {portafolio.titulo || `Selección para ${primerNombre}`}
          </h1>

          {portafolio.mensaje_personal && (
            <p
              className="mt-8 max-w-md text-[15px] font-light leading-[1.8]"
              style={{ color: C.gris }}
            >
              {portafolio.mensaje_personal}
            </p>
          )}

          <div
            className="mt-12 flex items-baseline justify-between border-t pt-5"
            style={{ borderColor: C.linea }}
          >
            <p
              className="text-[11px] font-medium uppercase"
              style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
            >
              {propiedades.length} propiedad{propiedades.length !== 1 ? "es" : ""}
            </p>
            <p
              className="text-[11px] font-medium uppercase"
              style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
            >
              {APP.marca}
            </p>
          </div>
        </header>

        {/* ── Propiedades ── */}
        <div className="space-y-24 pb-24">
          {propiedades.map((p: any, idx: number) => {
            const imgs: string[] = (p.imagenes ?? []).map((r: string) =>
              urlImagen(r)
            );
            const amenidades: string[] = p.amenidades ?? [];

            const mapsQuery = encodeURIComponent(
              [p.direccion, p.barrio, p.ciudad, "Colombia"]
                .filter(Boolean)
                .join(", ")
            );

            const waTexto = encodeURIComponent(
              `Hola, me interesa la propiedad "${p.titulo ?? `nº ${idx + 1}`}" del portafolio que me compartiste.`
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
              <article key={p.id}>
                {/* Número editorial */}
                <div className="mb-5 flex items-baseline justify-between">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="text-[11px] font-medium uppercase"
                    style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
                  >
                    {[p.barrio, p.ciudad].filter(Boolean).join(" · ")}
                  </span>
                </div>

                {/* Imagen */}
                <div className="overflow-hidden rounded-[6px]">
                  <Carrusel imagenes={imgs} alt={p.titulo ?? "Propiedad"} />
                </div>

                {/* Precio + título */}
                <div className="mt-8">
                  <p
                    className="text-[32px] font-bold leading-none sm:text-[38px]"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {formatoCOP(p.precio)}
                  </p>
                  <h2
                    className="mt-3 text-[17px] font-medium"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {p.titulo || "Propiedad"}
                  </h2>
                </div>

                {/* Datos — tabla suiza */}
                {datos.length > 0 && (
                  <div
                    className="mt-8 grid grid-cols-2 gap-x-8 sm:grid-cols-3"
                  >
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

                {/* Nota personal */}
                {p.nota && (
                  <p
                    className="mt-8 border-l pl-5 text-[14px] font-light italic leading-[1.8]"
                    style={{ borderColor: C.negro, color: C.gris }}
                  >
                    {p.nota}
                  </p>
                )}

                {/* Descripción */}
                {p.descripcion && (
                  <p
                    className="mt-8 max-w-xl text-[14px] font-light leading-[1.85]"
                    style={{ color: C.gris }}
                  >
                    {p.descripcion}
                  </p>
                )}

                {/* Amenidades — línea editorial */}
                {amenidades.length > 0 && (
                  <p
                    className="mt-6 text-[12px] font-light leading-[2]"
                    style={{ color: C.grisClaro, letterSpacing: "0.02em" }}
                  >
                    {amenidades.join("  ·  ")}
                  </p>
                )}

                {/* Acciones */}
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}?text=${waTexto}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full px-8 py-3.5 text-center text-[13px] font-semibold text-white transition-opacity duration-300 hover:opacity-80"
                      style={{ backgroundColor: C.negro, letterSpacing: "0.02em" }}
                    >
                      Me interesa esta propiedad
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border px-8 py-3.5 text-center text-[13px] font-medium transition-colors duration-300"
                    style={{ borderColor: C.linea, color: C.negro }}
                  >
                    Ver ubicación
                  </a>
                </div>
              </article>
            );
          })}
        </div>

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
          <p
            className="mt-10 text-[10px] font-medium uppercase"
            style={{ color: C.grisClaro, letterSpacing: "0.18em" }}
          >
            Preparado exclusivamente para {portafolio.cliente_nombre ?? "ti"}
          </p>
        </footer>
      </div>
    </main>
  );
}
