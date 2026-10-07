// Revisión automática de una toma, en el navegador y ANTES de subirla:
// así el agente sabe qué regrabar sin haberse ido del inmueble.
//  · Bloquea: horizontal, resolución de WhatsApp, menos de 3 s o más de 50 MB.
//  · Advierte: oscura, muy movida o muy larga (se puede enviar igual).
// Si el navegador no puede leer el video (pasa con algunos formatos), la
// toma sube «sin revisar» y la revisa Laura.

import {
  MAX_BYTES_ARCHIVO,
  MAX_BYTES_RECORRIDO,
  MAX_MB_ARCHIVO,
  MAX_MB_RECORRIDO,
  MIN_LADO_CORTO,
  MIN_SEGUNDOS_RECORRIDO,
} from "@/lib/videos/config";

export type Revision = {
  bloqueos: string[];
  advertencias: string[];
  duracion: number | null;
  ancho: number | null;
  alto: number | null;
  revisada: boolean;
  miniatura: string | null; // JPG pequeño en texto, para ver la toma sin descargarla
};

const BRILLO_MINIMO = 55; // 0–255: por debajo se ve oscura
const MOVIMIENTO_MAXIMO = 42; // diferencia media entre cuadros a 0,3 s

function esperar(video: HTMLVideoElement, evento: string, ms: number) {
  return new Promise<void>((ok, fallo) => {
    const t = setTimeout(() => {
      video.removeEventListener(evento, listo);
      fallo(new Error("tiempo"));
    }, ms);
    const listo = () => {
      clearTimeout(t);
      ok();
    };
    video.addEventListener(evento, listo, { once: true });
  });
}

async function cuadro(video: HTMLVideoElement, t: number, lienzo: HTMLCanvasElement): Promise<Uint8ClampedArray> {
  video.currentTime = Math.max(0, Math.min(t, (video.duration || 1) - 0.05));
  await esperar(video, "seeked", 2500);
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("sin lienzo");
  ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
  return ctx.getImageData(0, 0, lienzo.width, lienzo.height).data;
}

function luminancia(px: Uint8ClampedArray): number[] {
  const l: number[] = [];
  for (let i = 0; i < px.length; i += 4) l.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
  return l;
}

/** `recorrido`: un solo video de todo el inmueble (más largo y más pesado que una toma). */
export async function revisarToma(archivo: File, opciones: { recorrido?: boolean } = {}): Promise<Revision> {
  const recorrido = !!opciones.recorrido;
  const r: Revision = { bloqueos: [], advertencias: [], duracion: null, ancho: null, alto: null, revisada: false, miniatura: null };
  const maximo = recorrido ? MAX_BYTES_RECORRIDO : MAX_BYTES_ARCHIVO;
  if (archivo.size > maximo) {
    const mb = Math.round(archivo.size / (1024 * 1024));
    r.bloqueos.push(
      recorrido
        ? `Pesa ${mb} MB y el máximo es ${MAX_MB_RECORRIDO} MB. Grábalo en 1080p (no en 4K) y en 1 a 3 minutos.`
        : `Pesa ${mb} MB y el máximo es ${MAX_MB_ARCHIVO} MB. Graba en 1080p (no en 4K) y de 6 a 10 segundos.`
    );
  }

  const url = URL.createObjectURL(archivo);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await esperar(video, "loadedmetadata", 10000);
    r.revisada = true;
    r.duracion = Number.isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : null;
    r.ancho = video.videoWidth || null;
    r.alto = video.videoHeight || null;

    if (r.ancho && r.alto) {
      if (r.ancho > r.alto) r.bloqueos.push("Está horizontal. Grábala con el celular vertical.");
      else if (Math.min(r.ancho, r.alto) < MIN_LADO_CORTO)
        r.bloqueos.push(
          "La calidad es muy baja (parece reenviada por WhatsApp). Sube el video original desde la galería, grabado en 1080p."
        );
    }
    if (r.duracion != null) {
      if (recorrido) {
        if (r.duracion < MIN_SEGUNDOS_RECORRIDO)
          r.bloqueos.push("Es muy corto para un recorrido. Camina por todo el inmueble: de 1 a 3 minutos.");
        else if (r.duracion > 300) r.advertencias.push("Dura más de 5 minutos. Con 1 a 3 minutos alcanza; lo demás lo cortamos nosotros.");
      } else if (r.duracion < 3) r.bloqueos.push("Dura menos de 3 segundos. Graba de 6 a 10 segundos por espacio.");
      else if (r.duracion > 30) r.advertencias.push("Dura más de 30 segundos. Lo ideal son 6 a 10 segundos por espacio.");
    }

    // Luz y movimiento: tres pares de cuadros. Si el navegador no deja
    // leerlos, se omite esta parte sin molestar al agente.
    if (r.bloqueos.length === 0 && r.duracion && r.duracion >= 3) {
      try {
        if (video.readyState < 2) await esperar(video, "loadeddata", 6000).catch(() => undefined);
        const lienzo = document.createElement("canvas");
        lienzo.width = 36;
        lienzo.height = 64;
        let brillo = 0;
        let movimiento = 0;
        const momentos = recorrido ? [0.1, 0.25, 0.4, 0.55, 0.7, 0.85] : [0.25, 0.5, 0.75];
        for (const m of momentos) {
          const a = luminancia(await cuadro(video, r.duracion * m, lienzo));
          const b = luminancia(await cuadro(video, r.duracion * m + 0.3, lienzo));
          brillo += a.reduce((s, v) => s + v, 0) / a.length;
          movimiento += a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
        }
        // Miniatura: el cuadro de la mitad, en pequeño
        try {
          await cuadro(video, r.duracion * (recorrido ? 0.08 : 0.5), lienzo);
          const mini = document.createElement("canvas");
          mini.width = 144;
          mini.height = Math.round((144 * (r.alto || 16)) / (r.ancho || 9));
          mini.getContext("2d")?.drawImage(video, 0, 0, mini.width, mini.height);
          const datos = mini.toDataURL("image/jpeg", 0.72);
          if (datos.length < 40000) r.miniatura = datos;
        } catch {
          // sin miniatura
        }
        brillo /= momentos.length;
        movimiento /= momentos.length;
        if (brillo > 0 && brillo < BRILLO_MINIMO)
          r.advertencias.push("Se ve oscura. Graba de día, con las luces encendidas y las cortinas abiertas.");
        if (movimiento > MOVIMIENTO_MAXIMO)
          r.advertencias.push(
            recorrido
              ? "Se mueve mucho en varias partes. Camina más despacio y gira suave; si tu celular tiene modo estabilizado, actívalo."
              : "Se mueve mucho. Camina despacio y sin girar rápido; si tu celular tiene modo estabilizado, actívalo."
          );
      } catch {
        // sin luz ni movimiento: no pasa nada
      }
    }
  } catch {
    // El navegador no pudo leer el video: sube sin revisar
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
  return r;
}
