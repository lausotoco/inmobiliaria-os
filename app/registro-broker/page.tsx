'use client';

// app/registro-broker/page.tsx
// Registro público para brokers e inmobiliarias aliadas.
// ⚠️ Agrega '/registro-broker' a las rutas públicas de lib/supabase/middleware.ts

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegistroBroker() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ nombre: '', empresa: '', telefono: '', email: '', password: '' });
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

    router.push('/broker');
  }

  return (
    <div className="min-h-screen bg-[#F1EFE8] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-[9px] uppercase tracking-[0.2em] text-[#5F5E5A] mb-3">
          Sabana OS · Red de brokers
        </p>
        <h1 className="text-2xl tracking-tight text-[#1A1A18] mb-1">
          Crea tu cuenta de broker
        </h1>
        <p className="text-sm text-[#5F5E5A] mb-8 leading-relaxed">
          Accede a compradores verificados de forma anónima y postula tus inmuebles.
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
