'use client';

// app/broker/videos/nuevo/page.tsx — «Empezar mi primer video» de la página
// pública. Abre un borrador (con o sin cuenta; sin cuenta retoma el de este
// navegador) y lleva al asistente.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/videos/subir';
import { Aviso, BarraApp, botonPrimario, fondoApp } from '@/components/videos/ui';

export default function NuevoVideo() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [entrar, setEntrar] = useState(false);
  const empezado = useRef(false);

  useEffect(() => {
    if (empezado.current) return;
    empezado.current = true;
    api<{ id: string; sin_cuenta?: boolean; nuevo?: boolean }>('/api/videos', 'POST')
      .then((r) => {
        // Meta: alguien sin cuenta empezó su primer video (la campaña optimiza hacia esto)
        const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
        if (r.sin_cuenta && r.nuevo && fbq) fbq('track', 'Lead', { content_name: 'video_por_inmueble' });
        router.replace(`/broker/videos/${r.id}`);
      })
      .catch((e) => {
        setError((e as Error).message);
        setEntrar(!!(e as Error & { datos?: { entrar?: boolean } }).datos?.entrar);
      });
  }, [router]);

  return (
    <div className={fondoApp}>
      <BarraApp volver={{ href: '/video-inmueble', texto: 'Inicio' }} derecha={<span />} />
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        {error ? (
          <>
            <Aviso tono="error">{error}</Aviso>
            {entrar && (
              <Link href="/login?siguiente=%2Fbroker%2Fvideos" className={`${botonPrimario} mt-6`}>
                Entrar a mi cuenta
              </Link>
            )}
          </>
        ) : (
          <>
            <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
            <p className="mt-5 text-[15px] font-medium text-zinc-700">Preparando tu video…</p>
          </>
        )}
      </main>
    </div>
  );
}
