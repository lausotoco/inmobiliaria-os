'use client';

// Video por inmueble · la cuenta se crea al final, cuando el agente ya llenó
// la ficha y subió su video y pide su vista previa. Crear la cuenta (o entrar
// con una que ya tenga) deja el borrador a su nombre y lo envía a edición.

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Aviso, Icono, botonAcento, campo, etiqueta } from '@/components/videos/ui';

type Props = {
  whatsapp?: string;
  nombre?: string;
  entrega: string;
  siguiente: string;
  onCerrar: () => void;
  /** Ya hay sesión: envía el video. */
  onListo: () => Promise<void>;
};

export default function CuentaVistaPrevia({ whatsapp, nombre, entrega, siguiente, onCerrar, onListo }: Props) {
  const [modo, setModo] = useState<'registro' | 'entrar'>('registro');
  const [form, setForm] = useState({ nombre: nombre ?? '', telefono: whatsapp ?? '', email: '', password: '' });
  const [acepto, setAcepto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function continuar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const supabase = createClient();
    const email = form.email.trim();

    if (modo === 'entrar') {
      if (!email || !form.password) return setError('Escribe tu correo y tu contraseña.');
      setCargando(true);
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: form.password });
      if (err) {
        setCargando(false);
        return setError('Correo o contraseña incorrectos.');
      }
      await onListo();
      return;
    }

    if (!form.nombre.trim() || form.telefono.replace(/\D/g, '').length < 10 || !email || form.password.length < 8)
      return setError('Completa tu nombre, tu celular, tu correo y una contraseña de mínimo 8 caracteres.');
    if (!acepto) return setError('Debes autorizar el tratamiento de datos para crear tu cuenta.');
    setCargando(true);

    // Igual que /registro-broker: el perfil de agente lo crea la base con estos datos
    const { data: alta, error: err } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: { data: { nombre: form.nombre.trim(), empresa: null, telefono: form.telefono.trim() } },
    });
    if (err) {
      setCargando(false);
      if (err.message === 'User already registered') {
        setModo('entrar');
        return setError('Este correo ya tiene una cuenta. Escribe tu contraseña para entrar.');
      }
      return setError(err.message);
    }
    // Si Supabase pide confirmar el correo, aún no hay sesión. El borrador
    // queda guardado en este navegador y se reclama al entrar.
    if (!alta.session) {
      setCargando(false);
      return setConfirmarCorreo(true);
    }
    const { error: errRpc } = await supabase.rpc('registrar_broker', {
      p_nombre: form.nombre.trim(),
      p_empresa: '',
      p_telefono: form.telefono.trim(),
    });
    if (errRpc) console.error('registrar_broker:', errRpc.message);
    if (typeof window !== 'undefined' && (window as any).fbq) (window as any).fbq('track', 'CompleteRegistration');
    await onListo();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-cuenta">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
            <Icono nombre="ojo" className="h-6 w-6" />
          </span>
          <button onClick={onCerrar} aria-label="Cerrar" className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
            <Icono nombre="equis" className="h-5 w-5" />
          </button>
        </div>
        <h2 id="titulo-cuenta" className="mt-4 text-[22px] font-semibold leading-tight text-zinc-900">
          {modo === 'registro' ? 'Último paso: crea tu cuenta para ver tu vista previa' : 'Entra para pedir tu vista previa'}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-600">
          Tu ficha y tu video ya quedaron guardados. Tu vista previa llega <strong className="text-zinc-900">{entrega}</strong> y la ves en tu cuenta.
        </p>

        {confirmarCorreo ? (
          <div className="mt-5">
            <Aviso tono="atencion" titulo="Confirma tu correo">
              Te enviamos un correo a {form.email}. Ábrelo desde este mismo celular o computador, confirma tu cuenta y entra: tu video te espera aquí.
            </Aviso>
            <a href={`/login?siguiente=${encodeURIComponent(siguiente)}`} className={`${botonAcento} mt-4 w-full`}>
              Ya confirmé: entrar
            </a>
          </div>
        ) : (
          <form onSubmit={continuar} className="mt-5 space-y-3.5">
            {modo === 'registro' && (
              <>
                <div>
                  <label className={etiqueta} htmlFor="cv-nombre">Nombre completo</label>
                  <input id="cv-nombre" className={campo} value={form.nombre} onChange={set('nombre')} autoComplete="name" />
                </div>
                <div>
                  <label className={etiqueta} htmlFor="cv-tel">Celular / WhatsApp</label>
                  <input id="cv-tel" className={campo} value={form.telefono} onChange={set('telefono')} inputMode="tel" autoComplete="tel" placeholder="300 123 4567" />
                </div>
              </>
            )}
            <div>
              <label className={etiqueta} htmlFor="cv-correo">Correo</label>
              <input id="cv-correo" type="email" className={campo} value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
            <div>
              <label className={etiqueta} htmlFor="cv-clave">{modo === 'registro' ? 'Crea una contraseña' : 'Contraseña'}</label>
              <input
                id="cv-clave"
                type="password"
                className={campo}
                value={form.password}
                onChange={set('password')}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                placeholder={modo === 'registro' ? 'Mínimo 8 caracteres' : ''}
              />
            </div>

            {modo === 'registro' && (
              // Casilla de consentimiento (Ley 1581)
              <label className="flex cursor-pointer items-start gap-3 pt-1">
                <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-zinc-900" />
                <span className="text-[12.5px] leading-relaxed text-zinc-500">
                  Autorizo el tratamiento de mis datos personales conforme a la{' '}
                  <a href="/legal/tratamiento-de-datos" target="_blank" className="underline underline-offset-2 hover:text-zinc-900">
                    Política de tratamiento de datos
                  </a>{' '}
                  y acepto los{' '}
                  <a href="/legal/terminos" target="_blank" className="underline underline-offset-2 hover:text-zinc-900">
                    Términos y condiciones
                  </a>{' '}
                  de KYRELO.
                </span>
              </label>
            )}

            {error && <Aviso tono="error">{error}</Aviso>}

            <button type="submit" disabled={cargando} className={`${botonAcento} w-full py-3.5`}>
              {cargando ? 'Un momento…' : modo === 'registro' ? 'Crear cuenta y pedir mi vista previa' : 'Entrar y pedir mi vista previa'}
              {!cargando && <Icono nombre="flechaDer" className="h-4 w-4" grosor={2.2} />}
            </button>

            <p className="pt-1 text-center text-[13px] text-zinc-500">
              {modo === 'registro' ? (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <button type="button" onClick={() => { setModo('entrar'); setError(''); }} className="font-semibold text-zinc-900 underline underline-offset-2">
                    Entra
                  </button>
                </>
              ) : (
                <>
                  <a href="/recuperar" className="underline underline-offset-2">¿Olvidaste tu contraseña?</a>
                  {' · '}
                  <button type="button" onClick={() => { setModo('registro'); setError(''); }} className="font-semibold text-zinc-900 underline underline-offset-2">
                    Crear cuenta
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
