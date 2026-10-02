/* ============================================================
   KYRELO — Perfiles de cliente (/para/[perfil])
   Un perfil = una landing. La portada los lista en primera persona.
   Reglas: aquí no se habla de cobros ni de precios (cada marca lo
   explica en su página), así no se mezclan Plataforma y Marketing.
   ============================================================ */

export type PerfilId = "compradores" | "propietarios" | "agentes" | "oficinas" | "constructoras";
export type MarcaId = "inmobiliaria" | "plataforma" | "marketing";

export type Perfil = {
  id: PerfilId;
  yo: string; // cómo se nombra la persona, en primera persona
  titular: string;
  resalta: string; // parte del titular en cursiva cobre
  bajada: string;
  cambios: [string, string][]; // [antes, con KYRELO]
  pasos: [string, string][];
  marcas: { marca: MarcaId; texto: string; href: string; boton: string }[];
  promesas: string[];
  cta: { texto: string; href?: string; whatsapp?: string };
  seo: string;
};

export const PERFILES: Perfil[] = [
  {
    id: "compradores",
    yo: "Quiero comprar vivienda",
    titular: "Dinos qué buscas.",
    resalta: "Nosotros encontramos el inmueble.",
    bajada: "Dejas de recorrer portales y visitas solo lo que sí te sirve, en Chía, Cajicá, Cota, Sopó y Bogotá norte.",
    cambios: [
      ["Cientos de anuncios repetidos", "Una selección hecha para ti"],
      ["Precios que ya no son", "El precio de hoy, confirmado"],
      ["Visitas que no sirven", "Solo visitas lo que encaja"],
      ["Papeles que aparecen tarde", "Certificado de tradición revisado antes"],
    ],
    pasos: [
      ["Nos cuentas qué buscas", "Zona, tipo de inmueble, presupuesto y para cuándo."],
      ["Confirmamos tu búsqueda", "Así sabemos exactamente qué buscar."],
      ["Buscamos por ti", "En nuestro inventario y en la red de agentes y oficinas, sin publicar tus datos."],
      ["Recibes tu selección", "Privada, y nos dices qué te gustó."],
      ["Te acompañamos hasta la escritura", "Visita, promesa, banco y notaría."],
    ],
    marcas: [
      { marca: "inmobiliaria", texto: "Te buscamos el inmueble y te acompañamos hasta las llaves.", href: "/inmobiliaria", boton: "Conoce la Inmobiliaria" },
    ],
    promesas: ["Sin costo para ti", "Tus datos nunca se publican", "Precio y papeles revisados"],
    cta: { texto: "Contarles qué busco", href: "/casas/sabana-norte" },
    seo: "Dinos qué vivienda buscas en la Sabana y KYRELO encuentra el inmueble. Sin costo para el comprador.",
  },
  {
    id: "propietarios",
    yo: "Quiero vender o arrendar mi inmueble",
    titular: "Tu inmueble, frente a compradores",
    resalta: "que ya conocemos.",
    bajada: "Vende o arrienda vivienda premium en la Sabana sin pasear curiosos.",
    cambios: [
      ["Llegan curiosos a ver la casa", "Solo visitan quienes pueden comprar"],
      ["Fotos que no muestran cómo se vive", "Material de venta profesional"],
      ["Publicado en cinco portales, sin resultados", "Compradores verificados esperando"],
      ["Papeleo eterno", "Promesa, banco y notaría con nosotros"],
    ],
    pasos: [
      ["Hablamos de tu inmueble", "Qué tienes, en cuánto y para cuándo."],
      ["Revisamos precio y papeles", "Precio de mercado y certificado de tradición."],
      ["Producimos su material", "Fotos, video, ficha y textos con información completa."],
      ["Lo presentamos a compradores verificados", "Los que ya buscan algo como lo tuyo."],
      ["Cerramos contigo", "Del acuerdo a la escritura, el papeleo es nuestro."],
    ],
    marcas: [
      { marca: "inmobiliaria", texto: "Venta y arriendo de vivienda premium, con compradores que ya conocemos.", href: "/inmobiliaria", boton: "Conoce la Inmobiliaria" },
    ],
    promesas: ["Compradores verificados", "Material profesional", "Acompañamiento hasta la escritura"],
    cta: { texto: "Quiero vender o arrendar", whatsapp: "Hola KYRELO, quiero vender o arrendar mi inmueble." },
    seo: "Vende o arrienda tu vivienda en la Sabana frente a compradores verificados, con material profesional y acompañamiento hasta la escritura.",
  },
  {
    id: "agentes",
    yo: "Soy agente inmobiliario independiente",
    titular: "Compradores reales para tu inventario.",
    resalta: "Material que te hace vender.",
    bajada: "KYRELO te conecta con compradores verificados y presenta mejor los inmuebles que captas.",
    cambios: [
      ["Prospectar sin parar", "Compradores que ya están buscando"],
      ["Curiosos que no compran", "Presupuesto, zona y plazo confirmados"],
      ["Material improvisado", "Reels y recorridos con tus videos"],
      ["El papeleo solo", "Promesa, banco y notaría acompañados"],
    ],
    pasos: [
      ["Ves los requerimientos", "Compradores verificados de la Sabana, sin necesidad de cuenta."],
      ["Postulas tu inmueble", "Si encaja, te registras y lo envías."],
      ["Visita acompañada", "El comprador llega sabiendo lo que busca."],
      ["Cerramos juntos", "Con todo acordado por escrito antes de empezar."],
    ],
    marcas: [
      { marca: "plataforma", texto: "Requerimientos de compradores verificados para tus inmuebles.", href: "/plataforma", boton: "Ver requerimientos" },
      { marca: "marketing", texto: "Reels, recorridos animados y piezas para pauta de tus inmuebles captados.", href: "/marketing", boton: "Conoce Marketing" },
    ],
    promesas: ["Compradores verificados", "Sin exclusividad", "Tu cartera sigue siendo tuya"],
    cta: { texto: "Ver requerimientos", href: "/plataforma" },
    seo: "Compradores verificados para tu inventario y material que vende: KYRELO para agentes inmobiliarios de la Sabana.",
  },
  {
    id: "oficinas",
    yo: "Soy una oficina inmobiliaria",
    titular: "Tú eliges qué inmuebles potenciar.",
    resalta: "Nosotros los presentamos mejor.",
    bajada: "Material, pauta y marca para tu oficina, y una red de compradores verificados.",
    cambios: [
      ["Inventario quieto hace meses", "Eliges qué potenciar cada mes"],
      ["Cada asesor publica a su manera", "Una marca de oficina clara y constante"],
      ["Interesados que no encajan", "Red de respaldo: no se pierden"],
      ["Pauta sin medición", "Reporte de alcance y conversaciones"],
    ],
    pasos: [
      ["Reunión de 20 minutos", "Qué inmuebles quieres mover y cómo los muestras hoy."],
      ["Eliges qué potenciar", "El plan se arma a la medida de tu inventario."],
      ["Producimos con tu equipo", "Los asesores graban; nosotros editamos, animamos y pautamos."],
      ["Medimos cada mes", "Alcance, conversaciones y lo que sigue."],
    ],
    marcas: [
      { marca: "marketing", texto: "Reels, recorridos 3D, pauta y la marca de tu oficina.", href: "/marketing", boton: "Conoce Marketing" },
      { marca: "plataforma", texto: "Compradores verificados para los inmuebles de tu oficina.", href: "/plataforma", boton: "Ver requerimientos" },
    ],
    promesas: ["Contenido con tu marca", "Red de respaldo", "Reporte cada mes"],
    cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, tengo una oficina inmobiliaria y quiero agendar una reunión." },
    seo: "Material, pauta y marca para oficinas inmobiliarias de la Sabana: tú eliges qué inmuebles potenciar.",
  },
  {
    id: "constructoras",
    yo: "Soy constructora",
    titular: "El lanzamiento empieza",
    resalta: "en el plano.",
    bajada: "Del lote en 3D a la sala de ventas: el proyecto empieza a venderse antes de la primera piedra.",
    cambios: [
      ["Renders que no cuentan el proyecto", "Lote, entorno y torre en 3D"],
      ["Preventa lenta", "Campaña de preventa desde el primer día"],
      ["Vendedores sueltos, mensajes distintos", "Un solo equipo y un solo mensaje"],
      ["No saber qué busca el comprador", "Sabemos lo que necesita ver: también somos inmobiliaria"],
    ],
    pasos: [
      ["Conocemos el proyecto", "Lote, producto, precios y público."],
      ["Lo animamos", "Lote, entorno y torre en 3D."],
      ["Lanzamos la preventa", "Campaña enfocada en conversaciones con compradores."],
      ["Acompañamos la sala de ventas", "Material para la sala, los aliados y la pauta."],
    ],
    marcas: [
      { marca: "marketing", texto: "Lanzamiento completo: 3D, campaña de preventa y material de sala de ventas.", href: "/marketing", boton: "Conoce Marketing" },
      { marca: "inmobiliaria", texto: "También somos inmobiliaria: sabemos lo que un comprador necesita ver.", href: "/inmobiliaria", boton: "Conoce la Inmobiliaria" },
    ],
    promesas: ["Lote y torre en 3D", "Preventa desde el plano", "Un solo equipo"],
    cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, soy de una constructora y quiero agendar una reunión sobre un proyecto." },
    seo: "Lanzamiento de proyectos inmobiliarios desde el plano: 3D, preventa y sala de ventas, con KYRELO.",
  },
];

export const buscarPerfil = (id: string) => PERFILES.find((p) => p.id === id);
