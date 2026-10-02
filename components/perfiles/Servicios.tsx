"use client";

/* ============================================================
   Servicios de un perfil, interactivos:
   · «¿Qué necesitas hoy?»: cada necesidad abre el servicio que le sirve.
   · Pestañas de servicios (cada una con su marca y su logo).
   · Panel: qué es, qué recibes, cómo funciona, cómo se gana o se
     paga (solo en su pestaña) y el botón de acción.
   · A la derecha: datos reales de la plataforma (requerimientos o
     inmuebles) o el armador del plan (solo cantidades, sin precios;
     el resumen viaja por WhatsApp para cotizar).
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { C, LogoMarca, wa } from "@/components/sitio/marca";
import type { Perfil, Pieza, Servicio } from "@/lib/perfiles";

const serif = { fontFamily: '"Fraunces", Georgia, serif' };
const NOMBRE_MARCA = { inmobiliaria: "KYRELO Inmobiliaria", plataforma: "KYRELO Plataforma", marketing: "KYRELO Marketing" } as const;

/* ── Datos reales ─────────────────────────────────────────── */
const millones = (n?: number | null) => (n == null ? null : `$${Math.round(Number(n) / 1_000_000).toLocaleString("es-CO")} M`);
function rangoM(a?: number | null, b?: number | null) {
  const x = millones(a), y = millones(b);
  if (x && y) return `${x} – ${y}`;
  if (y) return `Hasta ${y}`;
  if (x) return `Desde ${x}`;
  return "Presupuesto confirmado";
}
const pesos = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");

function EnVivo({ tipo, titulo }: { tipo: NonNullable<Servicio["vivo"]>; titulo?: string }) {
  const [items, setItems] = useState<any[] | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  useEffect(() => {
    const sb = createClient();
    const rpc = tipo === "requerimientos" ? "marketplace_publico" : tipo === "inmuebles" ? "inmuebles_kyrelo_publico" : "captaciones_publicas";
    sb.rpc(rpc).then(({ data }) => setItems(Array.isArray(data) ? data : []));
  }, [tipo]);
  const sb = createClient();
  const foto = (ruta?: string | null) => (ruta ? sb.storage.from("propiedades").getPublicUrl(ruta).data.publicUrl : null);

  return (
    <div className="rounded-3xl p-5 sm:p-6" style={{ background: C.grafito, color: C.hueso }}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase" style={{ color: "#D9A36A", letterSpacing: "0.2em" }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: C.cobre }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: C.cobre }} />
          </span>
          {titulo ?? "En vivo"}
        </p>
        <span className="text-[11px]" style={{ color: "rgba(241,239,232,.55)" }}>Datos reales de la plataforma</span>
      </div>

      {items === null && <p className="mt-6 text-[13px]" style={{ color: "rgba(241,239,232,.6)" }}>Cargando…</p>}
      {items !== null && items.length === 0 && (
        <p className="mt-6 text-[14px] leading-relaxed" style={{ color: "rgba(241,239,232,.75)" }}>
          Se publican nuevos cada semana. Escríbenos y te avisamos cuando entre uno que encaje.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {tipo === "requerimientos" &&
          items?.slice(0, 3).map((t, i) => (
            <div key={t.id ?? i} className="pf-vivo rounded-2xl p-4" style={{ background: "rgba(241,239,232,.06)", border: "1px solid rgba(241,239,232,.12)", animationDelay: `${i * 120}ms` }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9.5px] font-semibold uppercase" style={{ color: "#D9A36A", letterSpacing: "0.16em" }}>Comprador verificado</p>
                {t.codigo && <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "rgba(241,239,232,.1)" }}>#{t.codigo}</span>}
              </div>
              <p className="mt-1.5 text-[19px] leading-tight" style={serif}>{rangoM(t.presupuesto_min, t.presupuesto_max)}</p>
              <p className="mt-1 text-[12.5px] capitalize" style={{ color: "rgba(241,239,232,.7)" }}>
                {[t.tipo, t.ciudad, t.plazo].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}

        {tipo === "inmuebles" &&
          items?.slice(0, 2).map((i, k) => {
            const f = foto((i.fotos_preview ?? []).filter(Boolean)[0]);
            const parte = i.precio ? Number(i.precio) * (Number(i.comision_pct ?? 3) / 100) * Number(i.pct_comparte ?? 0.5) : null;
            return (
              <div key={i.id ?? k} className="pf-vivo flex gap-4 rounded-2xl p-3" style={{ background: "rgba(241,239,232,.06)", border: "1px solid rgba(241,239,232,.12)", animationDelay: `${k * 120}ms` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f ? <img src={f} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" /> : <div className="h-20 w-24 shrink-0 rounded-xl" style={{ background: "rgba(241,239,232,.08)" }} />}
                <div className="min-w-0">
                  <p className="text-[12px] capitalize" style={{ color: "rgba(241,239,232,.7)" }}>{[i.tipo, i.municipio].filter(Boolean).join(" · ")}</p>
                  <p className="text-[18px] leading-tight" style={serif}>{i.precio ? pesos(Number(i.precio)) : "Precio a consultar"}</p>
                  {parte && (
                    <p className="mt-1 text-[12.5px]">
                      <span style={{ color: "rgba(241,239,232,.65)" }}>Tu parte si cierras: </span>
                      <span className="font-semibold" style={{ color: "#D9A36A" }}>{pesos(parte)}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}

        {tipo === "catalogo" &&
          items?.slice(0, 2).map((p, k) => (
            <a key={p.slug ?? k} href={`/inmuebles/${p.slug}`} className="pf-vivo flex gap-4 rounded-2xl p-3 transition-colors hover:bg-white/10" style={{ background: "rgba(241,239,232,.06)", border: "1px solid rgba(241,239,232,.12)", animationDelay: `${k * 120}ms` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.imagen ? <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/propiedades/${p.imagen}`} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" /> : <div className="h-20 w-24 shrink-0 rounded-xl" style={{ background: "rgba(241,239,232,.08)" }} />}
              <div className="min-w-0">
                <p className="truncate text-[12px]" style={{ color: "rgba(241,239,232,.7)" }}>{[p.barrio, p.ciudad].filter(Boolean).join(" · ")}</p>
                <p className="text-[18px] leading-tight" style={serif}>{p.precio ? pesos(Number(p.precio)) : "Precio a consultar"}</p>
                <p className="mt-1 text-[12px]" style={{ color: "rgba(241,239,232,.65)" }}>
                  {[p.area ? `${p.area} m²` : null, p.habitaciones ? `${p.habitaciones} hab` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
            </a>
          ))}
      </div>
    </div>
  );
}

/* ── Armador del plan (solo cantidades) ──────────────────── */
const UNO: Record<string, string> = { reels: "reel", recorridos: "recorrido", piezas: "pieza", "campañas": "campaña", animaciones: "animación" };
function Armador({ piezas, quien }: { piezas: Pieza[]; quien: string }) {
  const [cant, setCant] = useState<Record<string, number>>(() => Object.fromEntries(piezas.map((p) => [p.id, p.cantidad])));
  const total = piezas.reduce((a, p) => a + cant[p.id], 0);
  const resumen = piezas.filter((p) => cant[p.id] > 0).map((p) => `${cant[p.id]} ${cant[p.id] === 1 ? (UNO[p.unidad] ?? p.unidad) : p.unidad}`);
  const frase = resumen.length > 1 ? `${resumen.slice(0, -1).join(", ")} y ${resumen[resumen.length - 1]}` : resumen[0] ?? "";
  const mensaje = `Hola KYRELO, soy ${quien}. Me interesa un plan de KYRELO Marketing con ${frase} al mes. ¿Me lo cotizan?`;

  return (
    <div className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: C.linea }}>
      <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.2em" }}>Arma tu plan del mes</p>
      <p className="mt-1 text-[13px]" style={{ color: C.piedra }}>Mueve las cantidades. Te lo cotizamos por mensaje.</p>
      <div className="mt-5 space-y-5">
        {piezas.map((p) => (
          <div key={p.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-medium">{p.nombre}</p>
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`Menos ${p.unidad}`} onClick={() => setCant((c) => ({ ...c, [p.id]: Math.max(p.min, c[p.id] - 1) }))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border text-[16px] transition-colors hover:border-[#B87333]" style={{ borderColor: C.linea }}>−</button>
                <span className="w-8 text-center text-[20px] tabular-nums" style={serif}>{cant[p.id]}</span>
                <button type="button" aria-label={`Más ${p.unidad}`} onClick={() => setCant((c) => ({ ...c, [p.id]: Math.min(p.max, c[p.id] + 1) }))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[16px] text-white transition-opacity hover:opacity-85" style={{ background: C.grafito }}>+</button>
              </div>
            </div>
            <input type="range" min={p.min} max={p.max} value={cant[p.id]} onChange={(e) => setCant((c) => ({ ...c, [p.id]: Number(e.target.value) }))}
              className="pf-rango mt-2 w-full" aria-label={p.nombre}
              style={{ background: `linear-gradient(90deg, ${C.cobre} ${((cant[p.id] - p.min) / (p.max - p.min)) * 100}%, #E6E1D6 0)` }} />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl p-4" style={{ background: C.hueso }}>
        <p className="text-[11px] font-semibold uppercase" style={{ color: C.piedra, letterSpacing: "0.16em" }}>Tu plan</p>
        <p className="mt-1 text-[16px] leading-snug" style={serif}>{total > 0 ? `${frase[0]?.toUpperCase()}${frase.slice(1)} al mes.` : "Elige al menos una pieza."}</p>
      </div>
      <a href={wa(mensaje)} target="_blank" rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center rounded-full px-6 py-3.5 text-[14.5px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: C.cobre }}>
        Cotizar este plan por WhatsApp
      </a>
    </div>
  );
}

/* ── Cómo funciona (pasos animados) ───────────────────────── */
function Pasos({ pasos, clave }: { pasos: string[]; clave: string }) {
  return (
    <ol key={clave} className="relative mt-3 space-y-0">
      <span className="pf-riel absolute bottom-4 left-[15px] top-4 w-[2px]" style={{ background: C.cobre }} />
      {pasos.map((p, i) => (
        <li key={p} className="pf-paso-i relative flex items-start gap-4 py-2" style={{ animationDelay: `${150 + i * 140}ms` }}>
          <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ background: C.cobre }}>{i + 1}</span>
          <span className="pt-1 text-[15px] leading-snug">{p}</span>
        </li>
      ))}
    </ol>
  );
}

function Panel({ s, perfil }: { s: Servicio; perfil: Perfil }) {
  const cta = s.cta.whatsapp !== undefined
    ? { href: wa(s.cta.whatsapp || `Hola KYRELO, soy ${perfil.quien} y quiero saber más de ${NOMBRE_MARCA[s.marca]}.`), target: "_blank", rel: "noopener noreferrer" }
    : { href: s.cta.href };
  return (
    <div key={s.id} className="pf-panel grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <div className="flex items-center gap-3">
          <LogoMarca marca={s.marca} className="h-11 w-11" />
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.2em" }}>{NOMBRE_MARCA[s.marca]}</p>
        </div>
        <h3 className="mt-5 text-[30px] leading-[1.1] sm:text-[38px]" style={{ ...serif, letterSpacing: "-0.02em" }}>{s.titulo}</h3>
        <p className="mt-4 text-[16px] leading-[1.7]" style={{ color: C.piedra }}>{s.texto}</p>

        <p className="mt-8 text-[11px] font-semibold uppercase" style={{ color: C.piedra, letterSpacing: "0.2em" }}>Lo que recibes</p>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {s.recibes.map((r, i) => (
            <li key={r} className="pf-item flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-[14px] leading-snug" style={{ borderColor: C.linea, animationDelay: `${100 + i * 70}ms` }}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: C.cobre }}>
                <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4L16 6" /></svg>
              </span>
              {r}
            </li>
          ))}
        </ul>

        {s.modelo && (
          <div className="mt-6 rounded-2xl border-l-4 px-5 py-4" style={{ borderColor: C.cobre, background: "#EAE5D9" }}>
            <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.2em" }}>{s.modelo.titulo}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed">{s.modelo.texto}</p>
          </div>
        )}

        {!s.armador && (
          <a {...cta} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: C.grafito }}>
            {s.cta.texto} <span style={{ color: "#D9A36A" }}>→</span>
          </a>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: C.linea }}>
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.2em" }}>Cómo funciona</p>
          <Pasos pasos={s.pasos} clave={s.id} />
        </div>
        {s.vivo && <EnVivo tipo={s.vivo} titulo={s.vivoTitulo} />}
        {s.armador && <Armador piezas={s.armador} quien={perfil.quien} />}
      </div>
    </div>
  );
}

export default function Servicios({ perfil }: { perfil: Perfil }) {
  const [activo, setActivo] = useState(perfil.servicios[0].id);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const s = perfil.servicios.find((x) => x.id === activo)!;

  function elegir(id: string, desplazar = false) {
    setActivo(id);
    if (desplazar) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <section id="servicios" className="scroll-mt-20 border-t px-6 py-20 sm:px-10 sm:py-24" style={{ borderColor: C.linea }}>
      <style>{`
        @keyframes pfEntra { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes pfRiel { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        .pf-panel { animation: pfEntra .55s cubic-bezier(.16,1,.3,1) both; }
        .pf-item, .pf-paso-i, .pf-vivo { animation: pfEntra .6s cubic-bezier(.16,1,.3,1) both; }
        .pf-riel { transform-origin: top; animation: pfRiel 1.1s cubic-bezier(.16,1,.3,1) both .1s; }
        .pf-tab { transition: background-color .3s ease, color .3s ease, border-color .3s ease, transform .3s ease; }
        .pf-tab:hover { transform: translateY(-2px); border-color: ${C.cobre}; }
        .pf-nec { transition: background-color .3s ease, color .3s ease, border-color .3s ease; }
        .pf-nec:hover { border-color: ${C.cobre}; }
        .pf-rango { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 99px; outline: none; }
        .pf-rango::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 2px solid ${C.cobre}; box-shadow: 0 4px 10px -4px rgba(26,26,24,.4); cursor: pointer; }
        .pf-rango::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid ${C.cobre}; cursor: pointer; }
        @media (prefers-reduced-motion: reduce) { .pf-panel, .pf-item, .pf-paso-i, .pf-vivo, .pf-riel { animation: none; } }
      `}</style>
      <div className="mx-auto max-w-6xl">
        {/* ¿Qué necesitas hoy? */}
        <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.26em" }}>Lo que KYRELO tiene para ti</p>
        <h2 className="mt-4 text-[32px] leading-[1.1] sm:text-[44px]" style={{ ...serif, letterSpacing: "-0.025em" }}>
          {perfil.servicios.length === 2 ? "Dos" : "Tres"} servicios. <i style={{ color: C.cobre }}>¿Qué necesitas hoy?</i>
        </h2>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {perfil.necesidades.map((n) => {
            const on = n.servicio === activo;
            return (
              <button key={n.texto} type="button" onClick={() => elegir(n.servicio, true)}
                className="pf-nec inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[14px] font-medium"
                style={{ borderColor: on ? C.cobre : C.linea, background: on ? C.cobre : "#fff", color: on ? "#fff" : C.grafito }}>
                «{n.texto}»
              </button>
            );
          })}
        </div>

        {/* Pestañas */}
        <div ref={panelRef} className={`mt-10 grid scroll-mt-24 gap-3 ${perfil.servicios.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`} role="tablist">
          {perfil.servicios.map((x, i) => {
            const on = x.id === activo;
            return (
              <button key={x.id} type="button" role="tab" aria-selected={on} onClick={() => elegir(x.id)}
                className="pf-tab flex items-center gap-4 rounded-2xl border p-4 text-left"
                style={{ borderColor: on ? C.grafito : C.linea, background: on ? C.grafito : "#fff", color: on ? C.hueso : C.grafito }}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: C.hueso }}>
                  <LogoMarca marca={x.marca} className="h-9 w-9" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase" style={{ color: on ? "#D9A36A" : C.cobre, letterSpacing: "0.16em" }}>Servicio {i + 1}</span>
                  <span className="mt-0.5 block text-[16px] font-semibold leading-snug">{x.nombre}</span>
                  <span className="block text-[12.5px]" style={{ color: on ? "rgba(241,239,232,.7)" : C.piedra }}>{x.corto}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <Panel s={s} perfil={perfil} />
        </div>
      </div>
    </section>
  );
}
