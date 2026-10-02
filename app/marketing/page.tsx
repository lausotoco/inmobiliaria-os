import type { Metadata } from "next";
import { CabeceraSitio, PieSitio } from "@/components/sitio/Sitio";
import { C, LogoMarca, wa } from "@/components/sitio/marca";

/* ============================================================
   KYRELO Marketing (/marketing)
   Servicio pago: aquí NO se habla de "no cobramos nada" (eso es
   de la Plataforma), no se publican precios (se cotiza por
   mensaje) y no se promete vender ni "leads garantizados".
   ============================================================ */

export const metadata: Metadata = {
  title: "KYRELO Marketing · Reels, recorridos 3D y pauta inmobiliaria",
  description:
    "Reels editados, recorridos 3D y pauta para agentes, oficinas inmobiliarias y constructoras en Chía, Cajicá, Cota, Sopó y Bogotá norte.",
  robots: { index: true, follow: true },
};

const MSG = "Hola KYRELO, quiero agendar una reunión sobre KYRELO Marketing.";

const PUBLICOS = [
  {
    eb: "Para agentes",
    titulo: "Haz que tus inmuebles se vean mejor.",
    texto: "Editamos los videos que grabas con tu celular, hacemos recorridos animados y piezas para publicidad en redes.",
    video: "/reels/marketing-agentes",
  },
  {
    eb: "Para oficinas",
    titulo: "Tú eliges qué inmuebles impulsar.",
    texto: "Hacemos los videos y la publicidad de los inmuebles que elijas, y cuidamos la imagen de tu oficina.",
    video: "/reels/marketing-oficinas",
  },
  {
    eb: "Para constructoras",
    titulo: "Vende tu proyecto desde el plano.",
    texto: "Mostramos el lote y la torre en 3D, lanzamos la preventa en redes y hacemos el material de la sala de ventas.",
    video: null,
  },
];

const PASOS = [
  ["Nos reunimos 20 minutos", "Nos cuentas qué inmuebles o qué proyecto quieres vender."],
  ["Armamos tu plan", "Solo con lo que de verdad necesitas."],
  ["Tú grabas, nosotros editamos", "Hacemos los videos, los recorridos y la publicidad."],
  ["Te mostramos los resultados", "Cada mes ves cuántas personas lo vieron y cuántas te escribieron."],
];

export default function MarketingPage() {
  return (
    <main style={{ background: C.hueso, color: C.grafito, fontFamily: "Inter, system-ui, sans-serif" }} className="min-h-screen">
      <CabeceraSitio activa="/marketing" />

      {/* Hero */}
      <section className="px-6 pb-16 pt-20 sm:px-10 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <LogoMarca marca="marketing" className="h-14 w-14" />
            <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.28em" }}>
              KYRELO Marketing
            </p>
          </div>
          <h1
            className="mt-8 text-[42px] leading-[1.05] sm:text-[64px]"
            style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "-0.03em" }}
          >
            Los que más venden no saben más de ventas:{" "}
            <i style={{ color: C.cobre }}>presentan mejor.</i>
          </h1>
          <p className="mt-7 max-w-2xl text-[17px] leading-[1.7] sm:text-[19px]" style={{ color: C.piedra }}>
            Tú grabas con tu celular. Nosotros hacemos los videos, los recorridos y la publicidad de tus
            inmuebles. Para agentes, oficinas inmobiliarias y constructoras.
          </p>
          <a
            href={wa(MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center justify-center rounded-full px-8 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: C.cobre }}
          >
            Agenda una reunión
          </a>
        </div>
      </section>

      {/* Para quién */}
      <section className="border-t px-6 py-20 sm:px-10 sm:py-28" style={{ borderColor: C.linea }}>
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {PUBLICOS.map((p) => (
            <article key={p.eb} className="flex flex-col rounded-2xl border bg-white p-6 sm:p-7" style={{ borderColor: C.linea }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.cobre }}>
                {p.eb}
              </p>
              <h2 className="mt-3 text-[23px] leading-snug" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                {p.titulo}
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: C.piedra }}>
                {p.texto}
              </p>
              {p.video ? (
                <video
                  className="mt-6 aspect-[9/16] w-full rounded-xl bg-[#1A1A18] object-cover"
                  src={`${p.video}.mp4`}
                  poster={`${p.video}.jpg`}
                  controls
                  playsInline
                  preload="none"
                />
              ) : (
                <div
                  className="mt-6 flex aspect-[9/16] w-full flex-col items-center justify-center gap-5 rounded-xl"
                  style={{ background: C.grafito }}
                >
                  <LogoMarca marca="marketing" tinta={C.hueso} className="h-24 w-24" />
                  <p className="px-8 text-center text-[13px] leading-relaxed" style={{ color: "rgba(241,239,232,0.7)" }}>
                    Te mostramos ejemplos de lanzamiento en la reunión.
                  </p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section className="border-t px-6 py-20 sm:px-10 sm:py-28" style={{ borderColor: C.linea }}>
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>
            Cómo trabajamos
          </p>
          <h2
            className="mt-5 text-[32px] leading-[1.1] sm:text-[44px]"
            style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "-0.025em" }}
          >
            Cuatro pasos, cada mes.
          </h2>
          <div className="mt-12">
            {PASOS.map(([t, d], i) => (
              <div key={t} className="flex gap-6 border-t py-7" style={{ borderColor: C.linea }}>
                <span
                  className="shrink-0 text-[26px] leading-none"
                  style={{ fontFamily: '"Fraunces", Georgia, serif', color: C.cobre, minWidth: "2.2rem" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-[18px] font-semibold">{t}</h3>
                  <p className="mt-2 text-[15px] leading-[1.7]" style={{ color: C.piedra }}>
                    {d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Red de respaldo */}
      <section className="px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-5xl rounded-3xl p-8 sm:p-12" style={{ background: C.grafito, color: C.hueso }}>
          <p className="text-[11px] font-semibold uppercase" style={{ color: "#D9A36A", letterSpacing: "0.26em" }}>
            Red de respaldo KYRELO
          </p>
          <h2
            className="mt-5 max-w-2xl text-[28px] leading-[1.15] sm:text-[38px]"
            style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "-0.02em" }}
          >
            No pierdas a nadie que te escribe.
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-[1.75]" style={{ color: "rgba(241,239,232,0.75)" }}>
            Si te escribe alguien por tu publicidad y no tienes lo que busca, con tu permiso y el de esa persona
            se lo pasamos a la red de KYRELO. Si termina comprando, tu oficina también gana.
          </p>
        </div>
      </section>

      {/* Cierre */}
      <section className="border-t px-6 py-24 text-center sm:px-10" style={{ borderColor: C.linea }}>
        <h2
          className="mx-auto max-w-2xl text-[32px] leading-[1.12] sm:text-[46px]"
          style={{ fontFamily: '"Fraunces", Georgia, serif', letterSpacing: "-0.025em" }}
        >
          Cuéntanos qué quieres vender. <i style={{ color: C.cobre }}>Te ayudamos a que se vea mejor.</i>
        </h2>
        <a
          href={wa(MSG)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center justify-center rounded-full px-9 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: C.grafito }}
        >
          Agenda una reunión
        </a>
        <p className="mt-5 text-[13px]" style={{ color: C.piedra }}>
          Cada plan se arma a tu medida. Te enviamos el precio por WhatsApp.
        </p>
      </section>

      <PieSitio />
    </main>
  );
}
