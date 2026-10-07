// Video por inmueble (KYRELO Marketing) · reglas compartidas entre el
// navegador y el servidor. Nada secreto aquí: el precio vive en Netlify
// (VIDEO_PRECIO_DESBLOQUEO) porque este repositorio es público.

export type TipoInmueble = "apartamento" | "casa" | "lote" | "local";
export type EstadoVideo =
  | "borrador"
  | "recibido"
  | "en_edicion"
  | "vista_previa"
  | "desbloqueado"
  | "rechazado"
  | "descartado";

export type Ficha = {
  tipo?: TipoInmueble;
  operacion?: "venta" | "arriendo";
  precio?: number | null;
  area_construida?: number | null;
  area_privada?: number | null;
  habitaciones?: number | null;
  banos?: number | null;
  parqueaderos?: number | null;
  deposito?: boolean;
  piso?: number | null;
  ascensor?: boolean;
  estrato?: number | null;
  administracion?: number | null;
  municipio?: string;
  barrio?: string;
  diferenciales?: string[];
  nombre_marca?: string;
  whatsapp?: string;
  logo_ruta?: string | null;
  color_principal?: string;
  color_secundario?: string;
  permiso_propietario?: boolean;
};

export const TIPOS_INMUEBLE: { v: TipoInmueble; l: string }[] = [
  { v: "apartamento", l: "Apartamento" },
  { v: "casa", l: "Casa" },
  { v: "lote", l: "Lote" },
  { v: "local", l: "Local u oficina" },
];

export const ESTILOS = [
  { v: "sereno", l: "Sereno", detalle: "Cortes lentos y música suave. Para inmuebles amplios y con buena luz." },
  { v: "directo", l: "Directo", detalle: "Ritmo medio y datos grandes en pantalla. El más versátil." },
  { v: "dinamico", l: "Dinámico", detalle: "Cortes rápidos y más movimiento. Para redes y anuncios cortos." },
];

// ── Casillas: una toma por espacio, en el orden del recorrido ──
export const CASILLAS: Record<string, { nombre: string; ayuda: string }> = {
  recorrido: { nombre: "Recorrido completo", ayuda: "Un solo video caminando por todo el inmueble." },
  fachada: { nombre: "Fachada o portería", ayuda: "Desde la calle o la entrada del conjunto." },
  acceso: { nombre: "Acceso", ayuda: "La entrada al lote desde la vía." },
  entrada: { nombre: "Entrada", ayuda: "Abre la puerta y entra despacio." },
  sala: { nombre: "Sala y comedor", ayuda: "Desde la puerta, avanza suave hacia la ventana." },
  espacio: { nombre: "Espacio principal", ayuda: "Desde la puerta, avanza suave." },
  espacio_2: { nombre: "Otro espacio", ayuda: "Oficina, bodega o mezanine." },
  cocina: { nombre: "Cocina", ayuda: "Arranca desde la entrada de la cocina." },
  habitacion_principal: { nombre: "Habitación principal", ayuda: "Entra suave y muestra el clóset y la ventana." },
  habitacion_2: { nombre: "Otra habitación", ayuda: "Opcional." },
  habitacion_3: { nombre: "Otra habitación más", ayuda: "Opcional." },
  bano: { nombre: "Baño principal", ayuda: "Con la luz encendida y la tapa del sanitario abajo." },
  bano_2: { nombre: "Otro baño", ayuda: "Opcional." },
  balcon: { nombre: "Balcón o terraza", ayuda: "Sal despacio y muestra lo que se ve." },
  jardin: { nombre: "Jardín o patio", ayuda: "Un recorrido lento de lado a lado." },
  recorrido_1: { nombre: "Recorrido del lote 1", ayuda: "Camina despacio mostrando el terreno." },
  recorrido_2: { nombre: "Recorrido del lote 2", ayuda: "Desde otro punto del lote." },
  recorrido_3: { nombre: "Recorrido del lote 3", ayuda: "Opcional." },
  vista: { nombre: "Vista", ayuda: "Desde la ventana o el balcón, de izquierda a derecha." },
  zonas_comunes: { nombre: "Zonas comunes", ayuda: "Piscina, gimnasio, parque o salón comunal." },
  detalle_1: { nombre: "Detalle 1", ayuda: "Acabados, la vista desde una ventana o lo más bonito del inmueble." },
  detalle_2: { nombre: "Detalle 2", ayuda: "Opcional." },
  detalle_3: { nombre: "Detalle 3", ayuda: "Opcional." },
};

const RECORRIDO: Record<TipoInmueble, string[]> = {
  apartamento: [
    "fachada", "entrada", "sala", "cocina", "habitacion_principal", "habitacion_2",
    "habitacion_3", "bano", "bano_2", "balcon", "vista", "zonas_comunes",
    "detalle_1", "detalle_2", "detalle_3",
  ],
  casa: [
    "fachada", "entrada", "sala", "cocina", "habitacion_principal", "habitacion_2",
    "habitacion_3", "bano", "bano_2", "balcon", "jardin", "vista", "zonas_comunes",
    "detalle_1", "detalle_2", "detalle_3",
  ],
  lote: ["acceso", "recorrido_1", "recorrido_2", "recorrido_3", "vista", "zonas_comunes", "detalle_1", "detalle_2", "detalle_3"],
  local: ["fachada", "entrada", "espacio", "espacio_2", "cocina", "bano", "vista", "detalle_1", "detalle_2", "detalle_3"],
};

const OBLIGATORIAS: Record<TipoInmueble, string[]> = {
  apartamento: ["sala", "cocina", "habitacion_principal", "bano"],
  casa: ["sala", "cocina", "habitacion_principal", "bano"],
  lote: ["recorrido_1", "recorrido_2"],
  local: ["fachada", "espacio"],
};

export const MINIMO_TOMAS = 3;

// Un solo video del recorrido: el agente no tiene que cortar nada. Las tomas se sacan al editar.
// Pesa más de 50 MB (el máximo por archivo del plan gratis), así que se sube en partes.
export const CASILLA_RECORRIDO = "recorrido";
export const MAX_MB_RECORRIDO = 400;
export const MAX_BYTES_RECORRIDO = MAX_MB_RECORRIDO * 1024 * 1024;
export const BYTES_PARTE = 45 * 1024 * 1024;
export const MIN_SEGUNDOS_RECORRIDO = 15;
export const partesDe = (bytes: number) => Math.max(1, Math.ceil(bytes / BYTES_PARTE));
export const rutaParte = (ruta: string, i: number) => `${ruta}.part${String(i + 1).padStart(3, "0")}`;

export function casillasDe(tipo?: TipoInmueble): string[] {
  return RECORRIDO[tipo ?? "apartamento"];
}

export function obligatoriasDe(tipo?: TipoInmueble): string[] {
  return OBLIGATORIAS[tipo ?? "apartamento"];
}

export function esCasillaValida(casilla: string): boolean {
  return Object.prototype.hasOwnProperty.call(CASILLAS, casilla);
}

// ── Estados que ve el agente ──
export const NOMBRE_ESTADO: Record<EstadoVideo, string> = {
  borrador: "Sin enviar",
  recibido: "Recibido",
  en_edicion: "En edición",
  vista_previa: "Vista previa lista",
  desbloqueado: "Desbloqueado",
  rechazado: "Hay que regrabar",
  descartado: "Descartado",
};

export const LINEA_ESTADOS: EstadoVideo[] = ["recibido", "en_edicion", "vista_previa", "desbloqueado"];

// ── Límites ──
export const MAX_MB_ARCHIVO = 50; // máximo por archivo del plan gratis de Supabase
export const MAX_BYTES_ARCHIVO = MAX_MB_ARCHIVO * 1024 * 1024;
export const MAX_BYTES_LOGO = 5 * 1024 * 1024;
export const MIN_LADO_CORTO = 720; // por debajo, parece un video reenviado por WhatsApp
export const ESPACIO_GRATIS_BYTES = 1024 * 1024 * 1024; // 1 GB entre fotos y videos

// Máximo de videos sin pagar al mismo tiempo (en edición o con vista previa).
// Aprobado el 6 oct 2026: para editar el tercero, desbloquea o descarta uno.
export const MAX_PREVIAS_SIN_PAGAR = 2;
export const ESTADOS_SIN_PAGAR: EstadoVideo[] = ["recibido", "en_edicion", "vista_previa"];

// ── Horario de atención y reloj de entrega (hora de Colombia) ──
export const HORARIO = { inicio: 7, fin: 20 }; // 7 a. m. a 8 p. m., todos los días
// Promesa de entrega (7 oct 2026: 40 minutos mientras Laura tiene tiempo para atender;
// si un día no alcanza, se cambia aquí y en TEXTO_ENTREGA, y toda la plataforma se ajusta)
export const MINUTOS_ENTREGA = 40;
export const TEXTO_ENTREGA = "menos de 40 minutos";
const OFFSET_COLOMBIA_MS = -5 * 3600 * 1000; // Colombia no cambia de hora
const DIA_MS = 24 * 3600 * 1000;

/** Hora límite de entrega: MINUTOS_ENTREGA contados dentro del horario de atención. */
export function entregaEstimada(desde: Date, minutos = MINUTOS_ENTREGA): Date {
  let t = desde.getTime() + OFFSET_COLOMBIA_MS; // reloj de pared de Colombia
  let restante = minutos * 60 * 1000;
  for (let i = 0; i < 14 && restante > 0; i++) {
    const d = new Date(t);
    const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const inicio = base + HORARIO.inicio * 3600 * 1000;
    const fin = base + HORARIO.fin * 3600 * 1000;
    if (t < inicio) t = inicio;
    if (t >= fin) {
      t = inicio + DIA_MS;
      continue;
    }
    const disponible = fin - t;
    if (restante <= disponible) {
      t += restante;
      restante = 0;
    } else {
      restante -= disponible;
      t = inicio + DIA_MS;
    }
  }
  return new Date(t - OFFSET_COLOMBIA_MS);
}

export function dentroDelHorario(fecha = new Date()): boolean {
  const h = new Date(fecha.getTime() + OFFSET_COLOMBIA_MS).getUTCHours();
  return h >= HORARIO.inicio && h < HORARIO.fin;
}

function diaColombia(fecha: Date): number {
  return Math.floor((fecha.getTime() + OFFSET_COLOMBIA_MS) / DIA_MS);
}

/** "hoy a las 3:40 p. m." · "mañana a las 10:00 a. m." · "el jueves 9 a las …" */
export function formatoEntrega(fecha: Date, ahora = new Date()): string {
  const hora = fecha.toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit",
  });
  const dias = diaColombia(fecha) - diaColombia(ahora);
  if (dias <= 0) return `hoy a las ${hora}`;
  if (dias === 1) return `mañana a las ${hora}`;
  const dia = fecha.toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
  });
  return `el ${dia} a las ${hora}`;
}

export const TEXTO_HORARIO = "de 7 a. m. a 8 p. m.";

// ── Ficha: qué falta para poder enviar ──
export function faltantesFicha(f: Ficha): string[] {
  const falta: string[] = [];
  const conHabitaciones = f.tipo === "apartamento" || f.tipo === "casa";
  if (!f.tipo) falta.push("el tipo de inmueble");
  if (!f.operacion) falta.push("si es venta o arriendo");
  if (!f.precio || f.precio <= 0) falta.push("el precio");
  if (!f.area_construida && !f.area_privada) falta.push(f.tipo === "lote" ? "el área del lote" : "el área");
  if (conHabitaciones && f.habitaciones == null) falta.push("las habitaciones");
  if (conHabitaciones && f.banos == null) falta.push("los baños");
  if (!f.municipio?.trim()) falta.push("el municipio");
  if (!f.barrio?.trim()) falta.push("el barrio o sector");
  const dif = (f.diferenciales ?? []).filter((d) => d.trim());
  if (dif.length < 3) falta.push("las 3 cosas que lo hacen diferente");
  if (!f.nombre_marca?.trim()) falta.push("tu nombre o el de tu oficina para el cierre");
  if (!f.whatsapp || f.whatsapp.replace(/\D/g, "").length < 10) falta.push("tu WhatsApp");
  if (!f.permiso_propietario) falta.push("confirmar que tienes permiso del propietario");
  return falta;
}

export type Paso = "inmueble" | "detalles" | "tomas" | "marca";
export const PASOS: { v: Paso; l: string; corto: string }[] = [
  { v: "inmueble", l: "El inmueble", corto: "Inmueble" },
  { v: "detalles", l: "Detalles", corto: "Detalles" },
  { v: "tomas", l: "Tus tomas", corto: "Tomas" },
  { v: "marca", l: "Tu marca y envío", corto: "Enviar" },
];

/** Lo que falta en cada paso del asistente del agente. */
export function faltantesPorPaso(f: Ficha, casillasSubidas: string[]): Record<Paso, string[]> {
  const conHabitaciones = f.tipo === "apartamento" || f.tipo === "casa";
  const r: Record<Paso, string[]> = { inmueble: [], detalles: [], tomas: [], marca: [] };
  if (!f.tipo) r.inmueble.push("Tipo de inmueble");
  if (!f.operacion) r.inmueble.push("Venta o arriendo");
  if (!f.precio || f.precio <= 0) r.inmueble.push("Precio");
  if (!f.municipio?.trim()) r.inmueble.push("Municipio");
  if (!f.barrio?.trim()) r.inmueble.push("Barrio o sector");
  if (!f.area_construida && !f.area_privada) r.detalles.push(f.tipo === "lote" ? "Área del lote" : "Área");
  if (conHabitaciones && f.habitaciones == null) r.detalles.push("Habitaciones");
  if (conHabitaciones && f.banos == null) r.detalles.push("Baños");
  if ((f.diferenciales ?? []).filter((d) => d.trim()).length < 3) r.detalles.push("3 cosas que lo hacen diferente");
  const subidas = new Set(casillasSubidas);
  if (!subidas.has(CASILLA_RECORRIDO)) {
    for (const c of obligatoriasDe(f.tipo)) if (!subidas.has(c)) r.tomas.push(CASILLAS[c]?.nombre ?? c);
    if (r.tomas.length === 0 && subidas.size < MINIMO_TOMAS) r.tomas.push(`Al menos ${MINIMO_TOMAS} tomas`);
  }
  if (!f.nombre_marca?.trim()) r.marca.push("Nombre para el cierre");
  if (!f.whatsapp || f.whatsapp.replace(/\D/g, "").length < 10) r.marca.push("WhatsApp");
  if (!f.permiso_propietario) r.marca.push("Permiso del propietario");
  return r;
}

export function tituloVideo(f: Ficha): string {
  const tipo = TIPOS_INMUEBLE.find((t) => t.v === f.tipo)?.l ?? "Inmueble";
  const op = f.operacion === "arriendo" ? "en arriendo" : f.operacion === "venta" ? "en venta" : "";
  const lugar = [f.municipio, f.barrio].filter((x) => x && x.trim()).join(", ");
  return [tipo, op].filter(Boolean).join(" ") + (lugar ? ` · ${lugar}` : "");
}

/** Código corto para hablar de un video sin mostrar su id completo. */
export function codigoVideo(id: string): string {
  return "V-" + id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

// ── Archivos ──
const EXT_A_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  "3gp": "video/3gpp",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function extensionDe(nombre: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(nombre || "");
  return m ? m[1].toLowerCase() : "";
}

export function mimeDe(nombre: string, tipo?: string): string {
  if (tipo && (tipo.startsWith("video/") || tipo.startsWith("image/"))) return tipo;
  return EXT_A_MIME[extensionDe(nombre)] ?? (tipo || "");
}

export const MIMES_VIDEO = ["video/mp4", "video/quicktime", "video/x-m4v", "video/3gpp", "video/webm"];
export const MIMES_IMAGEN = ["image/jpeg", "image/png", "image/webp"];

export function extensionSegura(mime: string): string {
  const par = Object.entries(EXT_A_MIME).find(([, m]) => m === mime);
  return par ? par[0] : "bin";
}

// ── Entregas que sube Laura ──
export const ENTREGAS = [
  { v: "vista_previa", l: "Vista previa (540p, con marca de agua)", tipo: "video" },
  { v: "final_vertical", l: "Video vertical 9:16", tipo: "video" },
  { v: "final_anuncio", l: "Versión para anuncios 4:5", tipo: "video" },
  { v: "portada_vertical", l: "Portada 9:16", tipo: "imagen" },
  { v: "portada_cuadrada", l: "Portada 1:1", tipo: "imagen" },
] as const;
export type TipoEntrega = (typeof ENTREGAS)[number]["v"];

/**
 * Copia pequeña y con marca de cada portada, para que el agente vea el paquete
 * completo antes de pagar. El panel la crea sola al subir la portada; no se
 * descarga ni cuenta para publicar.
 */
export const PREVIAS_PORTADA: Record<string, string> = {
  portada_vertical: "portada_vertical_previa",
  portada_cuadrada: "portada_cuadrada_previa",
};

export const NOMBRE_DESCARGA: Record<string, string> = {
  final_vertical: "video-vertical",
  final_anuncio: "video-anuncios-4x5",
  portada_vertical: "portada-vertical",
  portada_cuadrada: "portada-cuadrada",
};

export function formatoMB(bytes?: number | null): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1).replace(".", ",")} MB`;
}
