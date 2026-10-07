'use client';

// Pasos del asistente con la ficha del inmueble: El inmueble · Detalles ·
// Tu marca. El padre guarda solo; aquí solo se edita.

import { useRef, useState } from 'react';
import { ESTILOS, TIPOS_INMUEBLE, mimeDe, MIMES_IMAGEN, MAX_BYTES_LOGO, type Ficha, type TipoInmueble } from '@/lib/videos/config';
import { api, subirConAvance } from '@/lib/videos/subir';
import { Icono, campo, etiqueta } from '@/components/videos/ui';

const MUNICIPIOS = ['Bogotá', 'Chía', 'Cajicá', 'Cota', 'Sopó', 'La Calera', 'Zipaquirá', 'Tenjo', 'Tabio', 'Funza', 'Mosquera', 'Madrid'];
const ICONO_TIPO: Record<TipoInmueble, string> = { apartamento: 'edificio', casa: 'casa', lote: 'montana', local: 'marca' };

function Numero({ valor, onChange, placeholder, moneda, sufijo }: { valor?: number | null; onChange: (v: number | null) => void; placeholder?: string; moneda?: boolean; sufijo?: string }) {
  return (
    <div className="relative">
      {moneda && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-zinc-400">$</span>}
      <input
        inputMode="numeric"
        className={`${campo} tabular-nums ${moneda ? 'pl-7' : ''} ${sufijo ? 'pr-10' : ''}`}
        placeholder={placeholder}
        value={valor == null ? '' : moneda ? valor.toLocaleString('es-CO') : String(valor)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '');
          onChange(d === '' ? null : Number(d));
        }}
      />
      {sufijo && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-zinc-400">{sufijo}</span>}
    </div>
  );
}

function Contador({ valor, onChange, texto }: { valor?: number | null; onChange: (v: number | null) => void; texto: string }) {
  const n = valor ?? null;
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2">
      <span className="text-[14px] text-zinc-700">{texto}</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Menos ${texto}`} onClick={() => onChange(n == null || n <= 0 ? 0 : n - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 active:bg-zinc-200">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <span className={`w-7 text-center text-[16px] font-semibold tabular-nums ${n == null ? 'text-zinc-300' : 'text-zinc-900'}`}>{n ?? '–'}</span>
        <button type="button" aria-label={`Más ${texto}`} onClick={() => onChange(n == null ? 1 : n + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 active:bg-zinc-200">
          <Icono nombre="mas" className="h-4 w-4" grosor={2} />
        </button>
      </div>
    </div>
  );
}

function Interruptor({ activo, onChange, texto }: { activo?: boolean; onChange: (v: boolean) => void; texto: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!activo)}
      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-[14px] transition ${activo ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-600'}`}
    >
      {texto}
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${activo ? 'bg-orange-600' : 'bg-zinc-200'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${activo ? 'left-5' : 'left-1'}`} />
      </span>
    </button>
  );
}

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-zinc-900">{titulo}</h3>
      {ayuda && <p className="mt-0.5 text-[13px] text-zinc-500">{ayuda}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

type Props = { ficha: Ficha; onChange: (f: Ficha) => void };

export function PasoInmueble({ ficha, onChange }: Props) {
  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => onChange({ ...ficha, [k]: v });
  return (
    <div className="space-y-7">
      <Seccion titulo="¿Qué vas a mostrar?">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TIPOS_INMUEBLE.map((t) => {
            const activo = ficha.tipo === t.v;
            return (
              <button
                key={t.v}
                type="button"
                onClick={() => set('tipo', t.v)}
                className={`flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  activo ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                }`}
              >
                <Icono nombre={ICONO_TIPO[t.v]} className={`h-6 w-6 ${activo ? 'text-orange-400' : 'text-zinc-400'}`} />
                <span className="text-[14px] font-semibold">{t.l}</span>
              </button>
            );
          })}
        </div>
      </Seccion>

      <Seccion titulo="¿Venta o arriendo?">
        <div className="inline-flex rounded-xl bg-zinc-100 p-1">
          {(['venta', 'arriendo'] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => set('operacion', o)}
              className={`rounded-lg px-6 py-2 text-[14px] font-semibold transition ${ficha.operacion === o ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              {o === 'venta' ? 'Venta' : 'Arriendo'}
            </button>
          ))}
        </div>
      </Seccion>

      <div>
        <label className={etiqueta}>{ficha.operacion === 'arriendo' ? 'Canon mensual' : 'Precio'}</label>
        <Numero moneda valor={ficha.precio} onChange={(v) => set('precio', v)} placeholder="0" />
        <p className="mt-1.5 text-[12px] text-zinc-500">El precio real y vigente. Es el que aparece en el video.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={etiqueta}>Municipio</label>
          <input className={campo} list="municipios-video" value={ficha.municipio ?? ''} onChange={(e) => set('municipio', e.target.value)} placeholder="Chía" />
          <datalist id="municipios-video">
            {MUNICIPIOS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={etiqueta}>Barrio o sector</label>
          <input className={campo} value={ficha.barrio ?? ''} onChange={(e) => set('barrio', e.target.value)} placeholder="Fontanar" />
          <p className="mt-1.5 text-[12px] text-zinc-500">Nunca la dirección exacta.</p>
        </div>
      </div>
    </div>
  );
}

export function PasoDetalles({ ficha, onChange }: Props) {
  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => onChange({ ...ficha, [k]: v });
  const conHabitaciones = ficha.tipo === 'apartamento' || ficha.tipo === 'casa';
  const esLote = ficha.tipo === 'lote';
  const dif = [...(ficha.diferenciales ?? []), '', '', ''].slice(0, 3);
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={etiqueta}>{esLote ? 'Área del lote' : 'Área construida'}</label>
          <Numero valor={ficha.area_construida} onChange={(v) => set('area_construida', v)} sufijo="m²" />
        </div>
        {!esLote && (
          <div>
            <label className={etiqueta}>Área privada</label>
            <Numero valor={ficha.area_privada} onChange={(v) => set('area_privada', v)} sufijo="m²" />
          </div>
        )}
      </div>

      {!esLote && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {conHabitaciones && <Contador texto="Habitaciones" valor={ficha.habitaciones} onChange={(v) => set('habitaciones', v)} />}
          {conHabitaciones && <Contador texto="Baños" valor={ficha.banos} onChange={(v) => set('banos', v)} />}
          <Contador texto="Parqueaderos" valor={ficha.parqueaderos} onChange={(v) => set('parqueaderos', v)} />
          {ficha.tipo === 'apartamento' && <Contador texto="Piso" valor={ficha.piso} onChange={(v) => set('piso', v)} />}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={etiqueta}>Estrato</label>
          <Numero valor={ficha.estrato} onChange={(v) => set('estrato', v)} placeholder="Opcional" />
        </div>
        <div>
          <label className={etiqueta}>Administración</label>
          <Numero moneda valor={ficha.administracion} onChange={(v) => set('administracion', v)} placeholder="Opcional" />
        </div>
      </div>

      {!esLote && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ficha.tipo === 'apartamento' && <Interruptor activo={ficha.ascensor} onChange={(v) => set('ascensor', v)} texto="Tiene ascensor" />}
          <Interruptor activo={ficha.deposito} onChange={(v) => set('deposito', v)} texto="Tiene depósito" />
        </div>
      )}

      <Seccion titulo="Tres cosas que lo hacen diferente" ayuda="Cortas y reales. Van en pantalla y en el texto de la publicación.">
        <div className="space-y-2.5">
          {['Vista a los cerros', 'Mucha luz natural', 'Conjunto con piscina'].map((ej, i) => (
            <div key={i} className="relative">
              <span className={`pointer-events-none absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-semibold ${dif[i].trim() ? 'bg-orange-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                {i + 1}
              </span>
              <input
                className={`${campo} pl-12`}
                maxLength={90}
                value={dif[i]}
                placeholder={`Ej.: ${ej}`}
                onChange={(e) => {
                  const nuevos = [...dif];
                  nuevos[i] = e.target.value;
                  set('diferenciales', nuevos);
                }}
              />
            </div>
          ))}
        </div>
      </Seccion>
    </div>
  );
}

export function PasoMarca({
  ficha,
  onChange,
  videoId,
  logoUrl,
  onLogo,
  estilo,
  voz,
  onEstilo,
}: Props & {
  videoId: string;
  logoUrl: string | null;
  onLogo: (url: string | null, ruta: string) => void;
  estilo: string | null;
  voz: boolean;
  onEstilo: (c: { estilo?: string; voz_en_off?: boolean }) => void;
}) {
  const set = <K extends keyof Ficha>(k: K, v: Ficha[K]) => onChange({ ...ficha, [k]: v });
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoEstado, setLogoEstado] = useState('');

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
      <Seccion titulo="Así cierra tu video" ayuda="Con tu logo y tu WhatsApp. Lo guardamos para tus próximos videos.">
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
            <p className="text-[12px] text-zinc-500">{logoEstado || 'PNG con fondo transparente, si lo tienes. Opcional.'}</p>
            <button type="button" onClick={() => logoInput.current?.click()} className="mt-1 text-[13px] font-semibold text-orange-700 hover:text-orange-800">
              {logoUrl ? 'Cambiar' : 'Elegir archivo'}
            </button>
          </div>
          <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => subirLogo(e.target.files?.[0])} />
        </div>
      </Seccion>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={etiqueta}>Tu nombre o el de tu oficina</label>
          <input className={campo} value={ficha.nombre_marca ?? ''} onChange={(e) => set('nombre_marca', e.target.value)} />
        </div>
        <div>
          <label className={etiqueta}>WhatsApp</label>
          <input className={campo} inputMode="tel" value={ficha.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="300 123 4567" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {([
          ['color_principal', 'Color principal', '#1A1A18'],
          ['color_secundario', 'Color de acento', '#B87333'],
        ] as const).map(([k, l, d]) => (
          <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 py-2 pl-2 pr-4 text-[14px] text-zinc-700">
            <span className="relative h-9 w-9 overflow-hidden rounded-lg ring-1 ring-black/10" style={{ background: ficha[k] ?? d }}>
              <input type="color" value={ficha[k] ?? d} onChange={(e) => set(k, e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </span>
            {l}
          </label>
        ))}
      </div>

      <Seccion titulo="Estilo de edición">
        <div className="grid gap-2.5 sm:grid-cols-3">
          {ESTILOS.map((e) => {
            const activo = (estilo ?? 'directo') === e.v;
            return (
              <button
                key={e.v}
                type="button"
                onClick={() => onEstilo({ estilo: e.v })}
                className={`relative rounded-2xl border p-4 text-left transition ${activo ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200 hover:border-zinc-300'}`}
              >
                {activo && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white">
                    <Icono nombre="check" className="h-3 w-3" grosor={2.6} />
                  </span>
                )}
                <p className="text-[14px] font-semibold text-zinc-900">{e.l}</p>
                <p className="mt-1 text-[12px] leading-snug text-zinc-500">{e.detalle}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-2.5">
          <Interruptor activo={voz} onChange={(v) => onEstilo({ voz_en_off: v })} texto="Con voz en off que narra los datos" />
        </div>
      </Seccion>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-4">
        <input type="checkbox" checked={!!ficha.permiso_propietario} onChange={(e) => set('permiso_propietario', e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-zinc-900" />
        <span className="text-[14px] leading-relaxed text-zinc-700">
          Tengo permiso del propietario para grabar y publicar este video, y el precio es el real y vigente.
        </span>
      </label>
    </div>
  );
}
