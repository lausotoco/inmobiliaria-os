'use client';

// app/broker/page.tsx — v2
// Portal independiente del broker con fichas editoriales organizadas
// por secciones (estilo portafolio): especificaciones, zonas de
// preferencia, amenidades y comentarios del cliente.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP } from '@/lib/config';
import SubirFotosPostulacion from '@/components/broker/SubirFotosPostulacion';

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
  if (dias === 0) return 'Actualizado hoy';
  if (dias === 1) return 'Actualizado hace 1 día';
  return `Actualizado hace ${dias} días`;
}

const formatoCOP = (n?: number | null) =>
  n == null ? null : '$' + Math.round(Number(n) / 1000000) + 'M';

// Convierte arrays o texto separado por comas en lista de chips
function aLista(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

function rango(min?: number | null, max?: number | null, sufijo = '') {
  const a = min != null ? Math.round(Number(min)) : null;
  const b = max != null ? Math.round(Number(max)) : null;
  if (a != null && b != null) return `${a} – ${b}${sufijo}`;
  if (b != null) return `hasta ${b}${sufijo}`;
  if (a != null) return `desde ${a}${sufijo}`;
  return null;
}

function rangoPresupuesto(min?: number | null, max?: number | null) {
  const a = formatoCOP(min);
  const b = formatoCOP(max);
  if (a && b) return `${a} – ${b}`;
  if (b) return `Hasta ${b}`;
  if (a) return `Desde ${a}`;
  return '—';
}

export default function PortalBroker() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState<'buscar' | 'mias'>('buscar');
  const [filtros, setFiltros] = useState({ alcobas: '', banos: '', zona: '', precioMax: '' });
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [mias, setMias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [postulando, setPostulando] = useState<any | null>(null);
  const [formP, setFormP] = useState({
    titulo: '', precio: '', area: '', habitaciones: '', banos: '', parqueaderos: '',
    administracion: '', estrato: '', descripcion: '', amenidades: '',
    barrio: '', ciudad: '', direccion: '', contacto: '',
  });
  const [telPerfil, setTelPerfil] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [tempId, setTempId] = useState('');
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? '');
      if (user) {
        supabase.from('profiles').select('telefono').eq('id', user.id).maybeSingle()
          .then(({ data }) => setTelPerfil(data?.telefono ?? ''));
      }
    });
    buscar();
    cargarMias();
  }, []); // eslint-disable-line

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push('/brokers');
    router.refresh();
  }

  async function postular() {
    if (!formP.titulo) { setMensaje('El título del inmueble es obligatorio.'); return; }
    if (fotos.length === 0) { setMensaje('Sube al menos una foto del inmueble.'); return; }
    if (!formP.contacto.trim()) { setMensaje('Escribe tu celular o WhatsApp de contacto.'); return; }
    setEnviando(true);

    const { data: { user }, error: errUser } = await supabase.auth.getUser();
    if (errUser || !user) {
      setEnviando(false);
      setMensaje('Tu sesión expiró. Cierra sesión y vuelve a entrar.');
      return;
    }

    const { error } = await supabase.from('marketplace_postulaciones').insert({
      requerimiento_id: postulando.id,
      broker_profile_id: user.id,
      titulo: formP.titulo,
      descripcion: formP.descripcion || null,
      precio: formP.precio ? Number(formP.precio) * 1000000 : null,
      ubicacion: [formP.direccion, formP.barrio, formP.ciudad].filter(Boolean).join(', ') || null,
      alcobas: formP.habitaciones ? Number(formP.habitaciones) : null,
      banos: formP.banos ? Number(formP.banos) : null,
      area: formP.area ? Number(formP.area) : null,
      fotos_url: null,
      datos_inmueble: {
        area: formP.area ? Number(formP.area) : null,
        habitaciones: formP.habitaciones ? Number(formP.habitaciones) : null,
        banos: formP.banos ? Number(formP.banos) : null,
        parqueaderos: formP.parqueaderos ? Number(formP.parqueaderos) : null,
        administracion: formP.administracion ? Number(formP.administracion) : null,
        estrato: formP.estrato ? Number(formP.estrato) : null,
        amenidades: formP.amenidades || null,
        barrio: formP.barrio || null,
        ciudad: formP.ciudad || null,
        direccion: formP.direccion || null,
      },
      contacto_telefono: formP.contacto.trim(),
      fotos_rutas: fotos,
      temp_id: tempId,
    });
    setEnviando(false);
    if (error) { setMensaje('No se pudo postular: ' + error.message); return; }
    setPostulando(null);
    setFotos([]);
    setMensaje('');
    cargarMias();
    setTab('mias');
  }

  const inputCls = 'w-full bg-transparent border-b border-[#E0DDD2] pb-1.5 text-sm text-[#1A1A18] outline-none focus:border-[#1A1A18] transition-colors';
  const labelCls = 'block text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-1';
  const badgeCls = 'text-[9px] uppercase tracking-[0.15em] border border-[#E0DDD2] rounded-full px-2.5 py-0.5';

  function Spec({ etiqueta, valor }: { etiqueta: string; valor: any }) {
    if (valor == null || valor === '' ) return null;
    return (
      <div>
        <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-1">{etiqueta}</p>
        <p className="text-[15px] text-[#1A1A18] tracking-tight">{valor}</p>
      </div>
    );
  }

  function Chips({ etiqueta, items }: { etiqueta: string; items: string[] }) {
    if (items.length === 0) return null;
    return (
      <div className="mt-6">
        <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-2">{etiqueta}</p>
        <div className="flex flex-wrap gap-2">
          {items.map((z) => (
            <span key={z} className="text-[11px] text-[#1A1A18] border border-[#E0DDD2] rounded-full px-3 py-1">
              {z}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1EFE8]">
      <header className="border-b border-[#E0DDD2] px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold tracking-tight text-[#1A1A18]">{APP.nombre}</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#A8A69E] mt-0.5">
            Red de brokers
          </p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <a href="/" className="text-[12px] font-medium text-[#5F5E5A] hover:text-[#1A1A18] transition">
            Inicio
          </a>
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#A8A69E] truncate max-w-[180px]">{email}</p>
            <button onClick={cerrarSesion}
              className="text-[12px] font-medium text-[#5F5E5A] hover:text-[#1A1A18] transition">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="px-8 py-10 max-w-3xl mx-auto">
        <h1 className="text-2xl tracking-tight text-[#1A1A18] mb-8">Compradores activos</h1>

        <div className="flex gap-6 border-b border-[#E0DDD2] mb-8">
          {[
            { k: 'buscar', l: 'Buscar compradores' },
            { k: 'mias', l: `Mis postulaciones (${mias.length})` },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`pb-3 text-sm transition-colors ${tab === t.k ? 'text-[#1A1A18] border-b border-[#1A1A18] -mb-px' : 'text-[#5F5E5A]'}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'buscar' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12 items-end">
              <div><label className={labelCls}>Alcobas mín.</label>
                <input className={inputCls} inputMode="numeric" value={filtros.alcobas} onChange={(e) => setFiltros({ ...filtros, alcobas: e.target.value })} /></div>
              <div><label className={labelCls}>Baños mín.</label>
                <input className={inputCls} inputMode="numeric" value={filtros.banos} onChange={(e) => setFiltros({ ...filtros, banos: e.target.value })} /></div>
              <div><label className={labelCls}>Zona</label>
                <input className={inputCls} placeholder="Cedritos" value={filtros.zona} onChange={(e) => setFiltros({ ...filtros, zona: e.target.value })} /></div>
              <div><label className={labelCls}>Presupuesto hasta (M)</label>
                <input className={inputCls} inputMode="numeric" placeholder="520" value={filtros.precioMax} onChange={(e) => setFiltros({ ...filtros, precioMax: e.target.value })} /></div>
              <button onClick={buscar} className="rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm py-2.5 hover:opacity-80 transition-opacity">
                Filtrar
              </button>
            </div>

            {cargando ? (
              <p className="text-sm text-[#5F5E5A]">Buscando compradores…</p>
            ) : tarjetas.length === 0 ? (
              <p className="text-sm text-[#5F5E5A]">No hay compradores publicados con esos filtros.</p>
            ) : (
              <div className="space-y-10">
                {tarjetas.map((t) => {
                  const zonas = aLista(t.zonas);
                  const amenidades = aLista(t.amenidades);
                  const area = rango(t.area_min, t.area_max, ' m²');
                  return (
                    <article key={t.id} className="border border-[#E0DDD2] bg-white">
                      {/* Encabezado de la ficha */}
                      <div className="px-8 pt-7 pb-5 border-b border-[#E0DDD2] flex flex-wrap items-center gap-3">
                        <h2 className="text-lg tracking-tight text-[#1A1A18] mr-auto">
                          Comprador #{t.codigo}
                        </h2>
                        <span className={`${badgeCls} text-[#5F5E5A]`}>{haceCuanto(t.updated_at)}</span>
                        {t.urgencia && <span className={`${badgeCls} text-[#1A1A18]`}>{t.urgencia}</span>}
                        {t.financiacion && <span className={`${badgeCls} text-[#1A1A18]`}>{t.financiacion}</span>}
                      </div>

                      <div className="px-8 py-7">
                        {/* Especificaciones en retícula */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
                          <Spec etiqueta="Tipo de inmueble" valor={t.tipo} />
                          <Spec etiqueta="Presupuesto" valor={rangoPresupuesto(t.presupuesto_min, t.presupuesto_max)} />
                          <Spec etiqueta="Ciudad" valor={t.ciudad} />
                          <Spec etiqueta="Alcobas" valor={t.alcobas} />
                          <Spec etiqueta="Baños" valor={t.banos} />
                          <Spec etiqueta="Parqueaderos" valor={t.parqueaderos} />
                          <Spec etiqueta="Área" valor={area} />
                          <Spec etiqueta="Barrio" valor={t.barrio} />
                        </div>

                        {/* Zonas de preferencia */}
                        <Chips etiqueta="Zonas de preferencia" items={zonas} />

                        {/* Amenidades deseadas */}
                        <Chips etiqueta="Amenidades deseadas" items={amenidades} />

                        {/* Comentarios del cliente */}
                        {(t.preferencias || t.observaciones) && (
                          <div className="mt-8 border-t border-[#E0DDD2] pt-6">
                            <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-3">
                              Comentarios del cliente
                            </p>
                            {t.preferencias && (
                              <p className="text-[14px] leading-relaxed text-[#1A1A18] border-l border-[#E0DDD2] pl-4 mb-3">
                                {t.preferencias}
                              </p>
                            )}
                            {t.observaciones && (
                              <p className="text-[14px] leading-relaxed text-[#1A1A18] border-l border-[#E0DDD2] pl-4">
                                {t.observaciones}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pie de la ficha */}
                      <div className="px-8 py-5 border-t border-[#E0DDD2] flex items-center justify-between">
                        <span className="text-[11px] text-[#A8A69E]">
                          {t.postulaciones > 0
                            ? `${t.postulaciones} postulacion${t.postulaciones === 1 ? '' : 'es'} recibida${t.postulaciones === 1 ? '' : 's'}`
                            : 'Sin postulaciones aún'}
                        </span>
                        <button
                          onClick={() => { setPostulando(t); setTempId(crypto.randomUUID()); setFotos([]); setFormP((f) => ({ ...f, contacto: f.contacto || telPerfil })); }}
                          className="rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm px-6 py-2.5 hover:opacity-80 transition-opacity"
                        >
                          Tengo un inmueble para este comprador
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'mias' && (
          <div className="divide-y divide-[#E0DDD2] border-t border-b border-[#E0DDD2]">
            {mias.length === 0 && <p className="py-6 text-sm text-[#5F5E5A]">Aún no has postulado inmuebles.</p>}
            {mias.map((p) => (
              <div key={p.id} className="py-6 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-[#1A1A18] tracking-tight mb-1">{p.titulo}</p>
                  <p className="text-sm text-[#5F5E5A]">
                    {[p.ubicacion, p.alcobas && `${p.alcobas} alcobas`, formatoCOP(p.precio)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#1A1A18] border border-[#E0DDD2] rounded-full px-3 py-1">
                  {ESTADOS[p.estado]}
                </span>
              </div>
            ))}
          </div>
        )}

        {postulando && (
          <div className="fixed inset-0 bg-[#1A1A18]/30 flex items-center justify-center px-6 z-50">
            <div className="bg-[#F1EFE8] w-full max-w-md p-8 max-h-[85vh] overflow-y-auto">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#5F5E5A] mb-1">
                Comprador #{postulando.codigo}
              </p>
              <h2 className="text-lg tracking-tight text-[#1A1A18] mb-6">Postular inmueble</h2>

              <div className="space-y-4">
                <div><label className={labelCls}>Título del inmueble *</label>
                  <input className={inputCls} value={formP.titulo} onChange={(e) => setFormP({ ...formP, titulo: e.target.value })} /></div>

                <div><label className={labelCls}>Tu celular / WhatsApp de contacto *</label>
                  <input className={inputCls} type="tel" placeholder="300 123 4567" value={formP.contacto} onChange={(e) => setFormP({ ...formP, contacto: e.target.value })} /></div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Precio (millones COP)</label>
                    <input className={inputCls} inputMode="numeric" value={formP.precio} onChange={(e) => setFormP({ ...formP, precio: e.target.value })} /></div>
                  <div><label className={labelCls}>Área (m²)</label>
                    <input className={inputCls} inputMode="numeric" value={formP.area} onChange={(e) => setFormP({ ...formP, area: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><label className={labelCls}>Habitaciones</label>
                    <input className={inputCls} inputMode="numeric" value={formP.habitaciones} onChange={(e) => setFormP({ ...formP, habitaciones: e.target.value })} /></div>
                  <div><label className={labelCls}>Baños</label>
                    <input className={inputCls} inputMode="numeric" value={formP.banos} onChange={(e) => setFormP({ ...formP, banos: e.target.value })} /></div>
                  <div><label className={labelCls}>Parqueaderos</label>
                    <input className={inputCls} inputMode="numeric" value={formP.parqueaderos} onChange={(e) => setFormP({ ...formP, parqueaderos: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Administración (COP)</label>
                    <input className={inputCls} inputMode="numeric" value={formP.administracion} onChange={(e) => setFormP({ ...formP, administracion: e.target.value })} /></div>
                  <div><label className={labelCls}>Estrato</label>
                    <input className={inputCls} inputMode="numeric" value={formP.estrato} onChange={(e) => setFormP({ ...formP, estrato: e.target.value })} /></div>
                </div>

                <div><label className={labelCls}>Ciudad</label>
                  <input className={inputCls} value={formP.ciudad} onChange={(e) => setFormP({ ...formP, ciudad: e.target.value })} /></div>
                <div><label className={labelCls}>Barrio</label>
                  <input className={inputCls} value={formP.barrio} onChange={(e) => setFormP({ ...formP, barrio: e.target.value })} /></div>
                <div><label className={labelCls}>Dirección</label>
                  <input className={inputCls} value={formP.direccion} onChange={(e) => setFormP({ ...formP, direccion: e.target.value })} /></div>

                <div><label className={labelCls}>Amenidades (separadas por coma)</label>
                  <input className={inputCls} placeholder="Piscina, gimnasio, portería 24h" value={formP.amenidades} onChange={(e) => setFormP({ ...formP, amenidades: e.target.value })} /></div>

                <div><label className={labelCls}>Descripción</label>
                  <textarea className={inputCls + ' resize-none'} rows={3} value={formP.descripcion} onChange={(e) => setFormP({ ...formP, descripcion: e.target.value })} /></div>

                <div>
                  <label className={labelCls}>Fotos del inmueble *</label>
                  <SubirFotosPostulacion tempId={tempId} rutas={fotos} onChange={setFotos} />
                </div>
              </div>

              {mensaje && <p className="text-xs text-[#1A1A18] mt-4 border-l border-[#1A1A18] pl-3">{mensaje}</p>}

              <div className="flex gap-3 mt-8">
                <button onClick={postular} disabled={enviando}
                  className="flex-1 rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm py-2.5 hover:opacity-80 transition-opacity disabled:opacity-40">
                  {enviando ? 'Enviando…' : 'Postular'}
                </button>
                <button onClick={() => { setPostulando(null); setMensaje(''); }}
                  className="rounded-full border border-[#E0DDD2] text-[#5F5E5A] text-sm px-5 py-2.5">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
