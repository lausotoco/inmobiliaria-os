'use client';

// Tomas del inmueble, de dos formas:
//  · Un solo video del recorrido (la más fácil: el agente no corta nada; las
//    tomas se sacan al editar). Se sube en partes porque pesa más de 50 MB.
//  · Toma por toma, una casilla por espacio en el orden del recorrido.
//  · Solo fotos (7 oct 2026): para el agente que no tiene video; de 6 a 20 fotos
//    que se reducen en el celular antes de subir, y el video se arma con ellas.
// Todo se revisa en el celular antes de subir (orientación, calidad, duración,
// luz y movimiento) y sube directo a la carpeta privada, con su miniatura.

import { useRef, useState } from 'react';
import {
  BYTES_PARTE,
  CASILLAS,
  CASILLA_RECORRIDO,
  casillasDe,
  obligatoriasDe,
  mimeDe,
  MIMES_VIDEO,
  MINIMO_TOMAS,
  MAX_FOTOS,
  MIN_FOTOS,
  casillaFoto,
  esCasillaFoto,
  type TipoInmueble,
} from '@/lib/videos/config';
import { prepararFoto } from '@/lib/videos/fotos';
import { revisarToma } from '@/lib/videos/revision';
import { api, subirConAvance, subirEnPartes } from '@/lib/videos/subir';
import { GuiaGrabacion, ICONO_CASILLA, Icono } from '@/components/videos/ui';

export type Toma = {
  id: string;
  casilla: string;
  nombre_archivo: string | null;
  tamano: number | null;
  duracion: number | null;
  ancho: number | null;
  alto: number | null;
  revision: 'ok' | 'advertencia' | 'sin_revisar';
  observaciones: string[];
  miniatura?: string | null;
};

type Proceso = { fase: 'revisando' | 'subiendo' | 'guardando' | 'bloqueada' | 'error'; avance?: number; mensajes?: string[]; miniatura?: string | null };

function Anillo({ fraccion }: { fraccion: number }) {
  const r = 15.9;
  return (
    <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.max(2, fraccion * 100)} 100`} pathLength={100} />
    </svg>
  );
}

function Casilla({ videoId, casilla, obligatoria, toma, onCambio, compacta }: { videoId: string; casilla: string; obligatoria: boolean; toma?: Toma; onCambio: (casilla: string, toma: Toma | null) => void; compacta?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const info = CASILLAS[casilla];
  const ocupada = !!proceso && ['revisando', 'subiendo', 'guardando'].includes(proceso.fase);
  const fallo = proceso?.fase === 'bloqueada' || proceso?.fase === 'error';
  const miniatura = proceso?.miniatura ?? toma?.miniatura ?? null;

  async function elegir(archivo?: File) {
    if (input.current) input.current.value = '';
    if (!archivo) return;
    const mime = mimeDe(archivo.name, archivo.type);
    if (!MIMES_VIDEO.includes(mime)) {
      setProceso({ fase: 'bloqueada', mensajes: ['Ese archivo no es un video que podamos usar. Sube un MP4 o MOV desde la galería.'] });
      return;
    }
    setProceso({ fase: 'revisando' });
    const rev = await revisarToma(archivo);
    if (rev.bloqueos.length) {
      setProceso({ fase: 'bloqueada', mensajes: rev.bloqueos, miniatura: rev.miniatura });
      return;
    }
    try {
      setProceso({ fase: 'subiendo', avance: 0, miniatura: rev.miniatura });
      const firma = await api<{ url: string; ruta: string }>(`/api/videos/${videoId}`, 'POST', { accion: 'firmar_subida', casilla, mime, tamano: archivo.size });
      await subirConAvance(firma.url, archivo, mime, (f) => setProceso({ fase: 'subiendo', avance: f, miniatura: rev.miniatura }));
      setProceso({ fase: 'guardando', miniatura: rev.miniatura });
      const r = await api<{ toma: Toma }>(`/api/videos/${videoId}`, 'POST', {
        accion: 'registrar_toma',
        casilla,
        ruta: firma.ruta,
        nombre: archivo.name,
        duracion: rev.duracion,
        ancho: rev.ancho,
        alto: rev.alto,
        revision: !rev.revisada ? 'sin_revisar' : rev.advertencias.length ? 'advertencia' : 'ok',
        observaciones: rev.advertencias,
        miniatura: rev.miniatura,
      });
      setProceso(null);
      onCambio(casilla, r.toma);
    } catch (e) {
      setProceso({ fase: 'error', mensajes: [(e as Error).message], miniatura: rev.miniatura });
    }
  }

  async function quitar() {
    setProceso({ fase: 'guardando' });
    try {
      await api(`/api/videos/${videoId}`, 'POST', { accion: 'borrar_toma', casilla });
      setProceso(null);
      onCambio(casilla, null);
    } catch (e) {
      setProceso({ fase: 'error', mensajes: [(e as Error).message] });
    }
  }

  const avisos = fallo ? proceso?.mensajes ?? [] : toma && !ocupada ? toma.observaciones ?? [] : [];

  return (
    <div className="flex flex-col">
      <button
        type="button"
        disabled={ocupada}
        onClick={() => input.current?.click()}
        className={`group relative aspect-[4/5] w-full overflow-hidden rounded-2xl text-left transition ${
          miniatura
            ? 'bg-zinc-900'
            : fallo
              ? 'border-2 border-dashed border-red-300 bg-red-50/60'
              : obligatoria
                ? 'border-2 border-dashed border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50'
                : 'border-2 border-dashed border-zinc-200 bg-white/60 hover:border-zinc-300 hover:bg-white'
        }`}
      >
        {miniatura && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={miniatura} alt="" className={`absolute inset-0 h-full w-full object-cover ${ocupada || fallo ? 'opacity-50' : ''}`} />
        )}

        {/* Vacía o con error: ícono del espacio */}
        {!miniatura && !ocupada && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
            <span className={`flex items-center justify-center rounded-2xl ${compacta ? 'h-10 w-10' : 'h-12 w-12'} ${fallo ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white'} transition`}>
              <Icono nombre={fallo ? 'alerta' : toma ? 'video' : ICONO_CASILLA[casilla] ?? 'video'} className={compacta ? 'h-5 w-5' : 'h-6 w-6'} />
            </span>
            <span className="text-[12px] font-medium text-zinc-500">{fallo ? 'Elegir otra' : toma ? 'Toma subida' : compacta ? 'Subir' : 'Toca para subir'}</span>
          </span>
        )}

        {/* Revisando / subiendo */}
        {ocupada && (
          <span className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${miniatura ? 'bg-black/30' : 'bg-zinc-900'} text-white`}>
            {proceso?.fase === 'subiendo' ? (
              <span className="relative flex items-center justify-center">
                <Anillo fraccion={proceso.avance ?? 0} />
                <span className="absolute text-[12px] font-semibold">{Math.round((proceso.avance ?? 0) * 100)}%</span>
              </span>
            ) : (
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            <span className="text-[12px] font-medium">{proceso?.fase === 'revisando' ? 'Revisando…' : proceso?.fase === 'subiendo' ? 'Subiendo' : 'Guardando…'}</span>
          </span>
        )}

        {/* Lista: insignias */}
        {toma && !ocupada && !fallo && (
          <>
            <span className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${toma.revision === 'advertencia' ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white'}`}>
              <Icono nombre={toma.revision === 'advertencia' ? 'alerta' : 'check'} className="h-3.5 w-3.5" grosor={2.4} />
            </span>
            {toma.duracion ? (
              <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                {String(toma.duracion).replace('.', ',')} s
              </span>
            ) : null}
          </>
        )}
        {!toma && !miniatura && obligatoria && !ocupada && !fallo && (
          <span className="absolute right-2 top-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">Obligatoria</span>
        )}
      </button>

      <div className="mt-2 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-zinc-900">{info?.nombre ?? casilla}</p>
          {!toma && !fallo && !compacta && <p className="text-[12px] leading-snug text-zinc-500">{info?.ayuda}</p>}
        </div>
        {toma && !ocupada && (
          <button type="button" onClick={quitar} aria-label="Quitar toma" className="-mr-1 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-600">
            <Icono nombre="basura" className="h-4 w-4" />
          </button>
        )}
      </div>
      {avisos.map((m, i) => (
        <p key={i} className={`mt-1.5 rounded-lg px-2.5 py-1.5 text-[12px] leading-snug ${fallo ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
          {m}
        </p>
      ))}
      <input ref={input} type="file" accept="video/*" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
    </div>
  );
}

const minutos = (s?: number | null) => (s ? (s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.round(s)} s`) : '');
const megas = (b?: number | null) => (b ? `${Math.round(b / 1048576)} MB` : '');

/** Un solo video de todo el inmueble. */
function Recorrido({ videoId, toma, onCambio }: { videoId: string; toma?: Toma; onCambio: (casilla: string, toma: Toma | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const ocupada = !!proceso && ['revisando', 'subiendo', 'guardando'].includes(proceso.fase);
  const fallo = proceso?.fase === 'bloqueada' || proceso?.fase === 'error';
  const miniatura = proceso?.miniatura ?? toma?.miniatura ?? null;

  async function elegir(archivo?: File) {
    if (input.current) input.current.value = '';
    if (!archivo) return;
    const mime = mimeDe(archivo.name, archivo.type);
    if (!MIMES_VIDEO.includes(mime)) {
      setProceso({ fase: 'bloqueada', mensajes: ['Ese archivo no es un video que podamos usar. Sube un MP4 o MOV desde la galería.'] });
      return;
    }
    setProceso({ fase: 'revisando' });
    const rev = await revisarToma(archivo, { recorrido: true });
    if (rev.bloqueos.length) {
      setProceso({ fase: 'bloqueada', mensajes: rev.bloqueos, miniatura: rev.miniatura });
      return;
    }
    try {
      setProceso({ fase: 'subiendo', avance: 0, miniatura: rev.miniatura });
      const firma = await api<{ urls: string[]; ruta: string; partes: number }>(`/api/videos/${videoId}`, 'POST', {
        accion: 'firmar_subida',
        casilla: CASILLA_RECORRIDO,
        mime,
        tamano: archivo.size,
      });
      await subirEnPartes(firma.urls, archivo, mime, BYTES_PARTE, (f) => setProceso({ fase: 'subiendo', avance: f, miniatura: rev.miniatura }));
      setProceso({ fase: 'guardando', miniatura: rev.miniatura });
      const r = await api<{ toma: Toma }>(`/api/videos/${videoId}`, 'POST', {
        accion: 'registrar_toma',
        casilla: CASILLA_RECORRIDO,
        ruta: firma.ruta,
        partes: firma.partes,
        nombre: archivo.name,
        duracion: rev.duracion,
        ancho: rev.ancho,
        alto: rev.alto,
        revision: !rev.revisada ? 'sin_revisar' : rev.advertencias.length ? 'advertencia' : 'ok',
        observaciones: rev.advertencias,
        miniatura: rev.miniatura,
      });
      setProceso(null);
      onCambio(CASILLA_RECORRIDO, r.toma);
    } catch (e) {
      setProceso({ fase: 'error', mensajes: [(e as Error).message], miniatura: rev.miniatura });
    }
  }

  async function quitar() {
    setProceso({ fase: 'guardando' });
    try {
      await api(`/api/videos/${videoId}`, 'POST', { accion: 'borrar_toma', casilla: CASILLA_RECORRIDO });
      setProceso(null);
      onCambio(CASILLA_RECORRIDO, null);
    } catch (e) {
      setProceso({ fase: 'error', mensajes: [(e as Error).message] });
    }
  }

  const avisos = fallo ? proceso?.mensajes ?? [] : toma && !ocupada ? toma.observaciones ?? [] : [];

  return (
    <div className={`overflow-hidden rounded-2xl ring-1 ${fallo ? 'ring-red-200' : toma ? 'ring-emerald-200' : 'ring-zinc-200'} bg-white`}>
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-5">
        <button
          type="button"
          disabled={ocupada}
          onClick={() => input.current?.click()}
          className={`relative mx-auto aspect-[9/16] w-[150px] shrink-0 overflow-hidden rounded-2xl sm:mx-0 ${miniatura ? 'bg-zinc-900' : 'border-2 border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400'}`}
        >
          {miniatura && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={miniatura} alt="" className={`absolute inset-0 h-full w-full object-cover ${ocupada ? 'opacity-50' : ''}`} />
          )}
          {!miniatura && !ocupada && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white">
                <Icono nombre="subir" className="h-6 w-6" />
              </span>
              <span className="px-2 text-[12px] font-medium">Elegir video</span>
            </span>
          )}
          {ocupada && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
              {proceso?.fase === 'subiendo' ? (
                <span className="relative flex items-center justify-center">
                  <Anillo fraccion={proceso.avance ?? 0} />
                  <span className="absolute text-[12px] font-semibold">{Math.round((proceso.avance ?? 0) * 100)}%</span>
                </span>
              ) : (
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
            </span>
          )}
          {toma && !ocupada && !fallo && (
            <span className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full ${toma.revision === 'advertencia' ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white'}`}>
              <Icono nombre={toma.revision === 'advertencia' ? 'alerta' : 'check'} className="h-3.5 w-3.5" grosor={2.4} />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {toma && !ocupada ? (
            <>
              <p className="text-[16px] font-semibold text-zinc-900">Recorrido subido</p>
              <p className="mt-0.5 text-[13px] text-zinc-500">{[minutos(toma.duracion), megas(toma.tamano)].filter(Boolean).join(' · ')}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">Nosotros sacamos las mejores tomas de cada espacio. No tienes que cortar nada.</p>
            </>
          ) : proceso?.fase === 'subiendo' ? (
            <>
              <p className="text-[16px] font-semibold text-zinc-900">Subiendo tu video…</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.round((proceso.avance ?? 0) * 100)}%` }} />
              </div>
              <p className="mt-2 text-[13px] text-zinc-500">No cierres esta página. Con wifi es más rápido.</p>
            </>
          ) : proceso?.fase === 'revisando' ? (
            <p className="text-[15px] font-semibold text-zinc-900">Revisando tu video…</p>
          ) : (
            <>
              <p className="text-[16px] font-semibold text-zinc-900">Sube el video de tu recorrido</p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">Un solo video caminando por todo el inmueble, vertical y de 1 a 3 minutos. Nosotros sacamos las tomas.</p>
            </>
          )}
          {avisos.map((m, i) => (
            <p key={i} className={`mt-2 rounded-lg px-2.5 py-1.5 text-[12px] leading-snug ${fallo ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
              {m}
            </p>
          ))}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={ocupada}
              onClick={() => input.current?.click()}
              className={`rounded-xl px-4 py-2.5 text-[14px] font-semibold transition disabled:opacity-40 ${toma ? 'border border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
            >
              {toma ? 'Cambiar video' : fallo ? 'Elegir otro video' : 'Elegir video'}
            </button>
            {toma && !ocupada && (
              <button type="button" onClick={quitar} className="rounded-xl px-3 py-2.5 text-[13px] text-zinc-500 transition hover:text-red-600">
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
      <ol className="grid gap-x-6 gap-y-2 border-t border-zinc-100 bg-zinc-50/60 px-4 py-4 text-[13px] text-zinc-600 sm:grid-cols-2 sm:px-5">
        {[
          'Vertical y en 1080p (no en 4K).',
          'De día, con luces encendidas y cortinas abiertas.',
          'Si quieres salir tú, preséntate al inicio frente al inmueble.',
          'Camina despacio: fachada, sala, cocina, habitaciones, baños, balcón y vista.',
          'Quédate 3 segundos quieto en cada espacio.',
          'Gira suave. Si tu celular tiene modo estabilizado, actívalo.',
        ].map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-orange-600">{i + 1}.</span>
            {t}
          </li>
        ))}
      </ol>
      <input ref={input} type="file" accept="video/*" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
    </div>
  );
}

export default function CasillasTomas({ videoId, tipo, tomas, onCambio }: { videoId: string; tipo?: TipoInmueble; tomas: Toma[]; onCambio: (casilla: string, toma: Toma | null) => void }) {
  const recorrido = tomas.find((t) => t.casilla === CASILLA_RECORRIDO);
  const fotos = tomas.filter((t) => esCasillaFoto(t.casilla));
  const porEspacio = tomas.filter((t) => t.casilla !== CASILLA_RECORRIDO && !esCasillaFoto(t.casilla));
  const [modo, setModo] = useState<'recorrido' | 'espacios' | 'fotos'>(
    recorrido ? 'recorrido' : fotos.length > 0 ? 'fotos' : porEspacio.length > 0 ? 'espacios' : 'recorrido'
  );
  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
        {(
          [
            ['recorrido', 'Un solo video', 'Lo más fácil'],
            ['espacios', 'Toma por toma', 'Una por espacio'],
            ['fotos', 'Solo fotos', 'No tengo video'],
          ] as const
        ).map(([v, l, d]) => (
          <button
            key={v}
            type="button"
            onClick={() => setModo(v)}
            className={`rounded-lg px-3 py-2.5 text-left transition ${modo === v ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          >
            <span className={`block text-[13px] font-semibold leading-tight sm:text-[14px] ${modo === v ? 'text-zinc-900' : 'text-zinc-500'}`}>{l}</span>
            <span className="mt-0.5 block text-[11px] leading-tight text-zinc-500 sm:text-[12px]">{d}</span>
          </button>
        ))}
      </div>
      {modo === 'recorrido' ? (
        <Recorrido videoId={videoId} toma={recorrido} onCambio={onCambio} />
      ) : modo === 'fotos' ? (
        <Fotos videoId={videoId} tomas={fotos} onCambio={onCambio} />
      ) : (
        <PorEspacios videoId={videoId} tipo={tipo} tomas={porEspacio} onCambio={onCambio} />
      )}
    </div>
  );
}

function PorEspacios({ videoId, tipo, tomas, onCambio }: { videoId: string; tipo?: TipoInmueble; tomas: Toma[]; onCambio: (casilla: string, toma: Toma | null) => void }) {
  const obligatorias = obligatoriasDe(tipo);
  const porCasilla = new Map(tomas.map((t) => [t.casilla, t]));
  const casillas = casillasDe(tipo);
  const sobrantes = tomas.map((t) => t.casilla).filter((c) => !casillas.includes(c));
  const listas = obligatorias.filter((c) => porCasilla.has(c)).length;
  const avance = Math.min(1, (listas + Math.min(tomas.length, MINIMO_TOMAS) / MINIMO_TOMAS) / (obligatorias.length + 1));

  return (
    <div>
      <div className="mb-5">
        <GuiaGrabacion />
      </div>
      <div className="mb-5 rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70 sm:bg-zinc-50">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold text-zinc-900">
            {listas} de {obligatorias.length} obligatorias · {tomas.length} {tomas.length === 1 ? 'toma' : 'tomas'}
          </span>
          <span className="hidden text-zinc-500 sm:inline">6 a 10 s cada una</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.round(avance * 100)}%` }} />
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-zinc-500">
          Revisamos cada toma al subirla. Si algo no sirve, te decimos qué regrabar antes de que te vayas del inmueble.
        </p>
      </div>
      {[
        { titulo: 'Obligatorias', ayuda: 'Sin estas no podemos armar el video.', compacta: false, lista: casillas.filter((c) => obligatorias.includes(c)) },
        { titulo: 'Suman mucho', ayuda: 'Opcionales. Entre más espacios, más completo el recorrido.', compacta: true, lista: [...casillas.filter((c) => !obligatorias.includes(c)), ...sobrantes] },
      ].map((grupo) => (
        <section key={grupo.titulo} className="mb-8 last:mb-0">
          <div className="mb-3">
            <h3 className="text-[15px] font-semibold text-zinc-900">{grupo.titulo}</h3>
            <p className="text-[12px] text-zinc-500">{grupo.ayuda}</p>
          </div>
          <div className={`grid gap-x-3 gap-y-5 ${grupo.compacta ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
            {grupo.lista.map((c) => (
              <Casilla key={c} videoId={videoId} casilla={c} obligatoria={obligatorias.includes(c)} toma={porCasilla.get(c)} onCambio={onCambio} compacta={grupo.compacta} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Solo fotos: el agente sube de 6 a 20 fotos y el video se arma con ellas. */
function Fotos({ videoId, tomas, onCambio }: { videoId: string; tomas: Toma[]; onCambio: (casilla: string, toma: Toma | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<{ hechas: number; total: number } | null>(null);
  const [borrando, setBorrando] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const ordenadas = [...tomas].sort((a, b) => a.casilla.localeCompare(b.casilla));
  const faltan = Math.max(0, MIN_FOTOS - tomas.length);

  async function elegir(archivos: File[]) {
    if (!archivos.length) return;
    const usadas = new Set(tomas.map((t) => t.casilla));
    const libres = Array.from({ length: MAX_FOTOS }, (_, i) => casillaFoto(i + 1)).filter((c) => !usadas.has(c));
    const lista = archivos.slice(0, libres.length);
    const problemas: string[] = [];
    if (archivos.length > libres.length) problemas.push(`Puedes subir hasta ${MAX_FOTOS} fotos: subimos las primeras ${libres.length}.`);
    setErrores([]);
    setSubiendo({ hechas: 0, total: lista.length });
    for (let i = 0; i < lista.length; i++) {
      const casilla = libres[i];
      try {
        const foto = await prepararFoto(lista[i]);
        const firma = await api<{ url: string; ruta: string }>(`/api/videos/${videoId}`, 'POST', { accion: 'firmar_subida', casilla, mime: 'image/jpeg', tamano: foto.archivo.size });
        await subirConAvance(firma.url, foto.archivo, 'image/jpeg', () => undefined);
        const r = await api<{ toma: Toma }>(`/api/videos/${videoId}`, 'POST', {
          accion: 'registrar_toma',
          casilla,
          ruta: firma.ruta,
          nombre: lista[i].name,
          ancho: foto.ancho,
          alto: foto.alto,
          revision: foto.avisos.length ? 'advertencia' : 'ok',
          observaciones: foto.avisos,
          miniatura: foto.miniatura,
        });
        onCambio(casilla, r.toma);
      } catch (e) {
        problemas.push((e as Error).message);
      }
      setSubiendo({ hechas: i + 1, total: lista.length });
    }
    setSubiendo(null);
    setErrores(problemas);
  }

  async function quitar(casilla: string) {
    setBorrando(casilla);
    try {
      await api(`/api/videos/${videoId}`, 'POST', { accion: 'borrar_toma', casilla });
      onCambio(casilla, null);
    } catch (e) {
      setErrores([(e as Error).message]);
    }
    setBorrando('');
  }

  return (
    <div>
      <div className="mb-5 rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70 sm:bg-zinc-50">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="font-semibold text-zinc-900">
            {tomas.length} {tomas.length === 1 ? 'foto' : 'fotos'}
            {faltan > 0 ? ` · faltan ${faltan} para el mínimo` : ' · listas'}
          </span>
          <span className="text-zinc-500">De {MIN_FOTOS} a {MAX_FOTOS}</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.round(Math.min(1, tomas.length / MIN_FOTOS) * 100)}%` }} />
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-zinc-500">
          Con tus fotos armamos el video: movimiento suave sobre cada una, los datos de tu inmueble y tu marca al final.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        {ordenadas.map((t, i) => (
          <div key={t.casilla} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-black/5">
            {t.miniatura ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.miniatura} alt="" className={`h-full w-full object-cover ${borrando === t.casilla ? 'opacity-40' : ''}`} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-zinc-400">
                <Icono nombre="imagen" className="h-6 w-6" />
              </span>
            )}
            <span className="absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/60 px-1.5 text-[11px] font-bold text-white">{i + 1}</span>
            {t.revision === 'advertencia' && (
              <span title={t.observaciones?.[0] ?? ''} className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-amber-950">
                <Icono nombre="alerta" className="h-3.5 w-3.5" grosor={2.4} />
              </span>
            )}
            <button
              type="button"
              onClick={() => quitar(t.casilla)}
              disabled={!!borrando || !!subiendo}
              aria-label="Quitar foto"
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow transition hover:text-red-600"
            >
              <Icono nombre="equis" className="h-4 w-4" grosor={2.2} />
            </button>
          </div>
        ))}
        {tomas.length < MAX_FOTOS && (
          <button
            type="button"
            disabled={!!subiendo}
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-300 bg-white text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-800 disabled:opacity-60"
          >
            {subiendo ? (
              <>
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700" />
                <span className="text-[12px] font-medium">
                  {subiendo.hechas} de {subiendo.total}
                </span>
              </>
            ) : (
              <>
                <Icono nombre="mas" className="h-6 w-6" grosor={2} />
                <span className="px-1 text-center text-[12px] font-medium">{tomas.length ? 'Agregar fotos' : 'Elegir fotos'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {errores.map((m, i) => (
        <p key={i} className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] leading-snug text-red-700">
          {m}
        </p>
      ))}

      <ol className="mt-5 grid gap-x-6 gap-y-2 rounded-2xl bg-zinc-50/80 px-4 py-4 text-[13px] text-zinc-600 ring-1 ring-zinc-200/70 sm:grid-cols-2">
        {[
          'Puedes elegir varias fotos a la vez desde la galería.',
          'Súbelas en el orden del recorrido: fachada, sala, cocina, habitaciones, baños y vista.',
          'Que sean nítidas y de día. Sirven horizontales o verticales.',
          'Sin marcas de agua de otros portales ni textos encima.',
        ].map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-orange-600">{i + 1}.</span>
            {t}
          </li>
        ))}
      </ol>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const archivos = Array.from(e.target.files ?? []);
          e.target.value = '';
          elegir(archivos);
        }}
      />
    </div>
  );
}
