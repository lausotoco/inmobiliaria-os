import { createClient } from "@/lib/supabase/server";
import { formatoCOP } from "@/lib/utils";
import { APP } from "@/lib/config";
import Carrusel from "@/components/portafolio/Carrusel";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function PortafolioPublicoPage({ params }: Props) {
  const supabase = createClient();

  // La función portafolio_publico (security definer) devuelve todo el
  // portafolio en una sola llamada, sin exponer nada más de la base.
  const { data: portafolio, error } = await supabase.rpc(
    "portafolio_publico",
    { p_token: params.token }
  );

  if (error || !portafolio) {
    return (
      <Envoltura>
        <div className="px-6 text-center">
          <p className="text-2xl font-semibold text-white">
            Este portafolio no está disponible
          </p>
          <p className="mt-2 text-sm text-white/60">
            {error
              ? "Falta ejecutar la actualización de la base de datos (supabase/actualizacion-portafolio-publico.sql)."
              : "El enlace puede ser incorrecto o haber sido eliminado."}
          </p>
        </div>
      </Envoltura>
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
    <main className="min-h-screen bg-[#0d3627]">
      {/* ── Portada ── */}
      <header className="px-6 pb-14 pt-16 text-center sm:pt-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#c9a961]">
          Portafolio exclusivo
        </p>
        <h1 className="mx-auto mt-4 max-w-xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
          {portafolio.titulo || `Selección para ${primerNombre}`}
        </h1>
        {portafolio.mensaje_personal && (
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
            {portafolio.mensaje_personal}
          </p>
        )}
        <p className="mt-7 text-xs text-white/40">
          {propiedades.length} propiedad{propiedades.length !== 1 ? "es" : ""}{" "}
          seleccionada{propiedades.length !== 1 ? "s" : ""} · {APP.marca}
        </p>
      </header>

      {/* ── Propiedades ── */}
      <div className="mx-auto max-w-lg space-y-8 px-4 pb-16 sm:max-w-xl">
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
            `Hola, me interesa la propiedad "${p.titulo ?? `#${idx + 1}`}" del portafolio que me enviaste 🙌`
          );

          return (
            <article
              key={p.id}
              className="overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <Carrusel imagenes={imgs} alt={p.titulo ?? "Propiedad"} />

              <div className="p-6">
                <p className="text-3xl font-bold tracking-tight text-[#14523d]">
                  {formatoCOP(p.precio)}
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-neutral-900">
                  {p.titulo || "Propiedad"}
                </h2>
                {(p.barrio || p.ciudad) && (
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {[p.barrio, p.ciudad].filter(Boolean).join(", ")}
                  </p>
                )}

                {/* Datos clave */}
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { v: p.area ? `${p.area}` : null, u: "m²" },
                    { v: p.habitaciones, u: "hab" },
                    { v: p.banos, u: "baños" },
                    { v: p.parqueaderos, u: "parq" },
                    { v: p.administracion ? formatoCOP(p.administracion) : null, u: "admón" },
                    { v: p.estrato ? `E${p.estrato}` : null, u: "estrato" },
                  ]
                    .filter((d) => d.v !== null && d.v !== undefined)
                    .map((d) => (
                      <div key={d.u} className="rounded-xl bg-neutral-50 px-2 py-3">
                        <p className="text-sm font-semibold text-neutral-900">{d.v}</p>
                        <p className="text-[11px] text-neutral-400">{d.u}</p>
                      </div>
                    ))}
                </div>

                {p.nota && (
                  <p className="mt-5 rounded-xl bg-[#e8f0eb] px-4 py-3 text-sm italic text-[#14523d]">
                    ✦ {p.nota}
                  </p>
                )}

                {p.descripcion && (
                  <p className="mt-5 text-sm leading-relaxed text-neutral-600">
                    {p.descripcion}
                  </p>
                )}

                {amenidades.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {amenidades.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}?text=${waTexto}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="col-span-2 rounded-xl bg-[#14523d] py-3.5 text-center text-sm font-semibold text-white transition hover:bg-[#0d3627]"
                    >
                      Me interesa — hablar por WhatsApp
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-neutral-200 py-3 text-center text-sm text-neutral-700 transition hover:bg-neutral-50"
                  >
                    📍 Ubicación
                  </a>
                  {p.url_original ? (
                    <a
                      href={p.url_original}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-neutral-200 py-3 text-center text-sm text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Anuncio original ↗
                    </a>
                  ) : (
                    <span className="rounded-xl border border-neutral-100 py-3 text-center text-sm text-neutral-300">
                      —
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="border-t border-white/10 px-6 py-10 text-center">
        <p className="text-lg font-semibold text-white">{APP.marca}</p>
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
          >
            Escribirme por WhatsApp
          </a>
        )}
        <p className="mt-6 text-[11px] text-white/30">
          Este portafolio es privado y fue preparado exclusivamente para{" "}
          {portafolio.cliente_nombre ?? "ti"}.
        </p>
      </footer>
    </main>
  );
}

function Envoltura({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d3627]">
      {children}
    </main>
  );
}
