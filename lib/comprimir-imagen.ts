// lib/comprimir-imagen.ts
// Reduce cada foto en el navegador ANTES de subirla a Supabase Storage.
// Una foto de celular (3–8 MB) queda en ~200–400 KB a 1600 px de lado,
// calidad de sobra para portafolios y 10–20 veces menos espacio.

const LADO_MAXIMO = 1600;
const CALIDAD_JPG = 0.8;

export type FotoComprimida = {
  contenido: Blob;
  extension: string;
  tipo: string;
};

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("no se pudo leer"));
    };
    img.src = url;
  });
}

export async function comprimirImagen(archivo: File): Promise<FotoComprimida> {
  let img: HTMLImageElement;
  try {
    img = await cargarImagen(archivo);
  } catch {
    throw new Error(
      `"${archivo.name}" no es una imagen compatible. Si es una foto de iPhone (HEIC), conviértela a JPG antes de subirla.`
    );
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const ancho = Math.round(img.naturalWidth * escala);
  const alto = Math.round(img.naturalHeight * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`"${archivo.name}" no se pudo procesar en este navegador.`);

  // Fondo blanco para PNG con transparencia (JPG no admite transparencia)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);

  const jpg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPG)
  );
  if (!jpg) throw new Error(`"${archivo.name}" no se pudo comprimir.`);

  // Si la original ya era más liviana y es un formato web, se sube tal cual
  const esFormatoWeb = /^image\/(jpeg|png|webp)$/.test(archivo.type);
  if (esFormatoWeb && archivo.size <= jpg.size) {
    const ext = archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    return { contenido: archivo, extension: ext, tipo: archivo.type };
  }

  return { contenido: jpg, extension: "jpg", tipo: "image/jpeg" };
}

/** Traduce el error de Supabase a algo entendible. */
export function mensajeErrorSubida(nombre: string, mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("quota") || m.includes("exceed") || m.includes("payment")) {
    return `"${nombre}" no se subió: Supabase está bloqueando cargas porque se superó el espacio del plan gratuito.`;
  }
  return `"${nombre}" no se subió: ${mensaje}`;
}
