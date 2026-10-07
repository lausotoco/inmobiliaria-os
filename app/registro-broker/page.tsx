'use client';

// app/registro-broker/page.tsx
// Registro público para brokers e inmobiliarias aliadas.

import { CabeceraSitio } from '@/components/sitio/Sitio';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP } from '@/lib/config';

export default function RegistroBroker() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ nombre: '', empresa: '', telefono: '', email: '', password: '' });
  const [acepto, setAcepto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState(false);
  // ?siguiente=/broker/videos: viene a hacer el video de un inmueble
  const [siguiente, setSiguiente] = useState('');
  const paraVideos = siguiente.startsWith('/broker/videos');

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('siguiente') ?? '';
    if (s.startsWith('/broker') && !s.startsWith('//')) setSiguiente(s);
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function registrar() {
    setError('');
    if (!form.nombre || !form.telefono || !form.email || form.password.length < 8) {
      setError('Completa tu nombre, celular, correo y una contraseña de mínimo 8 caracteres.');
      return;
    }
    if (!acepto) {
      setError('Debes autorizar el tratamiento de datos para crear tu cuenta.');
      return;
    }
    setCargando(true);

    // Los datos viajan en el registro: el perfil de broker se crea completo
    // desde la base (trigger handle_new_user), aunque falle cualquier paso posterior.
    const { data: alta, error: errAuth } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { nombre: form.nombre, empresa: form.empresa || null, telefono: form.telefono },
      },
    });
    if (errAuth) {
      setError(errAuth.message === 'User already registered'
        ? 'Este correo ya tiene una cuenta. Inicia sesión.'
        : errAuth.message);
      setCargando(false);
      return;
    }

    // Si Supabase pide confirmar el correo, aún no hay sesión: se le avisa
    // al broker y entra después desde /brokers.
    if (!alta.session) {
      setConfirmarCorreo(true);
      setCargando(false);
      return;
    }

    const { error: errRpc } = await supabase.rpc('registrar_broker', {
      p_nombre: form.nombre,
      p_empresa: form.empresa,
      p_telefono: form.telefono,
    });
    // El perfil ya existe como broker gracias al trigger; este paso solo complementa.
    if (errRpc) console.error('registrar_broker:', errRpc.message);

    // Evento de conversión para Meta Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration');
    }

    router.push(siguiente || '/broker');
  }

  return (
    <div className="min-h-screen bg-[#F1EFE8]">
      <CabeceraSitio activa="/plataforma" />
      <div className="mx-auto w-full max-w-md px-5 py-10 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B87333] mb-3">
          {APP.marca} · Red de agentes y oficinas
        </p>
        <h1 className="text-[30px] leading-tight tracking-tight text-[#1A1A18] mb-2" style={{ fontFamily: 'Fraunces, serif' }}>
          {paraVideos ? 'Crea tu cuenta para hacer tus videos' : 'Crea tu cuenta en la red'}
        </h1>
        <p className="text-[15px] text-[#5F5E5A] mb-8 leading-relaxed">
          {paraVideos
            ? 'Gratis. Subes las tomas de tu inmueble, ves el video editado y pagas solo si te gusta.'
            : 'Gratis. Accede a compradores verificados y postula tus inmuebles. Solo compartes comisión cuando cierras.'}
        </p>

        <div className="space-y-4">
          {[
            { k: 'nombre', label: 'Nombre completo', type: 'text' },
            { k: 'empresa', label: 'Inmobiliaria o marca (opcional)', type: 'text' },
            { k: 'telefono', label: 'Celular / WhatsApp', type: 'tel' },
            { k: 'email', label: 'Correo', type: 'email' },
            { k: 'password', label: 'Contraseña', type: 'password' },
          ].map((c) => (
            <div key={c.k}>
              <label className="block text-[13px] font-medium text-[#1A1A18] mb-1.5">
                {c.label}
              </label>
              <input
                type={c.type}
                value={(form as any)[c.k]}
                onChange={set(c.k)}
                className="h-12 w-full rounded-xl border border-[#E0DDD2] bg-white px-4 text-[15px] text-[#1A1A18] outline-none focus:border-[#1A1A18] transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Casilla de consentimiento (Ley 1581) */}
        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#1A1A18]"
          />
          <span className="text-[12.5px] leading-relaxed text-[#5F5E5A]">
            Autorizo el tratamiento de mis datos personales conforme a la{' '}
            <a href="/legal/tratamiento-de-datos" target="_blank" className="underline underline-offset-2 hover:text-[#1A1A18]">
              Política de tratamiento de datos
            </a>{' '}
            y acepto los{' '}
            <a href="/legal/terminos" target="_blank" className="underline underline-offset-2 hover:text-[#1A1A18]">
              Términos y condiciones
            </a>{' '}
            de KYRELO.
          </span>
        </label>

        {error && <p className="text-xs text-[#1A1A18] mt-4 border-l border-[#1A1A18] pl-3">{error}</p>}

        {confirmarCorreo && (
          <div className="mt-6 rounded-xl border border-[#EBDBC8] bg-[#F6EFE4] px-5 py-4 text-[13px] leading-relaxed text-[#1A1A18]">
            Tu cuenta quedó creada. Te enviamos un correo a <span className="font-semibold">{form.email}</span>:
            ábrelo, confirma tu cuenta y luego{' '}
            <a href="/brokers" className="underline underline-offset-4">inicia sesión aquí</a>.
          </div>
        )}

        <button
          onClick={registrar}
          disabled={cargando}
          className="mt-8 h-14 w-full rounded-full bg-[#1A1A18] text-[#F1EFE8] text-[16px] font-semibold hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p className="text-xs text-[#A8A69E] mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <a href={siguiente ? `/login?siguiente=${encodeURIComponent(siguiente)}` : '/login'} className="text-[#5F5E5A] underline underline-offset-4">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
