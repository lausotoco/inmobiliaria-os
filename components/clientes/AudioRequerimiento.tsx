"use client";

import { useState, useRef } from "react";
import type { Requerimiento } from "@/lib/types";

type Props = {
  onExtraido: (datos: Partial<Requerimiento>, transcripcion: string) => void;
};

export default function AudioRequerimiento({ onExtraido }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<"audio" | "texto">("audio");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [textoPegado, setTextoPegado] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripcion, setTranscripcion] = useState<string | null>(null);

  async function analizar() {
    if (modo === "audio" && !archivo) return;
    if (modo === "texto" && !textoPegado.trim()) return;

    setAnalizando(true);
    setError(null);

    try {
      const fd = new FormData();
      if (modo === "audio" && archivo) {
        fd.append("audio", archivo);
      } else {
        fd.append("texto", textoPegado.trim());
      }

      const res = await fetch("/api/analizar-audio", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo analizar.");
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

  const tabActiva =
    "rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white grad-acento";
  const tabInactiva =
    "rounded-lg px-3.5 py-1.5 text-[12px] font-medium text-neutro transition hover:text-tinta";

  return (
    <div className="rounded-2xl border border-[#E6E6E1] bg-[#F7F7F2] p-5 backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl grad-acento text-sm text-white">
          ✦
        </span>
        <div>
          <p className="text-[13px] font-semibold text-tinta">
            Crear requerimiento con IA
          </p>
          <p className="mt-0.5 text-[12px] text-neutro">
            Sube la nota de voz del cliente o pega su mensaje de WhatsApp — la
            IA extrae presupuesto, zonas, tiempos y preferencias, y llena el
            formulario por ti.
          </p>
        </div>
      </div>

      {/* Tabs audio / texto */}
      <div className="mt-4 inline-flex gap-1 rounded-xl border border-linea bg-[#F5F5F0] p-1">
        <button
          type="button"
          onClick={() => { setModo("audio"); setError(null); }}
          className={modo === "audio" ? tabActiva : tabInactiva}
        >
          🎙 Audio
        </button>
        <button
          type="button"
          onClick={() => { setModo("texto"); setError(null); }}
          className={modo === "texto" ? tabActiva : tabInactiva}
        >
          💬 Texto de WhatsApp
        </button>
      </div>

      {modo === "audio" ? (
        <>
          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
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
              className="rounded-xl border border-linea bg-[#F5F5F0] px-4 py-2.5 text-[13px] text-tinta transition hover:border-[#141414]/30"
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
        </>
      ) : (
        <>
          <textarea
            value={textoPegado}
            onChange={(e) => { setTextoPegado(e.target.value); setError(null); }}
            rows={5}
            placeholder={'Pega aquí el mensaje del cliente. Ej:\n"Hola Laura, estamos buscando un apto en Chía o Cajicá, de 3 habitaciones, máximo 550 millones. Nos urge porque entregamos el arriendo en 2 meses. Ojalá con terraza y que acepten mascotas…"'}
            className="mt-3 w-full rounded-xl border border-linea bg-[#F5F5F0] px-4 py-3 text-[13px] text-tinta outline-none transition placeholder:text-[#B9B9B3] focus:border-[#141414]/40"
          />
          <button
            type="button"
            onClick={analizar}
            disabled={!textoPegado.trim() || analizando}
            className="mt-2 rounded-xl bg-bosque px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            {analizando ? "Analizando…" : "✦ Analizar con IA"}
          </button>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-[#E8D8D3] bg-[#F7EFEC] px-4 py-2.5 text-[13px] text-[#8E3B31]">
          {error}
        </p>
      )}

      {transcripcion && !error && modo === "audio" && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-[#141414]">
            Ver transcripción del audio
          </summary>
          <p className="mt-2 rounded-xl bg-[#F5F5F0] px-4 py-3 text-[12px] leading-relaxed text-neutro">
            "{transcripcion}"
          </p>
        </details>
      )}
    </div>
  );
}
