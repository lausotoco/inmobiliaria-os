'use client';

// Video por inmueble · sin registro (8 oct 2026). Al pedir la vista previa el
// agente sin cuenta solo deja su nombre y su WhatsApp: ahí le avisamos cuando
// esté lista, con un enlace para verla, y el pago se hace por WhatsApp.

import { useState } from 'react';
import { Aviso, Icono, botonAcento, campo, etiqueta } from '@/components/videos/ui';

export type Contacto = { nombre: string; whatsapp: string; acepto: boolean };

type Props = {
  whatsapp?: string;
  nombre?: string;
  entrega: string;
  onCerrar: () => void;
  /** Envía el video con este contacto. Devuelve un error para mostrar, o nada si salió bien. */
  onEnviar: (c: Contacto) => Promise<string | void>;
};

export default function ContactoVistaPrevia({ whatsapp, nombre, entrega, onCerrar, onEnviar }: Props) {
  const [form, setForm] = useState({ nombre: nombre ?? '', whatsapp: whatsapp ?? '' });
  const [acepto, setAcepto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.nombre.trim().length < 2) return setError('Escribe tu nombre.');
    if (form.whatsapp.replace(/\D/g, '').length < 10) return setError('Escribe tu WhatsApp de 10 dígitos.');
    if (!acepto) return setError('Autoriza el uso de tus datos para que te podamos avisar.');
    setCargando(true);
    const fallo = await onEnviar({ nombre: form.nombre.trim(), whatsapp: form.whatsapp.trim(), acepto });
    if (fallo) {
      setError(fallo);
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-contacto">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
            <Icono nombre="chat" className="h-6 w-6" />
          </span>
          <button onClick={onCerrar} aria-label="Cerrar" className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
            <Icono nombre="equis" className="h-5 w-5" />
          </button>
        </div>
        <h2 id="titulo-contacto" className="mt-4 text-[22px] font-semibold leading-tight text-zinc-900">¿A qué WhatsApp te avisamos?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
          Tu vista previa llega <strong className="text-zinc-900">{entrega}</strong>. Te escribimos por WhatsApp con el enlace para verla. No necesitas crear cuenta.
        </p>

        <form onSubmit={continuar} className="mt-5 space-y-3.5">
          <div>
            <label className={etiqueta} htmlFor="cp-nombre">Tu nombre</label>
            <input id="cp-nombre" className={campo} value={form.nombre} onChange={set('nombre')} autoComplete="name" />
          </div>
          <div>
            <label className={etiqueta} htmlFor="cp-tel">Tu WhatsApp</label>
            <input id="cp-tel" className={campo} value={form.whatsapp} onChange={set('whatsapp')} inputMode="tel" autoComplete="tel" placeholder="300 123 4567" />
          </div>

          {/* Casilla de autorización (Ley 1581) */}
          <label className="flex cursor-pointer items-start gap-3 pt-1">
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-zinc-900" />
            <span className="text-[12.5px] leading-relaxed text-zinc-500">
              Autorizo a KYRELO a usar mi nombre y mi WhatsApp para avisarme de mi video, conforme a la{' '}
              <a href="/legal/tratamiento-de-datos" target="_blank" className="underline underline-offset-2 hover:text-zinc-900">
                Política de tratamiento de datos
              </a>
              , y acepto los{' '}
              <a href="/legal/terminos" target="_blank" className="underline underline-offset-2 hover:text-zinc-900">
                Términos y condiciones
              </a>
              .
            </span>
          </label>

          {error && <Aviso tono="error">{error}</Aviso>}

          <button type="submit" disabled={cargando} className={`${botonAcento} w-full py-3.5`}>
            {cargando ? 'Enviando…' : 'Pedir mi vista previa'}
            {!cargando && <Icono nombre="flechaDer" className="h-4 w-4" grosor={2.2} />}
          </button>
        </form>
      </div>
    </div>
  );
}
