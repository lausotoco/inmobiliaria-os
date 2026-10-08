// Video por inmueble · fotos para el modo «Solo tengo fotos».
// Cada foto se reduce en el navegador antes de subirla (límite gratis de Supabase):
// 2400 px de lado mayor, suficiente para moverla dentro de un video vertical en
// 1080p, y una miniatura pequeña para verla en la plataforma sin descargarla.

const LADO_MAXIMO = 2400;
const CALIDAD = 0.86;
const LADO_MINIATURA = 220;
/** Por debajo de esto la foto se verá borrosa en el video (se avisa, no se bloquea). */
const LADO_CORTO_MINIMO = 900;

export type FotoLista = {
  archivo: File;
  ancho: number;
  alto: number;
  miniatura: string | null;
  avisos: string[];
};

function cargar(archivo: File): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      mal(new Error(`«${archivo.name}» no se pudo abrir. Si es una foto de iPhone (HEIC), compártela como JPG o haz una captura de pantalla.`));
    };
    img.src = url;
  });
}

function dibujar(img: HTMLImageElement, ladoMayor: number) {
  const escala = Math.min(1, ladoMayor / Math.max(img.naturalWidth, img.naturalHeight));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(img.naturalWidth * escala);
  lienzo.height = Math.round(img.naturalHeight * escala);
  const g = lienzo.getContext('2d');
  if (!g) throw new Error('Este navegador no pudo procesar la foto.');
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, lienzo.width, lienzo.height);
  g.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  return lienzo;
}

export async function prepararFoto(archivo: File): Promise<FotoLista> {
  const img = await cargar(archivo);
  const lienzo = dibujar(img, LADO_MAXIMO);
  const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', CALIDAD));
  if (!blob) throw new Error(`«${archivo.name}» no se pudo preparar.`);
  let miniatura: string | null = null;
  try {
    miniatura = dibujar(img, LADO_MINIATURA).toDataURL('image/jpeg', 0.6);
    if (miniatura.length > 39000) miniatura = null;
  } catch {
    miniatura = null;
  }
  const avisos: string[] = [];
  if (Math.min(img.naturalWidth, img.naturalHeight) < LADO_CORTO_MINIMO)
    avisos.push('La foto es pequeña: en el video puede verse borrosa. Si tienes una más grande, cámbiala.');
  const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.jpg';
  return {
    archivo: new File([blob], nombre, { type: 'image/jpeg' }),
    ancho: lienzo.width,
    alto: lienzo.height,
    miniatura,
    avisos,
  };
}
