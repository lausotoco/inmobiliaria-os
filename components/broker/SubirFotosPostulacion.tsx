'use client';

// components/broker/SubirFotosPostulacion.tsx
// El broker sube fotos ANTES de que exista la propiedad. Se guardan en
// una carpeta temporal postulaciones/{tempId}/ dentro del bucket "propiedades".
// Al aprobar, la función aprobar_postulacion las mueve a la propiedad real.

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { comprimirImagen, mensajeErrorSubida } from '@/lib/comprimir-imagen';

export default function SubirFotosPostulacion({
  tempId,
  rutas,
  onChange,
}: {
  tempId: string;
  rutas: string[];
  onChange: (rutas: string[]) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [errores, setErrores] = useState<string[]>([]);

  function urlPublica(ruta: string) {
    const { data } = supabase.storage.from('propiedades').getPublicUrl(ruta);
    return data.publicUrl;
  }

  async function subir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setSubiendo(true);
    setErrores([]);
    const nuevas: string[] = [];
    const fallidas: string[] = [];

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      setProgreso(`Optimizando y subiendo ${i + 1} de ${archivos.length}…`);

      let foto;
      try {
        foto = await comprimirImagen(archivo);
      } catch (e) {
        fallidas.push((e as Error).message);
        continue;
      }

      const ruta = `postulaciones/${tempId}/${Date.now()}-${i}.${foto.extension}`;

      const { error } = await supabase.storage
        .from('propiedades')
        .upload(ruta, foto.contenido, { contentType: foto.tipo });

      if (error) fallidas.push(mensajeErrorSubida(archivo.name, error.message));
      else nuevas.push(ruta);
    }

    setErrores(fallidas);
    setSubiendo(false);
    setProgreso('');
    if (inputRef.current) inputRef.current.value = '';
    onChange([...rutas, ...nuevas]);
  }

  async function eliminar(ruta: string) {
    await supabase.storage.from('propiedades').remove([ruta]);
    onChange(rutas.filter((r) => r !== ruta));
  }

  return (
    <div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); subir(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-[#E0DDD2] bg-[#F1EFE8] p-6 text-center transition hover:border-[#1A1A18]/30"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => subir(e.target.files)}
        />
        {subiendo ? (
          <p className="text-sm text-[#1A1A18]">{progreso}</p>
        ) : (
          <>
            <p className="text-xl">📷</p>
            <p className="mt-2 text-sm font-medium text-[#1A1A18]">
              Arrastra fotos aquí o toca para seleccionar
            </p>
            <p className="mt-1 text-xs text-[#5F5E5A]">
              JPG, PNG o WebP. Sube varias a la vez.
            </p>
          </>
        )}
      </div>

      {errores.length > 0 && (
        <div className="mt-3 rounded-lg border border-[#D5BBB5] bg-white p-3 text-sm text-[#8E3B31]">
          <p className="font-medium">
            {errores.length} foto{errores.length !== 1 ? 's' : ''} no se
            subi{errores.length !== 1 ? 'eron' : 'ó'}:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {errores.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {rutas.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {rutas.map((ruta, idx) => (
            <div key={ruta} className="group relative">
              <img
                src={urlPublica(ruta)}
                alt={`Foto ${idx + 1}`}
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-[#1A1A18] px-1.5 py-0.5 text-[9px] font-medium text-white">
                  Principal
                </span>
              )}
              <button
                type="button"
                onClick={() => eliminar(ruta)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {rutas.length > 0 && (
        <p className="mt-2 text-xs text-[#5F5E5A]">
          {rutas.length} foto{rutas.length !== 1 ? 's' : ''}. La primera será la principal.
        </p>
      )}
    </div>
  );
}
