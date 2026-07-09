"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PropiedadImagen } from "@/lib/types";

type Props = {
  propiedadId: string;
  imagenes: PropiedadImagen[];
};

export default function GaleriaUpload({ propiedadId, imagenes }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);

  const supabase = createClient();

  function urlPublica(ruta: string) {
    const { data } = supabase.storage.from("propiedades").getPublicUrl(ruta);
    return data.publicUrl;
  }

  async function subirArchivos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setSubiendo(true);

    const maxOrden =
      imagenes.length > 0 ? Math.max(...imagenes.map((i) => i.orden)) : -1;

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`);

      const ext = archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const nombreArchivo = `${Date.now()}-${i}.${ext}`;
      const ruta = `${propiedadId}/${nombreArchivo}`;

      const { error: errStorage } = await supabase.storage
        .from("propiedades")
        .upload(ruta, archivo, { contentType: archivo.type });

      if (errStorage) {
        console.error("Error subiendo imagen:", errStorage);
        continue;
      }

      await supabase.from("propiedad_imagenes").insert({
        propiedad_id: propiedadId,
        ruta_storage: ruta,
        orden: maxOrden + 1 + i,
      });
    }

    setSubiendo(false);
    setProgreso("");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function eliminarImagen(img: PropiedadImagen) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    setEliminando(img.id);

    await supabase.storage.from("propiedades").remove([img.ruta_storage]);
    await supabase.from("propiedad_imagenes").delete().eq("id", img.id);

    setEliminando(null);
    router.refresh();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    subirArchivos(e.dataTransfer.files);
  }

  return (
    <div>
      {/* Zona de carga */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-linea bg-fondo p-8 text-center transition hover:border-bosque/40"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => subirArchivos(e.target.files)}
        />
        {subiendo ? (
          <p className="text-sm text-bosque">{progreso}</p>
        ) : (
          <>
            <p className="text-2xl">📷</p>
            <p className="mt-2 text-sm font-medium text-tinta">
              Arrastra imágenes aquí o toca para seleccionar
            </p>
            <p className="mt-1 text-xs text-neutro">
              JPG, PNG o WebP. Puedes subir varias a la vez.
            </p>
          </>
        )}
      </div>

      {/* Galería */}
      {imagenes.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {imagenes
            .sort((a, b) => a.orden - b.orden)
            .map((img, idx) => (
              <div key={img.id} className="group relative">
                <img
                  src={urlPublica(img.ruta_storage)}
                  alt={`Foto ${idx + 1}`}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                {idx === 0 && (
                  <span className="absolute left-2 top-2 rounded bg-bosque px-2 py-0.5 text-[10px] font-medium text-white">
                    Principal
                  </span>
                )}
                <button
                  onClick={() => eliminarImagen(img)}
                  disabled={eliminando === img.id}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
                >
                  {eliminando === img.id ? "…" : "✕"}
                </button>
              </div>
            ))}
        </div>
      )}

      {imagenes.length > 0 && (
        <p className="mt-3 text-xs text-neutro">
          {imagenes.length} imagen{imagenes.length !== 1 ? "es" : ""}. Estas
          fotos aparecerán automáticamente en cualquier portafolio que incluya
          este inmueble.
        </p>
      )}
    </div>
  );
}
