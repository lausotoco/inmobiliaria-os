'use client';

// app/broker/videos/[id]/page.tsx — un video por inmueble, de principio a fin:
// asistente de 4 pasos (inmueble · detalles · tomas · marca y envío) →
// Recibido / En edición → vista previa protegida con desbloqueo por Wompi →
// descargas en alta calidad.
// Se puede empezar sin cuenta: la cuenta se crea al pedir la vista previa,
// cuando ya está todo cargado (CuentaVistaPrevia).

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatoCOP } from '@/lib/utils';
import { enlaceWhatsApp } from '@/lib/mensaje-whatsapp';
import {
  ENTREGAS,
  ESTILOS,
  PASOS,
  TEXTO_HORARIO,
  casillasDe,
  faltantesPorPaso,
  tituloVideo,
  type EstadoVideo,
  type Ficha,
  type Paso,
} from '@/lib/videos/config';
import { api } from '@/lib/videos/subir';
import { PasoDetalles, PasoInmueble, PasoMarca } from '@/components/videos/FichaVideo';
import CasillasTomas, { type Toma } from '@/components/videos/CasillasTomas';
import VistaPreviaProtegida from '@/components/videos/VistaPreviaProtegida';
import CuentaVistaPrevia from '@/components/videos/CuentaVistaPrevia';
import {
  Aviso,
  BarraApp,
  EtiquetaEstado,
  Icono,
  LineaEstados,
  botonAcento,
  botonPrimario,
  botonSecundario,
  fondoApp,
  tarjeta,
  tarjetaDesdeSm,
} from '@/components/videos/ui';

type Datos = {
  video: {
    id: string;
    codigo: string;
    ficha: Ficha;
    estilo: string | null;
    voz_en_off: boolean;
    estado: EstadoVideo;
    motivo_rechazo: string | null;
    texto_corto: string | null;
    texto_largo: string | null;
    entregas_listas: string[];
    /** Antes de pagar: copias con marca de las portadas y el comienzo de los textos */
    paquete: {
      portadas: { tipo: string; url: string }[];
      textos: { corto: string | null; largo: string | null };
      con_anuncio: boolean;
    } | null;
  };
  tomas: Toma[];
  logo_url: string | null;
  nombre_agente: string;
  sin_cuenta: boolean;
  precio: number | null;
  pago_en_linea: boolean;
  pagos: { id: string; estado: string; creado_en: string }[];
  entrega: string | null;
  entrega_si_envia_ahora: string;
  dentro_horario: boolean;
};

const AYUDA_PASO: Record<Paso, string> = {
  inmueble: 'Lo básico: qué es, cuánto vale y dónde está.',
  detalles: 'Los datos que salen en pantalla y lo que lo hace especial.',
  tomas: 'Sube un solo video del recorrido, toma por toma o, si no tienes video, tus fotos.',
  marca: 'Cómo cierra tu video y el estilo de edición.',
};

const ICONO_ENTREGA: Record<string, string> = {
  final_vertical: 'video',
  final_anuncio: 'video',
  portada_vertical: 'imagen',
  portada_cuadrada: 'imagen',
};

function Pantalla({ children, derecha, sinCuenta }: { children: React.ReactNode; derecha?: React.ReactNode; sinCuenta?: boolean }) {
  return (
    <div className={fondoApp}>
      <BarraApp volver={sinCuenta ? { href: '/video-inmueble', texto: 'Inicio' } : { href: '/broker/videos', texto: 'Mis videos' }} derecha={derecha} />
      {children}
    </div>
  );
}

export default function VideoInmueble({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [ficha, setFicha] = useState<Ficha>({});
  const [tomas, setTomas] = useState<Toma[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [paso, setPaso] = useState<Paso | null>(null);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState<'' | 'guardando' | 'guardado' | 'error'>('');
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');
  const [pagando, setPagando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [copiado, setCopiado] = useState('');
  const [pidiendoCuenta, setPidiendoCuenta] = useState(false);
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fichaPorGuardar = useRef<Ficha | null>(null);
  const arriba = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api<Datos>(`/api/videos/${id}`, 'GET');
      setDatos(d);
      setFicha(d.video.ficha ?? {});
      setTomas(d.tomas);
      setLogoUrl(d.logo_url);
      return d;
    } catch (e) {
      // Video de un agente que no ha iniciado sesión: a entrar y volver aquí
      if ((e as Error & { datos?: { entrar?: boolean } }).datos?.entrar) {
        router.replace(`/login?siguiente=${encodeURIComponent(`/broker/videos/${id}`)}`);
        return null;
      }
      setError((e as Error).message);
      return null;
    }
  }, [id, router]);

  useEffect(() => {
    cargar().then((d) => {
      if (!d) return;
      // Arranca en el primer paso que tenga algo pendiente
      const f = faltantesPorPaso(d.video.ficha ?? {}, d.tomas.map((t) => t.casilla));
      setPaso(PASOS.find((p) => f[p.v].length > 0)?.v ?? 'marca');
    });
  }, [cargar]);

  // Al volver de Wompi: ?id=<transacción>. Se confirma servidor a servidor.
  useEffect(() => {
    const url = new URL(window.location.href);
    const transaccion = url.searchParams.get('id');
    if (!transaccion) return;
    window.history.replaceState(null, '', url.pathname);
    setVerificando(true);
    let intentos = 0;
    const revisar = async () => {
      intentos++;
      const r = await api<{ estado: string }>(`/api/videos/${id}/pago`, 'PUT', { transaccion }).catch(() => ({ estado: 'pendiente' }));
      if (r.estado !== 'pendiente' || intentos >= 24) {
        setVerificando(false);
        await cargar();
        return;
      }
      setTimeout(revisar, 5000);
    };
    revisar();
  }, [id, cargar]);

  const estado = datos?.video.estado;
  useEffect(() => {
    if (estado !== 'recibido' && estado !== 'en_edicion') return;
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, [estado, cargar]);

  async function guardarAhora() {
    if (pendiente.current) clearTimeout(pendiente.current);
    pendiente.current = null;
    const f = fichaPorGuardar.current;
    if (!f) return true;
    fichaPorGuardar.current = null;
    setGuardado('guardando');
    try {
      await api(`/api/videos/${id}`, 'PATCH', { ficha: f });
      setGuardado('guardado');
      return true;
    } catch (e) {
      setGuardado('error');
      setErrorAccion((e as Error).message);
      return false;
    }
  }

  function cambiarFicha(f: Ficha) {
    setFicha(f);
    fichaPorGuardar.current = f;
    setGuardado('guardando');
    if (pendiente.current) clearTimeout(pendiente.current);
    pendiente.current = setTimeout(guardarAhora, 800);
  }

  async function cambiarEstilo(cambios: { estilo?: string; voz_en_off?: boolean }) {
    if (!datos) return;
    setDatos({ ...datos, video: { ...datos.video, ...cambios } });
    await api(`/api/videos/${id}`, 'PATCH', cambios).catch((e) => setErrorAccion((e as Error).message));
  }

  function cambiarToma(casilla: string, toma: Toma | null) {
    setTomas((ts) => [...ts.filter((t) => t.casilla !== casilla), ...(toma ? [toma] : [])]);
  }

  function irA(p: Paso) {
    guardarAhora();
    setPaso(p);
    arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Sin cuenta, primero se crea (o se entra) y después se envía. */
  async function pedirVistaPrevia() {
    if (datos?.sin_cuenta) {
      if (await guardarAhora()) setPidiendoCuenta(true);
      return;
    }
    await enviar();
  }

  async function enviar() {
    setErrorAccion('');
    setEnviando(true);
    if (!(await guardarAhora())) {
      setEnviando(false);
      return;
    }
    try {
      await api(`/api/videos/${id}`, 'POST', { accion: 'enviar' });
      await cargar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErrorAccion((e as Error).message);
    }
    setEnviando(false);
  }

  async function descartar() {
    const texto =
      estado === 'vista_previa'
        ? '¿Descartar esta vista previa? Se borra el video y liberas el cupo para otro inmueble. No se puede deshacer.'
        : '¿Borrar este video? Se borran la ficha y las tomas. No se puede deshacer.';
    if (!window.confirm(texto)) return;
    try {
      await api(`/api/videos/${id}`, 'POST', { accion: 'descartar' });
      router.push(datos?.sin_cuenta ? '/video-inmueble' : '/broker/videos');
    } catch (e) {
      setErrorAccion((e as Error).message);
    }
  }

  async function pagar() {
    setPagando(true);
    setErrorAccion('');
    try {
      const r = await api<{ url: string }>(`/api/videos/${id}/pago`, 'POST');
      window.location.href = r.url;
    } catch (e) {
      setErrorAccion((e as Error).message);
      setPagando(false);
    }
  }

  async function descargar(tipo: string) {
    try {
      const r = await api<{ archivos: { tipo: string; url: string }[] }>(`/api/videos/${id}/descargas`, 'GET');
      const a = r.archivos.find((x) => x.tipo === tipo);
      if (a) window.location.href = a.url;
    } catch (e) {
      setErrorAccion((e as Error).message);
    }
  }

  function copiar(clave: string, texto: string) {
    navigator.clipboard?.writeText(texto);
    setCopiado(clave);
    setTimeout(() => setCopiado(''), 1800);
  }

  if (error)
    return (
      <Pantalla>
        <main className="mx-auto max-w-xl px-4 py-10">
          <Aviso tono="error">{error}</Aviso>
        </main>
      </Pantalla>
    );
  if (!datos || !estado)
    return (
      <Pantalla>
        <div className="flex justify-center py-24">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
        </div>
      </Pantalla>
    );

  const v = datos.video;
  const editable = estado === 'borrador' || estado === 'rechazado';
  const faltan = faltantesPorPaso(ficha, tomas.map((t) => t.casilla));
  const listo = PASOS.every((p) => faltan[p.v].length === 0);
  const indice = PASOS.findIndex((p) => p.v === paso);
  const pagoEnCurso = datos.pagos.some((p) => p.estado === 'pendiente' && Date.now() - new Date(p.creado_en).getTime() < 30 * 60000);
  const mensajeWhatsApp = enlaceWhatsApp(`Hola, quiero desbloquear mi video ${v.codigo} (${tituloVideo(ficha)}).`);
  const orden = casillasDe(ficha.tipo);
  const tira = [...tomas].sort((a, b) => orden.indexOf(a.casilla) - orden.indexOf(b.casilla));
  const titulo = ficha.tipo ? tituloVideo(ficha) : 'Nuevo video';

  const encabezado = (
    <div ref={arriba} className="scroll-mt-20">
      <p className="text-[13px] font-medium text-zinc-500">{v.codigo}</p>
      <h1 className="mt-1 text-[26px] font-semibold leading-tight text-zinc-900 sm:text-[32px]">{titulo}</h1>
    </div>
  );

  // ─────────────── Asistente: sin enviar o por regrabar ───────────────
  if (editable) {
    const ultimo = indice === PASOS.length - 1;
    const botonSiguiente = ultimo ? (
      <button onClick={pedirVistaPrevia} disabled={!listo || enviando} className={`${botonAcento} flex-1 lg:flex-none`}>
        {enviando ? 'Enviando…' : estado === 'rechazado' ? 'Volver a enviar' : 'Pedir mi vista previa'}
        {!enviando && <Icono nombre="flechaDer" className="h-4 w-4" grosor={2.2} />}
      </button>
    ) : (
      <button onClick={() => irA(PASOS[indice + 1].v)} className={`${botonPrimario} flex-1 lg:flex-none`}>
        Siguiente: {PASOS[indice + 1]?.corto}
        <Icono nombre="flechaDer" className="h-4 w-4" grosor={2.2} />
      </button>
    );

    const resumen = (
      <div className={`${tarjeta} p-5`}>
        <p className="text-[13px] font-semibold text-zinc-900">Tu video</p>
        {tira.length > 0 ? (
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {tira.map((t) =>
              t.miniatura ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={t.id} src={t.miniatura} alt="" className="h-20 w-[45px] shrink-0 rounded-md object-cover" />
              ) : (
                <span key={t.id} className="flex h-20 w-[45px] shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400">
                  <Icono nombre="video" className="h-4 w-4" />
                </span>
              )
            )}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-zinc-500">Aquí verás tus tomas en orden.</p>
        )}
        <ul className="mt-4 space-y-1">
          {PASOS.map((p) => {
            const ok = faltan[p.v].length === 0;
            return (
              <li key={p.v}>
                <button onClick={() => irA(p.v)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-zinc-50">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                    {ok ? <Icono nombre="check" className="h-3.5 w-3.5" grosor={2.6} /> : <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14px] ${paso === p.v ? 'font-semibold text-zinc-900' : 'text-zinc-700'}`}>{p.l}</span>
                    {!ok && <span className="block truncate text-[12px] text-zinc-500">Falta: {faltan[p.v].join(', ').toLowerCase()}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-[13px]">
          <p className="flex items-start gap-2 text-zinc-600">
            <Icono nombre="reloj" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
            <span>
              Si lo envías ahora, tu vista previa llega <strong className="text-zinc-900">{datos.entrega_si_envia_ahora}</strong>
            </span>
          </p>
          {datos.precio ? (
            <p className="flex items-start gap-2 text-zinc-600">
              <Icono nombre="ojo" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <span>
                Lo ves antes de pagar. Si te gusta, lo desbloqueas por <strong className="text-zinc-900">{formatoCOP(datos.precio)}</strong>.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2 text-zinc-600">
              <Icono nombre="ojo" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <span>Lo ves antes de pagar y pagas solo si te gusta.</span>
            </p>
          )}
          {datos.sin_cuenta && (
            <p className="flex items-start gap-2 text-zinc-600">
              <Icono nombre="check" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <span>No necesitas cuenta para empezar. La creas al pedir tu vista previa.</span>
            </p>
          )}
        </div>
        <button onClick={pedirVistaPrevia} disabled={!listo || enviando} className={`${botonAcento} mt-5 w-full`}>
          {enviando ? 'Enviando…' : estado === 'rechazado' ? 'Volver a enviar' : 'Pedir mi vista previa'}
        </button>
        <p className="mt-2 text-center text-[12px] text-zinc-400">
          {guardado === 'guardando'
            ? 'Guardando…'
            : guardado === 'error'
              ? 'No se guardó el último cambio'
              : datos.sin_cuenta
                ? 'Todo se guarda solo en este navegador'
                : 'Todo se guarda solo'}
        </p>
      </div>
    );

    const siguiente = `/broker/videos/${id}`;
    return (
      <Pantalla
        sinCuenta={datos.sin_cuenta}
        derecha={
          datos.sin_cuenta ? (
            <Link href={`/login?siguiente=${encodeURIComponent(siguiente)}`} className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
              ¿Ya tienes cuenta? <span className="font-semibold text-zinc-900">Entrar</span>
            </Link>
          ) : (
            <EtiquetaEstado estado={estado} />
          )
        }
      >
        {pidiendoCuenta && (
          <CuentaVistaPrevia
            whatsapp={ficha.whatsapp}
            nombre={ficha.nombre_marca}
            entrega={datos.entrega_si_envia_ahora}
            siguiente={siguiente}
            onCerrar={() => setPidiendoCuenta(false)}
            onListo={async () => {
              setPidiendoCuenta(false);
              await enviar();
            }}
          />
        )}
        <main className="mx-auto max-w-6xl px-4 pb-36 pt-6 sm:px-6 lg:pb-16 lg:pt-10">
          {encabezado}

          {estado === 'rechazado' && v.motivo_rechazo && (
            <div className="mt-5">
              <Aviso tono="error" titulo="Hay que regrabar antes de editar">
                {v.motivo_rechazo}
                <span className="mt-1 block text-red-700/80">Cambia las tomas que hagan falta y vuelve a enviar.</span>
              </Aviso>
            </div>
          )}

          {/* Pasos */}
          <nav className="mt-6 grid grid-cols-4 gap-1.5 sm:gap-2" aria-label="Pasos">
            {PASOS.map((p, i) => {
              const ok = faltan[p.v].length === 0;
              const activo = paso === p.v;
              return (
                <button key={p.v} onClick={() => irA(p.v)} className="group text-left">
                  <span className={`block h-1.5 rounded-full transition ${activo ? 'bg-zinc-900' : ok ? 'bg-orange-500' : 'bg-zinc-200 group-hover:bg-zinc-300'}`} />
                  <span className={`mt-2 flex items-center gap-1.5 text-[12px] sm:text-[13px] ${activo ? 'font-semibold text-zinc-900' : 'text-zinc-500'}`}>
                    {ok && !activo ? <Icono nombre="check" className="hidden h-3.5 w-3.5 text-orange-600 sm:block" grosor={2.6} /> : <span className="hidden text-zinc-400 sm:inline">{i + 1}.</span>}
                    <span className="truncate">
                      <span className="sm:hidden">{p.corto}</span>
                      <span className="hidden sm:inline">{p.l}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="min-w-0 space-y-4">
              <section className={tarjetaDesdeSm}>
                <div className="mb-6">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-orange-600">Paso {indice + 1} de 4</p>
                  <h2 className="mt-1 text-[22px] font-semibold text-zinc-900">{PASOS[indice]?.l}</h2>
                  <p className="mt-1 text-[14px] text-zinc-500">{paso ? AYUDA_PASO[paso] : ''}</p>
                </div>
                {paso === 'inmueble' && <PasoInmueble ficha={ficha} onChange={cambiarFicha} />}
                {paso === 'detalles' && <PasoDetalles ficha={ficha} onChange={cambiarFicha} />}
                {paso === 'tomas' && (
                  <CasillasTomas videoId={id} tipo={ficha.tipo} tomas={tomas} onCambio={cambiarToma} />
                )}
                {paso === 'marca' && (
                  <PasoMarca
                    ficha={ficha}
                    onChange={cambiarFicha}
                    videoId={id}
                    logoUrl={logoUrl}
                    onLogo={(url, ruta) => {
                      setLogoUrl(url);
                      setFicha((f) => ({ ...f, logo_ruta: ruta }));
                    }}
                    estilo={v.estilo}
                    voz={v.voz_en_off}
                    onEstilo={cambiarEstilo}
                  />
                )}

                {paso === 'marca' && !listo && (
                  <div className="mt-7">
                    <Aviso tono="atencion" titulo="Para enviar te falta">
                      <ul className="mt-1 space-y-1">
                        {PASOS.filter((p) => faltan[p.v].length).map((p) => (
                          <li key={p.v}>
                            <button onClick={() => irA(p.v)} className="text-left underline decoration-amber-400 underline-offset-2">
                              {p.l}: {faltan[p.v].join(', ').toLowerCase()}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Aviso>
                  </div>
                )}
                {errorAccion && (
                  <div className="mt-5">
                    <Aviso tono="error">
                      {errorAccion}
                      {errorAccion.includes('sin desbloquear') && (
                        <Link href="/broker/videos" className="mt-1 block font-semibold underline">
                          Ver mis videos
                        </Link>
                      )}
                    </Aviso>
                  </div>
                )}

                {/* Navegación en computador */}
                <div className="mt-8 hidden items-center justify-between gap-3 border-t border-zinc-100 pt-6 lg:flex">
                  {indice > 0 ? (
                    <button onClick={() => irA(PASOS[indice - 1].v)} className={botonSecundario}>
                      <Icono nombre="flechaIzq" className="h-4 w-4" />
                      Atrás
                    </button>
                  ) : (
                    <span />
                  )}
                  {botonSiguiente}
                </div>
              </section>

              {estado === 'borrador' && (
                <button onClick={descartar} className="px-1 text-[13px] text-zinc-400 transition hover:text-red-600">
                  Borrar este borrador
                </button>
              )}
              {paso === 'marca' && <div className="lg:hidden">{resumen}</div>}
            </div>

            <aside className="hidden lg:sticky lg:top-20 lg:block">{resumen}</aside>
          </div>
        </main>

        {/* Barra fija en el celular */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-2.5">
            {indice > 0 && (
              <button onClick={() => irA(PASOS[indice - 1].v)} aria-label="Atrás" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700">
                <Icono nombre="flechaIzq" />
              </button>
            )}
            {botonSiguiente}
          </div>
        </div>
      </Pantalla>
    );
  }

  // ─────────────── Enviado: en la fila de edición ───────────────
  if (estado === 'recibido' || estado === 'en_edicion') {
    return (
      <Pantalla derecha={<EtiquetaEstado estado={estado} />}>
        <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className={`${tarjeta} overflow-hidden`}>
            <div className="bg-gradient-to-b from-orange-50 to-white px-6 pb-6 pt-10 text-center sm:px-10">
              <span className="latido mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/25">
                <Icono nombre={estado === 'recibido' ? 'subir' : 'varita'} className="h-7 w-7" />
              </span>
              <h1 className="mt-5 text-[24px] font-semibold text-zinc-900 sm:text-[28px]">
                {estado === 'recibido' ? 'Recibimos tu material' : 'Estamos editando tu video'}
              </h1>
              <p className="mt-2 text-[15px] text-zinc-600">Tu vista previa llega</p>
              <p className="mt-1 text-[22px] font-semibold text-zinc-900">{datos.entrega}</p>
            </div>
            <div className="px-6 pb-8 pt-2 sm:px-10">
              <LineaEstados estado={estado} />
              <p className="mt-6 text-center text-[14px] leading-relaxed text-zinc-500">
                Aparece en esta misma página. Puedes cerrarla y volver cuando quieras. Editamos {TEXTO_HORARIO}.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-zinc-100 px-6 py-4 text-[12px] text-zinc-500">
              <span className="rounded-full bg-zinc-100 px-2.5 py-1">{titulo}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1">{tomas.length} {tomas.every((t) => t.casilla.startsWith('foto_')) ? 'fotos' : 'tomas'}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1">Estilo {ESTILOS.find((e) => e.v === v.estilo)?.l.toLowerCase() ?? 'directo'}</span>
              {v.voz_en_off && <span className="rounded-full bg-zinc-100 px-2.5 py-1">Con voz en off</span>}
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link href="/broker/videos" className={botonSecundario}>
              Mientras tanto, empieza otro video
            </Link>
          </div>
        </main>
      </Pantalla>
    );
  }

  // ─────────────── Vista previa: se ve, pero no se usa hasta pagar ───────────────
  if (estado === 'vista_previa') {
    const accionPago = datos.pago_en_linea ? (
      <button onClick={pagar} disabled={pagando || verificando} className={`${botonAcento} w-full py-3.5`}>
        <Icono nombre="candado" className="h-4 w-4" grosor={2} />
        {pagando ? 'Abriendo el pago…' : 'Desbloquear video'}
      </button>
    ) : (
      <a href={mensajeWhatsApp} target="_blank" rel="noopener noreferrer" className={`${botonAcento} w-full py-3.5`}>
        <Icono nombre="chat" className="h-4 w-4" grosor={2} />
        Desbloquear por WhatsApp
      </a>
    );
    return (
      <Pantalla derecha={<EtiquetaEstado estado={estado} />}>
        <main className="mx-auto max-w-5xl px-4 pb-36 pt-6 sm:px-6 lg:pb-16 lg:pt-10">
          {encabezado}
          <div className="mt-5">
            <LineaEstados estado={estado} />
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-14">
            <VistaPreviaProtegida videoId={id} />
            <div className="space-y-4">
              <section className={`${tarjeta} p-6 sm:p-8`}>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[12px] font-semibold text-orange-700">
                  <Icono nombre="destello" className="h-3.5 w-3.5" />
                  Tu video está listo
                </p>
                <h2 className="mt-3 text-[24px] font-semibold leading-tight text-zinc-900 sm:text-[28px]">Desbloquéalo y publícalo hoy</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ['video', 'Video vertical', 'Para redes, historias y estados'],
                    ['video', 'Versión 4:5', 'Lista para anuncios'],
                    ['imagen', 'Dos portadas', '9:16 y 1:1'],
                    ['texto', 'Textos para tus anuncios', 'Y para tu publicación, listos para copiar'],
                  ].map(([icono, t, d]) => (
                    <li key={t} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                        <Icono nombre={icono} className="h-[18px] w-[18px]" />
                      </span>
                      <span>
                        <span className="block text-[14px] font-semibold text-zinc-900">{t}</span>
                        <span className="block text-[13px] text-zinc-500">{d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-end justify-between gap-4 border-t border-zinc-100 pt-5">
                  <div>
                    <p className="text-[13px] text-zinc-500">Pago único</p>
                    {datos.precio && <p className="text-[30px] font-semibold tracking-tight text-zinc-900">{formatoCOP(datos.precio)}</p>}
                  </div>
                  <p className="text-right text-[12px] text-zinc-500">Alta calidad · sin marcas</p>
                </div>
                {verificando && (
                  <div className="mt-4">
                    <Aviso tono="atencion">Confirmando tu pago con Wompi. No cierres esta página.</Aviso>
                  </div>
                )}
                {!verificando && pagoEnCurso && !pagando && (
                  <div className="mt-4">
                    <Aviso tono="atencion">Tienes un pago en proceso. Apenas Wompi lo confirme, el video se desbloquea solo. Si no lo terminaste, puedes pagar de nuevo.</Aviso>
                  </div>
                )}
                <div className="mt-5 hidden lg:block">{accionPago}</div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-zinc-500">
                  <Icono nombre="escudo" className="h-4 w-4 text-emerald-600" />
                  {datos.pago_en_linea ? 'Pago seguro con Wompi: tarjeta, PSE, Nequi o Bancolombia' : 'Te enviamos los datos de pago y lo desbloqueamos al confirmarlo'}
                </p>
                {errorAccion && (
                  <div className="mt-4">
                    <Aviso tono="error">{errorAccion}</Aviso>
                  </div>
                )}
              </section>
              <p className="px-1 text-[12px] leading-relaxed text-zinc-500">
                La vista previa no es el producto final. Si encuentras un error nuestro (un dato o un corte), lo corregimos sin costo.{' '}
                <Link href="/legal/terminos" className="underline">
                  Términos
                </Link>
              </p>
              <button onClick={descartar} className="px-1 text-[13px] text-zinc-400 transition hover:text-red-600">
                No me sirve: descartar esta vista previa
              </button>
            </div>
          </div>

          {v.paquete && (v.paquete.portadas.length > 0 || v.paquete.textos.corto || v.paquete.textos.largo) && (
            <section className="mt-12">
              <h2 className="text-[22px] font-semibold text-zinc-900 sm:text-[26px]">Todo lo que recibes al desbloquear</h2>
              <p className="mt-1 text-[14px] text-zinc-500">Además del video vertical en alta calidad y sin marcas{v.paquete.con_anuncio ? ' y su versión 4:5 para anuncios' : ''}.</p>
              <div className="mt-6 grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
                {v.paquete.portadas.length > 0 && (
                  <div className={`${tarjeta} p-5`} onContextMenu={(e) => e.preventDefault()}>
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900">
                      <Icono nombre="imagen" className="h-4 w-4 text-zinc-400" />
                      Portadas
                    </p>
                    <p className="mt-0.5 text-[12px] text-zinc-500">Vertical y cuadrada, con tus datos</p>
                    <div className="mt-4 flex items-end gap-3">
                      {v.paquete.portadas.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.tipo}
                          src={p.url}
                          alt={p.tipo === 'portada_vertical' ? 'Portada vertical' : 'Portada cuadrada'}
                          draggable={false}
                          className={`pointer-events-none select-none rounded-xl object-cover ring-1 ring-black/5 ${p.tipo === 'portada_vertical' ? 'aspect-[9/16] w-[118px]' : 'aspect-square w-[150px]'}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {([
                    ['corto', 'Texto para tu anuncio', v.paquete.textos.corto],
                    ['largo', 'Texto para tu publicación', v.paquete.textos.largo],
                  ] as const)
                    .filter(([, , texto]) => texto)
                    .map(([k, t, texto]) => (
                      <div key={k} className={`${tarjeta} p-5`}>
                        <p className="flex items-center gap-2 text-[14px] font-semibold text-zinc-900">
                          <Icono nombre="texto" className="h-4 w-4 text-zinc-400" />
                          {t}
                        </p>
                        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700">{texto}</p>
                        <div aria-hidden className="mt-2.5 space-y-2 blur-[2.5px]">
                          <span className="block h-3 w-[94%] rounded bg-zinc-200" />
                          <span className="block h-3 w-[86%] rounded bg-zinc-200" />
                          <span className="block h-3 w-[62%] rounded bg-zinc-200" />
                        </div>
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold text-zinc-600">
                          <Icono nombre="candado" className="h-3.5 w-3.5" />
                          Completo al desbloquear
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}
        </main>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            {datos.precio && (
              <div className="shrink-0">
                <p className="text-[11px] text-zinc-500">Pago único</p>
                <p className="text-[17px] font-semibold text-zinc-900">{formatoCOP(datos.precio)}</p>
              </div>
            )}
            <div className="flex-1">{accionPago}</div>
          </div>
        </div>
      </Pantalla>
    );
  }

  // ─────────────── Desbloqueado: descargas y textos ───────────────
  if (estado === 'desbloqueado') {
    return (
      <Pantalla derecha={<EtiquetaEstado estado={estado} />}>
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
              <Icono nombre="check" className="h-6 w-6" grosor={2.4} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-zinc-500">{v.codigo}</p>
              <h1 className="text-[22px] font-semibold leading-tight text-zinc-900 sm:text-[28px]">Tu video está listo para publicar</h1>
            </div>
          </div>
          <p className="mt-3 text-[14px] text-zinc-500">{titulo} · alta calidad y sin marcas.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {ENTREGAS.filter((e) => v.entregas_listas.includes(e.v)).map((e) => (
              <button key={e.v} onClick={() => descargar(e.v)} className={`${tarjeta} group flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
                  <Icono nombre={ICONO_ENTREGA[e.v] ?? 'video'} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-zinc-900">{e.l}</span>
                  <span className="block text-[13px] text-zinc-500">Descargar</span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition group-hover:bg-orange-600 group-hover:text-white">
                  <Icono nombre="bajar" className="h-4 w-4" grosor={2} />
                </span>
              </button>
            ))}
          </div>
          {errorAccion && (
            <div className="mt-4">
              <Aviso tono="error">{errorAccion}</Aviso>
            </div>
          )}

          {[
            { k: 'corto', t: 'Texto para tu anuncio', v: v.texto_corto },
            { k: 'largo', t: 'Texto para tu publicación', v: v.texto_largo },
          ]
            .filter((x) => x.v)
            .map((x) => (
              <section key={x.k} className={`${tarjeta} mt-4 p-5 sm:p-6`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-zinc-900">
                    <Icono nombre="texto" className="h-4 w-4 text-zinc-400" />
                    {x.t}
                  </h2>
                  <button onClick={() => copiar(x.k, x.v ?? '')} className={botonSecundario}>
                    <Icono nombre={copiado === x.k ? 'check' : 'copiar'} className="h-4 w-4" />
                    {copiado === x.k ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-line rounded-xl bg-zinc-50 p-4 text-[14px] leading-relaxed text-zinc-800">{x.v}</p>
              </section>
            ))}

          <div className="mt-8 text-center">
            <Link href="/broker/videos" className={botonPrimario}>
              <Icono nombre="mas" className="h-4 w-4" grosor={2.2} />
              Hacer el video de otro inmueble
            </Link>
          </div>
        </main>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <main className="mx-auto max-w-xl px-4 py-12 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
          <Icono nombre="basura" />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold text-zinc-900">Este video fue descartado</h1>
        <Link href="/broker/videos" className={`${botonPrimario} mt-6`}>
          Volver a mis videos
        </Link>
      </main>
    </Pantalla>
  );
}
