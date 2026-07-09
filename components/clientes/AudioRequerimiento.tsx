"use client";

import { useState, useRef } from "react";
import type { Requerimiento } from "@/lib/types";

type Props = {
  onExtraido: (datos: Partial<Requerimiento>, transcripcion: string) => void;
};

export default function AudioRequerimiento({ onExtraido }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripcion, setTranscripcion] = useState<string | null>(null);

  async function analizar() {
    if (!archivo) return;
    setAnalizando(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("audio", archivo);

      const res = await fetch("/api/analizar-audio", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo analizar el audio.");
        if (data.transcripcion) setTranscripcion(data.transcripcion);
        setAnalizando(false);
        return;
      }

      setTranscripcion(data.transcripcion);
      onExtraido(data.requerimiento, data.transcripcion);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setAnalizando(false);
  }

  return (
    <div className="rounded-2xl border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] p-5 backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl grad-acento text-sm text-white shadow-[0_0_16px_rgba(0,212,255,0.3)]">
          🎙
        </span>
        <div>
          <p className="text-[13px] font-semibold text-tinta">
            Analizar audio del cliente con IA
          </p>
          <p className="mt-0.5 text-[12px] text-neutro">
            Sube la nota de voz donde te cuenta qué busca (presupuesto, zonas,
            tiempos…) y la IA llenará el formulario automáticamente.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.ogg,.opus,.wav,.aac"
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setError(null);
            setTranscripcion(null);
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border border-linea bg-white/[0.04] px-4 py-2.5 text-[13px] text-tinta transition hover:border-[#00D4FF]/40"
        >
          {archivo ? `🎵 ${archivo.name.slice(0, 32)}` : "Seleccionar audio…"}
        </button>
        <button
          type="button"
          onClick={analizar}
          disabled={!archivo || analizando}
          className="rounded-xl bg-bosque px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50"
        >
          {analizando ? "Transcribiendo y analizando…" : "✦ Analizar con IA"}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-neutro">
        Acepta notas de voz de WhatsApp (.opus/.ogg), .m4a, .mp3 y .wav — máx 20 MB.
      </p>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-400">
          {error}
        </p>
      )}

      {transcripcion && !error && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-[#00D4FF]">
            Ver transcripción del audio
          </summary>
          <p className="mt-2 rounded-xl bg-white/[0.03] px-4 py-3 text-[12px] leading-relaxed text-neutro">
            "{transcripcion}"
          </p>
        </details>
      )}
    </div>
  );
}
