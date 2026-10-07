'use client';

// Reproductor de la vista previa. Ninguna página web puede impedir al 100 %
// que alguien grabe la pantalla; por eso lo que se pueda grabar no sirve
// para publicar:
//  · archivo aparte en baja calidad, con una marca de agua suave quemada en el
//    centro y el nombre del agente (lo hace hacer-vista-previa.sh). Encima solo
//    va una etiqueta discreta: con dos marcas no se veía el trabajo (7 oct 2026);
//  · reproductor pequeño, sin controles nativos: sin pantalla completa, sin
//    imagen en imagen, sin menú de descarga ni clic derecho;
//  · el enlace del archivo vence en 60 segundos y se usa una sola vez: el video
//    se carga en memoria y nunca queda una dirección para compartir;
//  · se pausa cuando la pestaña o la ventana pierden el foco.

import { useEffect, useRef, useState } from 'react';

function Etiqueta() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-3 top-9 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur"
    >
      Vista previa
    </span>
  );
}

export default function VistaPreviaProtegida({ videoId }: { videoId: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reproduciendo, setReproduciendo] = useState(false);
  const [avance, setAvance] = useState(0);
  const [silencio, setSilencio] = useState(false);

  // Enlace de 60 s → el archivo se baja una vez a la memoria del navegador
  useEffect(() => {
    let local: string | null = null;
    let cancelado = false;
    (async () => {
      const r = await fetch(`/api/videos/${videoId}/vista-previa`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'No se pudo cargar la vista previa.');
      const archivo = await fetch(j.url, { cache: 'no-store' });
      if (!archivo.ok) throw new Error('No se pudo cargar la vista previa. Recarga la página.');
      const blob = await archivo.blob();
      if (cancelado) return;
      local = URL.createObjectURL(blob);
      setSrc(local);
    })().catch((e) => !cancelado && setError((e as Error).message));
    return () => {
      cancelado = true;
      if (local) URL.revokeObjectURL(local);
    };
  }, [videoId]);

  // Sin imagen en imagen, sin transmitir a otra pantalla, sin menú de descarga
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.disablePictureInPicture = true;
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('disableremoteplayback', '');
    v.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback noplaybackrate');
  }, [src]);

  // Se pausa si la pestaña o la ventana pierden el foco
  useEffect(() => {
    const pausar = () => ref.current?.pause();
    const alCambiar = () => document.hidden && pausar();
    window.addEventListener('blur', pausar);
    document.addEventListener('visibilitychange', alCambiar);
    return () => {
      window.removeEventListener('blur', pausar);
      document.removeEventListener('visibilitychange', alCambiar);
    };
  }, []);

  function alternar() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }

  return (
    <div className="mx-auto w-[240px] sm:w-[280px]">
      <div
        className="relative aspect-[9/16] w-full select-none overflow-hidden rounded-[2.4rem] border-[7px] border-zinc-900 bg-zinc-950 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)] ring-1 ring-black/10"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {src && (
          <video
            ref={ref}
            src={src}
            playsInline
            preload="auto"
            muted={silencio}
            draggable={false}
            className="pointer-events-none h-full w-full object-cover"
            onPlay={() => setReproduciendo(true)}
            onPause={() => setReproduciendo(false)}
            onEnded={() => setReproduciendo(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              setAvance(v.duration ? v.currentTime / v.duration : 0);
            }}
          />
        )}
        <Etiqueta />
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-zinc-900" />

        {!src && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[12px] text-white/70">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Cargando la vista previa…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px] leading-relaxed text-white">
            {error}
          </div>
        )}

        {src && (
          <button
            type="button"
            onClick={alternar}
            aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
            className="group absolute inset-0 flex items-center justify-center"
          >
            {!reproduciendo && (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-xl transition group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            )}
          </button>
        )}

        {src && (
          <>
            <button
              type="button"
              onClick={() => setSilencio(!silencio)}
              aria-label={silencio ? 'Activar sonido' : 'Silenciar'}
              className="absolute right-3 top-9 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10v4h4l5 4V6L8 10z" />
                {silencio ? <path d="M17 9l5 5M22 9l-5 5" /> : <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />}
              </svg>
            </button>
            <div className="absolute inset-x-4 bottom-4 h-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(avance * 100)}%` }} />
            </div>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-[12px] leading-relaxed text-zinc-500">
        Vista previa en baja calidad. Al desbloquear descargas el video en alta calidad y sin marcas.
      </p>
    </div>
  );
}
