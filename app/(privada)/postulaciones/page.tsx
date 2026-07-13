'use client';

// app/(privada)/postulaciones/page.tsx — v3
// Centro de control del marketplace:
// Resumen · Pendientes (ficha completa: fotos, datos, cliente, broker+WhatsApp)
// · En proceso (8 estados) · Rechazadas

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const PIPELINE = [
  'postulado', 'validado', 'acuerdo_firmado', 'presentado',
  'visita', 'negociacion', 'cierre', 'comision_repartida',
] as const;

const NOMBRES: Record<string, string> = {
  postulado: 'Postulado',
  validado: 'Validado',
  acuerdo_firmado: 'Acuerdo firmado',
  presentado: 'Presentado',
  visita: 'Visita',
  negociacion: 'Negociación',
  cierre: 'Cierre',
  comision_repartida: 'Comisión repartida',
  rechazado: 'Rechazado',
};

const formatoCOP = (n?: number | null) =>
  n == null ? '—' : '$' + Math.round(Number(n) / 1000000) + 'M';

const formatoCOPcompleto = (n?: number | null) =>
  n == null ? null : '$' + Number(n).toLocaleString('es-CO');

const formatoFechaCorta = (f: string) =>
  new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

function linkWhatsApp(tel?: string | null) {
  if (!tel) return null;
  const d = tel.replace(/\D/g, '');
  if (!d) return null;
  return 'https://wa.me/' + (d.length === 10 ? '57' + d : d);
}

export default function MarketplaceControl() {
  const supabase = createClient();
  const [tab, setTab] = useState<'resumen' | 'pendientes' | 'proceso' | 'rechazadas'>('resumen');
  const [resumen, setResumen] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aprobando, setAprobando] = useState<string | null>(null);

  function urlPublica(ruta: string) {
    const { data } = supabase.storage.from('propiedades').getPublicUrl(ruta);
    return data.publicUrl;
  }

  async function cargar() {
    setCargando(true);
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.rpc('marketplace_resumen'),
      supabase.rpc('marketplace_postulaciones_admin'),
    ]);
    setResumen(r ?? null);
    setItems(p ?? []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []); // eslint-disable-line

  async function aprobar(p: any) {
    setAprobando(p.id);
    const { error } = await supabase.rpc('aprobar_postulacion', { p_postulacion_id: p.id });
    setAprobando(null);
    if (error) { alert('No se pudo aprobar: ' + error.message); return; }
    cargar();
  }

  async function cambiarEstado(p: any, nuevo: string, comentario?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('marketplace_postulaciones')
      .update({ estado: nuevo, updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (error) return;
    await supabase.from('marketplace_eventos').insert({
      postulacion_id: p.id,
      estado_anterior: p.estado,
      estado_nuevo: nuevo,
      comentario: comentario ?? null,
      profile_id: user?.id,
    });
    cargar();
  }

  function mover(p: any, direccion: 1 | -1) {
    const i = PIPELINE.indexOf(p.estado);
    const nuevo = PIPELINE[i + direccion];
    if (nuevo) cambiarEstado(p, nuevo);
  }

  const pendientes = items.filter((p) => p.estado === 'postulado');
  const enProceso = items.filter((p) => p.estado !== 'rechazado');
  const rechazadas = items.filter((p) => p.estado === 'rechazado');

  const KPIS = resumen ? [
    { etiqueta: 'Brokers registrados', valor: resumen.brokers },
    { etiqueta: 'Compradores publicados', valor: resumen.publicados },
    { etiqueta: 'Inmuebles postulados', valor: resumen.total },
    { etiqueta: 'Pendientes por aprobar', valor: resumen.pendientes },
    { etiqueta: 'En proceso', valor: resumen.en_proceso },
    { etiqueta: 'Cierres logrados', valor: resumen.cerradas },
    { etiqueta: 'Rechazados', valor: resumen.rechazadas },
    { etiqueta: 'Pipeline estimado', valor: formatoCOP(resumen.pipeline) },
  ] : [];

  function ParaCliente({ p, claro = false }: { p: any; claro?: boolean }) {
    return (
      <p className={`text-[11px] ${claro ? 'text-[#B9B9B3]' : 'text-[#8C8C86]'}`}>
        Para: <span className="text-[#141414]">{p.cliente_nombre ?? 'Cliente'}</span>
        {' '}· #{p.codigo}
      </p>
    );
  }

  function ContactoBroker({ p }: { p: any }) {
    const tel = p.contacto_telefono || p.broker_telefono;
    const wa = linkWhatsApp(tel);
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[11px] text-[#8C8C86]">
          Broker: <span className="text-[#141414]">{p.broker_nombre ?? '—'}</span>
          {p.broker_empresa ? ` · ${p.broker_empresa}` : ''}
        </p>
        {tel && (
          <span className="text-[11px] text-[#8C8C86]">{tel}</span>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer"
            className="text-[10px] uppercase tracking-[0.12em] text-[#141414] border border-[#141414] rounded-full px-2.5 py-0.5 hover:bg-[#141414] hover:text-[#FAFAF7] transition-colors">
            WhatsApp
          </a>
        )}
        {p.broker_email && (
          <a href={`mailto:${p.broker_email}`}
            className="text-[11px] text-[#8C8C86] underline underline-offset-4 hover:text-[#141414]">
            {p.broker_email}
          </a>
        )}
      </div>
    );
  }

  function Spec({ etiqueta, valor }: { etiqueta: string; valor: any }) {
    if (valor == null || valor === '') return null;
    return (
      <div>
        <p className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86] mb-0.5">{etiqueta}</p>
        <p className="text-[13px] text-[#141414] tracking-tight">{valor}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] px-8 py-10">
      <p className="text-[9px] uppercase tracking-[0.2em] text-[#8C8C86] mb-2">Marketplace</p>
      <h1 className="text-2xl tracking-tight text-[#141414] mb-8">Centro de control</h1>

      <div className="flex gap-6 border-b border-[#E6E6E1] mb-10 overflow-x-auto">
        {[
          { k: 'resumen', l: 'Resumen' },
          { k: 'pendientes', l: `Pendientes${pendientes.length ? ` (${pendientes.length})` : ''}` },
          { k: 'proceso', l: 'En proceso' },
          { k: 'rechazadas', l: 'Rechazadas' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`pb-3 text-sm whitespace-nowrap transition-colors ${tab === t.k ? 'text-[#141414] border-b border-[#141414] -mb-px' : 'text-[#8C8C86]'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-[#8C8C86]">Cargando…</p>
      ) : (
        <>
          {/* ============ RESUMEN ============ */}
          {tab === 'resumen' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-[#E6E6E1]">
                {KPIS.map((k) => (
                  <div key={k.etiqueta} className="border-b border-r border-[#E6E6E1] px-6 py-7 bg-white">
                    <p className="text-[28px] tracking-tight text-[#141414] leading-none">
                      {k.valor ?? 0}
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86] mt-3">
                      {k.etiqueta}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <p className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86] mb-4">
                  Últimas postulaciones
                </p>
                <div className="divide-y divide-[#E6E6E1] border-t border-b border-[#E6E6E1]">
                  {items.slice(0, 6).map((p) => (
                    <div key={p.id} className="py-4 flex items-center gap-4">
                      <span className="text-[11px] text-[#B9B9B3] w-14 shrink-0">
                        {formatoFechaCorta(p.created_at)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#141414] tracking-tight truncate">{p.titulo}</p>
                        <ParaCliente p={p} />
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#141414] border border-[#E6E6E1] rounded-full px-3 py-1 shrink-0">
                        {NOMBRES[p.estado]}
                      </span>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="py-6 text-sm text-[#8C8C86]">Aún no hay postulaciones.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ============ PENDIENTES ============ */}
          {tab === 'pendientes' && (
            <div className="space-y-8 max-w-3xl">
              {pendientes.length === 0 && (
                <p className="text-sm text-[#8C8C86]">No hay postulaciones pendientes por aprobar.</p>
              )}
              {pendientes.map((p) => {
                const d = p.datos_inmueble ?? {};
                const fotos: string[] = p.fotos_rutas ?? [];
                return (
                  <article key={p.id} className="border border-[#E6E6E1] bg-white">
                    {/* Encabezado */}
                    <div className="px-7 pt-6 pb-4 border-b border-[#E6E6E1]">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h2 className="text-[16px] tracking-tight text-[#141414]">{p.titulo}</h2>
                        <span className="text-[15px] tracking-tight text-[#141414] shrink-0">
                          {formatoCOP(p.precio)}
                        </span>
                      </div>
                      <ParaCliente p={p} />
                    </div>

                    {/* Fotos */}
                    {fotos.length > 0 && (
                      <div className="px-7 pt-5 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {fotos.map((ruta, idx) => (
                          <a key={ruta} href={urlPublica(ruta)} target="_blank" rel="noreferrer">
                            <img
                              src={urlPublica(ruta)}
                              alt={`Foto ${idx + 1}`}
                              className="aspect-[4/3] w-full rounded-lg object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Datos del inmueble */}
                    <div className="px-7 py-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                      <Spec etiqueta="Área" valor={d.area ? `${d.area} m²` : null} />
                      <Spec etiqueta="Habitaciones" valor={d.habitaciones ?? p.alcobas} />
                      <Spec etiqueta="Baños" valor={d.banos ?? p.banos} />
                      <Spec etiqueta="Parqueaderos" valor={d.parqueaderos} />
                      <Spec etiqueta="Estrato" valor={d.estrato} />
                      <Spec etiqueta="Administración" valor={formatoCOPcompleto(d.administracion)} />
                      <Spec etiqueta="Ciudad" valor={d.ciudad} />
                      <Spec etiqueta="Barrio" valor={d.barrio} />
                    </div>
                    {(d.direccion || d.amenidades) && (
                      <div className="px-7 pb-5 space-y-2">
                        {d.direccion && (
                          <p className="text-[12px] text-[#8C8C86]">
                            <span className="uppercase tracking-[0.12em] text-[9px] mr-2">Dirección</span>
                            <span className="text-[#141414]">{d.direccion}</span>
                          </p>
                        )}
                        {d.amenidades && (
                          <p className="text-[12px] text-[#8C8C86]">
                            <span className="uppercase tracking-[0.12em] text-[9px] mr-2">Amenidades</span>
                            <span className="text-[#141414]">{d.amenidades}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {p.descripcion && (
                      <p className="mx-7 mb-5 text-[13px] leading-relaxed text-[#141414] border-l border-[#E6E6E1] pl-4">
                        {p.descripcion}
                      </p>
                    )}

                    {/* Broker + acciones */}
                    <div className="px-7 py-4 border-t border-[#E6E6E1] flex flex-wrap items-center gap-3 justify-between">
                      <ContactoBroker p={p} />
                      <div className="flex gap-3">
                        <button
                          onClick={() => cambiarEstado(p, 'rechazado')}
                          className="rounded-full border border-[#E6E6E1] text-[#8C8C86] text-sm px-5 py-2 hover:text-[#141414] hover:border-[#141414] transition-colors"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => aprobar(p)}
                          disabled={aprobando === p.id}
                          className="rounded-full bg-[#141414] text-[#FAFAF7] text-sm px-6 py-2 hover:opacity-80 transition-opacity disabled:opacity-40"
                        >
                          {aprobando === p.id ? 'Aprobando…' : 'Aprobar'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ============ EN PROCESO ============ */}
          {tab === 'proceso' && (
            <div className="flex gap-px overflow-x-auto pb-4 border-t border-[#E6E6E1] pt-6">
              {PIPELINE.map((estado, idx) => {
                const cols = enProceso.filter((p) => p.estado === estado);
                return (
                  <div key={estado} className="min-w-[230px] flex-1">
                    <div className="flex items-baseline gap-2 mb-4 px-3">
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.12em] text-[#141414]">
                        {NOMBRES[estado]}
                      </span>
                      <span className="text-[11px] text-[#B9B9B3]">{cols.length}</span>
                    </div>
                    <div className="space-y-px">
                      {cols.map((p) => (
                        <div key={p.id} className="bg-white border border-[#E6E6E1] p-4 mx-1">
                          <p className="text-sm text-[#141414] tracking-tight mb-1 leading-snug">{p.titulo}</p>
                          <ParaCliente p={p} />
                          <p className="text-xs text-[#8C8C86] my-1">
                            {[p.ubicacion, formatoCOP(p.precio)].filter(Boolean).join(' · ')}
                          </p>
                          <ContactoBroker p={p} />
                          <div className="flex justify-between border-t border-[#E6E6E1] pt-2 mt-3">
                            <button onClick={() => mover(p, -1)} disabled={estado === PIPELINE[0]}
                              className="text-xs text-[#8C8C86] disabled:opacity-20 hover:text-[#141414] transition-colors">
                              ← Atrás
                            </button>
                            <button onClick={() => mover(p, 1)} disabled={estado === PIPELINE[PIPELINE.length - 1]}
                              className="text-xs text-[#141414] disabled:opacity-20 hover:opacity-70 transition-opacity">
                              Avanzar →
                            </button>
                          </div>
                        </div>
                      ))}
                      {cols.length === 0 && <p className="text-xs text-[#B9B9B3] px-3">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============ RECHAZADAS ============ */}
          {tab === 'rechazadas' && (
            <div className="divide-y divide-[#E6E6E1] border-t border-b border-[#E6E6E1] max-w-3xl">
              {rechazadas.length === 0 && (
                <p className="py-6 text-sm text-[#8C8C86]">No has rechazado ninguna postulación.</p>
              )}
              {rechazadas.map((p) => (
                <div key={p.id} className="py-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#141414] tracking-tight truncate">{p.titulo}</p>
                    <ParaCliente p={p} />
                  </div>
                  <button
                    onClick={() => cambiarEstado(p, 'postulado', 'Reabierta')}
                    className="text-xs text-[#8C8C86] underline underline-offset-4 hover:text-[#141414] transition-colors shrink-0"
                  >
                    Reabrir
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
