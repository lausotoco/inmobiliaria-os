'use client';

// Celular de la página para agentes: un video real hecho por KYRELO.
// Arranca con Laura presentando la casa frente a la fachada (con subtítulos:
// «así puedes salir tú») y sigue con el antes y después de la misma casa
// (reel de KYRELO Marketing, sin la parte del recorrido 3D). Arranca solo,
// sin sonido y en bucle; el botón activa la voz y la música.

import { useRef, useState } from 'react';

export default function DemoTelefono() {
  const ref = useRef<HTMLVideoElement>(null);
  const [sonido, setSonido] = useState(false);

  function alternarSonido() {
    const v = ref.current;
    if (!v) return;
    const nuevo = !sonido;
    v.muted = !nuevo;
    if (nuevo) {
      v.currentTime = 0;
      v.play().catch(() => undefined);
    }
    setSonido(nuevo);
  }

  return (
    <figure className="mx-auto w-[250px] sm:w-[290px]">
      <div className="relative">
        <div className="absolute -inset-10 -z-10 rounded-full bg-orange-200/40 blur-3xl" aria-hidden />
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[2.6rem] border-[8px] border-zinc-900 bg-zinc-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]">
          <video
            ref={ref}
            src="/reels/video-inmueble-antes-despues.mp4?v=5"
            poster="/reels/video-inmueble-antes-despues.jpg?v=5"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
            aria-label="Una agente presenta su casa y después el antes y después del video editado por KYRELO"
          />
          <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-zinc-900" aria-hidden />
          <button
            type="button"
            onClick={alternarSonido}
            aria-label={sonido ? 'Silenciar' : 'Activar sonido'}
            className="absolute bottom-4 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur transition hover:bg-black/70"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 10v4h4l5 4V6L8 10z" />
              {sonido ? <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /> : <path d="M17 9l5 5M22 9l-5 5" />}
            </svg>
            {sonido ? 'Con sonido' : 'Activar sonido'}
          </button>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-[12px] text-zinc-500">Un video real: la agente presenta su casa y después, el antes y el después</figcaption>
    </figure>
  );
}
