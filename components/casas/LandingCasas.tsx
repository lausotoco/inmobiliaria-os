"use client";

/* ============================================================
   KYRELO — Landing de captación de compradores
   Ruta: /casas/[municipio] · Plantilla única para los 7 municipios
   ------------------------------------------------------------
   Objetivo: que un comprador que llega de un anuncio deje su
   requerimiento y termine en WhatsApp en menos de 60 segundos.
   El bloque principal (antetítulo + titular + subtítulo +
   formulario) DEBE caber en 390x844 sin scroll.

   Estética heredada de la home: grafito #1A1A18 + cobre #B87333
   sobre hueso #F1EFE8. Fraunces (titulares) · Inter (cuerpo).
   ============================================================ */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { APP } from "@/lib/config";
import { normalizarTelefono } from "@/lib/telefono";
import { obtenerAtribucion, calcularRefCode } from "@/lib/atribucion";
import { construirMensaje, enlaceWhatsApp } from "@/lib/mensaje-whatsapp";
import {
  antetitulo,
  titular,
  mostrarBloqueCredito,
  OPCIONES_MUNICIPIO,
  OPCIONES_PRESUPUESTO,
  OPCIONES_TIPO,
  OPCIONES_PLAZO,
  type Municipio,
} from "@/lib/municipios";

/* ── Paleta de marca (misma que la home) ── */
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
  cobreSuave: "#EBDBC8", // --cobre-suave de globals.css
  rojo: "#8E3B31", // rojo apagado de la marca, solo para errores
};

/* Eventos a GTM. Si el contenedor no está cargado, no rompe nada. */
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
function empujar(evento: string, datos: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: evento, ...datos });
}

/* Enlace de WhatsApp con mensaje pre-armado. Siempre wa.me. */
const wa = (msg: string) =>
  `https://wa.me/${APP.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

const SUBTITULO =
  "Tú no recorres 400 anuncios. Nos dices qué necesitas, publicamos tu requerimiento en nuestra red de brokers de la Sabana, y te presentamos solo lo que existe de verdad — incluyendo propiedades que no están en ningún portal.";

/* ── Fondo decorativo: constelación estática ──────────────────
   La home usa un canvas animado (RedDeNodos). Aquí va una versión
   estática en SVG: mismo lenguaje visual, cero CPU, no compromete
   el LCP en 4G ni gasta batería en móvil. */
function FondoConstelacion() {
  const puntos = [
    [8, 18], [22, 9], [34, 26], [17, 38], [46, 14], [58, 31],
    [71, 11], [83, 27], [92, 44], [65, 48], [40, 55], [12, 60],
    [27, 72], [52, 78], [78, 66], [90, 82], [61, 90], [33, 88],
  ];
  const lineas = [
    [0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15],
    [13, 16], [16, 17], [3, 10],
  ];
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke={C.linea} strokeWidth="0.12">
        {lineas.map(([a, b], i) => (
          <line
            key={i}
            x1={puntos[a][0]}
            y1={puntos[a][1]}
            x2={puntos[b][0]}
            y2={puntos[b][1]}
          />
        ))}
      </g>
      {puntos.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 7 === 0 ? 0.42 : 0.26}
          fill={i % 7 === 0 ? C.cobre : "#CFC9BB"}
        />
      ))}
    </svg>
  );
}

/* ── Encabezado: solo el logo. Ninguna salida más. ─────────── */
function Encabezado() {
  return (
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
        <span className="font-display text-[16px] sm:text-[18px]" style={{ letterSpacing: "0.04em" }}>
          KYRELO
        </span>
      </a>
    </header>
  );
}

/* ── Campo del formulario (select o teléfono) ──────────────── */
function Campo({
  id,
  etiqueta,
  valor,
  opciones,
  placeholder,
  error,
  onChange,
  onBlur,
  tipo = "select",
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones?: string[];
  placeholder: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  tipo?: "select" | "tel";
}) {
  const idError = `${id}-error`;
  const borde = error ? C.rojo : C.linea;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[9px] font-semibold uppercase leading-tight"
        style={{ color: C.piedra, letterSpacing: "0.13em" }}
      >
        {etiqueta}
      </label>

      {tipo === "select" ? (
        <select
          id={id}
          name={id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? idError : undefined}
          className="mt-1 h-11 w-full appearance-none border-b bg-transparent text-[13px] outline-none transition-colors focus:border-[#1A1A18] sm:text-[14px]"
          style={{ borderColor: borde, color: valor ? C.grafito : C.piedra }}
        >
          <option value="">{placeholder}</option>
          {(opciones ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={placeholder}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? idError : undefined}
          className="mt-1 h-11 w-full border-b bg-transparent text-[13px] outline-none transition-colors focus:border-[#1A1A18] sm:text-[14px]"
          style={{ borderColor: borde, color: C.grafito }}
        />
      )}

      <p
        id={idError}
        aria-live="polite"
        className="mt-1 text-[10.5px] leading-tight"
        style={{ color: C.rojo, minHeight: error ? undefined : 0 }}
      >
        {error ?? ""}
      </p>
    </div>
  );
}

/* ── Formulario ────────────────────────────────────────────── */

type Campos = {
  municipio: string;
  presupuesto: string;
  tipo: string;
  plazo: string;
  telefono: string;
};

const FALTA = "Falta este dato.";

function Formulario({ municipio }: { municipio: Municipio }) {
  const inicial: Campos = {
    municipio: municipio.prellenado,
    presupuesto: "",
    tipo: "",
    plazo: "",
    telefono: "",
  };

  const [form, setForm] = useState<Campos>(inicial);
  const [autoriza, setAutoriza] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const empezado = useRef(false);
  /* Candado SÍNCRONO contra el doble clic. Con useState no basta:
     React actualiza el estado después, y dos clics seguidos alcanzan
     a ver enviando=false los dos. Con un ref el segundo clic ya lo ve. */
  const enviandoRef = useRef(false);

  /* Al volver con el botón "atrás" desde /gracias, el navegador puede
     restaurar la página desde su caché con los datos escritos. Se limpia. */
  useEffect(() => {
    const alVolver = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setForm(inicial);
      setAutoriza(false);
      setErrores({});
      setEnviando(false);
      setErrorServidor(null);
    };
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = (k: keyof Campos) => (v: string) => {
    if (!empezado.current) {
      empezado.current = true;
      empujar("form_start", { municipio_landing: municipio.slug });
    }
    setForm((f) => ({ ...f, [k]: v }));
    // Al corregir, el error desaparece de inmediato.
    setErrores((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  /* Se valida al SALIR del campo, no en cada tecla. */
  const validarCampo = (k: keyof Campos) => () => {
    setErrores((e) => ({ ...e, [k]: mensajeDeError(k, form[k]) }));
  };

  function mensajeDeError(k: keyof Campos, v: string): string | undefined {
    if (k === "telefono") {
      if (!v.trim()) return FALTA;
      const r = normalizarTelefono(v);
      return r.ok ? undefined : r.error;
    }
    return v ? undefined : FALTA;
  }

  function validarTodo(): boolean {
    const nuevos: Partial<Record<keyof Campos, string>> = {};
    (Object.keys(form) as (keyof Campos)[]).forEach((k) => {
      const m = mensajeDeError(k, form[k]);
      if (m) nuevos[k] = m;
    });
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function enviar() {
    if (enviandoRef.current) return; // doble clic: un solo lead
    setErrorServidor(null);
    if (!validarTodo()) return;

    enviandoRef.current = true;
    setEnviando(true);

    const atribucion = obtenerAtribucion();
    const refCode = calcularRefCode(atribucion.canal, municipio.slug);

    // Si el servidor se demora, no dejamos al comprador esperando.
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 10000);

    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: control.signal,
        body: JSON.stringify({
          ...form,
          autorizacion: autoriza,
          atribucion,
          canal: atribucion.canal,
          refCode,
        }),
      });
      clearTimeout(reloj);

      const cuerpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(cuerpo?.mensaje || "Error del servidor");

      empujar("form_submit_ok", {
        municipio: form.municipio,
        presupuesto: form.presupuesto,
        plazo: form.plazo,
        canal: atribucion.canal,
        ref_code: refCode,
      });

      const mensaje = construirMensaje({ ...form, refCode });
      // window.location.href, no window.open: los bloqueadores de
      // ventanas emergentes cancelan window.open.
      window.location.href = `/gracias?wa=${encodeURIComponent(mensaje)}`;
    } catch (e: any) {
      clearTimeout(reloj);
      const mensaje =
        e?.name === "AbortError"
          ? "No pudimos guardar tu requerimiento."
          : e?.message || "No pudimos guardar tu requerimiento.";
      empujar("form_submit_error", { mensaje_error: mensaje });
      setErrorServidor(mensaje);
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const listo = autoriza && !enviando;

  return (
    <div
      id="formulario"
      className="ky-card rounded-2xl border bg-white p-4 sm:p-6"
      style={{ borderColor: C.linea, boxShadow: "0 12px 32px -24px rgba(26,26,24,0.20)" }}
    >
      <div className="grid grid-cols-2 gap-x-4">
        <Campo
          id="municipio"
          etiqueta="¿En qué municipio buscas?"
          valor={form.municipio}
          opciones={OPCIONES_MUNICIPIO}
          placeholder="Selecciona un municipio"
          error={errores.municipio}
          onChange={cambiar("municipio")}
          onBlur={validarCampo("municipio")}
        />
        <Campo
          id="presupuesto"
          etiqueta="¿Cuál es tu presupuesto?"
          valor={form.presupuesto}
          opciones={OPCIONES_PRESUPUESTO}
          placeholder="Selecciona un rango"
          error={errores.presupuesto}
          onChange={cambiar("presupuesto")}
          onBlur={validarCampo("presupuesto")}
        />
        <Campo
          id="tipo"
          etiqueta="¿Qué tipo de casa buscas?"
          valor={form.tipo}
          opciones={OPCIONES_TIPO}
          placeholder="Selecciona una opción"
          error={errores.tipo}
          onChange={cambiar("tipo")}
          onBlur={validarCampo("tipo")}
        />
        <Campo
          id="plazo"
          etiqueta="¿Para cuándo quieres estar viviendo ahí?"
          valor={form.plazo}
          opciones={OPCIONES_PLAZO}
          placeholder="Selecciona un plazo"
          error={errores.plazo}
          onChange={cambiar("plazo")}
          onBlur={validarCampo("plazo")}
        />
      </div>

      <Campo
        id="telefono"
        tipo="tel"
        etiqueta="WhatsApp"
        valor={form.telefono}
        placeholder="300 123 4567"
        error={errores.telefono}
        onChange={cambiar("telefono")}
        onBlur={validarCampo("telefono")}
      />

      <label className="mt-2 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={autoriza}
          onChange={(e) => setAutoriza(e.target.checked)}
          className="mt-[2px] h-4 w-4 shrink-0 accent-[#1A1A18]"
        />
        <span className="ky-legal text-[10px] leading-[1.45]" style={{ color: C.piedra }}>
          Autorizo a KYRELO el tratamiento de mis datos personales para contactarme por
          WhatsApp, teléfono o correo, entender mi requerimiento de vivienda, y publicarlo
          de forma anónima ante brokers, inmobiliarias y constructoras aliadas con el fin
          de que me presenten propiedades que se ajusten a lo que busco. Conozco la{" "}
          <a
            href="/politica-de-datos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: C.grafito }}
          >
            Política de Tratamiento de Datos
          </a>{" "}
          y mis derechos a conocer, actualizar, rectificar y suprimir mis datos.
        </span>
      </label>

      {!autoriza && (
        <p className="mt-1.5 pl-[26px] text-[10px]" style={{ color: C.piedra }}>
          Marca la casilla para poder contactarte.
        </p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={!listo}
        aria-describedby="estado-envio"
        className="mt-3 h-11 w-full rounded-full text-[14px] font-semibold text-white transition-opacity"
        style={{
          background: C.cobreTexto,
          opacity: listo ? 1 : 0.45,
          cursor: listo ? "pointer" : "not-allowed",
        }}
      >
        {enviando ? "Un momento…" : "Hablemos por WhatsApp"}
      </button>

      {/* Lo primero que se pregunta un comprador, en el momento exacto
          en que decide. Pastilla en cobre suave para que no se lea como
          una nota al pie más. */}
      <div className="mt-2.5 text-center">
        <span
          id="estado-envio"
          aria-live="polite"
          className={
            errorServidor
              ? "block text-[11px] leading-tight"
              : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold leading-tight"
          }
          style={
            errorServidor
              ? { color: C.rojo }
              : { background: C.cobreSuave, color: C.grafito }
          }
        >
          {errorServidor ? (
            "No pudimos guardar tu requerimiento. Escríbenos directamente por WhatsApp:"
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 8.5 L6.5 12 L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sin ningún costo para ti
            </>
          )}
        </span>
      </div>

      {errorServidor && (
        <a
          href={enlaceWhatsApp(
            construirMensaje({
              ...form,
              refCode: calcularRefCode(obtenerAtribucion().canal, municipio.slug),
            })
          )}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => empujar("whatsapp_click", { origen: "error" })}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-full border text-[14px] font-semibold"
          style={{ borderColor: C.grafito, color: C.grafito }}
        >
          Escribir por WhatsApp
        </a>
      )}
    </div>
  );
}


/* ── Tres razones ──────────────────────────────────────────── */
const RAZONES_BASE: [string, string][] = [
  [
    "Te respondemos en menos de 5 minutos",
    "Nada de formularios que caen en el vacío. Nos escribes y hablamos hoy mismo.",
  ],
];
const RAZON_CREDITO: [string, string] = [
  "Te decimos con cuánto puedes comprar realmente",
  "Antes de mostrarte casas, te ayudamos a saber qué te aprueba un banco. Sin costo.",
];
const RAZON_ALTERNA: [string, string] = [
  "Trabajamos con pocos compradores a la vez",
  "Por eso encontramos lo que otros no ven.",
];
const RAZON_FINAL: [string, string] = [
  "Solo te mostramos lo que existe",
  "Verificamos precio, disponibilidad y estado jurídico antes de que salgas de tu casa.",
];

function TresRazones() {
  const razones = [
    ...RAZONES_BASE,
    mostrarBloqueCredito ? RAZON_CREDITO : RAZON_ALTERNA,
    RAZON_FINAL,
  ];
  return (
    <section id="razones" className="border-t px-5 py-14 sm:px-10 sm:py-20" style={{ borderColor: C.linea }}>
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3 sm:gap-6">
        {razones.map(([titulo, texto]) => (
          <div
            key={titulo}
            className="tarjeta-viva rounded-2xl p-5 sm:p-6"
            style={{ borderColor: C.linea }}
          >
            <h3 className="text-[15px] font-semibold leading-snug" style={{ letterSpacing: "-0.01em" }}>
              {titulo}
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.65]" style={{ color: C.piedra }}>
              {texto}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Cómo funciona: mismo componente de pasos que la home ──── */
const PASOS: [string, string][] = [
  [
    "Nos dices qué buscas",
    "Sesenta segundos, sin registro y sin crear ninguna cuenta.",
  ],
  [
    "Hablamos quince minutos por videollamada",
    "Entendemos el detalle de lo que necesitas y tu presupuesto real.",
  ],
  [
    "Publicamos tu requerimiento de forma anónima",
    "Los brokers de la Sabana nos presentan lo que tienen. Tu nombre y tus datos nunca se publican.",
  ],
  [
    "Visitas solo lo que sí te sirve",
    "Y te acompañamos hasta la firma de la escritura, sin que tengas que pagarnos nada.",
  ],
];

function ComoFunciona() {
  return (
    <section id="como-funciona" className="border-t px-5 py-16 sm:px-10 sm:py-24" style={{ borderColor: C.linea }}>
      <div className="mx-auto max-w-3xl">
        <p
          className="text-[11px] font-semibold uppercase"
          style={{ color: C.cobreTexto, letterSpacing: "0.26em" }}
        >
          Cómo funciona
        </p>
        <h2
          className="font-display mt-4 text-[28px] leading-[1.1] sm:text-[40px]"
          style={{ letterSpacing: "-0.025em" }}
        >
          Del requerimiento a las llaves, en cuatro pasos.
        </h2>

        <div className="mt-10">
          {PASOS.map(([titulo, texto], i) => (
            <div
              key={titulo}
              className="flex gap-5 border-t py-6 sm:gap-6 sm:py-8"
              style={{ borderColor: C.linea }}
            >
              <span
                className="font-display shrink-0 text-[24px] leading-none sm:text-[26px]"
                style={{ color: C.cobre, letterSpacing: "-0.02em", minWidth: "2.2rem" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[16px] font-semibold sm:text-[18px]" style={{ letterSpacing: "-0.01em" }}>
                  {titulo}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.7] sm:text-[15px]" style={{ color: C.piedra }}>
                  {texto}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Cierre: vuelve al mismo formulario, no crea uno nuevo ─── */
function Cierre() {
  const irAlFormulario = () => {
    const el = document.getElementById("formulario");
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.querySelector("select")?.focus({ preventScroll: true });
  };
  return (
    <section id="empezamos" className="border-t px-5 py-16 text-center sm:px-10 sm:py-24" style={{ borderColor: C.linea }}>
      <h2 className="font-display text-[32px] leading-[1.05] sm:text-[46px]" style={{ letterSpacing: "-0.03em" }}>
        ¿Empezamos?
      </h2>
      <p className="mx-auto mt-4 max-w-sm text-[14px] leading-[1.6]" style={{ color: C.piedra }}>
        Sesenta segundos, sin registro y{" "}
        <strong className="font-semibold" style={{ color: C.grafito }}>
          sin ningún costo para ti
        </strong>
        .
      </p>
      <button
        type="button"
        onClick={irAlFormulario}
        className="mt-7 inline-flex h-12 items-center justify-center rounded-full px-8 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
        style={{ background: C.cobreTexto }}
      >
        Contarles qué busco
      </button>
    </section>
  );
}

/* ── WhatsApp flotante ─────────────────────────────────────
   En móvil se oculta mientras el formulario está en pantalla:
   no puede taparle el botón al comprador. */
function WhatsAppFlotante({ municipio }: { municipio: Municipio }) {
  const [tapado, setTapado] = useState(true);
  useEffect(() => {
    // Se esconde mientras haya un botón de acción en pantalla:
    // el formulario del bloque principal o el CTA de cierre.
    const objetivos = ["formulario", "empezamos"]
      .map((id) => document.getElementById(id))
      .filter((e): e is HTMLElement => !!e);
    if (!objetivos.length || typeof IntersectionObserver === "undefined") {
      setTapado(false);
      return;
    }
    const visibles = new Set<Element>();
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) =>
          e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)
        );
        setTapado(visibles.size > 0);
      },
      { threshold: 0.25 }
    );
    objetivos.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, []);

  const donde = municipio.prellenado || "la Sabana Norte";
  const mensaje = `Hola, vi el anuncio y estoy buscando casa en ${donde}.`;

  return (
    <a
      href={wa(mensaje)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => empujar("whatsapp_click", { origen: "flotante" })}
      aria-label="Escribirnos por WhatsApp"
      className={`fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full px-5 text-[13px] font-semibold text-white transition-all duration-300 ${
        tapado ? "pointer-events-none translate-y-3 opacity-0 sm:pointer-events-auto sm:translate-y-0 sm:opacity-100" : "opacity-100"
      }`}
      style={{ background: C.grafito, minWidth: 44 }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.2 1.26-1.96 1.42-.52.11-1.2.2-3.5-.75-2.94-1.22-4.83-4.2-4.98-4.4-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.14 1.02-2.43.24-.26.53-.33.71-.33.18 0 .35 0 .51.01.16.01.38-.06.6.46.23.55.77 1.9.84 2.04.07.14.11.3.02.49-.09.2-.14.32-.27.49-.14.16-.29.36-.41.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.2.69-.81.88-1.08.18-.28.37-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.34Z" />
      </svg>
      WhatsApp
    </a>
  );
}

/* ── Pie mínimo ────────────────────────────────────────────── */
function Pie() {
  return (
    <footer
      className="flex flex-col gap-5 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-10"
      style={{ background: C.grafito }}
    >
      <div className="flex items-center gap-2.5">
        <Image src="/kyrelo-isotipo.png" alt="" width={64} height={64} className="h-7 w-7 rounded-[6px]" />
        <span className="font-display text-[15px] text-white" style={{ letterSpacing: "0.04em" }}>
          KYRELO
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]">
        <a href="/politica-de-datos" className="hover:opacity-70" style={{ color: "rgba(255,255,255,0.72)" }}>
          Política de datos
        </a>
        <a href="/verificacion" className="hover:opacity-70" style={{ color: "rgba(255,255,255,0.72)" }}>
          Cómo verificamos
        </a>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>© {new Date().getFullYear()} KYRELO</span>
      </div>
    </footer>
  );
}

/* ════════════════ PÁGINA ════════════════ */
export default function LandingCasas({ municipio }: { municipio: Municipio }) {
  return (
    <main className="min-h-screen" style={{ background: C.hueso, color: C.grafito }}>
      {/* En pantallas bajitas (Androids de 360x780 y similares) el bloque
          principal se aprieta para que el formulario siga cabiendo sin
          scroll. Las áreas táctiles se quedan en 44px: eso no se toca. */}
      <style>{`
        @media (max-height: 830px) and (max-width: 640px) {
          .ky-ante { font-size: 9px; letter-spacing: 0.18em; }
          .ky-h1 { font-size: 25px; margin-top: 8px; }
          .ky-sub { font-size: 11.5px; line-height: 1.42; margin-top: 8px; }
          .ky-card { padding: 12px; }
          .ky-card .ky-legal { font-size: 9.5px; line-height: 1.4; }
        }
        @media (max-height: 760px) and (max-width: 640px) {
          .ky-h1 { font-size: 22px; }
          .ky-sub { font-size: 11px; }
          .ky-grid { gap: 12px; }
        }
        /* iPhone SE / 8 y equivalentes: 667px de alto */
        @media (max-height: 700px) and (max-width: 640px) {
          .ky-ante { font-size: 8.5px; }
          .ky-h1 { font-size: 20px; margin-top: 6px; }
          .ky-sub { font-size: 10.5px; line-height: 1.38; margin-top: 6px; }
          .ky-card { padding: 10px; }
          .ky-card .ky-legal { font-size: 9px; line-height: 1.35; }
          .ky-grid { gap: 8px; }
        }
      `}</style>
      {/* ── BLOQUE PRINCIPAL: cabe completo en 390x844 ── */}
      <div className="relative flex min-h-[100svh] flex-col overflow-hidden">
        <FondoConstelacion />
        <div className="relative z-10 flex min-h-[100svh] flex-col">
          <Encabezado />

          <section className="flex flex-1 items-center px-5 pb-5 sm:px-10 sm:pb-10">
            <div className="ky-grid mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1fr_460px] lg:items-center lg:gap-14">
              <div>
                <p
                  className="ky-ante text-[10px] font-semibold uppercase sm:text-[11px]"
                  style={{ color: C.cobreTexto, letterSpacing: "0.24em" }}
                >
                  {antetitulo(municipio)}
                </p>
                <h1
                  className="ky-h1 font-display mt-3 text-[30px] leading-[1.06] sm:text-[44px] lg:text-[52px]"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {titular(municipio)}
                </h1>
                <p
                  className="ky-sub mt-3 max-w-xl text-[12.5px] leading-[1.55] sm:mt-5 sm:text-[15px] sm:leading-[1.7]"
                  style={{ color: C.piedra }}
                >
                  {SUBTITULO}{" "}
                  <strong className="font-semibold" style={{ color: C.grafito }}>
                    Todo esto, sin que tengas que pagarnos nada.
                  </strong>
                </p>
              </div>

              <Formulario municipio={municipio} />
            </div>
          </section>
        </div>
      </div>

      <TresRazones />
      <ComoFunciona />
      <Cierre />
      <Pie />
      <WhatsAppFlotante municipio={municipio} />
    </main>
  );
}
