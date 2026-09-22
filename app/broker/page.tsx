'use client';

// app/broker/page.tsx — v3 · Portal del agente
// Tres pestañas de trabajo: Compradores (requerimientos banda A), Inmuebles
// KYRELO (captaciones con solicitud de asociación) y Mi panel. Más "Cómo
// funciona". Nunca muestra nombre ni contacto del comprador.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP } from '@/lib/config';
import { vinetas, resumenPreferencias } from '@/lib/requerimientos-formato';

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

const SEGUIMIENTO = [
  { clave: 'postulado', label: 'Postulada' },
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

const ASOC_ESTADOS: Record<string, string> = {
  solicitada: 'En revisión',
  aceptada: 'Aceptada',
  rechazada: 'No aceptada',
  vencida: 'Vencida',
  cerrada: 'Cerrada',
};

const NEGOCIO_ESTADOS: Record<string, string> = {
  conectado: 'Conectado',
  visita_agendada: 'Visita agendada',
  visitado: 'Visitado',
  oferta: 'Oferta',
  promesa: 'Promesa',
  escriturado: 'Escriturado',
  perdido: 'No se concretó',
};

const EXCLUSIVIDAD = [
  { v: '', l: 'No lo sé / prefiero no decir' },
  { v: 'propia', l: 'Propia: solo yo lo comercializo' },
  { v: 'compartida', l: 'Compartida: el dueño trabaja con varias inmobiliarias' },
  { v: 'sin_exclusividad', l: 'Sin exclusividad: no hay acuerdo firmado' },
];
const PLAZOS = ['Inmediato', '1 a 3 meses', '3 a 6 meses', 'Más de 6 meses'];
const FORMAS_PAGO = ['Crédito aprobado', 'Recursos propios', 'Venta previa', 'Mixto'];

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
  String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function diasHasta(fecha?: string | null) {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
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

// Sello de verificación: el diferencial de KYRELO. Solo se publican banda A.
function SelloVerificado({ banda }: { banda?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#B87333]">
        Comprador verificado · Banda {banda || 'A'}
      </p>
      <p className="text-[10px] text-[#5F5E5A]">presupuesto y plazo confirmados</p>
    </div>
  );
}

function Vigencia({ dias }: { dias?: number | null }) {
  if (dias == null) return null;
  const urgente = dias <= 5;
  const texto = dias <= 0 ? 'Vence hoy' : dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`;
  return (
    <span className={`text-[11px] font-medium ${urgente ? 'text-[#B87333]' : 'text-[#5F5E5A]'}`}>
      {texto}
    </span>
  );
}

function Spec({ etiqueta, valor }: { etiqueta: string; valor: any }) {
  if (valor == null || valor === '') return null;
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

const inputCls = 'w-full bg-transparent border-b border-[#E0DDD2] pb-1.5 text-sm text-[#1A1A18] outline-none focus:border-[#1A1A18] transition-colors';
const labelCls = 'block text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-1';
const pillCls = 'shrink-0 rounded-full bg-[#F1EFE8] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[#1A1A18]';

type Tab = 'buscar' | 'inmuebles' | 'panel' | 'info';

export default function PortalBroker() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('buscar');
  const [filtros, setFiltros] = useState({ alcobas: '', banos: '', zona: '', precioMax: '' });
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [mias, setMias] = useState<any[]>([]);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [negocios, setNegocios] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoInmuebles, setCargandoInmuebles] = useState(true);
  const [postulando, setPostulando] = useState<any | null>(null);
  const [detalle, setDetalle] = useState<any | null>(null);
  const [asociando, setAsociando] = useState<any | null>(null);
  const [inmuebleAbierto, setInmuebleAbierto] = useState<any | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [zonaFiltro, setZonaFiltro] = useState('');
  // El agente entra y ve los compradores de una: el buscador solo filtra.
  const [mostrarResultados, setMostrarResultados] = useState(true);
  const [formP, setFormP] = useState({
    titulo: '', precio: '', area: '', habitaciones: '', banos: '', parqueaderos: '',
    administracion: '', estrato: '', descripcion: '', amenidades: '',
    barrio: '', ciudad: '', direccion: '', conjunto: '', contacto: '',
    matricula: '', exclusividad: '', linkFotos: '', certificado: false,
  });
  const [formA, setFormA] = useState({
    presupuesto: '', plazo: PLAZOS[1], formaPago: FORMAS_PAGO[0], verificado: false, pctPropuesto: '',
  });
  const [telPerfil, setTelPerfil] = useState('');
  const [tempId, setTempId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmandoAlcance, setConfirmandoAlcance] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajeA, setMensajeA] = useState('');

  function urlFoto(ruta?: string | null) {
    if (!ruta) return null;
    return supabase.storage.from('propiedades').getPublicUrl(ruta).data.publicUrl;
  }

  async function buscar(f = filtros) {
    setCargando(true);
    const { data, error } = await supabase.rpc('marketplace_buscar_v2', {
      p_alcobas: f.alcobas ? Number(f.alcobas) : null,
      p_banos: f.banos ? Number(f.banos) : null,
      p_zona: null,
      p_precio_max: f.precioMax ? Number(f.precioMax) * 1000000 : null,
    });
    if (!error) setTarjetas(Array.isArray(data) ? data : []);
    setCargando(false);
  }

  async function cargarMias() {
    const { data } = await supabase
      .from('marketplace_postulaciones')
      .select('*')
      .order('updated_at', { ascending: false });
    setMias(data ?? []);
  }

  async function cargarInmuebles() {
    setCargandoInmuebles(true);
    const { data, error } = await supabase.rpc('inmuebles_kyrelo');
    if (!error) setInmuebles(Array.isArray(data) ? data : []);
    setCargandoInmuebles(false);
  }

  async function cargarNegocios() {
    const { data } = await supabase
      .from('negocios')
      .select('*')
      .order('fecha_ultimo_movimiento', { ascending: false });
    setNegocios(data ?? []);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? '');
      setUserId(user?.id ?? null);
      if (user) {
        supabase
          .from('profiles')
          .select('nombre, telefono, empresa, cierres, estado_agente')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            setPerfil(data ?? null);
            setTelPerfil(data?.telefono ?? '');
          });
      }
    });
    buscar();
    cargarMias();
    cargarInmuebles();
    cargarNegocios();
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
    if (!formP.matricula.trim()) { setMensaje('La matrícula inmobiliaria es obligatoria: nos permite verificar el inmueble.'); return; }
    if (!/^https?:\/\/\S+$/i.test(formP.linkFotos.trim())) { setMensaje('Pega el enlace a las fotos (Drive, WeTransfer, portal…). Debe empezar por http.'); return; }
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

    const link = formP.linkFotos.trim();
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
      // Fotos por enlace, no subidas: no ocupan espacio en la plataforma
      fotos_url: link,
      link_fotos: link,
      fotos_rutas: [],
      matricula_inmobiliaria: formP.matricula.trim(),
      exclusividad: formP.exclusividad || null,
      tiene_certificado: formP.certificado,
      municipio: formP.ciudad || null,
      conjunto: formP.conjunto || null,
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
        conjunto: formP.conjunto || null,
        alcance,
      },
      contacto_telefono: formP.contacto.trim(),
      temp_id: tempId,
    });
    setEnviando(false);
    if (error) { setMensaje('No se pudo postular: ' + error.message); return; }
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'SubmitApplication');
    }
    setPostulando(null);
    setMensaje('');
    cargarMias();
    setTab('panel');
  }

  async function solicitarAsociacion() {
    if (!asociando || !userId) return;
    if (!formA.presupuesto) { setMensajeA('Indica el presupuesto de tu comprador.'); return; }
    setEnviando(true);
    setMensajeA('');
    const { error } = await supabase.from('asociaciones').insert({
      propiedad_id: asociando.id,
      agente_id: userId,
      presupuesto_comprador: Number(formA.presupuesto) * 1000000,
      plazo_comprador: formA.plazo,
      forma_pago_comprador: formA.formaPago,
      comprador_verificado: formA.verificado,
      pct_propuesto: formA.pctPropuesto ? Number(formA.pctPropuesto) / 100 : null,
    });
    setEnviando(false);
    if (error) { setMensajeA('No se pudo enviar la solicitud: ' + error.message); return; }
    setAsociando(null);
    setFormA({ presupuesto: '', plazo: PLAZOS[1], formaPago: FORMAS_PAGO[0], verificado: false, pctPropuesto: '' });
    cargarInmuebles();
    setTab('panel');
  }

  const enProceso = mias.filter(
    (p) => p.estado !== 'rechazado' && p.estado !== 'comision_repartida'
  ).length;
  const cierres = Number(perfil?.cierres ?? 0);
  const pctAgente = cierres < 3 ? 40 : 50;
  const asociaciones = inmuebles.filter((i) => i.asociacion_id);

  return (
    <div className="min-h-screen bg-[#F1EFE8]">
      <header className="border-b border-[#E0DDD2] px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-[15px] font-bold tracking-tight text-[#1A1A18]">{APP.nombre}</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#A8A69E] mt-0.5">
            Red de agentes
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
          <div className="relative px-8 py-10 sm:py-12 max-w-3xl mx-auto text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#EBDBC8] mb-3">
              {APP.nombre} · Compradores verificados
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
              Quitar filtros y ver todos
            </button>
          </div>
        </section>
      )}

      <div className="px-8 py-10 max-w-3xl mx-auto">

        <div className="flex gap-6 border-b border-[#E0DDD2] mb-8 overflow-x-auto">
          {[
            { k: 'buscar', l: 'Compradores' },
            { k: 'inmuebles', l: `Inmuebles KYRELO${inmuebles.length ? ` (${inmuebles.length})` : ''}` },
            { k: 'panel', l: 'Mi panel' },
            { k: 'info', l: 'Cómo funciona' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={`pb-3 text-sm whitespace-nowrap transition-colors ${tab === t.k ? 'text-[#1A1A18] border-b border-[#1A1A18] -mb-px' : 'text-[#5F5E5A]'}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* ============ COMPRADORES ============ */}
        {tab === 'buscar' && (
          <>
            {/* Los tres caminos del agente, de un vistazo */}
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {[
                { k: 'buscar', etiqueta: 'Compradores activos', valor: String(tarjetas.length), color: '#1A1A18', pie: 'verificados y vigentes' },
                { k: 'inmuebles', etiqueta: 'Inmuebles de KYRELO', valor: String(inmuebles.length), color: '#B87333', pie: 'con material listo · 50/50' },
                { k: 'panel', etiqueta: 'Tus postulaciones', valor: String(enProceso), color: '#1A1A18', pie: 'en proceso' },
              ].map((c) => (
                <button
                  key={c.k}
                  onClick={() => setTab(c.k as Tab)}
                  className="rounded-2xl border border-[#E0DDD2] bg-white p-4 text-left transition hover:border-[#CFC9BB]"
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#A8A69E]">{c.etiqueta}</p>
                  <p className="mt-1 text-[26px] leading-none tracking-tight" style={{ fontFamily: 'Fraunces, serif', color: c.color }}>
                    {c.valor}
                  </p>
                  <p className="mt-1 text-[11px] text-[#5F5E5A]">{c.pie}</p>
                </button>
              ))}
            </div>

            {/* Que nadie se pierda los inmuebles que KYRELO ya captó */}
            <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl bg-[#1A1A18] px-5 py-4">
              <div className="min-w-[220px] flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#EBDBC8]">Inmuebles de KYRELO</p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#F1EFE8]">
                  ¿Tienes comprador y no inmueble? Vende los nuestros: material listo y 50/50.
                </p>
              </div>
              <button
                onClick={() => setTab('inmuebles')}
                className="shrink-0 rounded-full bg-[#B87333] px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Ver los inmuebles
              </button>
            </div>

            {cargando ? (
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
                  {resultados.length} comprador{resultados.length === 1 ? '' : 'es'} verificado{resultados.length === 1 ? '' : 's'}
                  {tipoFiltro ? ` buscando ${tipoFiltro}` : ''}
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {resultados.map((t) => {
                    const zonaLinea = [aLista(t.zonas)[0], t.ciudad].filter(Boolean).join(' · ');
                    return (
                      <article
                        key={t.id}
                        className="overflow-hidden rounded-2xl border border-[#E0DDD2] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#CFC9BB]"
                      >
                        {/* El presupuesto manda: es lo primero que mira un agente */}
                        <div className="bg-[#EBDBC8] px-5 py-4">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <span className="flex flex-wrap gap-1.5">
                              {t.urgencia && (
                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#993C1D]">
                                  {t.urgencia}
                                </span>
                              )}
                              {t.tipo && (
                                <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-medium capitalize text-[#1A1A18]">
                                  {t.tipo}
                                </span>
                              )}
                            </span>
                            <span className="rounded-full bg-[#1A1A18] px-2.5 py-1 text-[10px] text-[#F1EFE8]">#{t.codigo}</span>
                          </div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#993C1D]">
                            Comprador verificado · Banda {t.banda || 'A'}
                          </p>
                          <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight text-[#1A1A18]">
                            {rangoPresupuestoFull(t.presupuesto_min, t.presupuesto_max)}
                          </p>
                          <p className="mt-1.5 text-[12px] text-[#5F5E5A]">
                            {[t.tipo, zonaLinea].filter(Boolean).join(' en ') || 'Sabana de Bogotá'}
                          </p>
                        </div>

                        <div className="p-5">
                          <div className="flex items-stretch border-y border-[#E0DDD2] py-2.5 text-center text-[12px] text-[#1A1A18]">
                            <div className="flex-1">{rango(t.area_min, t.area_max, ' m²') ?? '—'}</div>
                            <div className="flex-1 border-x border-[#E0DDD2]">{t.alcobas != null ? `${t.alcobas} alc.` : '—'}</div>
                            <div className="flex-1">{t.banos != null ? `${t.banos} baños` : '—'}</div>
                          </div>

                          {(t.financiacion || t.plazo) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {t.financiacion && (
                                <span className="rounded-full border border-[#E0DDD2] px-3 py-1 text-[11px] text-[#1A1A18]">{t.financiacion}</span>
                              )}
                              {t.plazo && (
                                <span className="rounded-full border border-[#E0DDD2] px-3 py-1 text-[11px] text-[#1A1A18]">{t.plazo}</span>
                              )}
                            </div>
                          )}

                          {resumenPreferencias(t.preferencias) && (
                            <p className="mt-3 text-[12px] leading-relaxed text-[#5F5E5A]">
                              {resumenPreferencias(t.preferencias)}
                            </p>
                          )}

                          <div className="mt-4 flex items-center justify-between">
                            <Vigencia dias={t.dias_restantes} />
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
                      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#A8A69E]">
                        Presupuesto del cliente
                      </p>
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

                  <div className="mb-5 rounded-xl bg-[#F6EFE4] px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <SelloVerificado banda={detalle.banda} />
                      <Vigencia dias={detalle.dias_restantes} />
                    </div>
                  </div>

                  <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">Condiciones de compra</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      ['Forma de pago', detalle.financiacion],
                      ['Plazo', detalle.plazo],
                      ['Urgencia', detalle.urgencia],
                    ].map(([k, v]) => (
                      <div key={k as string} className="rounded-lg bg-[#F1EFE8] px-3 py-2">
                        <p className="text-[9px] uppercase tracking-[0.1em] text-[#993C1D]">{k as string}</p>
                        <p className="mt-0.5 text-[13px] leading-snug text-[#1A1A18]">{(v as string) || '—'}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-6 text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">El inmueble que busca</p>
                  <div className="mt-2 grid grid-cols-4 gap-x-4 gap-y-4 border-b border-[#E0DDD2] pb-5">
                    <Spec etiqueta="Área" valor={rango(detalle.area_min, detalle.area_max, ' m²')} />
                    <Spec etiqueta="Alcobas" valor={detalle.alcobas} />
                    <Spec etiqueta="Baños" valor={detalle.banos} />
                    <Spec etiqueta="Parq." valor={detalle.parqueaderos} />
                  </div>

                  <Chips etiqueta="Zonas de preferencia" items={aLista(detalle.zonas)} />
                  <Chips etiqueta="Amenidades deseadas" items={aLista(detalle.amenidades)} />

                  {vinetas(detalle.preferencias).length > 0 && (
                    <div className="mt-6">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">Preferencias del cliente</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[#1A1A18]">
                        {vinetas(detalle.preferencias).map((p: string, i: number) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {detalle.nota_broker && (
                    <div className="mt-5 rounded-xl border border-[#EBDBC8] bg-[#F6EFE4] px-4 py-3">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-[#993C1D]">Nota de KYRELO</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-[#1A1A18]">{detalle.nota_broker}</p>
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

        {/* ============ INMUEBLES KYRELO ============ */}
        {tab === 'inmuebles' && (
          <>
            <div className="mb-8 rounded-2xl border border-[#EBDBC8] bg-[#F6EFE4] px-6 py-5">
              <p className="text-[13px] font-medium text-[#1A1A18]">
                Inmuebles captados por KYRELO, con mandato y material de venta listo.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#5F5E5A]">
                Si tienes un comprador, solicita la asociación. Al aceptarla te entregamos dirección,
                fotos, video, ficha técnica y textos de venta, con 30 días de vigencia. Reparto 50/50.
              </p>
            </div>

            {cargandoInmuebles ? (
              <p className="text-sm text-[#5F5E5A]">Cargando inmuebles…</p>
            ) : inmuebles.length === 0 ? (
              <p className="py-6 text-sm text-[#5F5E5A]">Por ahora no hay inmuebles de KYRELO publicados. Pronto habrá.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {inmuebles.map((i) => {
                  const fotos: string[] = (i.fotos_preview ?? []).filter(Boolean);
                  const dias = diasHasta(i.fecha_vence);
                  const comision = Number(i.comision_pct ?? 3);
                  const tuParte = i.precio ? Number(i.precio) * (comision / 100) * Number(i.pct_comparte ?? 0.5) : null;
                  const condiciones = [
                    i.precio_negociable ? (i.margen_negociacion ? `Negociable · ${i.margen_negociacion}` : 'Precio negociable') : null,
                    i.acepta_permuta ? 'Acepta permuta' : null,
                    i.libre_gravamenes ? 'Libre de gravámenes' : null,
                    i.acepta_credito ? 'Acepta crédito' : null,
                    i.acepta_subsidio ? 'Acepta subsidio' : null,
                    i.ocupacion,
                    i.entrega ? `Entrega ${String(i.entrega).toLowerCase()}` : null,
                  ].filter(Boolean) as string[];
                  return (
                    <article key={i.id} className="overflow-hidden rounded-2xl border border-[#E0DDD2] bg-white">
                      <div className="relative">
                        {fotos.length > 0 ? (
                          <div className={`grid gap-1 ${fotos.length === 1 ? '' : 'grid-cols-3'}`}>
                            {fotos.slice(0, 3).map((ruta, idx) => (
                              <img
                                key={ruta}
                                src={urlFoto(ruta) ?? ''}
                                alt=""
                                className={`w-full object-cover ${fotos.length === 1 ? 'aspect-[16/10]' : idx === 0 ? 'col-span-3 aspect-[16/10]' : 'aspect-[4/3]'}`}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex aspect-[16/10] items-center justify-center bg-[#EBDBC8] opacity-60">
                            <IconoTipo tipo={i.tipo} />
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          {i.tipo && (
                            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-medium capitalize text-[#1A1A18]">{i.tipo}</span>
                          )}
                          {i.tiene_exclusividad && (
                            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#B87333]">Exclusividad KYRELO</span>
                          )}
                        </div>
                        {i.asociacion_estado && (
                          <span className="absolute right-3 top-3 rounded-full bg-[#1A1A18]/80 px-2.5 py-1 text-[10px] text-[#F1EFE8]">
                            {ASOC_ESTADOS[i.asociacion_estado] ?? i.asociacion_estado}
                          </span>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="rounded-xl bg-[#F6EFE4] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#993C1D]">
                            Comisión {comision}% · compartes {Math.round(Number(i.pct_comparte ?? 0.5) * 100)}%
                          </p>
                          {tuParte != null && (
                            <p className="mt-0.5 text-[13px] text-[#1A1A18]">
                              Para ti: <span className="font-semibold">{formatoCOPfull(tuParte)}</span> si cierras
                            </p>
                          )}
                        </div>

                        <p className="mt-4 text-[18px] font-semibold leading-none tracking-tight text-[#1A1A18]">
                          {formatoCOPfull(i.precio) ?? 'Precio por confirmar'}
                        </p>
                        <p className="mt-1 truncate text-[12px] text-[#5F5E5A]">
                          {[i.municipio, i.sector].filter(Boolean).join(' · ') || 'Sabana de Bogotá'}
                          {i.administracion ? ` · Admón. ${formatoCOPfull(i.administracion)}` : ''}
                          {i.estrato ? ` · Estrato ${i.estrato}` : ''}
                        </p>

                        <div className="mt-4 flex items-stretch border-y border-[#E0DDD2] py-2.5 text-center text-[12px] text-[#1A1A18]">
                          <div className="flex-1">{i.area ? `${Math.round(Number(i.area))} m²` : '—'}{i.area_lote ? ` · lote ${Math.round(Number(i.area_lote))}` : ''}</div>
                          <div className="flex-1 border-x border-[#E0DDD2]">{i.habitaciones != null ? `${i.habitaciones} alc.` : '—'}</div>
                          <div className="flex-1">{i.banos != null ? `${i.banos} baños` : '—'}{i.parqueaderos ? ` · ${i.parqueaderos} parq.` : ''}</div>
                        </div>

                        {condiciones.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {condiciones.slice(0, 4).map((c) => (
                              <span key={c} className="rounded-full border border-[#E0DDD2] px-3 py-1 text-[11px] text-[#1A1A18]">{c}</span>
                            ))}
                          </div>
                        )}

                        {i.descripcion_brokers && (
                          <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-[#5F5E5A]">{i.descripcion_brokers}</p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                          {i.acceso_completo ? (
                            <>
                              <Vigencia dias={dias} />
                              <button onClick={() => setInmuebleAbierto(i)}
                                className="rounded-full bg-[#1A1A18] px-5 py-2.5 text-[13px] font-medium text-[#F1EFE8] hover:opacity-85 transition-opacity">
                                Ver ficha y kit
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setInmuebleAbierto(i)} className="text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18]">
                                Ver ficha completa
                              </button>
                              {i.asociacion_estado === 'solicitada' ? (
                                <span className="text-[12px] text-[#5F5E5A]">Solicitud enviada</span>
                              ) : (
                                <button onClick={() => { setAsociando(i); setMensajeA(''); }}
                                  className="rounded-full bg-[#1A1A18] px-5 py-2.5 text-[13px] font-medium text-[#F1EFE8] hover:opacity-85 transition-opacity">
                                  Solicitar asociación
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {inmuebleAbierto && (
              <div className="fixed inset-0 bg-[#1A1A18]/50 flex items-center justify-center px-6 z-50" onClick={() => setInmuebleAbierto(null)}>
                <div className="bg-white w-full max-w-md p-7 max-h-[85vh] overflow-y-auto rounded-xl" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const inm = inmuebleAbierto;
                    const comision = Number(inm.comision_pct ?? 3);
                    const tuParte = inm.precio ? Number(inm.precio) * (comision / 100) * Number(inm.pct_comparte ?? 0.5) : null;
                    const fotos: string[] = inm.acceso_completo && Array.isArray(inm.imagenes) && inm.imagenes.length > 0
                      ? inm.imagenes
                      : (inm.fotos_preview ?? []);
                    return (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.2em] text-[#B87333]">
                              {inm.acceso_completo ? 'Asociación vigente' : 'Inmueble de KYRELO'}
                            </p>
                            <h2 className="mt-1 text-[18px] tracking-tight text-[#1A1A18]">{inm.titulo || 'Inmueble KYRELO'}</h2>
                            <p className="mt-1 text-[12px] text-[#5F5E5A]">
                              {[inm.acceso_completo ? inm.direccion : null, inm.acceso_completo ? inm.conjunto : null, inm.municipio, inm.sector]
                                .filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <button onClick={() => setInmuebleAbierto(null)} aria-label="Cerrar" className="text-[#5F5E5A] hover:text-[#1A1A18]">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                          </button>
                        </div>

                        {fotos.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            {fotos.map((r: string) => (
                              <a key={r} href={urlFoto(r) ?? '#'} target="_blank" rel="noreferrer">
                                <img src={urlFoto(r) ?? ''} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="mt-5 rounded-xl bg-[#F6EFE4] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#993C1D]">
                            Comisión total {comision}% · compartes {Math.round(Number(inm.pct_comparte ?? 0.5) * 100)}%
                          </p>
                          {tuParte != null && (
                            <p className="mt-0.5 text-[13px] text-[#1A1A18]">Para ti: <span className="font-semibold">{formatoCOPfull(tuParte)}</span> si cierras</p>
                          )}
                          {inm.acceso_completo && <div className="mt-1"><Vigencia dias={diasHasta(inm.fecha_vence)} /></div>}
                        </div>

                        <p className="mt-5 text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">El inmueble</p>
                        <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-4">
                          <Spec etiqueta="Precio" valor={formatoCOPfull(inm.precio)} />
                          <Spec etiqueta="Administración" valor={formatoCOPfull(inm.administracion)} />
                          <Spec etiqueta="Estrato" valor={inm.estrato} />
                          <Spec etiqueta="Área construida" valor={inm.area ? `${Math.round(Number(inm.area))} m²` : null} />
                          <Spec etiqueta="Área lote" valor={inm.area_lote ? `${Math.round(Number(inm.area_lote))} m²` : null} />
                          <Spec etiqueta="Año" valor={inm.anio_construccion} />
                          <Spec etiqueta="Alcobas" valor={inm.habitaciones} />
                          <Spec etiqueta="Baños" valor={inm.banos} />
                          <Spec etiqueta="Parqueaderos" valor={inm.parqueaderos} />
                        </div>

                        <p className="mt-6 text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A]">Condiciones del negocio</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                          <Spec etiqueta="Precio" valor={inm.precio_negociable ? (inm.margen_negociacion ? `Negociable · ${inm.margen_negociacion}` : 'Negociable') : 'No negociable'} />
                          <Spec etiqueta="Permuta" valor={inm.acepta_permuta ? 'Sí acepta' : 'No acepta'} />
                          <Spec etiqueta="Crédito" valor={inm.acepta_credito ? 'Sí acepta' : 'Solo contado'} />
                          <Spec etiqueta="Subsidio" valor={inm.acepta_subsidio ? 'Sí acepta' : null} />
                          <Spec etiqueta="Ocupación" valor={inm.ocupacion} />
                          <Spec etiqueta="Entrega" valor={inm.entrega} />
                          <Spec etiqueta="Estado jurídico" valor={inm.libre_gravamenes ? 'Libre de gravámenes' : null} />
                          <Spec etiqueta="Exclusividad" valor={inm.tiene_exclusividad ? 'KYRELO tiene exclusividad' : null} />
                        </div>
                        {inm.nota_juridica && (
                          <p className="mt-3 text-[12px] leading-relaxed text-[#5F5E5A]">{inm.nota_juridica}</p>
                        )}

                        <Chips etiqueta="Amenidades" items={aLista(inm.amenidades)} />

                        {inm.descripcion_brokers && (
                          <p className="mt-5 border-l border-[#E0DDD2] pl-4 text-[13px] leading-relaxed text-[#1A1A18]">
                            {inm.descripcion_brokers}
                          </p>
                        )}

                        {!inm.acceso_completo && (
                          <p className="mt-5 rounded-xl border border-[#EBDBC8] bg-[#F6EFE4] px-4 py-3 text-[12px] leading-relaxed text-[#5F5E5A]">
                            La dirección, el conjunto, todas las fotos y el kit de venta se abren cuando KYRELO acepta tu asociación.
                          </p>
                        )}

                        <div className="mt-6 flex gap-2">
                          {inm.acceso_completo ? (
                            inm.kit_url ? (
                              <a href={inm.kit_url} target="_blank" rel="noreferrer"
                                className="flex-1 rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm py-2.5 text-center hover:opacity-80 transition-opacity">
                                Abrir kit de venta
                              </a>
                            ) : (
                              <p className="flex-1 text-[12px] text-[#5F5E5A]">El kit de venta se está preparando.</p>
                            )
                          ) : inm.asociacion_estado === 'solicitada' ? (
                            <p className="flex-1 text-[12px] text-[#5F5E5A]">Solicitud enviada. Te avisamos al revisarla.</p>
                          ) : (
                            <button
                              onClick={() => { setInmuebleAbierto(null); setAsociando(inm); setMensajeA(''); }}
                              className="flex-1 rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm py-2.5 hover:opacity-80 transition-opacity"
                            >
                              Solicitar asociación
                            </button>
                          )}
                          <button onClick={() => setInmuebleAbierto(null)} className="rounded-full border border-[#E0DDD2] text-[#5F5E5A] text-sm px-5 py-2.5">Cerrar</button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {asociando && (
              <div className="fixed inset-0 bg-[#1A1A18]/30 flex items-center justify-center px-6 z-50">
                <div className="bg-[#F1EFE8] w-full max-w-md p-8 max-h-[85vh] overflow-y-auto">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#5F5E5A] mb-1">
                    Inmueble KYRELO · {formatoCOP(asociando.precio) ?? ''}
                  </p>
                  <h2 className="text-lg tracking-tight text-[#1A1A18] mb-2">Solicitar asociación</h2>
                  <p className="text-[12px] leading-relaxed text-[#5F5E5A] mb-6">
                    Cuéntanos de tu comprador. No pedimos su contacto: tú sigues siendo su agente.
                  </p>

                  <div className="space-y-4">
                    <div><label className={labelCls}>Presupuesto de tu comprador (millones COP) *</label>
                      <input className={inputCls} inputMode="numeric" value={formA.presupuesto} onChange={(e) => setFormA({ ...formA, presupuesto: e.target.value })} /></div>
                    <div><label className={labelCls}>Plazo para comprar</label>
                      <select className={inputCls} value={formA.plazo} onChange={(e) => setFormA({ ...formA, plazo: e.target.value })}>
                        {PLAZOS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select></div>
                    <div><label className={labelCls}>Forma de pago</label>
                      <select className={inputCls} value={formA.formaPago} onChange={(e) => setFormA({ ...formA, formaPago: e.target.value })}>
                        {FORMAS_PAGO.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select></div>
                    <label className="flex items-center gap-3 text-[13px] text-[#1A1A18]">
                      <input type="checkbox" checked={formA.verificado} onChange={(e) => setFormA({ ...formA, verificado: e.target.checked })} />
                      Ya verifiqué su capacidad de compra
                    </label>
                    <div><label className={labelCls}>¿Propones otro reparto? (opcional, % para ti)</label>
                      <input className={inputCls} inputMode="numeric" placeholder="Publicado: 50" value={formA.pctPropuesto} onChange={(e) => setFormA({ ...formA, pctPropuesto: e.target.value })} /></div>
                  </div>

                  {mensajeA && <p className="text-xs text-[#1A1A18] mt-4 border-l border-[#1A1A18] pl-3">{mensajeA}</p>}

                  <div className="flex gap-3 mt-6">
                    <button onClick={solicitarAsociacion} disabled={enviando}
                      className="flex-1 rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm py-2.5 hover:opacity-80 transition-opacity disabled:opacity-40">
                      {enviando ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                    <button onClick={() => setAsociando(null)} className="rounded-full border border-[#E0DDD2] text-[#5F5E5A] text-sm px-5 py-2.5">Cancelar</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ MI PANEL ============ */}
        {tab === 'panel' && (
          <div className="space-y-10">
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E0DDD2] bg-white p-5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#A8A69E]">Cierres con KYRELO</p>
                <p className="mt-2 text-[28px] leading-none tracking-tight text-[#1A1A18]" style={{ fontFamily: 'Fraunces, serif' }}>{cierres}</p>
              </div>
              <div className="rounded-2xl border border-[#E0DDD2] bg-white p-5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#A8A69E]">Tu parte hoy</p>
                <p className="mt-2 text-[28px] leading-none tracking-tight text-[#B87333]" style={{ fontFamily: 'Fraunces, serif' }}>{pctAgente}%</p>
                <p className="mt-1.5 text-[11px] leading-snug text-[#5F5E5A]">
                  {cierres < 3 ? `de la comisión en compradores KYRELO. Desde tu cuarto cierre pasas a 50/50 (te faltan ${3 - cierres}).` : 'de la comisión en compradores KYRELO. Ya estás en 50/50.'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E0DDD2] bg-white p-5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#A8A69E]">Inmuebles KYRELO</p>
                <p className="mt-2 text-[28px] leading-none tracking-tight text-[#1A1A18]" style={{ fontFamily: 'Fraunces, serif' }}>50/50</p>
                <p className="mt-1.5 text-[11px] leading-snug text-[#5F5E5A]">Reparto fijo, con el material de venta incluido.</p>
              </div>
            </section>

            <section>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A69E] mb-4">Mis postulaciones ({mias.length})</p>
              {mias.length === 0 && <p className="py-4 text-sm text-[#5F5E5A]">Aún no has postulado inmuebles. Busca en «Compradores».</p>}
              {mias.map((p) => {
                const idx = Math.max(0, SEGUIMIENTO.findIndex((e) => e.clave === p.estado));
                const rechazada = p.estado === 'rechazado';
                return (
                  <article key={p.id} className="mb-4 overflow-hidden rounded-2xl border border-[#E0DDD2] bg-white">
                    <div className="flex items-center gap-4 p-5">
                      <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-xl bg-[#F1EFE8]">
                        <div className="absolute inset-0 flex items-center justify-center opacity-60">
                          <IconoTipo tipo={p.titulo} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium tracking-tight text-[#1A1A18]">{p.titulo}</p>
                        <p className="mt-0.5 truncate text-[12px] text-[#5F5E5A]">
                          {[p.ubicacion, p.alcobas && `${p.alcobas} alcobas`, formatoCOPfull(p.precio)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {rechazada ? (
                        <span className="shrink-0 rounded-full border border-[#D5BBB5] px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[#8E3B31]">No seleccionada</span>
                      ) : (
                        <span className={pillCls}>{SEGUIMIENTO[idx]?.label ?? ESTADOS[p.estado] ?? p.estado}</span>
                      )}
                    </div>
                    <div className="border-t border-[#E0DDD2] px-5 py-4">
                      {rechazada ? (
                        <p className="text-[11px] leading-relaxed text-[#5F5E5A]">
                          {p.motivo_rechazo
                            ? <>Motivo: <span className="text-[#1A1A18]">{p.motivo_rechazo}</span>. Puedes postular tu inmueble a otros compradores activos.</>
                            : 'Esta postulación no fue seleccionada para este comprador. Puedes postular tu inmueble a otros compradores activos.'}
                        </p>
                      ) : (
                        <div>
                          <div className="flex items-center">
                            {SEGUIMIENTO.map((e, i) => (
                              <div key={e.clave} className="flex flex-1 items-center last:flex-none">
                                <span
                                  title={e.label}
                                  className={`h-[10px] w-[10px] shrink-0 rounded-full ${
                                    i < idx ? 'bg-[#1A1A18]' : i === idx ? 'bg-[#B87333]' : 'border border-[#E0DDD2] bg-transparent'
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
            </section>

            <section>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A69E] mb-4">Mis asociaciones ({asociaciones.length})</p>
              {asociaciones.length === 0 && <p className="py-4 text-sm text-[#5F5E5A]">Todavía no has solicitado ninguna asociación. Mira «Inmuebles KYRELO».</p>}
              {asociaciones.map((i) => {
                const dias = diasHasta(i.fecha_vence);
                return (
                  <article key={i.asociacion_id} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E0DDD2] bg-white p-5">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium tracking-tight text-[#1A1A18]">{i.titulo || 'Inmueble KYRELO'}</p>
                      <p className="mt-0.5 text-[12px] text-[#5F5E5A]">
                        {[i.municipio, formatoCOPfull(i.precio)].filter(Boolean).join(' · ')}
                        {i.acceso_completo && dias != null ? ` · ${dias <= 0 ? 'vence hoy' : `${dias} días de vigencia`}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={pillCls}>{ASOC_ESTADOS[i.asociacion_estado] ?? i.asociacion_estado}</span>
                      {i.acceso_completo && (
                        <button onClick={() => setInmuebleAbierto(i)} className="text-[12px] text-[#1A1A18] underline underline-offset-4">Ver ficha y kit</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>

            <section>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#A8A69E] mb-4">Mis negocios ({negocios.length})</p>
              {negocios.length === 0 && <p className="py-4 text-sm text-[#5F5E5A]">Cuando un comprador y tu inmueble se conecten, el negocio aparece aquí con su avance.</p>}
              {negocios.map((n) => (
                <article key={n.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E0DDD2] bg-white p-5">
                  <div>
                    <p className="text-[15px] font-medium tracking-tight text-[#1A1A18]">{NEGOCIO_ESTADOS[n.estado] ?? n.estado}</p>
                    <p className="mt-0.5 text-[12px] text-[#5F5E5A]">
                      {haceCuanto(n.fecha_ultimo_movimiento)}
                      {n.estado === 'perdido' && n.motivo_perdida ? ` · ${n.motivo_perdida}` : ''}
                    </p>
                  </div>
                  {n.acuerdo_comision_url ? (
                    <a href={n.acuerdo_comision_url} target="_blank" rel="noreferrer" className="text-[12px] text-[#1A1A18] underline underline-offset-4">Acuerdo de comisión</a>
                  ) : n.estado === 'conectado' ? (
                    <span className="text-[11px] text-[#B87333]">Falta firmar el acuerdo para agendar visita</span>
                  ) : null}
                </article>
              ))}
            </section>
          </div>
        )}

        {/* ============ CÓMO FUNCIONA ============ */}
        {tab === 'info' && (
          <>
            <ComoFunciona />
            <FAQBrokers />
          </>
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
                href={`https://wa.me/${APP.whatsapp}?text=${encodeURIComponent(`Hola, soy un agente de ${APP.nombre}. Estoy registrando un inmueble para el comprador #${postulando.codigo} y tengo una duda:`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[12px] text-[#5F5E5A] underline underline-offset-4 hover:text-[#1A1A18] transition-colors mb-6"
              >
                ¿Tienes dudas? Escríbenos por WhatsApp
              </a>

              <div className="space-y-4">
                <div><label className={labelCls}>Título del inmueble *</label>
                  <input className={inputCls} value={formP.titulo} onChange={(e) => setFormP({ ...formP, titulo: e.target.value })} /></div>

                <div><label className={labelCls}>Matrícula inmobiliaria *</label>
                  <input className={inputCls} placeholder="Ej: 50N-1234567" value={formP.matricula} onChange={(e) => setFormP({ ...formP, matricula: e.target.value })} />
                  <p className="mt-1 text-[10px] text-[#A8A69E]">Nos permite verificar el inmueble. No se comparte con el comprador.</p></div>

                <div><label className={labelCls}>Enlace a las fotos *</label>
                  <input className={inputCls} type="url" placeholder="https://drive.google.com/… o el link del portal" value={formP.linkFotos} onChange={(e) => setFormP({ ...formP, linkFotos: e.target.value })} />
                  <p className="mt-1 text-[10px] text-[#A8A69E]">Drive, WeTransfer, Dropbox o el anuncio en un portal.</p></div>

                <div><label className={labelCls}>Tu celular / WhatsApp de contacto *</label>
                  <input className={inputCls} type="tel" placeholder="300 123 4567" value={formP.contacto} onChange={(e) => setFormP({ ...formP, contacto: e.target.value })} /></div>

                <div><label className={labelCls}>¿Cómo tienes el inmueble?</label>
                  <select className={inputCls} value={formP.exclusividad} onChange={(e) => setFormP({ ...formP, exclusividad: e.target.value })}>
                    {EXCLUSIVIDAD.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select></div>

                <label className="flex items-center gap-3 text-[13px] text-[#1A1A18]">
                  <input type="checkbox" checked={formP.certificado} onChange={(e) => setFormP({ ...formP, certificado: e.target.checked })} />
                  Tengo el certificado de tradición y libertad
                </label>

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

                <div><label className={labelCls}>Municipio / ciudad</label>
                  <input className={inputCls} value={formP.ciudad} onChange={(e) => setFormP({ ...formP, ciudad: e.target.value })} /></div>
                <div><label className={labelCls}>Barrio o sector</label>
                  <input className={inputCls} value={formP.barrio} onChange={(e) => setFormP({ ...formP, barrio: e.target.value })} /></div>
                <div><label className={labelCls}>Conjunto</label>
                  <input className={inputCls} value={formP.conjunto} onChange={(e) => setFormP({ ...formP, conjunto: e.target.value })} /></div>
                <div><label className={labelCls}>Dirección</label>
                  <input className={inputCls} value={formP.direccion} onChange={(e) => setFormP({ ...formP, direccion: e.target.value })} /></div>

                <div><label className={labelCls}>Amenidades (separadas por coma)</label>
                  <input className={inputCls} placeholder="Piscina, gimnasio, portería 24h" value={formP.amenidades} onChange={(e) => setFormP({ ...formP, amenidades: e.target.value })} /></div>

                <div><label className={labelCls}>Descripción</label>
                  <textarea className={inputCls + ' resize-none'} rows={3} value={formP.descripcion} onChange={(e) => setFormP({ ...formP, descripcion: e.target.value })} /></div>
              </div>

              {mensaje && <p className="text-xs text-[#1A1A18] mt-4 border-l border-[#1A1A18] pl-3">{mensaje}</p>}

              <div className="flex gap-3 mt-6">
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
    { n: '01', t: 'Compradores verificados', d: 'Solo publicamos compradores banda A: presupuesto, plazo y forma de pago confirmados. Cada requerimiento vence a los 30 días para que nunca trabajes sobre datos viejos.' },
    { n: '02', t: 'Postula o asóciate', d: 'Si tienes el inmueble que busca un comprador, lo postulas con el enlace a tus fotos. Si tienes el comprador, te asocias a un inmueble de KYRELO y te damos el kit de venta.' },
    { n: '03', t: 'Cierras y creces', d: 'En compradores KYRELO: 40% de la comisión para ti en tus tres primeros cierres y 50/50 desde el cuarto. En inmuebles KYRELO: 50/50 fijo. Nosotros hacemos el papeleo.' },
  ];
  return (
    <section className="py-4">
      <div className="mb-8 rounded-2xl border border-[#EBDBC8] bg-[#F6EFE4] px-6 py-5 text-center">
        <p className="text-[13px] font-medium text-[#1A1A18]">
          Registrarte e ingresar es <span className="text-[#B87333]">gratis</span>. Solo compartes comisión cuando cierras un negocio dentro de KYRELO.
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
    { q: '¿Registrarme tiene algún costo?', a: 'No. Crear tu cuenta, ver los compradores y postular tus inmuebles es totalmente gratis. Solo compartes comisión cuando se cierra un negocio dentro de KYRELO.' },
    { q: '¿Cómo se reparte la comisión?', a: 'En los compradores que te asignamos: 40% para ti en tus tres primeros cierres y 50/50 desde el cuarto. En los inmuebles que capta KYRELO: 50/50 fijo, con fotos, video, ficha técnica y textos de venta incluidos. Firmamos el acuerdo antes de presentar el inmueble o agendar la visita.' },
    { q: '¿Qué es la exclusividad que me preguntan al postular?', a: 'Si el dueño te dio el derecho de vender el inmueble solo tú (propia), si trabaja con varias inmobiliarias (compartida) o si no hay acuerdo firmado. Nos ayuda a saber qué tan segura es la disponibilidad y la comisión.' },
    { q: '¿Me pueden quitar el cliente?', a: 'No. Tu postulación queda registrada y firmamos un acuerdo antes de presentar el inmueble. Nunca recibes el contacto del comprador de KYRELO, y KYRELO nunca pide el contacto del tuyo.' },
    { q: '¿Qué pasa si ya trabajo con otra inmobiliaria?', a: 'Puedes usar KYRELO como un canal más de oportunidades. Tú decides qué inmuebles postular y con qué alcance.' },
    { q: '¿Los compradores son reales?', a: 'Sí. Cada requerimiento viene de un comprador verificado por audio y calificación (banda A), con presupuesto y plazo confirmados. Si un requerimiento no está en banda A, no se publica.' },
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
      href={`https://wa.me/${APP.whatsapp}?text=${encodeURIComponent(`Hola, soy un agente de ${APP.nombre} y tengo una duda:`)}`}
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
