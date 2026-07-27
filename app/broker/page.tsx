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

const norm = (x: any) =>
  String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const SEGUIMIENTO = [
  { clave: 'postulado', label: 'Enviada' },
  { clave: 'validado', label: 'Validada' },
  { clave: 'acuerdo_firmado', label: 'Acuerdo firmado' },
  { clave: 'presentado', label: 'Presentada al cliente' },
  { clave: 'visita', label: 'Visita' },
  { clave: 'negociacion', label: 'Negociación' },
  { clave: 'cierre', label: 'Cierre' },
  { clave: 'comision_repartida', label: 'Comisión repartida' },
];

const SIGUIENTE_PASO: Record<string, string> = {
  postulado: 'Estamos revisando tu postulación.',
  validado: 'Te enviaremos el acuerdo de corretaje para firmar.',
  acuerdo_firmado: 'Presentaremos tu inmueble al cliente.',
  presentado: 'Te contactaremos pronto para agendar una visita.',
  visita: 'Esperando el resultado de la visita.',
  negociacion: 'Estamos negociando con el cliente.',
  cierre: 'Cierre en proceso — pronto se reparte la comisión.',
  comision_repartida: 'Proceso completado. ¡Gracias por trabajar con nosotros!',
};

const FOTOS_TARJETAS = 5;

function imagenPara(codigo: string) {
  let h = 0;
  const c = String(codigo || '');
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) % 997;
  return `/requerimientos/${(h % FOTOS_TARJETAS) + 1}.jpg`;
}

const primerNombre = (n?: string | null) =>
  n ? String(n).trim().split(/\s+/)[0] : null;

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

export default function PortalBroker() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState<'buscar' | 'info' | 'mias'>('buscar');
  const [filtros, setFiltros] = useState({ alcobas: '', banos: '', zona: '', precioMax: '' });
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [mias, setMias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [postulando, setPostulando] = useState<any | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [zonaFiltro, setZonaFiltro] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [formP, setFormP] = useState({
    titulo: '', precio: '', area: '', habitaciones: '', banos: '', parqueaderos: '',
    administracion: '', estrato: '', descripcion: '', amenidades: '',
    barrio: '', ciudad: '', direccion: '', contacto: '',
  });
  const [telPerfil, setTelPerfil] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [tempId, setTempId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmandoAlcance, setConfirmandoAlcance] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function buscar(f = filtros) {
    setCargando(true);
    const { data, error } = await supabase.rpc('marketplace_buscar', {
      p_alcobas: f.alcobas ? Number(f.alcobas) : null,
      p_banos: f.banos ? Number(f.banos) : null,
      p_zona: null,
      p_precio_max: f.precioMax ? Number(f.precioMax) * 1000000 : null,
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

  function buscarDesdeHero() {
    setMostrarResultados(true);
    buscar();
  }

  function verTodo() {
    const limpio = { alcobas: '', banos: '', zona: '', precioMax: '' };
    setFiltros(limpio);
    setTipoFiltro('');
    setZonaFiltro('');
    setMostrarResultados(true);
    buscar(limpio);
  }

  function abrirPostulacion(t: any) {
    setPostulando(t);
    setTempId(crypto.randomUUID());
    setFotos([]);
    setFormP((f) => ({ ...f, contacto: f.contacto || telPerfil }));
    setDetalle(null);
  }

  const resultados = tarjetas.filter((t) => {
    const okTipo = !tipoFiltro || (t.tipo || '').toLowerCase().includes(tipoFiltro);
    const okZona =
      !zonaFiltro ||
      [...aLista(t.zonas), t.ciudad, t.barrio]
        .filter(Boolean)
        .some((z) => norm(z).includes(norm(zonaFiltro)));
    return okTipo && okZona;
  });

  const zonasDisponibles = (() => {
    const m = new Map<string, string>();
    tarjetas.forEach((t) => {
      [...aLista(t.zonas), t.ciudad].filter(Boolean).forEach((z) => {
        const k = norm(z);
        if (k && !m.has(k)) m.set(k, String(z).trim());
      });
    });
    return Array.from(m.values()).sort((a, b) => a.localeCompare(b, 'es'));
  })();

  function postular() {
    if (!formP.titulo) { setMensaje('El título del inmueble es obligatorio.'); return; }
    if (fotos.length === 0) { setMensaje('Sube al menos una foto del inmueble.'); return; }
    if (!formP.contacto.trim()) { setMensaje('Escribe tu celular o WhatsApp de contacto.'); return; }
    setMensaje('');
    setConfirmandoAlcance(true);
  }

  async function enviarPostulacion(alcance: 'futuros' | 'solo_este') {
    setConfirmandoAlcance(false);
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
        alcance,
      },
      contacto_telefono: formP.contacto.trim(),
      fotos_rutas: fotos,
      temp_id: tempId,
    });
    setEnviando(false);
    if (error) { setMensaje('No se pudo postular: ' + error.message); return; }
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'SubmitApplication');
    }
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

      <HablaBroker />

      {tab === 'buscar' && (
        <section className="relative bg-[#1A1A18] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: "url('/broker-hero.jpg')" }}
          />
          <div className="absolute inset-0 bg-[#1A1A18]/45" />
          <div className="relative px-8 py-14 sm:py-20 max-w-3xl mx-auto text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#EBDBC8] mb-3">
              {APP.nombre} · Red de brokers
            </p>
            <h1 className="text-3xl sm:text-4xl tracking-tight text-[#F1EFE8] mb-2">
              ¿Qué inmueble tienes?
            </h1>
            <p className="text-sm text-[#F1EFE8]/80 mb-8">
              Encuentra al comprador que ya lo está buscando
            </p>

            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {TIPOS.map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTipoFiltro(tipoFiltro === t.v ? '' : t.v)}
                  className={`rounded-full border px-5 py-2 text-[13px] transition-colors ${
                    tipoFiltro === t.v
                      ? 'bg-[#F1EFE8] text-[#1A1A18] border-[#F1EFE8]'
                      : 'bg-transparent text-[#F1EFE8] border-[#F1EFE8]/40 hover:border-[#F1EFE8]'
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-full p-1.5 pl-5 flex items-center gap-2 max-w-xl mx-auto">
              <svg className="w-4 h-4 text-[#5F5E5A] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <select
                className="flex-1 min-w-0 bg-transparent text-sm text-[#1A1A18] outline-none cursor-pointer appearance-none"
                value={zonaFiltro}
                onChange={(e) => setZonaFiltro(e.target.value)}
              >
                <option value="">¿En qué zona está? Todas las zonas</option>
                {zonasDisponibles.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              <button
                onClick={buscarDesdeHero}
                className="rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm px-6 py-2.5 hover:opacity-80 transition-opacity shrink-0"
              >
                Buscar
              </button>
            </div>

            <button
              onClick={verTodo}
              className="mt-4 text-[12px] text-[#F1EFE8]/80 underline underline-offset-4 hover:text-[#F1EFE8] transition-colors"
            >
              o ver todos los requerimientos disponibles
            </button>
          </div>
        </section>
      )}

      <div className="px-8 py-10 max-w-3xl mx-auto">


        <div className="flex gap-6 border-b border-[#E0DDD2] mb-8">
          {[
            { k: 'buscar', l: 'Buscar compradores' },
            { k: 'info', l: 'Cómo funciona' },
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
            {!mostrarResultados ? (
              <>
                <ComoFunciona />
                <FAQBrokers />
              </>
            ) : cargando ? (
              <p className="text-sm text-[#5F5E5A]">Buscando compradores…</p>
            ) : resultados.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-[#5F5E5A] mb-4">
                  No hay compradores publicados con esa búsqueda.
                </p>
                <button
                  onClick={verTodo}
                  className="text-[12px] text-[#1A1A18] underline underline-offset-4"
                >
                  Ver todos los requerimientos disponibles
                </button>
              </div>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-5">
                  {resultados.length} comprador{resultados.length === 1 ? '' : 'es'}
                  {tipoFiltro ? ` buscando ${tipoFiltro}` : ' activos'}
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {resultados.map((t) => {
                    const zonaLinea = [aLista(t.zonas)[0], t.ciudad].filter(Boolean).join(' · ');
                    const nombre = primerNombre(t.nombre ?? t.cliente_nombre);
                    return (
                      <article
                        key={t.id}
                        className="overflow-hidden rounded-2xl border border-[#E0DDD2] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#CFC9BB]"
                      >
                        <div className="relative aspect-[4/3] bg-[#F1EFE8]">
                          <div className="absolute inset-0 flex items-center justify-center opacity-60">
                            <IconoTipo tipo={t.tipo} />
                          </div>
                          <img
                            src={imagenPara(t.codigo)}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                            {t.urgencia && (
                              <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#993C1D]">
                                {t.urgencia}
                              </span>
                            )}
                            {t.tipo && (
                              <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium capitalize text-[#1A1A18]">
                                {t.tipo}
                              </span>
                            )}
                          </div>
                          <span className="absolute right-3 top-3 rounded-full bg-[#1A1A18]/75 px-2.5 py-1 text-[10px] text-[#F1EFE8]">
                            #{t.codigo}
                          </span>
                        </div>

                        <div className="p-5">
                          <p className="text-[16px] font-semibold leading-snug tracking-tight text-[#1A1A18]">
                            {rangoPresupuestoFull(t.presupuesto_min, t.presupuesto_max)}
                          </p>
                          <p className="mt-0.5 truncate text-[12px] text-[#5F5E5A]">
                            {[nombre ? `Busca ${nombre}` : null, zonaLinea].filter(Boolean).join(' · ') || 'Comprador verificado'}
                          </p>

                          <div className="mt-4 flex items-stretch border-y border-[#E0DDD2] py-2.5 text-center text-[12px] text-[#1A1A18]">
                            <div className="flex flex-1 items-center justify-center gap-1.5">
                              <svg className="h-[14px] w-[14px] text-[#5F5E5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M4 9h3M4 15h3M9 4v3M15 4v3" /></svg>
                              {rango(t.area_min, t.area_max, ' m²') ?? '—'}
                            </div>
                            <div className="flex flex-1 items-center justify-center gap-1.5 border-x border-[#E0DDD2]">
                              <svg className="h-[14px] w-[14px] text-[#5F5E5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M6 10V7h12v3" /></svg>
                              {t.alcobas != null ? `${t.alcobas} alc.` : '—'}
                            </div>
                            <div className="flex flex-1 items-center justify-center gap-1.5">
                              <svg className="h-[14px] w-[14px] text-[#5F5E5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><path d="M5 12h14a1 1 0 0 1 1 1c0 3-2 5-5 5H9c-3 0-5-2-5-5a1 1 0 0 1 1-1zM7 12V6a2 2 0 0 1 4 0" /></svg>
                              {t.banos != null ? `${t.banos} baños` : '—'}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-[11px] text-[#A8A69E]">{haceCuanto(t.updated_at)}</span>
                            <button
                              onClick={() => setDetalle(t)}
                              className="rounded-full bg-[#1A1A18] px-6 py-2.5 text-[13px] font-medium text-[#F1EFE8] transition-opacity hover:opacity-85"
                            >
                              Ver más
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {detalle && (
              <div
                className="fixed inset-0 bg-[#1A1A18]/50 flex items-center justify-center px-6 z-50"
                onClick={() => setDetalle(null)}
              >
                <div
                  className="bg-white w-full max-w-md p-7 max-h-[85vh] overflow-y-auto rounded-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-9 h-9 rounded-full bg-[#F1EFE8] flex items-center justify-center shrink-0">
                      <IconoTipo tipo={detalle.tipo} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-medium text-[#1A1A18] tracking-tight leading-snug">
                        {rangoPresupuestoFull(detalle.presupuesto_min, detalle.presupuesto_max)}
                      </p>
                      <p className="text-[12px] text-[#5F5E5A]">
                        {[detalle.tipo, detalle.ciudad, `#${detalle.codigo}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button onClick={() => setDetalle(null)} aria-label="Cerrar" className="text-[#5F5E5A] hover:text-[#1A1A18] transition-colors">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-x-4 gap-y-4 border-t border-[#E0DDD2] pt-5 mb-5">
                    <Spec etiqueta="Alcobas" valor={detalle.alcobas} />
                    <Spec etiqueta="Baños" valor={detalle.banos} />
                    <Spec etiqueta="Parqueaderos" valor={detalle.parqueaderos} />
                    <Spec etiqueta="Área" valor={rango(detalle.area_min, detalle.area_max, ' m²')} />
                    <Spec etiqueta="Financiación" valor={detalle.financiacion} />
                    <Spec etiqueta="Urgencia" valor={detalle.urgencia} />
                    <Spec etiqueta="Barrio" valor={detalle.barrio} />
                    <Spec etiqueta="Actualizado" valor={haceCuanto(detalle.updated_at).replace('Actualizado ', '')} />
                  </div>

                  <Chips etiqueta="Zonas de preferencia" items={aLista(detalle.zonas)} />
                  <Chips etiqueta="Amenidades deseadas" items={aLista(detalle.amenidades)} />

                  {(detalle.preferencias || detalle.observaciones) && (
                    <div className="mt-6">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-3">
                        Lo que busca el cliente
                      </p>
                      {detalle.preferencias && (
                        <p className="text-[13px] leading-relaxed text-[#1A1A18] border-l-2 border-[#E0DDD2] pl-3 mb-2">
                          {detalle.preferencias}
                        </p>
                      )}
                      {detalle.observaciones && (
                        <p className="text-[13px] leading-relaxed text-[#1A1A18] border-l-2 border-[#E0DDD2] pl-3">
                          {detalle.observaciones}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-7">
                    <button
                      onClick={() => abrirPostulacion(detalle)}
                      className="flex-1 rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm py-2.5 hover:opacity-80 transition-opacity"
                    >
                      Tengo un inmueble para este comprador
                    </button>
                    <button
                      onClick={() => setDetalle(null)}
                      className="rounded-full border border-[#E0DDD2] text-[#5F5E5A] text-sm px-5 py-2.5"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'info' && (
          <>
            <ComoFunciona />
            <FAQBrokers />
          </>
        )}

        {tab === 'mias' && (
          <div className="divide-y divide-[#E0DDD2] border-t border-b border-[#E0DDD2]">
            {mias.length === 0 && <p className="py-6 text-sm text-[#5F5E5A]">Aún no has postulado inmuebles.</p>}
            {mias.map((p) => {
              const idx = Math.max(0, SEGUIMIENTO.findIndex((e) => e.clave === p.estado));
              const rechazada = p.estado === 'rechazado';
              const foto = Array.isArray(p.fotos_rutas) && p.fotos_rutas.length > 0
                ? supabase.storage.from('propiedades').getPublicUrl(p.fotos_rutas[0]).data.publicUrl
                : null;
              return (
                <article
                  key={p.id}
                  className="mb-4 overflow-hidden rounded-2xl border border-[#E0DDD2] bg-white"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className="relative h-[64px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-[#F1EFE8]">
                      <div className="absolute inset-0 flex items-center justify-center opacity-60">
                        <IconoTipo tipo={p.titulo} />
                      </div>
                      {foto && (
                        <img
                          src={foto}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium tracking-tight text-[#1A1A18]">{p.titulo}</p>
                      <p className="mt-0.5 truncate text-[12px] text-[#5F5E5A]">
                        {[p.ubicacion, p.alcobas && `${p.alcobas} alcobas`, formatoCOPfull(p.precio)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {rechazada ? (
                      <span className="shrink-0 rounded-full border border-[#D5BBB5] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[#8E3B31]">
                        No seleccionada
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-[#F1EFE8] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[#1A1A18]">
                        {SEGUIMIENTO[idx]?.label ?? ESTADOS[p.estado] ?? p.estado}
                      </span>
                    )}
                  </div>

                  <div className="border-t border-[#E0DDD2] px-5 py-4">
                    {rechazada ? (
                      <p className="text-[11px] leading-relaxed text-[#5F5E5A]">
                        Esta postulación no fue seleccionada para este comprador. Puedes postular tu inmueble a otros compradores activos.
                      </p>
                    ) : (
                      <div>
                        <div className="flex items-center">
                          {SEGUIMIENTO.map((e, i) => (
                            <div key={e.clave} className="flex flex-1 items-center last:flex-none">
                              <span
                                title={e.label}
                                className={`h-[10px] w-[10px] shrink-0 rounded-full ${
                                  i < idx
                                    ? 'bg-[#1A1A18]'
                                    : i === idx
                                      ? 'bg-[#B87333]'
                                      : 'border border-[#E0DDD2] bg-transparent'
                                }`}
                              />
                              {i < SEGUIMIENTO.length - 1 && (
                                <span className={`mx-1 h-px flex-1 ${i < idx ? 'bg-[#1A1A18]' : 'bg-[#E0DDD2]'}`} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="text-[11px] text-[#1A1A18]">
                            {SEGUIMIENTO[idx]?.label}
                            <span className="text-[#A8A69E]"> · etapa {idx + 1} de {SEGUIMIENTO.length}</span>
                          </p>
                          <p className="text-[11px] text-[#5F5E5A]">{SIGUIENTE_PASO[p.estado] ?? ''}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {confirmandoAlcance && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1A1A18]/50 px-6">
            <div className="w-full max-w-md rounded-2xl bg-[#F1EFE8] p-8">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#B87333]">Antes de enviar</p>
              <h2 className="mt-2 text-[19px] leading-snug tracking-tight text-[#1A1A18]" style={{ fontFamily: 'Fraunces, serif' }}>
                ¿Para qué requerimientos quieres este inmueble?
              </h2>
              <p className="mt-3 text-[12px] leading-relaxed text-[#5F5E5A]">
                Tu inmueble solo se usa dentro de KYRELO. Nunca lo comercializamos por fuera ni en otras
                plataformas. Tú decides su alcance:
              </p>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => enviarPostulacion('futuros')}
                  disabled={enviando}
                  className="w-full rounded-xl bg-[#1A1A18] px-5 py-4 text-left transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <span className="block text-[14px] font-semibold text-[#F1EFE8]">Disponible para futuros requerimientos</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-[#F1EFE8]/70">
                    Autorizas que KYRELO también lo considere para otros compradores internos. Más oportunidades de cierre.
                  </span>
                </button>

                <button
                  onClick={() => enviarPostulacion('solo_este')}
                  disabled={enviando}
                  className="w-full rounded-xl border border-[#D8D3C6] bg-white px-5 py-4 text-left transition-colors hover:border-[#1A1A18] disabled:opacity-40"
                >
                  <span className="block text-[14px] font-semibold text-[#1A1A18]">Solo para este requerimiento</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-[#5F5E5A]">
                    El inmueble se usa únicamente para el comprador #{postulando?.codigo}. No se cruza con ningún otro.
                  </span>
                </button>
              </div>

              <button
                onClick={() => setConfirmandoAlcance(false)}
                disabled={enviando}
                className="mt-5 w-full text-center text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18] disabled:opacity-40"
              >
                {enviando ? 'Enviando…' : 'Volver'}
              </button>
            </div>
          </div>
        )}

        {postulando && (
          <div className="fixed inset-0 bg-[#1A1A18]/30 flex items-center justify-center px-6 z-50">
            <div className="bg-[#F1EFE8] w-full max-w-md p-8 max-h-[85vh] overflow-y-auto">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#5F5E5A] mb-1">
                Comprador #{postulando.codigo}
              </p>
              <h2 className="text-lg tracking-tight text-[#1A1A18] mb-2">Postular inmueble</h2>
              <a
                href={`https://wa.me/${APP.whatsapp}?text=${encodeURIComponent(`Hola, soy un broker de ${APP.nombre}. Estoy registrando un inmueble para el comprador #${postulando.codigo} y tengo una duda:`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18] transition-colors mb-6"
              >
                ¿Tienes dudas? Escríbenos por WhatsApp
              </a>

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

              <a
                href={`https://wa.me/${APP.whatsapp}?text=${encodeURIComponent(`Hola, soy un broker de ${APP.nombre}. Estoy registrando un inmueble para el comprador #${postulando.codigo} y tengo una duda:`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18] transition-colors"
              >
                ¿Tienes dudas antes de enviar? Escríbenos por WhatsApp
              </a>

              <div className="flex gap-3 mt-4">
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

      <FooterBroker />
    </div>
  );
}

function ComoFunciona() {
  const pasos = [
    { n: '01', t: 'Mira compradores reales', d: 'Requerimientos de compradores verificados en la Sabana, con presupuesto y zona. Sin datos inflados.' },
    { n: '02', t: 'Postula tu inmueble', d: 'Si tienes algo que encaja, lo postulas en dos minutos. Tú decides si queda solo para ese comprador o para más.' },
    { n: '03', t: 'Cierras y ganas', d: 'Acompañamos el proceso hasta la firma. Solo compartes comisión cuando el negocio se cierra.' },
  ];
  return (
    <section className="py-4">
      <div className="mb-8 rounded-2xl border border-[#EBDBC8] bg-[#F6EFE4] px-6 py-5 text-center">
        <p className="text-[13px] font-medium text-[#1A1A18]">
          Registrarte e ingresar es <span className="text-[#B87333]">gratis</span>. Solo compartes comisión cuando cierras un negocio con un requerimiento de KYRELO.
        </p>
      </div>

      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A69E]">Cómo funciona</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {pasos.map((p) => (
          <div key={p.n} className="rounded-2xl border border-[#E0DDD2] bg-white p-6">
            <p className="text-[12px] font-semibold text-[#B87333]">{p.n}</p>
            <p className="mt-3 text-[15px] font-semibold tracking-tight text-[#1A1A18]">{p.t}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#5F5E5A]">{p.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQBrokers() {
  const faqs = [
    { q: '¿Registrarme tiene algún costo?', a: 'No. Crear tu cuenta, ver los compradores y postular tus inmuebles es totalmente gratis. Solo compartes comisión cuando se cierra un negocio con un requerimiento traído de KYRELO.' },
    { q: '¿Cómo funciona la comisión?', a: 'La comisión aplica únicamente cuando concretas un cierre con un comprador de KYRELO. Las condiciones se acuerdan contigo antes de presentar el inmueble al comprador.' },
    { q: '¿Me pueden quitar el cliente?', a: 'No. Tu postulación queda registrada y firmamos un acuerdo antes de presentar el inmueble. El proceso es transparente y tu participación queda protegida.' },
    { q: '¿Qué pasa si ya trabajo con otra inmobiliaria?', a: 'Puedes usar KYRELO como un canal más de oportunidades. Tú decides qué inmuebles postular y con qué alcance.' },
    { q: '¿Los compradores son reales?', a: 'Sí. Cada requerimiento viene de un comprador verificado con presupuesto y zona definidos. No mostramos búsquedas infladas ni datos falsos.' },
  ];
  return (
    <section className="mt-12 border-t border-[#E0DDD2] pt-10">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A69E]">Preguntas frecuentes</p>
      <div className="mt-5 divide-y divide-[#E0DDD2]">
        {faqs.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium text-[#1A1A18]">
              {f.q}
              <span className="shrink-0 text-[#B87333] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2.5 text-[12px] leading-relaxed text-[#5F5E5A]">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FooterBroker() {
  return (
    <footer className="border-t border-[#E0DDD2] bg-[#F1EFE8]">
      <div className="mx-auto max-w-3xl px-8 py-8">
        <p className="text-[14px] font-semibold tracking-tight text-[#1A1A18]" style={{ fontFamily: 'Fraunces, serif' }}>
          {APP.marca}
        </p>
        <p className="mt-1 text-[12px] text-[#5F5E5A]">Kyrelocorp · {APP.eslogan}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[#5F5E5A]">
          <a
            href={`https://wa.me/${APP.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-[#1A1A18]"
          >
            WhatsApp +57 311 801 8295
          </a>
          <a href="/legal/tratamiento-de-datos" className="underline underline-offset-4 hover:text-[#1A1A18]">Tratamiento de datos</a>
          <a href="/legal/terminos" className="underline underline-offset-4 hover:text-[#1A1A18]">Términos y condiciones</a>
        </div>
        <p className="mt-6 text-[10px] text-[#A8A69E]">© {new Date().getFullYear()} Kyrelocorp. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

function HablaBroker() {
  return (
    <a
      href={`https://wa.me/${APP.whatsapp}?text=${encodeURIComponent(`Hola, soy un broker de ${APP.nombre} y tengo una duda:`)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Habla con nosotros por WhatsApp"
      onClick={() => { if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'Contact'); }}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#1A1A18] px-5 py-3 text-[14px] font-semibold text-[#F1EFE8] transition-transform hover:-translate-y-0.5"
      style={{ boxShadow: '0 14px 34px -16px rgba(26,26,24,0.5)' }}
    >
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="#B87333" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.38-4.1-1.05L3 20l1.1-5.2A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
      <span className="hidden sm:inline">Habla con nosotros</span>
      <span className="sm:hidden">Dudas</span>
    </a>
  );
}
