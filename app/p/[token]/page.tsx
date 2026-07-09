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
          <p className="font-display text-2xl font-semibold text-[#F0F4FF]">
            Este portafolio no está disponible
          </p>
          <p className="mt-2 text-sm text-[#6B7B9E]">
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
    <main className="min-h-screen bg-[#06080F]">
      {/* ── Portada ── */}
      <header className="px-6 pb-14 pt-16 text-center sm:pt-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#00D4FF]">
          Portafolio exclusivo
        </p>
        <h1 className="mx-auto mt-4 max-w-xl font-display text-3xl font-bold leading-[1.05] tracking-[-0.03em] text-[#F0F4FF] sm:text-5xl">
          {portafolio.titulo || `Selección para ${primerNombre}`}
        </h1>
        {portafolio.mensaje_personal && (
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[#6B7B9E]">
            {portafolio.mensaje_personal}
          </p>
        )}
        <p className="mt-7 text-xs text-[#3A4560]">
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
              className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.04] shadow-[0_40px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(0,212,255,0.06)] backdrop-blur-[20px]"
            >
              <Carrusel imagenes={imgs} alt={p.titulo ?? "Propiedad"} />

              <div className="p-6">
                <p className="grad-acento-texto font-display text-3xl font-bold tracking-tight">
                  {formatoCOP(p.precio)}
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#F0F4FF]">
                  {p.titulo || "Propiedad"}
                </h2>
                {(p.barrio || p.ciudad) && (
                  <p className="mt-0.5 text-sm text-[#6B7B9E]">
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
                      <div key={d.u} className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-2 py-3">
                        <p className="text-sm font-semibold text-[#F0F4FF]">{d.v}</p>
                        <p className="text-[11px] text-[#3A4560]">{d.u}</p>
                      </div>
                    ))}
                </div>

                {p.nota && (
                  <p className="mt-5 rounded-xl border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.08)] px-4 py-3 text-sm italic text-[#00D4FF]">
                    ✦ {p.nota}
                  </p>
                )}

                {p.descripcion && (
                  <p className="mt-5 text-sm leading-relaxed text-[#6B7B9E]">
                    {p.descripcion}
                  </p>
                )}

                {amenidades.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {amenidades.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#6B7B9E]"
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
                      className="col-span-2 rounded-full py-3.5 text-center font-display text-sm font-semibold text-[#020617] shadow-[0_0_15px_rgba(0,212,255,0.15)] transition-all duration-[400ms] hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]" style={{ background: "linear-gradient(135deg, #00D4FF, #0EA5E9)" }}
                    >
                      Me interesa — hablar por WhatsApp
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/[0.08] py-3 text-center text-sm text-[#F0F4FF] transition hover:border-[#00D4FF]/40 hover:bg-[rgba(0,212,255,0.08)]"
                  >
                    📍 Ubicación
                  </a>
                  {p.url_original ? (
                    <a
                      href={p.url_original}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-white/[0.08] py-3 text-center text-sm text-[#F0F4FF] transition hover:border-[#00D4FF]/40 hover:bg-[rgba(0,212,255,0.08)]"
                    >
                      Anuncio original ↗
                    </a>
                  ) : (
                    <span className="rounded-xl border border-white/[0.04] py-3 text-center text-sm text-white/15">
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
        <p className="font-display text-lg font-semibold text-[#F0F4FF]">{APP.marca}</p>
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-medium text-[#F0F4FF] backdrop-blur transition hover:border-[#00D4FF]/40 hover:bg-[rgba(0,212,255,0.1)]"
          >
            Escribirme por WhatsApp
          </a>
        )}
        <p className="mt-6 text-[11px] text-[#3A4560]">
          Este portafolio es privado y fue preparado exclusivamente para{" "}
          {portafolio.cliente_nombre ?? "ti"}.
        </p>
      </footer>
    </main>
  );
}

function Envoltura({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#06080F]">
      {children}
    </main>
  );
}
