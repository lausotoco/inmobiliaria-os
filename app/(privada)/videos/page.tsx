'use client';

// app/(privada)/videos/page.tsx — Panel de Laura · Video por inmueble.
// La fila de edición con el reloj de entrega (40 minutos), las vistas previas que esperan
// pago, los pagos de Wompi y el espacio usado del plan gratis.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatoCOP } from '@/lib/utils';
import { ESPACIO_GRATIS_BYTES, codigoVideo, entregaEstimada, formatoMB, tituloVideo, type EstadoVideo, type Ficha } from '@/lib/videos/config';
import { api } from '@/lib/videos/subir';
import { EtiquetaEstado, Icono, tarjeta } from '@/components/videos/ui';

type Video = {
  id: string;
  agente_id: string;
  ficha: Ficha;
  estado: EstadoVideo;
  enviado_at: string | null;
  metodo: string | null;
  peso_tomas: number;
  peso_entregas: number;
  tomas_borradas_at: string | null;
  tomas_inmueble: { count: number }[];
};
type Pago = {
  id: string;
  video_id: string | null;
  agente_id: string | null;
  referencia: string;
  monto: number;
  estado: string;
  medio: string | null;
  ambiente: string | null;
  creado_en: string;
  aprobado_en: string | null;
};
type Perfil = { id: string; nombre: string | null; empresa: string | null; email: string | null };
type Datos = { videos: Video[]; pagos: Pago[]; perfiles: Perfil[]; borradores: number; pesoTotal: number; precio: number | null };
type Pestana = 'editar' | 'previas' | 'regrabar' | 'desbloqueados' | 'pagos';

function reloj(enviado: string | null) {
  if (!enviado) return { texto: '—', vencido: false, min: 0, sub: '' };
  const limite = entregaEstimada(new Date(enviado));
  const min = Math.round((limite.getTime() - Date.now()) / 60000);
  const hora = limite.toLocaleString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: '2-digit' });
  if (min < 0) return { texto: 'Vencido', vencido: true, min, sub: hora };
  const h = Math.floor(min / 60);
  return { texto: `${h ? `${h} h ` : ''}${min % 60} min`, vencido: false, min, sub: hora };
}

const ESTADO_PAGO: Record<string, string> = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', anulado: 'Anulado', error: 'Revisar' };
const COLOR_PAGO: Record<string, string> = {
  aprobado: 'bg-emerald-50 text-emerald-700',
  pendiente: 'bg-amber-50 text-amber-700',
  rechazado: 'bg-zinc-100 text-zinc-500',
  anulado: 'bg-zinc-100 text-zinc-500',
  error: 'bg-red-50 text-red-700',
};

export default function PanelVideos() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState<Pestana>('editar');
  const [, setTic] = useState(0);

  useEffect(() => {
    const cargar = () => api<Datos>('/api/videos?panel=1', 'GET').then(setDatos).catch((e) => setError((e as Error).message));
    cargar();
    const t = setInterval(cargar, 60000);
    const r = setInterval(() => setTic((x) => x + 1), 30000); // el reloj avanza
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, []);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!datos)
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );

  const agente = (id: string | null) => {
    const p = datos.perfiles.find((x) => x.id === id);
    return p?.nombre || p?.empresa || p?.email || 'Agente';
  };
  const porEditar = datos.videos
    .filter((v) => v.estado === 'recibido' || v.estado === 'en_edicion')
    .sort((a, b) => (a.enviado_at ?? '').localeCompare(b.enviado_at ?? ''));
  const previas = datos.videos.filter((v) => v.estado === 'vista_previa');
  const regrabar = datos.videos.filter((v) => v.estado === 'rechazado');
  const desbloqueados = datos.videos.filter((v) => v.estado === 'desbloqueado');
  const mes = new Date().toISOString().slice(0, 7);
  const aprobadosMes = datos.pagos.filter((p) => p.estado === 'aprobado' && p.ambiente !== 'test' && (p.aprobado_en ?? '').startsWith(mes));
  const cobradoMes = aprobadosMes.reduce((s, p) => s + Number(p.monto), 0);
  const usoPct = Math.min(100, Math.round((datos.pesoTotal / ESPACIO_GRATIS_BYTES) * 100));
  const vencidos = porEditar.filter((v) => reloj(v.enviado_at).vencido).length;
  const listas: Record<Exclude<Pestana, 'pagos'>, Video[]> = { editar: porEditar, previas, regrabar, desbloqueados };

  const tarjetas = [
    { i: 'varita', t: 'Por editar', v: String(porEditar.length), pie: vencidos ? `${vencidos} vencido${vencidos > 1 ? 's' : ''}` : 'a tiempo', alerta: vencidos > 0, barra: null as number | null },
    { i: 'ojo', t: 'Esperando pago', v: String(previas.length), pie: 'vistas previas publicadas', alerta: false, barra: null },
    { i: 'tarjetaPago', t: 'Cobrado este mes', v: formatoCOP(cobradoMes), pie: `${aprobadosMes.length} ${aprobadosMes.length === 1 ? 'pago' : 'pagos'} por Wompi`, alerta: false, barra: null },
    { i: 'subir', t: 'Espacio en videos', v: `${usoPct}%`, pie: `${formatoMB(datos.pesoTotal)} de 1 GB (con fotos)`, alerta: false, barra: usoPct },
  ];

  return (
    <div className="app-videos anim-entrada text-zinc-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-zinc-500">KYRELO Marketing</p>
          <h1 className="mt-0.5 text-[28px] font-semibold">Videos por inmueble</h1>
          <p className="mt-1 text-[14px] text-zinc-500">Cada material nuevo te llega también por Telegram.</p>
        </div>
        <p className="text-[13px] text-zinc-500">
          {datos.precio ? `Desbloqueo: ${formatoCOP(datos.precio)}` : 'Falta VIDEO_PRECIO_DESBLOQUEO en Netlify'} · {datos.borradores} en borrador
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tarjetas.map((c) => (
          <div key={c.t} className={`${tarjeta} p-4`}>
            <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-500">
              <Icono nombre={c.i} className="h-4 w-4" />
              {c.t}
            </div>
            <p className="mt-2 text-[24px] font-semibold leading-none tracking-tight sm:text-[26px]">{c.v}</p>
            {c.barra !== null && (
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className={`h-full rounded-full ${c.barra >= 70 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${c.barra}%` }} />
              </div>
            )}
            <p className={`mt-2 text-[12px] ${c.alerta ? 'font-semibold text-red-600' : 'text-zinc-500'}`}>{c.pie}</p>
          </div>
        ))}
      </div>
      {usoPct >= 70 && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-amber-200">
          El espacio gratis se está llenando. En los videos ya publicados usa «Liberar espacio».
        </p>
      )}

      <div className="mt-8 flex gap-1 overflow-x-auto rounded-xl bg-zinc-200/60 p-1">
        {(
          [
            ['editar', 'Por editar', porEditar.length],
            ['previas', 'Vistas previas', previas.length],
            ['regrabar', 'Regrabar', regrabar.length],
            ['desbloqueados', 'Desbloqueados', desbloqueados.length],
            ['pagos', 'Pagos', null],
          ] as [Pestana, string, number | null][]
        ).map(([k, l, n]) => (
          <button
            key={k}
            onClick={() => setPestana(k)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${pestana === k ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            {l}
            {n !== null && <span className={`rounded-full px-1.5 text-[11px] ${pestana === k ? 'bg-zinc-900 text-white' : 'bg-zinc-300/70 text-zinc-600'}`}>{n}</span>}
          </button>
        ))}
      </div>

      {pestana !== 'pagos' && (
        <div className="mt-4 space-y-2.5">
          {listas[pestana].length === 0 && <div className={`${tarjeta} px-6 py-10 text-center text-[14px] text-zinc-500`}>Nada por aquí.</div>}
          {listas[pestana].map((v) => {
            const r = reloj(v.enviado_at);
            return (
              <Link key={v.id} href={`/videos/${v.id}`} className={`${tarjeta} group flex flex-wrap items-center gap-4 p-4 transition hover:-translate-y-0.5`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <Icono nombre="video" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{tituloVideo(v.ficha ?? {})}</p>
                  <p className="mt-0.5 text-[12px] text-zinc-500">
                    {codigoVideo(v.id)} · {agente(v.agente_id)} · {v.tomas_inmueble?.[0]?.count ?? 0} tomas
                    {v.tomas_borradas_at ? ' (borradas)' : ` · ${formatoMB(Number(v.peso_tomas) + Number(v.peso_entregas))}`}
                    {v.metodo === 'manual' ? ' · desbloqueo a mano' : ''}
                  </p>
                </div>
                {pestana === 'editar' ? (
                  <div className={`rounded-xl px-3 py-2 text-right ${r.vencido ? 'bg-red-50 text-red-700' : r.min < 60 ? 'bg-amber-50 text-amber-800' : 'bg-zinc-50 text-zinc-800'}`}>
                    <p className="flex items-center justify-end gap-1.5 text-[14px] font-semibold">
                      <Icono nombre="reloj" className="h-4 w-4" />
                      {r.texto}
                    </p>
                    <p className="text-[11px] opacity-70">entregar {r.sub}</p>
                  </div>
                ) : (
                  <EtiquetaEstado estado={v.estado} />
                )}
              </Link>
            );
          })}
        </div>
      )}

      {pestana === 'pagos' && (
        <div className={`${tarjeta} mt-4 overflow-x-auto`}>
          <table className="w-full text-left text-[13px]">
            <thead className="text-[12px] text-zinc-500">
              <tr>
                {['Fecha', 'Agente', 'Video', 'Monto', 'Estado', 'Medio'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.pagos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-zinc-500">
                    Todavía no hay pagos.
                  </td>
                </tr>
              )}
              {datos.pagos.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(p.creado_en).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">{agente(p.agente_id)}</td>
                  <td className="px-4 py-3">
                    {p.video_id ? (
                      <Link href={`/videos/${p.video_id}`} className="font-medium underline decoration-zinc-300 underline-offset-2">
                        {codigoVideo(p.video_id)}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatoCOP(p.monto)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${COLOR_PAGO[p.estado] ?? 'bg-zinc-100'}`}>
                      {ESTADO_PAGO[p.estado] ?? p.estado}
                      {p.ambiente === 'test' ? ' · prueba' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{p.medio ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
