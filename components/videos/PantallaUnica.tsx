'use client';
// Video por inmueble · pantalla única (10 oct 2026). Reemplaza el asistente de 4 pasos:
// el agente sube su material, escribe TODO lo que quiere que salga en el video y deja su cierre.
// Lo que no escriba no sale en el video, y no se hacen cambios por información que faltó.
import { useRef, useState } from 'react';
import {
  CASILLAS_APOYO,
  MAX_BYTES_LOGO,
  MAX_DESCRIPCION,
  MIMES_IMAGEN,
  MIN_DESCRIPCION,
  TIPOS_INMUEBLE,
  mimeDe,
  type Ficha,
  type TipoInmueble,
} from '@/lib/videos/config';
import { api, subirConAvance } from '@/lib/videos/subir';
import CasillasTomas, { Casilla, type Toma } from '@/components/videos/CasillasTomas';
import { Aviso, Icono, botonAcento, botonSecundario, campo, etiqueta } from '@/components/videos/ui';

const ICONO_TIPO: Record<TipoInmueble, string> = { apartamento: 'edificio', casa: 'casa', lote: 'montana', local: 'marca' };

const EJEMPLO =
  'Ejemplo: Casa en venta en el conjunto Sauces de la Florida, Cajicá. Precio: $1.250 millones. 280 m² construidos, 4 habitaciones, 4 baños y 4 parqueaderos. Jardín privado, sala de doble altura con chimenea y zona BBQ. A 5 minutos del centro comercial.';

function Bloque({ n, titulo, ayuda, children }: { n: number; titulo: string; ayuda?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-100 pt-7 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[13px] font-semibold text-white">{n}</span>
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold leading-tight text-zinc-900">{titulo}</h2>
          {ayuda && <p className="mt-1 text-[14px] leading-relaxed text-zinc-500">{ayuda}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-[15px] transition ${activo ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'}`}
    >
      {children}
    </button>
  );
}

type Props = {
  videoId: string;
  ficha: Ficha;
  onChange: (f: Ficha) => void;
  tomas: Toma[];
  onCambioToma: (casilla: string, toma: Toma | null) => void;
  logoUrl: string | null;
  onLogo: (url: string | null, ruta: string) => void;
  voz: boolean;
  onVoz: (v: boolean) => void;
};

export default function PantallaUnica({ videoId, ficha, onChange, tomas, onCambioToma, logoUrl, onLogo, voz, onVoz }: Props) {
  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => onChange({ ...ficha, [k]: v });
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoEstado, setLogoEstado] = useState('');
  const largo = (ficha.descripcion ?? '').trim().length;

  async function subirLogo(archivo?: File) {
    if (logoInput.current) logoInput.current.value = '';
    if (!archivo) return;
    const mime = mimeDe(archivo.name, archivo.type);
    if (!MIMES_IMAGEN.includes(mime)) return setLogoEstado('El logo debe ser PNG, JPG o WEBP.');
    if (archivo.size > MAX_BYTES_LOGO) return setLogoEstado('El logo pesa más de 5 MB.');
    try {
      setLogoEstado('Subiendo…');
      const firma = await api<{ url: string; ruta: string }>(`/api/videos/${videoId}`, 'POST', { accion: 'firmar_logo', mime, tamano: archivo.size });
      await subirConAvance(firma.url, archivo, mime, () => undefined);
      const r = await api<{ logo_url: string | null }>(`/api/videos/${videoId}`, 'POST', { accion: 'registrar_logo', ruta: firma.ruta });
      onLogo(r.logo_url, firma.ruta);
      setLogoEstado('');
    } catch (e) {
      setLogoEstado((e as Error).message);
    }
  }

  return (
    <div className="space-y-7">
      <Bloque n={1} titulo="¿Qué inmueble es?">
        <div className="flex flex-wrap gap-2">
          {TIPOS_INMUEBLE.map((t) => (
            <Chip key={t.v} activo={ficha.tipo === t.v} onClick={() => set('tipo', t.v)}>
              <Icono nombre={ICONO_TIPO[t.v]} className="h-4 w-4" />
              {t.l}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['venta', 'arriendo'] as const).map((o) => (
            <Chip key={o} activo={ficha.operacion === o} onClick={() => set('operacion', o)}>
              {o === 'venta' ? 'En venta' : 'En arriendo'}
            </Chip>
          ))}
        </div>
        <div className="mt-4 max-w-sm">
          <label className={etiqueta} htmlFor="pu-municipio">Municipio o ciudad</label>
          <input id="pu-municipio" className={campo} value={ficha.municipio ?? ''} onChange={(e) => set('municipio', e.target.value)} placeholder="Cajicá" />
        </div>
      </Bloque>

      <Bloque n={2} titulo="Sube tu material" ayuda="Un video del recorrido, tus tomas por espacio o tus fotos.">
        <CasillasTomas videoId={videoId} tipo={ficha.tipo} tomas={tomas} onCambio={onCambioToma} />
        <div className="mt-6 rounded-2xl bg-zinc-50 p-4">
          <p className="text-[14px] font-semibold text-zinc-900">Material de apoyo (opcional)</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">
            Si quieres que en el video salga algo más, súbelo tú: el centro comercial que queda cerca, la vía de acceso, el parque. Fotos o videos, como los tengas. Solo usamos el material que subas.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {CASILLAS_APOYO.map((c) => (
              <Casilla key={c} videoId={videoId} casilla={c} obligatoria={false} toma={tomas.find((t) => t.casilla === c)} onCambio={onCambioToma} compacta libre />
            ))}
          </div>
        </div>
      </Bloque>

      <Bloque
        n={3}
        titulo="Cuéntanos todo lo que quieres que salga"
        ayuda="Precio, barrio o conjunto, áreas, habitaciones, baños, parqueaderos, lo que lo hace diferente y lo que queda cerca."
      >
        <Aviso tono="atencion" titulo="Lo que escribas es lo que sale en el video">
          La información que no pongas no saldrá en el video, y no se hacen cambios por información que faltó. Escribe todo lo que necesites que salga.
        </Aviso>
        <textarea
          className={`${campo} mt-3 min-h-[180px] resize-y leading-relaxed`}
          maxLength={MAX_DESCRIPCION}
          value={ficha.descripcion ?? ''}
          onChange={(e) => set('descripcion', e.target.value)}
          placeholder={EJEMPLO}
        />
        <p className={`mt-1.5 text-right text-[12px] ${largo < MIN_DESCRIPCION ? 'text-zinc-400' : 'text-emerald-600'}`}>
          {largo < MIN_DESCRIPCION ? `Escribe al menos ${MIN_DESCRIPCION} letras (${largo})` : 'Bien. Revisa que no falte nada.'}
        </p>
      </Bloque>

      <Bloque n={4} titulo="Así cierra tu video" ayuda="Con tu nombre, tu logo y tu WhatsApp.">
        <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-3">
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 transition hover:border-zinc-400"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Tu logo" className="max-h-full max-w-full object-contain p-1" />
            ) : (
              <Icono nombre="imagen" className="h-6 w-6" />
            )}
          </button>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-zinc-900">{logoUrl ? 'Tu logo' : 'Sube tu logo'}</p>
            <p className="text-[12px] text-zinc-500">{logoEstado || 'Opcional.'}</p>
            <button type="button" onClick={() => logoInput.current?.click()} className="mt-1 text-[13px] font-semibold text-orange-700 hover:text-orange-800">
              {logoUrl ? 'Cambiar' : 'Elegir archivo'}
            </button>
          </div>
          <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => subirLogo(e.target.files?.[0])} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={etiqueta} htmlFor="pu-marca">Tu nombre o el de tu oficina</label>
            <input id="pu-marca" className={campo} value={ficha.nombre_marca ?? ''} onChange={(e) => set('nombre_marca', e.target.value)} />
          </div>
          <div>
            <label className={etiqueta} htmlFor="pu-wa">WhatsApp</label>
            <input id="pu-wa" className={campo} inputMode="tel" value={ficha.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="300 123 4567" />
          </div>
        </div>

        <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${voz ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200'}`}>
          <input type="checkbox" checked={voz} onChange={(e) => onVoz(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-zinc-900" />
          <span>
            <span className="block text-[15px] font-semibold text-zinc-900">Quiero el video con voz de fondo narrando</span>
            <span className="mt-0.5 block text-[13px] text-zinc-500">Tiene un costo adicional. La voz cuenta lo que escribiste arriba.</span>
          </span>
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-4">
          <input type="checkbox" checked={!!ficha.permiso_propietario} onChange={(e) => set('permiso_propietario', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-zinc-900" />
          <span className="text-[14px] leading-relaxed text-zinc-700">
            Tengo permiso del propietario para grabar y publicar este video, y el precio es el real y vigente.
          </span>
        </label>
      </Bloque>
    </div>
  );
}

/** Se abre al tocar «Hacer mi video»: repite que lo que no escribieron no sale. */
export function AdvertenciaEnvio({ onVolver, onSeguir }: { onVolver: () => void; onSeguir: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-advertencia">
      <div className="w-full rounded-t-3xl bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-6 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Icono nombre="ojo" className="h-6 w-6" />
        </span>
        <h2 id="titulo-advertencia" className="mt-4 text-[22px] font-semibold leading-tight text-zinc-900">Antes de enviar</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-zinc-800">
          <strong>La información que no pongas no saldrá en el video.</strong> Pon todo lo que necesites que salga.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">No se hacen cambios por información que no escribiste.</p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button onClick={onVolver} className={botonSecundario}>Volver a completar</button>
          <button onClick={onSeguir} className={botonAcento}>
            Ya puse todo, hacer mi video
            <Icono nombre="flechaDer" className="h-4 w-4" grosor={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
