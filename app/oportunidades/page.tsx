'use client';

// app/oportunidades/page.tsx
// Página PÚBLICA (sin login): mismo buscador con imagen que /broker, pero
// en modo ver. Postular / crear cuenta / iniciar sesión llevan a /brokers.
// Lee de la función security-definer marketplace_publico().

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { APP } from '@/lib/config';

const ENTRADA = '/brokers'; // punto único de entrada (login + registro)

const formatoCOPfull = (n?: number | null) =>
  n == null ? null : '$' + Math.round(Number(n)).toLocaleString('es-CO');

function rangoPresupuestoFull(min?: number | null, max?: number | null) {
  const a = formatoCOPfull(min);
  const b = formatoCOPfull(max);
  if (a && b) return `${a} – ${b}`;
  if (b) return `Hasta ${b}`;
  if (a) return `Desde ${a}`;
  return 'Presupuesto por definir';
}

function rango(min?: number | null, max?: number | null, sufijo = '') {
  const a = min != null ? Math.round(Number(min)) : null;
  const b = max != null ? Math.round(Number(max)) : null;
  if (a != null && b != null) return `${a} – ${b}${sufijo}`;
  if (b != null) return `hasta ${b}${sufijo}`;
  if (a != null) return `desde ${a}${sufijo}`;
  return null;
}

const norm = (x: any) =>
  String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const FOTOS_TARJETAS = 5;
function imagenPara(codigo: string) {
  let h = 0;
  const c = String(codigo || '');
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) % 997;
  return `/requerimientos/${(h % FOTOS_TARJETAS) + 1}.jpg`;
}

const TIPOS = [
  { v: 'casa', l: 'Casa' },
  { v: 'apartamento', l: 'Apartamento' },
  { v: 'lote', l: 'Lote' },
];

function IconoTipo({ tipo }: { tipo?: string | null }) {
  const t = (tipo || '').toLowerCase();
  const pr = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (t.includes('apart') || t.includes('apto'))
    return (<svg className="w-[17px] h-[17px] text-[#B87333]" viewBox="0 0 24 24" {...pr}><rect x="6" y="3" width="12" height="18" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></svg>);
  if (t.includes('lote') || t.includes('terreno') || t.includes('finca'))
    return (<svg className="w-[17px] h-[17px] text-[#B87333]" viewBox="0 0 24 24" {...pr}><path d="M12 21c4-4.5 6-8 6-11a6 6 0 1 0-12 0c0 3 2 6.5 6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>);
  return (<svg className="w-[17px] h-[17px] text-[#B87333]" viewBox="0 0 24 24" {...pr}><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></svg>);
}

export default function Oportunidades() {
  const supabase = createClient();
  const [items, setItems] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [zonaFiltro, setZonaFiltro] = useState('');
  const [detalle, setDetalle] = useState<any | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.rpc('marketplace_publico').then(({ data }) => {
      setItems(Array.isArray(data) ? data : []);
      setCargando(false);
    });
  }, []); // eslint-disable-line

  const zonasDisponibles = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((t) => {
      [t.ciudad, ...(Array.isArray(t.zonas) ? t.zonas : [])].forEach((z: any) => {
        const k = norm(z);
        if (k && !m.has(k)) m.set(k, String(z).trim());
      });
    });
    return Array.from(m.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [items]);

  const resultados = useMemo(() => {
    return items.filter((t) => {
      if (tipoFiltro && norm(t.tipo) !== norm(tipoFiltro)) return false;
      if (zonaFiltro) {
        const enZonas = Array.isArray(t.zonas) && t.zonas.some((x: any) => norm(x) === norm(zonaFiltro));
        if (norm(t.ciudad) !== norm(zonaFiltro) && !enZonas) return false;
      }
      return true;
    });
  }, [items, tipoFiltro, zonaFiltro]);

  function irAResultados() {
    listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function verTodo() {
    setTipoFiltro('');
    setZonaFiltro('');
    irAResultados();
  }

  return (
    <div className="min-h-screen bg-[#F1EFE8]">
      {/* Header */}
      <header className="border-b border-[#E0DDD2] px-6 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight text-[#1A1A18]">{APP.nombre}</p>
            <p className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#A8A69E]">Red de brokers</p>
          </Link>
          <div className="flex items-center gap-3">
            <Link href={ENTRADA} className="text-[12px] text-[#5F5E5A] hover:text-[#1A1A18] transition">
              Iniciar sesión
            </Link>
            <Link href={ENTRADA} className="rounded-full bg-[#1A1A18] px-4 py-2 text-[12px] font-semibold text-[#F1EFE8] hover:opacity-85 transition">
              Únete como broker
            </Link>
          </div>
        </div>
      </header>

      {/* Hero con imagen + buscador (mismo look que /broker) */}
      <section className="relative bg-[#1A1A18] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: "url('/broker-hero.jpg')" }} />
        <div className="absolute inset-0 bg-[#1A1A18]/45" />
        <div className="relative mx-auto max-w-3xl px-8 py-14 text-center sm:py-20">
          <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#EBDBC8]">
            {APP.nombre} · Compradores activos
          </p>
          <h1 className="mb-2 text-3xl tracking-tight text-[#F1EFE8] sm:text-4xl">
            ¿Qué inmueble tienes?
          </h1>
          <p className="mb-8 text-sm text-[#F1EFE8]/80">
            Encuentra al comprador que ya lo está buscando
          </p>

          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.v}
                onClick={() => setTipoFiltro(tipoFiltro === t.v ? '' : t.v)}
                className={`rounded-full border px-5 py-2 text-[13px] transition-colors ${
                  tipoFiltro === t.v
                    ? 'border-[#F1EFE8] bg-[#F1EFE8] text-[#1A1A18]'
                    : 'border-[#F1EFE8]/40 bg-transparent text-[#F1EFE8] hover:border-[#F1EFE8]'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 pl-5">
            <svg className="h-4 w-4 shrink-0 text-[#5F5E5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <select
              className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-sm text-[#1A1A18] outline-none"
              value={zonaFiltro}
              onChange={(e) => setZonaFiltro(e.target.value)}
            >
              <option value="">¿En qué zona está? Todas las zonas</option>
              {zonasDisponibles.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <button
              onClick={irAResultados}
              className="shrink-0 rounded-full bg-[#1A1A18] px-6 py-2.5 text-sm text-[#F1EFE8] transition-opacity hover:opacity-80"
            >
              Buscar
            </button>
          </div>

          <button
            onClick={verTodo}
            className="mt-4 text-[12px] text-[#F1EFE8]/80 underline underline-offset-4 transition-colors hover:text-[#F1EFE8]"
          >
            o ver todos los requerimientos disponibles
          </button>
        </div>
      </section>

      <main ref={listaRef} className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        {cargando ? (
          <p className="py-10 text-center text-sm text-[#5F5E5A]">Cargando compradores…</p>
        ) : resultados.length === 0 ? (
          <VacioAlerta zona={zonaFiltro} />
        ) : (
          <>
            <p className="mb-5 text-[12px] text-[#5F5E5A]">
              {resultados.length} {resultados.length === 1 ? 'comprador' : 'compradores'}
              {zonaFiltro ? ` en ${zonaFiltro}` : ' activos'}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {resultados.map((t) => (
                <article key={t.id} className="overflow-hidden rounded-2xl border border-[#E0DDD2] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#CFC9BB]">
                  <div className="relative aspect-[4/3] bg-[#F1EFE8]">
                    <div className="absolute inset-0 flex items-center justify-center opacity-60"><IconoTipo tipo={t.tipo} /></div>
                    <img src={imagenPara(t.codigo)} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {t.urgencia && <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#993C1D]">{t.urgencia}</span>}
                      {t.tipo && <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium capitalize text-[#1A1A18]">{t.tipo}</span>}
                    </div>
                    <span className="absolute right-3 top-3 rounded-full bg-[#1A1A18]/75 px-2.5 py-1 text-[10px] text-[#F1EFE8]">#{t.codigo}</span>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#A8A69E]">Presupuesto del cliente</p>
                    <p className="mt-0.5 text-[16px] font-semibold leading-snug tracking-tight text-[#1A1A18]">{rangoPresupuestoFull(t.presupuesto_min, t.presupuesto_max)}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[#5F5E5A]">{[t.tipo, t.ciudad].filter(Boolean).join(' · ') || 'Comprador verificado'}</p>
                    <div className="mt-4 flex items-stretch border-y border-[#E0DDD2] py-2.5 text-center text-[12px] text-[#1A1A18]">
                      <div className="flex-1">{rango(t.area_min, t.area_max, ' m²') ?? '—'}</div>
                      <div className="flex-1 border-x border-[#E0DDD2]">{t.alcobas != null ? `${t.alcobas} alc.` : '—'}</div>
                      <div className="flex-1">{t.banos != null ? `${t.banos} baños` : '—'}</div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <button onClick={() => setDetalle(t)} className="text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18]">Ver detalles</button>
                      <Link href={ENTRADA} className="rounded-full bg-[#1A1A18] px-5 py-2.5 text-[13px] font-medium text-[#F1EFE8] transition-opacity hover:opacity-85">
                        Postular →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* Banner registro */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#EBDBC8] bg-[#F6EFE4] px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-[14px] font-semibold text-[#1A1A18]">Regístrate gratis para postular</p>
            <p className="mt-0.5 text-[12px] text-[#5F5E5A]">Ver es libre. Para enviar tu inmueble a un comprador, crea tu cuenta.</p>
          </div>
          <Link href={ENTRADA} className="shrink-0 rounded-full bg-[#B87333] px-6 py-2.5 text-[13px] font-semibold text-[#F1EFE8] hover:opacity-90 transition">
            Crear cuenta
          </Link>
        </div>
      </main>

      {/* Modal detalles */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A18]/40 px-6" onClick={() => setDetalle(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-7 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1EFE8]"><IconoTipo tipo={detalle.tipo} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#A8A69E]">Presupuesto del cliente</p>
                <p className="text-[16px] font-medium leading-snug tracking-tight text-[#1A1A18]">{rangoPresupuestoFull(detalle.presupuesto_min, detalle.presupuesto_max)}</p>
                <p className="text-[12px] text-[#5F5E5A]">{[detalle.tipo, detalle.ciudad, `#${detalle.codigo}`].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 border-y border-[#E0DDD2] py-4 text-center">
              <Spec etiqueta="Área" valor={rango(detalle.area_min, detalle.area_max, ' m²')} />
              <Spec etiqueta="Alcobas" valor={detalle.alcobas} />
              <Spec etiqueta="Baños" valor={detalle.banos} />
              <Spec etiqueta="Parqueaderos" valor={detalle.parqueaderos} />
              <Spec etiqueta="Barrio" valor={detalle.barrio} />
              <Spec etiqueta="Financiación" valor={detalle.financiacion} />
            </div>
            {Array.isArray(detalle.zonas) && detalle.zonas.length > 0 && (
              <div className="mt-4">
                <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">Zonas de interés</p>
                <p className="mt-1 text-[13px] text-[#1A1A18]">{detalle.zonas.join(', ')}</p>
              </div>
            )}
            {detalle.preferencias && (
              <div className="mt-4">
                <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">Lo que busca el cliente</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#1A1A18]">{detalle.preferencias}</p>
              </div>
            )}
            <Link href={ENTRADA} className="mt-6 block rounded-full bg-[#1A1A18] py-3 text-center text-[14px] font-medium text-[#F1EFE8] hover:opacity-85 transition">
              Tengo un inmueble para este comprador
            </Link>
            <p className="mt-2 text-center text-[11px] text-[#A8A69E]">Regístrate gratis para postular</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E0DDD2]">
        <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
          <p className="text-[14px] font-semibold tracking-tight text-[#1A1A18]" style={{ fontFamily: 'Fraunces, serif' }}>{APP.marca}</p>
          <p className="mt-1 text-[12px] text-[#5F5E5A]">Kyrelocorp · {APP.eslogan}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[#5F5E5A]">
            <a href={`https://wa.me/${APP.whatsapp}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#1A1A18]">WhatsApp +57 311 801 8295</a>
            <Link href="/legal/tratamiento-de-datos" className="underline underline-offset-4 hover:text-[#1A1A18]">Tratamiento de datos</Link>
            <Link href="/legal/terminos" className="underline underline-offset-4 hover:text-[#1A1A18]">Términos y condiciones</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Spec({ etiqueta, valor }: { etiqueta: string; valor: any }) {
  if (valor == null || valor === '') return null;
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">{etiqueta}</p>
      <p className="mt-0.5 text-[13px] text-[#1A1A18] tracking-tight">{valor}</p>
    </div>
  );
}

function VacioAlerta({ zona }: { zona: string }) {
  return (
    <div className="rounded-2xl border border-[#E0DDD2] bg-white px-6 py-12 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B87333]">Sin resultados por ahora</p>
      <p className="mt-3 text-[15px] font-semibold text-[#1A1A18]">
        {zona ? `No hay compradores en ${zona} ahora mismo` : 'No hay compradores con esos filtros'}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[#5F5E5A]">
        Llegan nuevos cada semana. Regístrate como broker y guarda esta búsqueda: te avisamos cuando entre un comprador que encaje.
      </p>
      <Link href="/brokers" className="mt-6 inline-block rounded-full bg-[#1A1A18] px-6 py-3 text-[13px] font-medium text-[#F1EFE8] hover:opacity-85 transition">
        Crear cuenta y guardar alerta
      </Link>
    </div>
  );
}
