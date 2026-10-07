// Subida directa del navegador a la carpeta privada, con un enlace firmado
// que entrega el servidor. Muestra el avance (los videos pesan) y traduce
// los errores de Supabase a palabras sencillas.

import { MAX_MB_ARCHIVO } from "@/lib/videos/config";

function mensajeError(estado: number, respuesta: string): string {
  const t = respuesta.toLowerCase();
  if (estado === 413 || t.includes("exceeded") || t.includes("too large"))
    return `El archivo pesa más de ${MAX_MB_ARCHIVO} MB.`;
  if (t.includes("mime") || t.includes("not supported")) return "Ese formato no se puede subir. Usa MP4 o MOV.";
  if (estado === 400 && t.includes("token")) return "El permiso de subida venció. Inténtalo de nuevo.";
  return "No se pudo subir el archivo. Inténtalo de nuevo.";
}

export function subirConAvance(
  url: string,
  archivo: Blob,
  mime: string,
  alAvanzar: (fraccion: number) => void
): Promise<void> {
  return new Promise((ok, fallo) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime);
    // La llave pública de Supabase (la misma que ya usa el navegador); el permiso real va en el enlace firmado
    const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (llave) xhr.setRequestHeader("apikey", llave);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) alAvanzar(e.loaded / e.total);
    };
    xhr.onload = () => {
      // Si una parte ya había quedado arriba en un intento anterior, cuenta como subida
      if (xhr.status >= 200 && xhr.status < 300) ok();
      else if (/already exists|duplicate/i.test(xhr.responseText || "")) ok();
      else fallo(new Error(mensajeError(xhr.status, xhr.responseText || "")));
    };
    xhr.onerror = () => fallo(new Error("Se cortó la conexión. Revisa tu internet e inténtalo de nuevo."));
    xhr.send(archivo);
  });
}

/**
 * Sube un video grande en partes (cada una con su enlace firmado), una detrás
 * de otra y reintentando hasta 3 veces cada parte si se cae la conexión.
 */
export async function subirEnPartes(
  urls: string[],
  archivo: Blob,
  mime: string,
  bytesParte: number,
  alAvanzar: (fraccion: number) => void
): Promise<void> {
  for (let i = 0; i < urls.length; i++) {
    const trozo = archivo.slice(i * bytesParte, Math.min(archivo.size, (i + 1) * bytesParte), mime);
    let intento = 0;
    for (;;) {
      try {
        await subirConAvance(urls[i], trozo, mime, (f) => alAvanzar((i * bytesParte + f * trozo.size) / archivo.size));
        break;
      } catch (e) {
        if (++intento >= 3) throw e;
        await new Promise((r) => setTimeout(r, 1500 * intento));
      }
    }
  }
  alAvanzar(1);
}

/** POST/PATCH a la API de videos con el error ya en español. */
export async function api<T = any>(url: string, metodo: "GET" | "POST" | "PATCH" | "PUT", cuerpo?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: metodo,
    headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j?.error || "Algo falló. Recarga la página e inténtalo de nuevo.") as Error & { datos?: any };
    e.datos = j;
    throw e;
  }
  return j as T;
}
