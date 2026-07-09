"use client";

import { useRef, useState } from "react";

export default function Carrusel({
  imagenes,
  alt,
}: {
  imagenes: string[];
  alt: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(0);

  function onScroll() {
    if (!ref.current) return;
    const idx = Math.round(ref.current.scrollLeft / ref.current.clientWidth);
    setActiva(idx);
  }

  function irA(idx: number) {
    ref.current?.scrollTo({
      left: idx * ref.current.clientWidth,
      behavior: "smooth",
    });
  }

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-neutral-100 text-5xl text-neutral-300">
        ⌂
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {imagenes.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${alt} — foto ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="aspect-[4/3] w-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      {imagenes.length > 1 && (
        <>
          {/* Flechas — escritorio */}
          <button
            onClick={() => irA(Math.max(0, activa - 1))}
            aria-label="Foto anterior"
            className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 backdrop-blur transition hover:bg-white sm:flex"
          >
            ‹
          </button>
          <button
            onClick={() => irA(Math.min(imagenes.length - 1, activa + 1))}
            aria-label="Foto siguiente"
            className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-800 backdrop-blur transition hover:bg-white sm:flex"
          >
            ›
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {imagenes.map((_, i) => (
              <button
                key={i}
                onClick={() => irA(i)}
                aria-label={`Ir a foto ${i + 1}`}
                className={`size-1.5 rounded-full transition ${
                  i === activa ? "w-4 bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Contador */}
          <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-neutral-700 backdrop-blur">
            {activa + 1} / {imagenes.length}
          </span>
        </>
      )}
    </div>
  );
}
