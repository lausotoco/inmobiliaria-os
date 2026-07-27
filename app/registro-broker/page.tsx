'use client';

// app/registro-broker/page.tsx
// Registro público para brokers e inmobiliarias aliadas.

import { useState } from 'react';
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

    const { error: errAuth } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (errAuth) {
      setError(errAuth.message === 'User already registered'
        ? 'Este correo ya tiene una cuenta. Inicia sesión.'
        : errAuth.message);
      setCargando(false);
      return;
    }

    const { error: errRpc } = await supabase.rpc('registrar_broker', {
      p_nombre: form.nombre,
      p_empresa: form.empresa,
      p_telefono: form.telefono,
    });
    if (errRpc) {
      setError('Tu cuenta se creó pero falta el perfil: ' + errRpc.message);
      setCargando(false);
      return;
    }

    // Evento de conversión para Meta Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration');
    }

    router.push('/broker');
  }

  return (
    <div className="min-h-screen bg-[#F1EFE8] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#5F5E5A] mb-3">
          {APP.marca} · Red de brokers
        </p>
        <h1 className="text-2xl tracking-tight text-[#1A1A18] mb-1" style={{ fontFamily: 'Fraunces, serif' }}>
          Crea tu cuenta de broker
        </h1>
        <p className="text-sm text-[#5F5E5A] mb-8 leading-relaxed">
          Gratis. Accede a compradores verificados y postula tus inmuebles. Solo compartes comisión cuando cierras.
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
              <label className="block text-[9px] uppercase tracking-[0.15em] text-[#5F5E5A] mb-1.5">
                {c.label}
              </label>
              <input
                type={c.type}
                value={(form as any)[c.k]}
                onChange={set(c.k)}
                className="w-full bg-transparent border-b border-[#E0DDD2] pb-2 text-sm text-[#1A1A18] outline-none focus:border-[#1A1A18] transition-colors"
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
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#1A1A18]"
          />
          <span className="text-[11px] leading-relaxed text-[#5F5E5A]">
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

        <button
          onClick={registrar}
          disabled={cargando}
          className="mt-8 w-full rounded-full bg-[#1A1A18] text-[#F1EFE8] text-sm py-3 hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>

        <p className="text-xs text-[#A8A69E] mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-[#5F5E5A] underline underline-offset-4">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}
