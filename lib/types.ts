// Tipos que reflejan el esquema de Supabase (supabase/schema.sql).
// Se irán usando a medida que construyamos cada módulo.

export type Cliente = {
  id: string;
  organization_id: string;
  nombre: string;
  cedula: string | null;
  whatsapp: string | null;
  email: string | null;
  ciudad: string | null;
  estado: string;
  urgencia: string | null;
  probabilidad_cierre: number | null;
  credito_aprobado: boolean;
  banco: string | null;
  inicial_disponible: number | null;
  ultimo_contacto: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type Requerimiento = {
  id: string;
  organization_id: string;
  cliente_id: string;
  titulo: string | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  ciudad: string | null;
  zonas: string[] | null;
  barrio: string | null;
  area_min: number | null;
  area_max: number | null;
  habitaciones: number | null;
  banos: number | null;
  parqueaderos: number | null;
  tipo_inmueble: string | null;
  amenidades: string[];
  preferencias: string | null;
  financiacion: string | null;
  urgencia: string | null;
  observaciones: string | null;
  estado: string;
  score: number | null;
  created_at: string;
  updated_at: string;
};

export type Propiedad = {
  id: string;
  organization_id: string;
  consecutivo: number | null;
  codigo: string | null;
  titulo: string | null;
  precio: number | null;
  area: number | null;
  habitaciones: number | null;
  banos: number | null;
  parqueaderos: number | null;
  administracion: number | null;
  estrato: number | null;
  descripcion: string | null;
  amenidades: string[];
  barrio: string | null;
  ciudad: string | null;
  direccion: string | null;
  lat: number | null;
  lng: number | null;
  asesor: string | null;
  inmobiliaria: string | null;
  telefono: string | null;
  url_original: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
};

export type PropiedadImagen = {
  id: string;
  organization_id: string;
  propiedad_id: string;
  ruta_storage: string;
  orden: number;
  created_at: string;
};

export type Match = {
  id: string;
  organization_id: string;
  requerimiento_id: string;
  propiedad_id: string;
  score: number | null;
  probabilidad_cierre: number | null;
  explicacion: string | null;
  estado: "sugerido" | "aceptado" | "descartado";
  motivo_descarte: string | null;
  created_at: string;
};

export type Portafolio = {
  id: string;
  organization_id: string;
  cliente_id: string;
  token: string;
  titulo: string | null;
  mensaje_personal: string | null;
  estado: "borrador" | "enviado" | "visto" | "respondido";
  fecha_envio: string | null;
  created_at: string;
  updated_at: string;
};

export type PortafolioItem = {
  id: string;
  organization_id: string;
  portafolio_id: string;
  propiedad_id: string;
  orden: number;
  nota: string | null;
};

export type Conversacion = {
  id: string;
  organization_id: string;
  cliente_id: string;
  canal: string;
  direccion: "enviado" | "recibido" | "nota";
  contenido: string;
  fecha: string;
};

export type Visita = {
  id: string;
  organization_id: string;
  cliente_id: string;
  propiedad_id: string | null;
  fecha: string | null;
  estado: string;
  resultado: string | null;
  notas: string | null;
};

export type Oferta = {
  id: string;
  organization_id: string;
  cliente_id: string;
  propiedad_id: string | null;
  monto: number | null;
  estado: string;
  notas: string | null;
};

export type Tarea = {
  id: string;
  organization_id: string;
  cliente_id: string | null;
  descripcion: string;
  fecha_limite: string | null;
  origen: "manual" | "asistente_ia";
  estado: "pendiente" | "completada";
};
