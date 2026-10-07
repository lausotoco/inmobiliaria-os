'use client';

// app/broker/videos/page.tsx — Video por inmueble · inicio del agente.
// Crea un video, ve en qué va cada uno y entra a terminarlo, verlo o descargarlo.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatoCOP } from '@/lib/utils';
import { TEXTO_HORARIO, tituloVideo, codigoVideo, type EstadoVideo, type Ficha } from '@/lib/videos/config';
import { api } from '@/lib/videos/subir';
import { Aviso, BarraApp, EtiquetaEstado, GuiaGrabacion, Icono, botonPrimario, fondoApp, tarjeta } from '@/components/videos/ui';

type Fila = {
  id: string;
  ficha: Ficha;
  estado: EstadoVideo;
  created_at: string;
  tomas_inmueble: { count: number }[];
};

const ACCION: Partial<Record<EstadoVideo, string>> = {
  borrador: 'Seguir',
  rechazado: 'Ver qué regrabar',
  vista_previa: 'Ver y desbloquear',
  desbloqueado: 'Descargar',
  recibido: 'Ver estado',
  en_edicion: 'Ver estado',
};

const ICONO_ESTADO: Partial<Record<EstadoVideo, string>> = {
  borrador: 'texto',
  recibido: 'reloj',
  en_edicion: 'varita',
  vista_previa: 'ojo',
  desbloqueado: 'check',
  rechazado: 'alerta',
};

export default function MisVideos() {
  const router = useRouter();
  const [videos, setVideos] = useState<Fila[] | null>(null);
  const [precio, setPrecio] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ videos: Fila[]; precio: number | null }>('/api/videos', 'GET')
      .then((r) => {
        setVideos(r.videos);
        setPrecio(r.precio);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  async function nuevo() {
    setCreando(true);
    setError('');
    try {
      const r = await api<{ id: string }>('/api/videos', 'POST');
      router.push(`/broker/videos/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreando(false);
    }
  }

  const visibles = (videos ?? []).filter((v) => v.estado !== 'descartado');
  const pendientes = visibles.filter((v) => v.estado === 'vista_previa').length;

  return (
    <div className={fondoApp}>
      <BarraApp />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-zinc-700 ring-1 ring-black/[0.06]">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Video listo en menos de 40 minutos
            </p>
            <h1 className="mt-4 text-[32px] font-semibold leading-[1.1] text-zinc-900 sm:text-[44px]">
              Graba tu inmueble.
              <br />
              <span className="text-zinc-400">Nosotros lo editamos.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-zinc-600">
              Subes un solo video caminando por tu inmueble y recibes el video editado, la versión para anuncios, las portadas y
              el texto de la publicación. Lo ves antes de pagar{precio ? <> y lo desbloqueas por <strong className="text-zinc-900">{formatoCOP(precio)}</strong> si te gusta</> : null}.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={nuevo} disabled={creando} className={`${botonPrimario} px-6 py-3.5`}>
                <Icono nombre="mas" className="h-4 w-4" grosor={2.4} />
                {creando ? 'Creando…' : 'Crear video nuevo'}
              </button>
              <span className="text-[13px] text-zinc-500">Editamos {TEXTO_HORARIO}</span>
            </div>
            {error && (
              <div className="mt-4">
                <Aviso tono="error">{error}</Aviso>
              </div>
            )}
          </div>

          <ol className={`${tarjeta} divide-y divide-zinc-100`}>
            {[
              ['texto', 'Llena la ficha', 'Precio, zona, datos y lo que lo hace diferente.'],
              ['camara', 'Sube tu video', 'Un solo video del recorrido, desde el celular. Lo revisamos al instante.'],
              ['ojo', 'Mira la vista previa', 'En menos de 40 minutos, antes de pagar.'],
              ['bajar', 'Descarga y publica', 'En alta calidad, con tu logo y tu WhatsApp.'],
            ].map(([icono, t, d], i) => (
              <li key={t} className="flex gap-4 p-4 sm:p-5">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <Icono nombre={icono} className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">{i + 1}</span>
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-zinc-900">{t}</span>
                  <span className="block text-[13px] leading-snug text-zinc-500">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[20px] font-semibold text-zinc-900">Tus videos</h2>
            {pendientes > 0 && (
              <span className="rounded-full bg-orange-600 px-2.5 py-1 text-[12px] font-semibold text-white">
                {pendientes} {pendientes === 1 ? 'vista previa lista' : 'vistas previas listas'}
              </span>
            )}
          </div>

          {videos === null && !error && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/70" />
              ))}
            </div>
          )}

          {videos !== null && visibles.length === 0 && (
            <div className={`${tarjeta} mt-4 flex flex-col items-center px-6 py-12 text-center`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <Icono nombre="video" className="h-7 w-7" />
              </span>
              <p className="mt-4 text-[16px] font-semibold text-zinc-900">Todavía no tienes videos</p>
              <p className="mt-1 max-w-sm text-[14px] text-zinc-500">
                Puedes llenar la ficha desde ya y subir las tomas cuando estés en el inmueble.
              </p>
              <button onClick={nuevo} disabled={creando} className={`${botonPrimario} mt-5`}>
                Crear mi primer video
              </button>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {visibles.map((v) => (
              <Link
                key={v.id}
                href={`/broker/videos/${v.id}`}
                className={`${tarjeta} group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,16,16,0.04),0_18px_40px_-20px_rgba(16,16,16,0.25)]`}
              >
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                    v.estado === 'vista_previa' ? 'bg-orange-600 text-white' : v.estado === 'desbloqueado' ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  <Icono nombre={ICONO_ESTADO[v.estado] ?? 'video'} className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-zinc-900">{v.ficha?.tipo ? tituloVideo(v.ficha) : 'Video sin ficha'}</span>
                  <span className="mt-0.5 block text-[12px] text-zinc-500">
                    {codigoVideo(v.id)} · {v.tomas_inmueble?.[0]?.count ?? 0} tomas ·{' '}
                    {new Date(v.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <EtiquetaEstado estado={v.estado} />
                  </span>
                </span>
                <span className="hidden items-center gap-1 text-[13px] font-semibold text-zinc-900 sm:flex">
                  {ACCION[v.estado]}
                  <Icono nombre="flechaDer" className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <GuiaGrabacion />
        </section>
      </main>
    </div>
  );
}
