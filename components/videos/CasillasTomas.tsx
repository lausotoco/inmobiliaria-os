'use client';

// Tomas del inmueble, de dos formas:
//  · Un solo video del recorrido (la más fácil: el agente no corta nada; las
//    tomas se sacan al editar). Se sube en partes porque pesa más de 50 MB.
//  · Toma por toma, una casilla por espacio en el orden del recorrido.
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
  type TipoInmueble,
} from '@/lib/videos/config';
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
  const porEspacio = tomas.filter((t) => t.casilla !== CASILLA_RECORRIDO);
  const [modo, setModo] = useState<'recorrido' | 'espacios'>(porEspacio.length > 0 && !recorrido ? 'espacios' : 'recorrido');
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
        {(
          [
            ['recorrido', 'Un solo video', 'Lo más fácil'],
            ['espacios', 'Toma por toma', 'Una por espacio'],
          ] as const
        ).map(([v, l, d]) => (
          <button
            key={v}
            type="button"
            onClick={() => setModo(v)}
            className={`rounded-lg px-3 py-2.5 text-left transition ${modo === v ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
          >
            <span className={`block text-[14px] font-semibold ${modo === v ? 'text-zinc-900' : 'text-zinc-500'}`}>{l}</span>
            <span className="block text-[12px] text-zinc-500">{d}</span>
          </button>
        ))}
      </div>
      {modo === 'recorrido' ? (
        <Recorrido videoId={videoId} toma={recorrido} onCambio={onCambio} />
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
