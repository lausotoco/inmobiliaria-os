'use client';

// app/(privada)/whatsapp/page.tsx — Conectar el WhatsApp de KYRELO a la API (coexistencia).
// Se usa una sola vez. Abre el registro de Meta: Laura elige «Conectar la app WhatsApp Business»,
// confirma en su celular y la plataforma termina la conexión (/api/whatsapp/conectar).
// Necesita en Netlify NEXT_PUBLIC_META_APP_ID y NEXT_PUBLIC_WHATSAPP_CONFIG_ID (no son secretos).

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/videos/subir';
import { tarjeta } from '@/components/videos/ui';

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;
const VERSION = 'v25.0';

type Resultado = { phone_number_id: string; numero: string; coexistencia: boolean; pasos: string[] };

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export default function ConectarWhatsapp() {
  const [listo, setListo] = useState(false);
  const [estado, setEstado] = useState<'inicio' | 'abierto' | 'conectando' | 'hecho' | 'error'>('inicio');
  const [mensaje, setMensaje] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const sesion = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  useEffect(() => {
    if (!APP_ID) return;
    window.fbAsyncInit = () => {
      window.FB.init({ appId: APP_ID, autoLogAppEvents: true, xfbml: false, version: VERSION });
      setListo(true);
    };
    if (window.FB) window.fbAsyncInit();
    else {
      const s = document.createElement('script');
      s.src = 'https://connect.facebook.net/es_LA/sdk.js';
      s.async = true;
      s.defer = true;
      s.crossOrigin = 'anonymous';
      document.body.appendChild(s);
    }
    // Lo que Meta cuenta de la sesión: la cuenta de WhatsApp, o en qué pantalla se quedó
    const alMensaje = (e: MessageEvent) => {
      if (!String(e.origin).endsWith('facebook.com')) return;
      try {
        const d = JSON.parse(e.data);
        if (d.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (d.data?.waba_id) sesion.current = { waba_id: d.data.waba_id, phone_number_id: d.data.phone_number_id };
        if (d.event === 'CANCEL') {
          setEstado('error');
          setMensaje(`Se cerró el registro de Meta${d.data?.current_step ? ` en «${d.data.current_step}»` : ''}. Vuelve a tocar el botón.`);
        }
      } catch {
        // mensajes de Meta que no son del registro
      }
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, []);

  function abrir() {
    setMensaje('');
    setEstado('abierto');
    window.FB.login(
      (r: any) => {
        const code = r?.authResponse?.code;
        if (!code) {
          setEstado('error');
          setMensaje('Meta no terminó el registro. Vuelve a tocar el botón.');
          return;
        }
        // El código vence en 30 segundos: se manda de una vez
        setTimeout(async () => {
          setEstado('conectando');
          try {
            const res = await api<Resultado>('/api/whatsapp/conectar', 'POST', { code, ...sesion.current });
            setResultado(res);
            setEstado('hecho');
          } catch (e) {
            setEstado('error');
            setMensaje((e as Error).message);
          }
        }, 800);
      },
      {
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
      }
    );
  }

  const falta = !APP_ID || !CONFIG_ID;
  return (
    <div className="app-videos anim-entrada max-w-2xl text-zinc-900">
      <p className="text-[13px] font-medium text-zinc-500">KYRELO Marketing</p>
      <h1 className="mt-0.5 text-[28px] font-semibold">Conectar el WhatsApp de KYRELO</h1>
      <p className="mt-1 text-[14px] text-zinc-500">
        Se hace una sola vez. Tu número sigue funcionando en la app de tu celular y, además, la plataforma recibe los pedidos de video.
      </p>

      <div className={`${tarjeta} mt-6 space-y-4 p-5 text-[14px]`}>
        <ol className="list-decimal space-y-2 pl-5 text-zinc-700">
          <li>Ten a mano el celular con la app WhatsApp Business de KYRELO (actualizada).</li>
          <li>Toca el botón y entra con tu Facebook. Elige <b>Conectar tu app WhatsApp Business</b>.</li>
          <li>En el celular te llega un mensaje de Meta: toca <b>Conectar</b>, acepta compartir el historial y escribe el código que te muestra.</li>
          <li>Vuelve aquí y espera a que diga «Conectado». No cierres esta página.</li>
        </ol>

        {falta ? (
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
            Faltan las variables NEXT_PUBLIC_META_APP_ID y NEXT_PUBLIC_WHATSAPP_CONFIG_ID en Netlify.
          </p>
        ) : (
          <button
            className="rounded-lg bg-[#1877f2] px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            disabled={!listo || estado === 'abierto' || estado === 'conectando'}
            onClick={abrir}
          >
            {estado === 'conectando' ? 'Conectando…' : 'Conectar con Facebook'}
          </button>
        )}

        {mensaje && <p className="text-red-700">{mensaje}</p>}
        {resultado && (
          <div className="rounded-lg bg-emerald-50 p-4 text-emerald-900">
            <p className="font-semibold">{resultado.coexistencia ? 'Conectado' : 'Conectado, revisa el estado'}: {resultado.numero}</p>
            <ul className="mt-2 list-disc pl-5">
              {resultado.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-3">
              Copia este número en Netlify como <b>WHATSAPP_PHONE_ID</b>: <code className="select-all">{resultado.phone_number_id}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
