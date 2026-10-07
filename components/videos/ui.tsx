'use client';

// Video por inmueble · sistema visual propio (interfaz de aplicación):
// fondo claro, tarjetas blancas suaves, Inter en todo, botones negros y un
// acento naranja para avance y estados. Íconos dibujados aquí (sin librerías).

import Link from 'next/link';
import { LINEA_ESTADOS, NOMBRE_ESTADO, type EstadoVideo } from '@/lib/videos/config';

// ── Clases base ──
export const fondoApp = 'app-videos min-h-screen bg-[#F6F6F3] text-zinc-900 antialiased';
export const tarjeta =
  'rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,16,16,0.04),0_10px_30px_-18px_rgba(16,16,16,0.12)]';
/** Tarjeta solo desde tablet: en el celular el contenido va directo sobre el fondo. */
export const tarjetaDesdeSm =
  'sm:rounded-2xl sm:border sm:border-black/[0.06] sm:bg-white sm:p-7 sm:shadow-[0_1px_2px_rgba(16,16,16,0.04),0_10px_30px_-18px_rgba(16,16,16,0.12)]';
export const etiqueta = 'mb-1.5 block text-[13px] font-medium text-zinc-700';
export const campo =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5';
export const botonPrimario =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-300';
export const botonSecundario =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40';
export const botonAcento =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-orange-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-orange-300';

// ── Íconos (trazo de 1.8, 24×24) ──
const TRAZOS: Record<string, string> = {
  edificio: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16 M15 9h4a1 1 0 0 1 1 1v11 M8 8h3 M8 12h3 M8 16h3 M3 21h18',
  casa: 'M3 11l9-7 9 7 M5 9.5V20h14V9.5 M10 20v-5h4v5',
  puerta: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17 M4 21h16 M14 12h.01',
  sofa: 'M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3 M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M6 18v2 M18 18v2',
  cocina: 'M4 10h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4 M8 14h.01 M12 14h.01 M16 14h.01 M9 17h6',
  cama: 'M3 18V7 M3 13h18v5 M21 18v-3a3 3 0 0 0-3-3h-7v6 M7 11a2 2 0 1 0 0-.01',
  bano: 'M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M6 12V6a2 2 0 0 1 3.5-1.3 M7 20l-1 2 M17 20l1 2',
  balcon: 'M4 21V11 M20 21V11 M2 11h20 M8 11v10 M12 11v10 M16 11v10 M7 7a5 5 0 0 1 10 0v4H7z',
  arbol: 'M12 22v-6 M8 16h8 M12 2a5 5 0 0 0-5 5c-1.7.6-3 2.2-3 4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-1.8-1.3-3.4-3-4a5 5 0 0 0-5-5z',
  montana: 'M3 20l6-10 4 6 2-3 6 7z M16 8a2 2 0 1 0 0-.01',
  piscina: 'M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5 M8 15V5a2 2 0 0 1 4 0 M14 15V5a2 2 0 0 1 4 0 M8 9h6',
  destello: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  ruta: 'M6 19a2 2 0 1 0 0-.01 M18 7a2 2 0 1 0 0-.01 M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8',
  camara: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  video: 'M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M16 10l5-3v10l-5-3',
  subir: 'M12 16V4 M7 9l5-5 5 5 M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  bajar: 'M12 4v12 M7 11l5 5 5-5 M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  play: 'M8 5.5v13l11-6.5z',
  pausa: 'M8 5v14 M16 5v14',
  candado: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
  copiar: 'M9 9h11v11H9z M5 15H4V4h11v1',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01',
  alerta: 'M12 3l10 18H2z M12 10v4 M12 17h.01',
  equis: 'M6 6l12 12 M18 6L6 18',
  flechaIzq: 'M19 12H5 M11 6l-6 6 6 6',
  flechaDer: 'M5 12h14 M13 6l6 6-6 6',
  mas: 'M12 5v14 M5 12h14',
  basura: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  imagen: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9a1.5 1.5 0 1 0 0-.01',
  texto: 'M5 6h14 M5 10h14 M5 14h9 M5 18h6',
  varita: 'M4 20L15 9 M14 4v2 M18 6l-1.5 1.5 M20 10h-2 M11 5l1 1 M17 12l1 1',
  sonido: 'M4 10v4h4l5 4V6L8 10z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12',
  silencio: 'M4 10v4h4l5 4V6L8 10z M17 9l5 5 M22 9l-5 5',
  tarjetaPago: 'M3 6h18v12H3z M3 10h18 M7 15h3',
  marca: 'M4 4h7l9 9-7 7-9-9z M8.5 8.5h.01',
  chat: 'M4 5h16v11H8l-4 4z',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

export function Icono({ nombre, className = 'h-5 w-5', grosor = 1.8 }: { nombre: string; className?: string; grosor?: number }) {
  const d = TRAZOS[nombre] ?? TRAZOS.info;
  const relleno = nombre === 'play';
  return (
    <svg viewBox="0 0 24 24" className={className} fill={relleno ? 'currentColor' : 'none'} stroke={relleno ? 'none' : 'currentColor'} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split(' M').map((tramo, i) => (
        <path key={i} d={i === 0 ? tramo : 'M' + tramo} />
      ))}
    </svg>
  );
}

export const ICONO_CASILLA: Record<string, string> = {
  fachada: 'edificio', acceso: 'ruta', entrada: 'puerta', sala: 'sofa', espacio: 'sofa', espacio_2: 'edificio',
  cocina: 'cocina', habitacion_principal: 'cama', habitacion_2: 'cama', habitacion_3: 'cama', bano: 'bano', bano_2: 'bano',
  balcon: 'balcon', jardin: 'arbol', recorrido_1: 'ruta', recorrido_2: 'ruta', recorrido_3: 'ruta', vista: 'montana',
  zonas_comunes: 'piscina', detalle_1: 'destello', detalle_2: 'destello', detalle_3: 'destello',
};

// ── Barra superior ──
export function BarraApp({ volver, derecha }: { volver?: { href: string; texto: string }; derecha?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {volver ? (
            <Link href={volver.href} className="-ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[14px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
              <Icono nombre="flechaIzq" className="h-4 w-4" />
              {volver.texto}
            </Link>
          ) : (
            <Link href="/broker/videos" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Icono nombre="video" className="h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-[14px] font-semibold text-zinc-900">Videos</span>
                <span className="block text-[11px] text-zinc-500">por KYRELO</span>
              </span>
            </Link>
          )}
        </div>
        {derecha ?? (
          <Link href="/broker" className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900">
            Portal de agentes
          </Link>
        )}
      </div>
    </header>
  );
}

// ── Estados ──
const ESTILO_ESTADO: Record<EstadoVideo, string> = {
  borrador: 'bg-zinc-100 text-zinc-600',
  recibido: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
  en_edicion: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
  vista_previa: 'bg-orange-600 text-white',
  desbloqueado: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
  rechazado: 'bg-red-50 text-red-700 ring-1 ring-red-200/70',
  descartado: 'bg-zinc-100 text-zinc-400',
};

export function EtiquetaEstado({ estado }: { estado: EstadoVideo }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${ESTILO_ESTADO[estado]}`}>
      {(estado === 'recibido' || estado === 'en_edicion') && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />}
      {NOMBRE_ESTADO[estado]}
    </span>
  );
}

const ICONO_LINEA: Record<string, string> = { recibido: 'subir', en_edicion: 'varita', vista_previa: 'ojo', desbloqueado: 'candado' };

/** Recibido → En edición → Vista previa lista → Desbloqueado */
export function LineaEstados({ estado }: { estado: EstadoVideo }) {
  const actual = LINEA_ESTADOS.indexOf(estado);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {LINEA_ESTADOS.map((e, i) => {
        const hecho = actual > i || estado === 'desbloqueado';
        const ahora = actual === i && estado !== 'desbloqueado';
        return (
          <li key={e} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : actual >= i ? 'bg-orange-500' : 'bg-zinc-200'}`} />
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  hecho ? 'bg-orange-600 text-white' : ahora ? 'bg-white text-orange-600 ring-2 ring-orange-500' : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                <Icono nombre={hecho ? 'check' : ICONO_LINEA[e]} className="h-4 w-4" grosor={2} />
              </span>
              <div className={`h-0.5 flex-1 ${i === LINEA_ESTADOS.length - 1 ? 'opacity-0' : actual > i ? 'bg-orange-500' : 'bg-zinc-200'}`} />
            </div>
            <p className={`mt-2 text-[12px] leading-tight ${ahora ? 'font-semibold text-zinc-900' : hecho ? 'text-zinc-700' : 'text-zinc-400'}`}>
              {NOMBRE_ESTADO[e]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function Aviso({ tono = 'info', titulo, children }: { tono?: 'info' | 'error' | 'ok' | 'atencion'; titulo?: string; children?: React.ReactNode }) {
  const t = {
    info: { caja: 'bg-zinc-50 text-zinc-700 ring-zinc-200', icono: 'info', color: 'text-zinc-500' },
    error: { caja: 'bg-red-50 text-red-800 ring-red-200', icono: 'alerta', color: 'text-red-600' },
    ok: { caja: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icono: 'check', color: 'text-emerald-600' },
    atencion: { caja: 'bg-amber-50 text-amber-900 ring-amber-200', icono: 'reloj', color: 'text-amber-600' },
  }[tono];
  return (
    <div className={`flex gap-3 rounded-xl px-4 py-3 text-[14px] leading-relaxed ring-1 ${t.caja}`}>
      <Icono nombre={t.icono} className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${t.color}`} />
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}

const PASOS_GUIA: { icono: string; texto: string }[] = [
  { icono: 'camara', texto: 'Graba vertical, en 1080p a 30 cuadros (no en 4K: pesa demasiado). En iPhone: Ajustes › Cámara › Grabar video › 1080p a 30 cps. En Android: en la cámara, toca la resolución y elige 1080p o FHD.' },
  { icono: 'destello', texto: 'Graba de día, con todas las luces encendidas y las cortinas abiertas.' },
  { icono: 'sofa', texto: 'Deja el inmueble limpio y ordenado: sin personas, sin mascotas y sin objetos personales a la vista.' },
  { icono: 'ruta', texto: 'Sigue el recorrido: fachada, entrada, sala, cocina, habitaciones, baños, balcón, vista y zonas comunes.' },
  { icono: 'reloj', texto: 'Una toma por espacio, de 6 a 10 segundos, caminando despacio y sin girar rápido. Si tienes modo estabilizado, actívalo.' },
  { icono: 'puerta', texto: 'Arranca cada toma desde la puerta del espacio y entra suave.' },
  { icono: 'silencio', texto: 'Graba sin hablar. La voz y la música las ponemos nosotros.' },
  { icono: 'imagen', texto: 'Suma hasta 3 detalles cortos: acabados, la vista desde una ventana, lo más bonito del inmueble.' },
  { icono: 'subir', texto: 'Sube los videos originales desde la galería, sin filtros y sin pasarlos por WhatsApp.' },
];

export function GuiaGrabacion({ abierta = false }: { abierta?: boolean }) {
  return (
    <details className={`${tarjeta} group overflow-hidden`} open={abierta}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <Icono nombre="camara" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-zinc-900">Cómo grabar con el celular</span>
          <span className="block text-[13px] text-zinc-500">9 consejos para que tu video salga mejor y más rápido</span>
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-open:rotate-45">
          <Icono nombre="mas" className="h-4 w-4" />
        </span>
      </summary>
      <ol className="grid gap-x-6 gap-y-3 border-t border-zinc-100 px-4 py-4 sm:grid-cols-2 sm:px-5">
        {PASOS_GUIA.map((p, i) => (
          <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-zinc-700">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <Icono nombre={p.icono} className="h-4 w-4" />
            </span>
            {p.texto}
          </li>
        ))}
      </ol>
    </details>
  );
}
