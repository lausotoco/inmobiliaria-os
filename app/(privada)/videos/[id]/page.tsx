'use client';

// app/(privada)/videos/[id]/page.tsx — Panel de Laura para un video:
// descargar las tomas, subir la vista previa y los finales, publicar,
// pedir que regrabe, desbloquear a mano y liberar espacio.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatoCOP } from '@/lib/utils';
import { enlaceWhatsApp } from '@/lib/mensaje-whatsapp';
import { normalizarTelefono } from '@/lib/telefono';
import { ENTREGAS, ESTILOS, PREVIAS_PORTADA, TIPOS_INMUEBLE, entregaEstimada, formatoMB, mimeDe, type EstadoVideo, type Ficha } from '@/lib/videos/config';
import { api, subirConAvance } from '@/lib/videos/subir';
import { EtiquetaEstado, ICONO_CASILLA, Icono, botonAcento, botonPrimario, botonSecundario, tarjeta } from '@/components/videos/ui';

type Toma = {
  id: string;
  casilla: string;
  nombre_casilla: string;
  tamano: number | null;
  duracion: number | null;
  ancho: number | null;
  alto: number | null;
  revision: string;
  observaciones: string[];
  miniatura: string | null;
  url: string | null;
  partes?: number;
  partes_urls?: string[];
  nombre_archivo?: string | null;
};
type Datos = {
  video: Record<string, any> & { id: string; codigo: string; titulo: string; estado: EstadoVideo; ficha: Ficha & { nota_desbloqueo?: string } };
  agente: { nombre: string | null; empresa: string | null; telefono: string | null; email: string | null } | null;
  tomas: Toma[];
  logo_url: string | null;
  entregas: Record<string, { tamano?: number; nombre?: string; url: string | null }>;
  pagos: { id: string; referencia: string; monto: number; estado: string; medio: string | null; ambiente: string | null; creado_en: string }[];
  entrega_limite: string | null;
};

/**
 * Copia pequeña de una portada para que el agente la vea antes de pagar, con la
 * misma marca de la vista previa del video: «VISTA PREVIA» y «KYRELO» en el centro
 * (no su marca, para que no la pueda publicar) y el aviso abajo.
 */
async function previaDePortada(archivo: File): Promise<File> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error('No se pudo leer la portada.'));
      i.src = url;
    });
    const ancho = 360;
    const alto = Math.round((img.naturalHeight * ancho) / img.naturalWidth);
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const g = lienzo.getContext('2d');
    if (!g) throw new Error('No se pudo crear la copia.');
    g.drawImage(img, 0, 0, ancho, alto);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const texto = (t: string, x: number, y: number, tam: number, opacidad: number) => {
      g.font = `${tam < 16 ? 700 : 800} ${tam}px Arial, sans-serif`;
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      g.fillStyle = `rgba(255,255,255,${opacidad})`;
      g.strokeText(t, x, y);
      g.fillText(t, x, y);
    };
    // «VISTA PREVIA · KYRELO» en el centro y, entre los datos y esa marca, el aviso
    // también como marca de agua (abajo se recortaría fácil)
    const vertical = alto > ancho * 1.3;
    const yMarca = alto * (vertical ? 0.58 : 0.66);
    const yAviso = alto * (vertical ? 0.45 : 0.5);
    texto('VISTA PREVIA', ancho / 2, yMarca, 36, 0.38);
    texto('KYRELO', ancho / 2, yMarca + 30, 18, 0.38);
    const aviso = ['Esta portada es una vista previa.', 'No se puede publicar ni usar en anuncios.'];
    aviso.forEach((linea, i) => texto(linea, ancho / 2, yAviso + i * (vertical ? 17 : 15), vertical ? 13 : 11.5, 0.55));
    const blob = await new Promise<Blob>((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la copia.'))), 'image/jpeg', 0.72));
    return new File([blob], 'portada-vista-previa.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SubirEntrega({ videoId, tipo, nombre, actual, onListo }: { videoId: string; tipo: string; nombre: string; actual?: { tamano?: number; nombre?: string; url: string | null }; onListo: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const esImagen = tipo.startsWith('portada');

  async function subir(archivo?: File) {
    if (input.current) input.current.value = '';
    if (!archivo) return;
    setError('');
    const mime = mimeDe(archivo.name, archivo.type);
    try {
      setAvance(0);
      const firma = await api<{ url: string; ruta: string }>(`/api/videos/${videoId}/panel`, 'POST', { accion: 'firmar_entrega', tipo, mime, tamano: archivo.size });
      await subirConAvance(firma.url, archivo, mime, setAvance);
      await api(`/api/videos/${videoId}/panel`, 'POST', { accion: 'registrar_entrega', tipo, ruta: firma.ruta, nombre: archivo.name });
      // Portadas: se sube sola una copia pequeña con marca para la vista previa del agente
      const tipoPrevia = PREVIAS_PORTADA[tipo];
      if (tipoPrevia) {
        try {
          const previa = await previaDePortada(archivo);
          const f2 = await api<{ url: string; ruta: string }>(`/api/videos/${videoId}/panel`, 'POST', { accion: 'firmar_entrega', tipo: tipoPrevia, mime: 'image/jpeg', tamano: previa.size });
          await subirConAvance(f2.url, previa, 'image/jpeg', () => undefined);
          await api(`/api/videos/${videoId}/panel`, 'POST', { accion: 'registrar_entrega', tipo: tipoPrevia, ruta: f2.ruta, nombre: previa.name });
        } catch {
          setError('La portada quedó subida, pero no se creó su copia para la vista previa. Vuelve a subirla.');
        }
      }
      setAvance(null);
      onListo();
    } catch (e) {
      setAvance(null);
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${actual ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
        <Icono nombre={actual ? 'check' : esImagen ? 'imagen' : 'video'} className="h-5 w-5" grosor={actual ? 2.4 : 1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-zinc-900">{nombre}</p>
        <p className="truncate text-[12px] text-zinc-500">
          {avance !== null ? (
            <span className="font-medium text-orange-700">Subiendo {Math.round(avance * 100)}%…</span>
          ) : actual ? (
            <>
              {actual.nombre || 'Subido'} · {formatoMB(actual.tamano)}
              {actual.url && (
                <>
                  {' · '}
                  <a href={actual.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-700 underline">
                    Ver
                  </a>
                </>
              )}
            </>
          ) : (
            'Sin subir'
          )}
        </p>
        {avance !== null && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.round(avance * 100)}%` }} />
          </div>
        )}
        {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
      </div>
      <button className={botonSecundario} disabled={avance !== null} onClick={() => input.current?.click()}>
        <Icono nombre="subir" className="h-4 w-4" />
        {actual ? 'Cambiar' : 'Subir'}
      </button>
      <input ref={input} type="file" accept={esImagen ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime'} className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
    </div>
  );
}

function Dato({ t, v }: { t: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === '' || v === false) return null;
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-zinc-500">{t}</p>
      <p className="mt-0.5 text-[14px] font-medium text-zinc-900">{v === true ? 'Sí' : v}</p>
    </div>
  );
}

export default function PanelVideo({ params }: { params: { id: string } }) {
  const id = params.id;
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState<{ tono: 'ok' | 'error'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [textos, setTextos] = useState({ texto_corto: '', texto_largo: '' });
  const [enlacePublicado, setEnlacePublicado] = useState('');

  const cargar = useCallback(async () => {
    try {
      const d = await api<Datos>(`/api/videos/${id}/panel`, 'GET');
      setDatos(d);
      setTextos({ texto_corto: d.video.texto_corto ?? '', texto_largo: d.video.texto_largo ?? '' });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function accion(cuerpo: Record<string, unknown>, exito?: string) {
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await api<{ enlace?: string }>(`/api/videos/${id}/panel`, 'POST', cuerpo);
      if (r.enlace) setEnlacePublicado(r.enlace);
      if (exito) setMensaje({ tono: 'ok', texto: exito });
      await cargar();
    } catch (e) {
      setMensaje({ tono: 'error', texto: (e as Error).message });
    }
    setOcupado(false);
  }

  const [bajando, setBajando] = useState<number | null>(null);
  // El recorrido completo se subió en partes de 45 MB: se bajan y se unen en un solo archivo
  async function descargarRecorrido(t: Toma) {
    if (!t.partes_urls?.length) return;
    try {
      const trozos: Blob[] = [];
      for (let i = 0; i < t.partes_urls.length; i++) {
        setBajando(i / t.partes_urls.length);
        const r = await fetch(t.partes_urls[i]);
        if (!r.ok) throw new Error('No se pudo bajar una parte. Recarga la página e inténtalo de nuevo.');
        trozos.push(await r.blob());
      }
      const ext = (t.nombre_archivo?.split('.').pop() || 'mp4').toLowerCase();
      const url = URL.createObjectURL(new Blob(trozos, { type: 'video/mp4' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${datos?.video.codigo ?? 'video'}-recorrido.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setMensaje({ tono: 'error', texto: (e as Error).message });
    }
    setBajando(null);
  }

  function descargarTodas() {
    datos?.tomas.forEach((t, i) => {
      if (!t.url) return;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = t.url!;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 900);
    });
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!datos)
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
      </div>
    );

  const v = datos.video;
  const f = v.ficha ?? {};
  const estado = v.estado;
  const limite = datos.entrega_limite ? new Date(datos.entrega_limite) : null;
  const minutos = limite ? Math.round((limite.getTime() - Date.now()) / 60000) : null;
  const telefono = normalizarTelefono(f.whatsapp || datos.agente?.telefono || '');
  const nombre = datos.agente?.nombre?.split(' ')[0] || '';
  const enlaceAgente = enlacePublicado || (typeof window !== 'undefined' ? `${window.location.origin}/broker/videos/${v.id}` : '');
  const avisoWhatsApp = telefono.ok
    ? enlaceWhatsApp(`Hola${nombre ? ` ${nombre}` : ''}, la vista previa de tu video ${v.codigo} ya está lista. Puedes verla aquí: ${enlaceAgente}`, telefono.normalizado)
    : null;
  const enEdicion = estado === 'recibido' || estado === 'en_edicion';
  const puedePublicar = enEdicion && !!datos.entregas.vista_previa && !!datos.entregas.final_vertical;

  return (
    <div className="app-videos anim-entrada space-y-5 text-zinc-900">
      <Link href="/videos" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-900">
        <Icono nombre="flechaIzq" className="h-4 w-4" />
        Videos por inmueble
      </Link>

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-zinc-500">{v.codigo}</span>
            <EtiquetaEstado estado={estado} />
          </div>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight">{v.titulo}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[14px] text-zinc-500">
            {datos.agente?.nombre || datos.agente?.email}
            {datos.agente?.empresa ? <span>· {datos.agente.empresa}</span> : null}
            {telefono.ok && (
              <a href={`https://wa.me/${telefono.normalizado}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800">
                · <Icono nombre="chat" className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </p>
        </div>
        {limite && enEdicion && minutos !== null && (
          <div className={`rounded-2xl px-4 py-3 text-right ${minutos < 0 ? 'bg-red-50 text-red-700' : minutos < 60 ? 'bg-amber-50 text-amber-800' : 'bg-white text-zinc-900 ring-1 ring-black/[0.06]'}`}>
            <p className="flex items-center justify-end gap-1.5 text-[18px] font-semibold">
              <Icono nombre="reloj" className="h-5 w-5" />
              {minutos < 0 ? 'Vencido' : `${Math.floor(minutos / 60) ? `${Math.floor(minutos / 60)} h ` : ''}${minutos % 60} min`}
            </p>
            <p className="text-[12px] opacity-70">
              entregar {limite.toLocaleString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      {mensaje && (
        <p className={`rounded-xl px-4 py-3 text-[14px] ring-1 ${mensaje.tono === 'ok' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-red-50 text-red-800 ring-red-200'}`}>{mensaje.texto}</p>
      )}

      {/* Lo que sigue */}
      <div className={`${tarjeta} flex flex-wrap items-center gap-3 p-4`}>
        <p className="mr-auto text-[14px] font-semibold text-zinc-900">
          {estado === 'recibido' && 'Material recibido: descarga las tomas y edita.'}
          {estado === 'en_edicion' && (puedePublicar ? 'Todo subido: ya puedes publicar la vista previa.' : 'Sube la vista previa y el video vertical final para publicar.')}
          {estado === 'vista_previa' && 'Vista previa publicada. Esperando el pago.'}
          {estado === 'desbloqueado' && `Desbloqueado ${v.metodo === 'manual' ? `a mano (${f.nota_desbloqueo ?? 'sin nota'})` : 'con pago en Wompi'}.`}
          {estado === 'rechazado' && `Esperando que regrabe: ${v.motivo_rechazo ?? ''}`}
          {estado === 'descartado' && 'El agente descartó este video.'}
          {estado === 'borrador' && 'El agente todavía no lo ha enviado.'}
        </p>
        {estado === 'recibido' && (
          <button className={botonPrimario} disabled={ocupado} onClick={() => accion({ accion: 'en_edicion' }, 'Marcado en edición. El agente lo ve así.')}>
            <Icono nombre="varita" className="h-4 w-4" />
            Empezar edición
          </button>
        )}
        {enEdicion && (
          <>
            <button
              className={botonSecundario}
              disabled={ocupado}
              onClick={() => {
                const motivo = window.prompt('¿Qué tiene que regrabar? (el agente lo lee tal cual)');
                if (motivo) accion({ accion: 'rechazar', motivo }, 'Le pediste regrabar. Escríbele para que lo vea.');
              }}
            >
              Pedir que regrabe
            </button>
            <button className={botonAcento} disabled={ocupado || !puedePublicar} onClick={() => accion({ accion: 'publicar' }, 'Vista previa publicada. Avísale al agente por WhatsApp.')}>
              <Icono nombre="ojo" className="h-4 w-4" />
              Publicar vista previa
            </button>
          </>
        )}
        {estado === 'vista_previa' && (
          <>
            <button
              className={botonSecundario}
              disabled={ocupado}
              onClick={() => {
                const nota = window.prompt('¿Cómo pagó? Ej.: «Nequi 6 oct, pago completo». Solo para pagos que ya viste en tu cuenta.');
                if (nota) accion({ accion: 'desbloquear_manual', nota }, 'Desbloqueado. El agente ya puede descargar.');
              }}
            >
              <Icono nombre="candado" className="h-4 w-4" />
              Desbloquear a mano
            </button>
            {avisoWhatsApp && (
              <a className={botonAcento} href={avisoWhatsApp} target="_blank" rel="noopener noreferrer">
                <Icono nombre="chat" className="h-4 w-4" />
                Avisar por WhatsApp
              </a>
            )}
          </>
        )}
        {['vista_previa', 'desbloqueado', 'descartado'].includes(estado) && !v.tomas_borradas_at && datos.tomas.length > 0 && (
          <button
            className={botonSecundario}
            disabled={ocupado}
            onClick={() => {
              if (window.confirm('¿Borrar las tomas originales de este video? Libera espacio; el video editado no se toca.'))
                accion({ accion: 'liberar_tomas' }, 'Tomas borradas. Espacio liberado.');
            }}
          >
            <Icono nombre="basura" className="h-4 w-4" />
            Liberar espacio
          </button>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {/* Tomas */}
          <section className={`${tarjeta} p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold">
                Tomas <span className="text-zinc-400">({datos.tomas.length})</span>
              </h2>
              {!v.tomas_borradas_at && datos.tomas.length > 0 && (
                <button className={botonSecundario} onClick={descargarTodas}>
                  <Icono nombre="bajar" className="h-4 w-4" />
                  Descargar todas
                </button>
              )}
            </div>
            {v.tomas_borradas_at && <p className="mt-2 text-[13px] text-zinc-500">Las tomas originales ya se borraron para liberar espacio.</p>}
            {datos.tomas
              .filter((t) => Number(t.partes ?? 0) > 0)
              .map((t) => (
                <div key={t.id} className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-orange-50 p-4 ring-1 ring-orange-200">
                  {t.miniatura && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.miniatura} alt="" className="h-24 w-[54px] rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">Un solo video del recorrido</p>
                    <p className="text-[13px] text-zinc-600">
                      {[t.duracion ? `${Math.round(Number(t.duracion))} s` : null, formatoMB(t.tamano), `${t.partes} partes`].filter(Boolean).join(' · ')}. Hay que sacar las tomas al editar.
                    </p>
                    {t.observaciones?.map((o, j) => (
                      <p key={j} className="mt-1 text-[12px] text-amber-700">{o}</p>
                    ))}
                  </div>
                  {!v.tomas_borradas_at && (
                    <button className={botonPrimario} disabled={bajando !== null} onClick={() => descargarRecorrido(t)}>
                      <Icono nombre="bajar" className="h-4 w-4" />
                      {bajando !== null ? `Bajando ${Math.round(bajando * 100)}%…` : 'Descargar recorrido completo'}
                    </button>
                  )}
                </div>
              ))}
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {datos.tomas.filter((t) => !(Number(t.partes ?? 0) > 0)).map((t, i) => (
                <div key={t.id} className="min-w-0">
                  <a
                    href={t.url ?? undefined}
                    className={`relative block aspect-[9/16] overflow-hidden rounded-xl ${t.miniatura ? 'bg-zinc-900' : 'bg-zinc-100'} ${t.url ? 'group' : 'pointer-events-none'}`}
                  >
                    {t.miniatura ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.miniatura} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-zinc-400">
                        <Icono nombre={ICONO_CASILLA[t.casilla] ?? 'video'} className="h-6 w-6" />
                      </span>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 text-[11px] font-semibold text-white">{i + 1}</span>
                    {t.revision !== 'ok' && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950" title={t.revision === 'sin_revisar' ? 'Sin revisión automática' : t.observaciones.join(' ')}>
                        <Icono nombre="alerta" className="h-3 w-3" grosor={2.4} />
                      </span>
                    )}
                    {t.url && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
                        <Icono nombre="bajar" className="h-6 w-6" />
                      </span>
                    )}
                  </a>
                  <p className="mt-1.5 truncate text-[12px] font-semibold">{t.nombre_casilla}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {[t.duracion ? `${t.duracion} s` : null, formatoMB(t.tamano)].filter(Boolean).join(' · ')}
                  </p>
                  {t.observaciones?.map((o, j) => (
                    <p key={j} className="mt-1 text-[11px] leading-snug text-amber-700">
                      {o}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Entregas */}
          <section className={`${tarjeta} p-5`}>
            <h2 className="text-[17px] font-semibold">Entregas</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Máximo 50 MB por archivo. La vista previa sale del script «hacer-vista-previa» (540p, marca de agua y firma de KYRELO al final). El final va sin firma y solo se descarga después del pago.
            </p>
            <div className="mt-2 divide-y divide-zinc-100">
              {ENTREGAS.map((e) => (
                <SubirEntrega key={e.v} videoId={id} tipo={e.v} nombre={e.l} actual={datos.entregas[e.v]} onListo={cargar} />
              ))}
            </div>
          </section>

          <section className={`${tarjeta} p-5`}>
            <h2 className="text-[17px] font-semibold">Textos para el agente</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {(['texto_corto', 'texto_largo'] as const).map((k) => (
                <label key={k} className="block">
                  <span className="text-[13px] font-medium text-zinc-700">{k === 'texto_corto' ? 'Para su anuncio (corto)' : 'Para su publicación (largo)'}</span>
                  <textarea
                    rows={6}
                    value={textos[k]}
                    onChange={(e) => setTextos({ ...textos, [k]: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 p-3 text-[14px] outline-none transition focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5"
                  />
                </label>
              ))}
            </div>
            <button className={`${botonSecundario} mt-3`} disabled={ocupado} onClick={() => accion({ accion: 'textos', ...textos }, 'Textos guardados.')}>
              Guardar textos
            </button>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          {/* Ficha */}
          <section className={`${tarjeta} p-5`}>
            <h2 className="text-[17px] font-semibold">Ficha</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              <Dato t="Tipo" v={TIPOS_INMUEBLE.find((x) => x.v === f.tipo)?.l} />
              <Dato t="Operación" v={f.operacion === 'arriendo' ? 'Arriendo' : f.operacion === 'venta' ? 'Venta' : null} />
              <Dato t="Precio" v={f.precio ? formatoCOP(f.precio) : null} />
              <Dato t="Municipio" v={f.municipio} />
              <Dato t="Barrio" v={f.barrio} />
              <Dato t="Área construida" v={f.area_construida ? `${f.area_construida} m²` : null} />
              <Dato t="Área privada" v={f.area_privada ? `${f.area_privada} m²` : null} />
              <Dato t="Habitaciones" v={f.habitaciones} />
              <Dato t="Baños" v={f.banos} />
              <Dato t="Parqueaderos" v={f.parqueaderos} />
              <Dato t="Estrato" v={f.estrato} />
              <Dato t="Administración" v={f.administracion ? formatoCOP(f.administracion) : null} />
              <Dato t="Piso" v={f.piso} />
              <Dato t="Ascensor" v={f.ascensor} />
              <Dato t="Depósito" v={f.deposito} />
            </div>
            <div className="mt-5 rounded-xl bg-zinc-50 p-3.5">
              <p className="text-[12px] text-zinc-500">Lo que lo hace diferente</p>
              <ol className="mt-1.5 space-y-1 text-[14px] font-medium">
                {(f.diferenciales ?? []).filter(Boolean).map((d, i) => (
                  <li key={d} className="flex gap-2">
                    <span className="text-orange-600">{i + 1}.</span>
                    {d}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className={`${tarjeta} p-5`}>
            <h2 className="text-[17px] font-semibold">Marca y estilo</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-zinc-200">
                {datos.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={datos.logo_url} alt="Logo" className="max-h-full max-w-full object-contain p-1" />
                ) : (
                  <Icono nombre="imagen" className="h-6 w-6 text-zinc-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{f.nombre_marca}</p>
                <p className="text-[13px] text-zinc-500">{f.whatsapp}</p>
                {datos.logo_url && (
                  <a href={datos.logo_url} className="text-[13px] font-medium text-orange-700 underline">
                    Descargar logo
                  </a>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[f.color_principal, f.color_secundario].filter(Boolean).map((c) => (
                <span key={c} className="inline-flex items-center gap-2 rounded-full bg-zinc-50 py-1 pl-1 pr-3 text-[12px] font-medium ring-1 ring-zinc-200">
                  <span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                  {c}
                </span>
              ))}
              <span className="rounded-full bg-zinc-50 px-3 py-1 text-[12px] font-medium ring-1 ring-zinc-200">
                Estilo {ESTILOS.find((e) => e.v === v.estilo)?.l.toLowerCase() ?? 'directo'}
              </span>
              <span className="rounded-full bg-zinc-50 px-3 py-1 text-[12px] font-medium ring-1 ring-zinc-200">{v.voz_en_off ? 'Con voz en off' : 'Sin voz en off'}</span>
            </div>
          </section>

          {datos.pagos.length > 0 && (
            <section className={`${tarjeta} p-5`}>
              <h2 className="text-[17px] font-semibold">Pagos</h2>
              <ul className="mt-3 divide-y divide-zinc-100">
                {datos.pagos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <span className="min-w-0">
                      <span className="block font-semibold">{formatoCOP(p.monto)}</span>
                      <span className="block truncate text-[12px] text-zinc-500">
                        {new Date(p.creado_en).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {p.referencia}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold">
                      {p.estado}
                      {p.medio ? ` · ${p.medio}` : ''}
                      {p.ambiente === 'test' ? ' · prueba' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {v.enviado_at && v.vista_previa_at && (
            <p className="text-[12px] text-zinc-400">
              Enviado {new Date(v.enviado_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · vista previa{' '}
              {new Date(v.vista_previa_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · límite{' '}
              {entregaEstimada(new Date(v.enviado_at)).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
