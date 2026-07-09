"use client";

import { useState } from "react";

type Props = {
  onImportado: (datos: Record<string, unknown>) => void;
};

export default function ImportarPropiedad({ onImportado }: Props) {
  const [modo, setModo] = useState<"url" | "texto" | null>(null);
  const [url, setUrl] = useState("");
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importarDesdeUrl() {
    if (!url.trim()) return;
    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/importar-propiedad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        // El scraping falló — pasamos al plan B
        setError(
          data.mensaje ||
            "No se pudo importar desde la URL. Usa el Plan B: copia el texto del anuncio y pégalo abajo."
        );
        setModo("texto");
        setCargando(false);
        return;
      }

      onImportado({ ...data.propiedad, url_original: url.trim() });
    } catch {
      setError("Error de conexión. Usa el Plan B: pega el texto del anuncio.");
      setModo("texto");
    }
    setCargando(false);
  }

  async function importarDesdeTexto() {
    if (!texto.trim()) return;
    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/importar-propiedad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim(), url: url.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.mensaje || "No se pudo extraer la información.");
        setCargando(false);
        return;
      }

      onImportado({
        ...data.propiedad,
        ...(url.trim() ? { url_original: url.trim() } : {}),
      });
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    }
    setCargando(false);
  }

  if (!modo) {
    return (
      <div className="rounded-xl border border-linea bg-superficie p-6">
        <p className="font-medium text-tinta">¿Cómo quieres agregar el inmueble?</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setModo("url")}
            className="flex-1 rounded-lg border border-linea bg-fondo px-4 py-6 text-center transition hover:border-bosque/40 hover:shadow-sm"
          >
            <p className="text-2xl">🔗</p>
            <p className="mt-2 text-sm font-medium text-tinta">Pegar enlace</p>
            <p className="mt-1 text-xs text-neutro">
              De Metrocuadrado, FincaRaíz u otro portal
            </p>
          </button>
          <button
            onClick={() => setModo("texto")}
            className="flex-1 rounded-lg border border-linea bg-fondo px-4 py-6 text-center transition hover:border-bosque/40 hover:shadow-sm"
          >
            <p className="text-2xl">📋</p>
            <p className="mt-2 text-sm font-medium text-tinta">Pegar texto</p>
            <p className="mt-1 text-xs text-neutro">
              Copia la descripción del anuncio y la IA extrae los campos
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-linea bg-superficie p-6">
      {modo === "url" && (
        <>
          <label className="block text-sm font-medium text-tinta">
            Enlace del anuncio
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.metrocuadrado.com/inmueble/…"
              className="mt-1.5 w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
            />
          </label>
          <div className="mt-4 flex gap-3">
            <button
              onClick={importarDesdeUrl}
              disabled={cargando || !url.trim()}
              className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
            >
              {cargando ? "Importando…" : "Importar"}
            </button>
            <button
              onClick={() => { setModo("texto"); setError(null); }}
              className="rounded-lg border border-linea px-4 py-2.5 text-sm text-neutro transition hover:bg-fondo"
            >
              Pegar texto en su lugar
            </button>
          </div>
        </>
      )}

      {modo === "texto" && (
        <>
          <label className="block text-sm font-medium text-tinta">
            Pega el texto del anuncio
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={8}
              className="mt-1.5 w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
              placeholder={"Copia todo el texto del anuncio aquí.\nPrecio, área, habitaciones, dirección, descripción…\nLa IA extraerá los campos automáticamente."}
            />
          </label>
          {url && (
            <p className="mt-1 text-xs text-neutro">
              URL guardada: {url}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={importarDesdeTexto}
              disabled={cargando || !texto.trim()}
              className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
            >
              {cargando ? "Extrayendo con IA…" : "Extraer información"}
            </button>
            <button
              onClick={() => { setModo("url"); setError(null); }}
              className="rounded-lg border border-linea px-4 py-2.5 text-sm text-neutro transition hover:bg-fondo"
            >
              Volver a URL
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          {error}
        </p>
      )}
    </div>
  );
}
