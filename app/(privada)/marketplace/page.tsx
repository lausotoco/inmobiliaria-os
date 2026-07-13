'use client';

// app/(privada)/marketplace/page.tsx
// Vista del BROKER: busca compradores anonimizados y postula inmuebles.
// El broker NUNCA ve nombre, cédula ni contacto del comprador.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ESTADOS: Record<string, string> = {
  postulado: 'Postulado',
  validado: 'Validado',
  acuerdo_firmado: 'Acuerdo firmado',
  presentado: 'Presentado',
  visita: 'Visita',
  negociacion: 'Negociación',
  cierre: 'Cierre',
  comision_repartida: 'Comisión repartida',
};

function haceCuanto(fecha: string) {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  if (dias === 0) return 'actualizado hoy';
  if (dias === 1) return 'actualizado hace 1 día';
  return `actualizado hace ${dias} días`;
}

const formatoCOP = (n?: number | null) =>
  n == null ? '—' : '$' + Math.round(n / 1000000) + 'M';

export default function Marketplace() {
  const supabase = createClient();
  const [tab, setTab] = useState<'buscar' | 'mias'>('buscar');
  const [filtros, setFiltros] = useState({ alcobas: '', banos: '', zona: '', precioMax: '' });
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [mias, setMias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [postulando, setPostulando] = useState<any | null>(null); // tarjeta seleccionada
  const [formP, setFormP] = useState({ titulo: '', descripcion: '', precio: '', ubicacion: '', alcobas: '', banos: '', area: '', fotos_url: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function buscar() {
    setCargando(true);
    const { data, error } = await supabase.rpc('marketplace_buscar', {
      p_alcobas: filtros.alcobas ? Number(filtros.alcobas) : null,
      p_banos: filtros.banos ? Number(filtros.banos) : null,
      p_zona: filtros.zona || null,
      p_precio_max: filtros.precioMax ? Number(filtros.precioMax) * 1000000 : null,
    });
    if (!error) setTarjetas(data ?? []);
    setCargando(false);
  }

  async function cargarMias() {
    const { data } = await supabase
      .from('marketplace_postulaciones')
      .select('*')
      .order('updated_at', { ascending: false });
    setMias(data ?? []);
  }

  useEffect(() => { buscar(); cargarMias(); }, []); // eslint-disable-line

  async function postular() {
    if (!formP.titulo) { setMensaje('El título del inmueble es obligatorio.'); return; }
    setEnviando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('marketplace_postulaciones').insert({
      requerimiento_id: postulando.id,
      broker_profile_id: user?.id,
      titulo: formP.titulo,
      descripcion: formP.descripcion || null,
      precio: formP.precio ? Number(formP.precio) * 1000000 : null,
      ubicacion: formP.ubicacion || null,
      alcobas: formP.alcobas ? Number(formP.alcobas) : null,
      banos: formP.banos ? Number(formP.banos) : null,
      area: formP.area ? Number(formP.area) : null,
      fotos_url: formP.fotos_url || null,
    });
    setEnviando(false);
    if (error) { setMensaje(error.message); return; }
    setPostulando(null);
    setFormP({ titulo: '', descripcion: '', precio: '', ubicacion: '', alcobas: '', banos: '', area: '', fotos_url: '' });
    setMensaje('');
    cargarMias();
    setTab('mias');
  }

  const inputCls = 'w-full bg-transparent border-b border-[#E6E6E1] pb-1.5 text-sm text-[#141414] outline-none focus:border-[#141414] transition-colors';
  const labelCls = 'block text-[9px] uppercase tracking-[0.15em] text-[#8C8C86] mb-1';

  return (
    <div className="min-h-screen bg-[#FAFAF7] px-8 py-10 max-w-5xl mx-auto">
      <p className="text-[9px] uppercase tracking-[0.2em] text-[#8C8C86] mb-2">Marketplace</p>
      <h1 className="text-2xl tracking-tight text-[#141414] mb-8">Compradores activos</h1>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-[#E6E6E1] mb-8">
        {[
          { k: 'buscar', l: 'Buscar compradores' },
          { k: 'mias', l: `Mis postulaciones (${mias.length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`pb-3 text-sm transition-colors ${tab === t.k ? 'text-[#141414] border-b border-[#141414] -mb-px' : 'text-[#8C8C86]'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'buscar' && (
        <>
          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10 items-end">
            <div><label className={labelCls}>Alcobas mín.</label>
              <input className={inputCls} inputMode="numeric" value={filtros.alcobas} onChange={(e) => setFiltros({ ...filtros, alcobas: e.target.value })} /></div>
            <div><label className={labelCls}>Baños mín.</label>
              <input className={inputCls} inputMode="numeric" value={filtros.banos} onChange={(e) => setFiltros({ ...filtros, banos: e.target.value })} /></div>
            <div><label className={labelCls}>Zona</label>
              <input className={inputCls} placeholder="Cedritos" value={filtros.zona} onChange={(e) => setFiltros({ ...filtros, zona: e.target.value })} /></div>
            <div><label className={labelCls}>Presupuesto hasta (M)</label>
              <input className={inputCls} inputMode="numeric" placeholder="520" value={filtros.precioMax} onChange={(e) => setFiltros({ ...filtros, precioMax: e.target.value })} /></div>
            <button onClick={buscar} className="rounded-full bg-[#141414] text-[#FAFAF7] text-sm py-2.5 hover:opacity-80 transition-opacity">
              Filtrar
            </button>
          </div>

          {/* Tarjetas anonimizadas */}
          {cargando ? (
            <p className="text-sm text-[#8C8C86]">Buscando compradores…</p>
          ) : tarjetas.length === 0 ? (
            <p className="text-sm text-[#8C8C86]">No hay compradores publicados con esos filtros.</p>
          ) : (
            <div className="divide-y divide-[#E6E6E1] border-t border-b border-[#E6E6E1]">
              {tarjetas.map((t) => (
                <div key={t.id} className="py-6 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-sm text-[#141414] tracking-tight">Comprador #{t.codigo}</span>
                      <span className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86] border border-[#E6E6E1] rounded-full px-2.5 py-0.5">
                        {haceCuanto(t.updated_at)}
                      </span>
                      {t.postulaciones > 0 && (
                        <span className="text-[9px] uppercase tracking-[0.15em] text-[#8C8C86]">
                          {t.postulaciones} postulacion{t.postulaciones === 1 ? '' : 'es'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#8C8C86]">
                      {[t.tipo, t.alcobas && `${t.alcobas} alcobas`, t.banos && `${t.banos} baños`, t.zona, `hasta ${formatoCOP(t.presupuesto_max)}`, t.financiacion, t.urgencia]
                        .filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setPostulando(t)}
                    className="rounded-full border border-[#141414] text-[#141414] text-sm px-5 py-2 hover:bg-[#141414] hover:text-[#FAFAF7] transition-colors self-start md:self-auto"
                  >
                    Tengo un inmueble para este comprador
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'mias' && (
        <div className="divide-y divide-[#E6E6E1] border-t border-b border-[#E6E6E1]">
          {mias.length === 0 && <p className="py-6 text-sm text-[#8C8C86]">Aún no has postulado inmuebles.</p>}
          {mias.map((p) => (
            <div key={p.id} className="py-6 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-[#141414] tracking-tight mb-1">{p.titulo}</p>
                <p className="text-sm text-[#8C8C86]">
                  {[p.ubicacion, p.alcobas && `${p.alcobas} alcobas`, p.precio && formatoCOP(p.precio)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-[#141414] border border-[#E6E6E1] rounded-full px-3 py-1">
                {ESTADOS[p.estado]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal de postulación */}
      {postulando && (
        <div className="fixed inset-0 bg-[#141414]/30 flex items-center justify-center px-6 z-50">
          <div className="bg-[#FAFAF7] w-full max-w-md p-8 max-h-[85vh] overflow-y-auto">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8C8C86] mb-1">
              Comprador #{postulando.codigo}
            </p>
            <h2 className="text-lg tracking-tight text-[#141414] mb-6">Postular inmueble</h2>

            <div className="space-y-4">
              <div><label className={labelCls}>Título *</label>
                <input className={inputCls} value={formP.titulo} onChange={(e) => setFormP({ ...formP, titulo: e.target.value })} /></div>
              <div><label className={labelCls}>Descripción</label>
                <input className={inputCls} value={formP.descripcion} onChange={(e) => setFormP({ ...formP, descripcion: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelCls}>Precio (M)</label>
                  <input className={inputCls} inputMode="numeric" value={formP.precio} onChange={(e) => setFormP({ ...formP, precio: e.target.value })} /></div>
                <div><label className={labelCls}>Alcobas</label>
                  <input className={inputCls} inputMode="numeric" value={formP.alcobas} onChange={(e) => setFormP({ ...formP, alcobas: e.target.value })} /></div>
                <div><label className={labelCls}>Baños</label>
                  <input className={inputCls} inputMode="numeric" value={formP.banos} onChange={(e) => setFormP({ ...formP, banos: e.target.value })} /></div>
              </div>
              <div><label className={labelCls}>Ubicación</label>
                <input className={inputCls} value={formP.ubicacion} onChange={(e) => setFormP({ ...formP, ubicacion: e.target.value })} /></div>
              <div><label className={labelCls}>Link a fotos</label>
                <input className={inputCls} value={formP.fotos_url} onChange={(e) => setFormP({ ...formP, fotos_url: e.target.value })} /></div>
            </div>

            {mensaje && <p className="text-xs text-[#141414] mt-4 border-l border-[#141414] pl-3">{mensaje}</p>}

            <div className="flex gap-3 mt-8">
              <button onClick={postular} disabled={enviando}
                className="flex-1 rounded-full bg-[#141414] text-[#FAFAF7] text-sm py-2.5 hover:opacity-80 transition-opacity disabled:opacity-40">
                {enviando ? 'Enviando…' : 'Postular'}
              </button>
              <button onClick={() => { setPostulando(null); setMensaje(''); }}
                className="rounded-full border border-[#E6E6E1] text-[#8C8C86] text-sm px-5 py-2.5">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
