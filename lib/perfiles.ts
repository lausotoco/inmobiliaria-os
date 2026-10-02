/* ============================================================
   KYRELO — Perfiles de cliente (/para/[perfil])
   Un perfil = una landing. Cada perfil tiene sus servicios, y cada
   servicio explica en SU pestaña cómo se gana o cómo se paga, así
   no se mezclan la Plataforma (nada por adelantado) y Marketing
   (plan mensual). Nunca se publican precios de Marketing: el
   armador solo maneja cantidades y se cotiza por mensaje.
   ============================================================ */

export type PerfilId = "compradores" | "propietarios" | "agentes" | "oficinas" | "constructoras";
export type MarcaId = "inmobiliaria" | "plataforma" | "marketing";

export type Pieza = { id: string; nombre: string; unidad: string; cantidad: number; min: number; max: number };

export type Servicio = {
  id: string;
  marca: MarcaId;
  nombre: string; // lo que se ve en la pestaña
  corto: string; // una línea debajo del nombre
  titulo: string;
  texto: string;
  recibes: string[];
  pasos: string[];
  modelo?: { titulo: string; texto: string };
  cta: { texto: string; href?: string; whatsapp?: string };
  vivo?: "requerimientos" | "inmuebles" | "catalogo"; // datos reales: requerimientos, inmuebles de KYRELO para agentes, catálogo para compradores
  vivoTitulo?: string;
  armador?: Pieza[]; // "arma tu plan" (solo cantidades)
};

export type Perfil = {
  id: PerfilId;
  yo: string; // cómo se nombra la persona, en primera persona
  quien: string; // "un agente", "una oficina"… (para el mensaje de WhatsApp)
  titular: string;
  resalta: string; // parte del titular en cursiva cobre
  bajada: string;
  necesidades: { texto: string; servicio: string }[];
  servicios: Servicio[];
  cambios: [string, string][]; // [antes, con KYRELO]
  promesas: string[];
  cta: { texto: string; href?: string; whatsapp?: string };
  seo: string;
};

export const PERFILES: Perfil[] = [
  /* ─────────────── Compradores ─────────────── */
  {
    id: "compradores",
    yo: "Quiero comprar vivienda",
    quien: "un comprador",
    titular: "Dinos qué casa buscas.",
    resalta: "Te mostramos solo las que te sirven.",
    bajada: "Sin recorrer portales y sin costo para ti, en Chía, Cajicá, Cota, Sopó y Bogotá norte. Elige cómo quieres que te ayudemos:",
    necesidades: [
      { texto: "Quiero que me busquen inmuebles a mi medida, sin costo", servicio: "busqueda" },
      { texto: "Quiero ver los inmuebles que ya tienen", servicio: "inventario" },
    ],
    servicios: [
      {
        id: "busqueda",
        marca: "inmobiliaria",
        nombre: "Buscamos por ti",
        corto: "Te mandamos una selección a tu medida, sin costo",
        titulo: "Te buscamos el inmueble que necesitas.",
        texto: "Nos cuentas qué buscas y con qué presupuesto. Buscamos entre nuestros inmuebles y los de agentes y oficinas de confianza, y te mandamos solo los que encajan contigo. Tus datos no se publican.",
        recibes: ["Una selección hecha para ti", "Precios actualizados", "Papeles revisados antes de visitar", "Te acompañamos a las visitas", "Te ayudamos con banco, promesa y notaría"],
        pasos: ["Nos cuentas qué buscas", "Confirmamos lo que necesitas", "Te mandamos una selección", "Visitas las que te gustan", "Te acompañamos hasta firmar"],
        modelo: { titulo: "¿Cuánto te cuesta?", texto: "Nada. Al vendedor le cobramos cuando se cierra el negocio." },
        cta: { texto: "Contarles qué busco", href: "/casas/sabana-norte" },
      },
      {
        id: "inventario",
        marca: "inmobiliaria",
        nombre: "Inmuebles disponibles",
        corto: "Mira los que ya tenemos revisados",
        titulo: "Mira los inmuebles que tenemos disponibles.",
        texto: "Son inmuebles que ya revisamos: sabemos el precio real, el estado de los papeles y todos los datos. Si alguno te gusta, agendamos la visita.",
        recibes: ["Todos los datos de cada inmueble", "Precio real", "Papeles revisados", "Visita con cita"],
        pasos: ["Miras los inmuebles", "Nos escribes por el que te gusta", "Agendamos la visita", "Te acompañamos hasta firmar"],
        modelo: { titulo: "¿Cuánto te cuesta?", texto: "Nada. Acompañarte no tiene costo para ti." },
        cta: { texto: "Ver todos los inmuebles", href: "/inmuebles" },
        vivo: "catalogo",
        vivoTitulo: "Disponibles hoy",
      },
    ],
    cambios: [
      ["Ver cientos de anuncios repetidos", "Ver solo los que te sirven"],
      ["Encontrar precios viejos", "Ver el precio real"],
      ["Ir a visitas que no valen la pena", "Visitar solo lo que encaja contigo"],
      ["Descubrir problemas en los papeles al final", "Papeles revisados desde el principio"],
    ],
    promesas: ["Sin costo para ti", "Tus datos no se publican", "Precios y papeles revisados"],
    cta: { texto: "Contarles qué busco", href: "/casas/sabana-norte" },
    seo: "Dinos qué vivienda buscas en la Sabana y te mostramos solo las que te sirven. Sin costo para ti.",
  },

  /* ─────────────── Propietarios ─────────────── */
  {
    id: "propietarios",
    yo: "Quiero vender o arrendar mi inmueble",
    quien: "un propietario",
    titular: "Vende o arrienda tu inmueble",
    resalta: "sin perder tiempo con curiosos.",
    bajada: "Ya conocemos personas que buscan inmuebles como el tuyo en la Sabana, y solo te visitan quienes de verdad pueden comprar. Elige qué quieres hacer:",
    necesidades: [
      { texto: "Quiero vender mi inmueble", servicio: "venta" },
      { texto: "Quiero arrendar mi inmueble", servicio: "arriendo" },
    ],
    servicios: [
      {
        id: "venta",
        marca: "inmobiliaria",
        nombre: "Vender",
        corto: "A personas que ya buscan un inmueble así",
        titulo: "Vende tu inmueble a quien ya está buscando uno así.",
        texto: "Antes de publicar tu inmueble ya conocemos a personas que buscan algo como lo tuyo y que tienen el dinero o el crédito para comprar. Nosotros hacemos las fotos y el video, mostramos el inmueble y hacemos los trámites.",
        recibes: ["Te ayudamos a definir un buen precio", "Fotos, video y ficha profesionales", "Solo visitas de compradores serios", "Nos encargamos de promesa, banco y notaría"],
        pasos: ["Hablamos de tu inmueble", "Revisamos el precio y los papeles", "Hacemos fotos, video y ficha", "Lo mostramos a compradores serios", "Te acompañamos hasta firmar"],
        modelo: { titulo: "¿Cuándo pagas?", texto: "Solo cuando se vende. Te explicamos la comisión en la primera conversación." },
        cta: { texto: "Quiero vender mi inmueble", whatsapp: "Hola KYRELO, quiero vender mi inmueble." },
        vivo: "requerimientos",
        vivoTitulo: "Personas buscando comprar hoy",
      },
      {
        id: "arriendo",
        marca: "inmobiliaria",
        nombre: "Arrendar",
        corto: "Te conseguimos a quién arrendarle",
        titulo: "Te conseguimos a quién arrendarle.",
        texto: "Preparamos tu inmueble para mostrarlo, buscamos interesados y solo te traemos a los que cumplen. Nosotros conseguimos el arrendatario; la administración del arriendo sigue siendo tuya.",
        recibes: ["Fotos y ficha del inmueble", "Solo interesados que cumplen", "Visitas con cita", "Te acompañamos hasta la firma"],
        pasos: ["Hablamos de tu inmueble", "Hacemos fotos y ficha", "Filtramos a los interesados", "Firmas el contrato"],
        modelo: { titulo: "¿Cuándo pagas?", texto: "Solo cuando se firma el contrato. Te explicamos la comisión en la primera conversación." },
        cta: { texto: "Quiero arrendar mi inmueble", whatsapp: "Hola KYRELO, quiero arrendar mi inmueble." },
      },
    ],
    cambios: [
      ["Te visitan curiosos", "Solo te visitan compradores serios"],
      ["Fotos que no muestran bien el inmueble", "Fotos y video profesionales"],
      ["Publicar en muchos portales y esperar", "Personas que ya están buscando"],
      ["Hacer los trámites solo", "Te acompañamos en todos los trámites"],
    ],
    promesas: ["Compradores serios", "Fotos y video profesionales", "Trámites acompañados"],
    cta: { texto: "Quiero vender o arrendar", whatsapp: "Hola KYRELO, quiero vender o arrendar mi inmueble." },
    seo: "Vende o arrienda tu inmueble en la Sabana sin perder tiempo con curiosos: solo te visitan compradores serios.",
  },

  /* ─────────────── Agentes ─────────────── */
  {
    id: "agentes",
    yo: "Soy agente inmobiliario independiente",
    quien: "un agente inmobiliario",
    titular: "Te traemos compradores",
    resalta: "y te ayudamos a vender.",
    bajada: "Puedes trabajar con KYRELO de tres formas. Elige la que necesitas hoy:",
    necesidades: [
      { texto: "Tengo inmuebles y quiero ver quién está buscando", servicio: "requerimientos" },
      { texto: "Tengo un comprador pero no tengo el inmueble", servicio: "captados" },
      { texto: "Quiero vender mis inmuebles más rápido con videos y publicidad", servicio: "marketing" },
    ],
    servicios: [
      {
        id: "requerimientos",
        marca: "plataforma",
        nombre: "Ver compradores",
        corto: "Te mostramos quién está buscando y tú ofreces tus inmuebles",
        titulo: "Mira quién está buscando inmueble hoy.",
        texto: "Publicamos lo que buscan nuestros compradores: zona, tipo de inmueble, presupuesto y para cuándo. Ya hablamos con cada uno y confirmamos que puede comprar. Si tienes un inmueble que le sirve, nos lo envías.",
        recibes: ["Compradores con dinero o crédito confirmado", "Zona, presupuesto y plazo de cada uno", "Te acompañamos en la visita", "Te ayudamos con promesa, banco y notaría"],
        pasos: ["Miras los compradores, sin crear cuenta", "Si tienes algo que le sirve, te registras", "Nos envías tu inmueble", "Lo mostramos y te acompañamos hasta firmar"],
        modelo: { titulo: "¿Cuánto ganas?", texto: "Registrarte es gratis. Si se vende, te quedas con el 40% de la comisión en tus primeras tres ventas y con la mitad desde la cuarta." },
        cta: { texto: "Ver compradores", href: "/plataforma" },
        vivo: "requerimientos",
        vivoTitulo: "Compradores buscando hoy",
      },
      {
        id: "captados",
        marca: "plataforma",
        nombre: "Vender inmuebles de KYRELO",
        corto: "Ofrece nuestros inmuebles a tu comprador y ganas la mitad",
        titulo: "Vende los inmuebles que nosotros ya tenemos.",
        texto: "Tenemos inmuebles listos para vender, con autorización del dueño y con fotos, video y ficha hechos. Si tienes un comprador para alguno, lo vendes con nosotros y la comisión se divide por mitades.",
        recibes: ["Inmuebles con autorización del dueño", "Fotos, video y ficha listos", "Comisión clara desde el principio", "Sin exclusividad"],
        pasos: ["Miras los inmuebles, sin crear cuenta", "Nos dices cuál le sirve a tu comprador", "Te damos fotos, video y ficha", "Visitas y cierras con nosotros"],
        modelo: { titulo: "¿Cuánto ganas?", texto: "La mitad de la comisión cuando se vende. No tienes que salir a buscar inmuebles ni pagar nada antes." },
        cta: { texto: "Ver inmuebles disponibles", href: "/plataforma" },
        vivo: "inmuebles",
        vivoTitulo: "Inmuebles disponibles para vender",
      },
      {
        id: "marketing",
        marca: "marketing",
        nombre: "Videos y publicidad",
        corto: "Editamos tus videos y movemos tus inmuebles en redes",
        titulo: "Vende tus inmuebles más rápido con videos y publicidad.",
        texto: "Tú grabas con tu celular. Nosotros editamos los videos, hacemos recorridos animados y movemos tus inmuebles con publicidad en redes, para que más personas los vean y te escriban.",
        recibes: ["Videos cortos editados (reels)", "Recorridos animados", "Piezas para publicidad en redes", "Un ajuste por cada pieza"],
        pasos: ["Nos dices qué inmuebles quieres mover", "Armamos el plan del mes", "Tú grabas, nosotros editamos", "Te entregamos todo listo para publicar"],
        modelo: { titulo: "¿Cómo se paga?", texto: "Es un servicio aparte que se paga cada mes. Arma tu plan aquí abajo y te enviamos el precio por WhatsApp." },
        cta: { texto: "Pedir el precio", whatsapp: "" },
        armador: [
          { id: "reels", nombre: "Videos cortos (reels)", unidad: "videos", cantidad: 4, min: 1, max: 20 },
          { id: "3d", nombre: "Recorridos animados", unidad: "recorridos", cantidad: 1, min: 0, max: 6 },
          { id: "pauta", nombre: "Piezas para publicidad", unidad: "piezas", cantidad: 1, min: 0, max: 10 },
        ],
      },
    ],
    cambios: [
      ["Buscar clientes todos los días", "Compradores que ya están buscando"],
      ["Salir a buscar inmuebles para vender", "Inmuebles listos para vender"],
      ["Videos hechos a la carrera", "Videos y recorridos profesionales"],
      ["Hacer los trámites solo", "Te acompañamos en los trámites"],
    ],
    promesas: ["Compradores revisados", "Sin exclusividad", "Tus propios clientes siguen siendo tuyos"],
    cta: { texto: "Ver compradores", href: "/plataforma" },
    seo: "Compradores que ya revisamos, inmuebles listos para vender y videos para tus inmuebles: KYRELO para agentes inmobiliarios de la Sabana.",
  },

  /* ─────────────── Oficinas ─────────────── */
  {
    id: "oficinas",
    yo: "Soy una oficina inmobiliaria",
    quien: "una oficina inmobiliaria",
    titular: "Ayudamos a tu oficina",
    resalta: "a vender más rápido.",
    bajada: "Trabajamos con oficinas de tres formas. Elige la que necesitas hoy:",
    necesidades: [
      { texto: "Tengo inmuebles que no se mueven", servicio: "marketing" },
      { texto: "Me escriben personas que no encajan con mis inmuebles", servicio: "respaldo" },
      { texto: "Quiero compradores para mis inmuebles", servicio: "requerimientos" },
    ],
    servicios: [
      {
        id: "marketing",
        marca: "marketing",
        nombre: "Videos, publicidad e imagen",
        corto: "Para los inmuebles que elijas y la marca de tu oficina",
        titulo: "Tú eliges qué inmuebles impulsar. Nosotros hacemos el resto.",
        texto: "Cada mes escoges los inmuebles que quieres vender primero. Hacemos sus videos con lo que graba tu equipo, manejamos la publicidad en redes y cuidamos la imagen de tu oficina.",
        recibes: ["Videos cortos de los inmuebles que elijas", "Recorridos en 3D", "Contenido de tu equipo y tus ventas", "Publicidad en redes", "Todo con el logo y los colores de tu oficina", "Informe de resultados cada mes"],
        pasos: ["Nos reunimos 20 minutos", "Eliges qué inmuebles impulsar", "Tu equipo graba, nosotros editamos", "Publicamos y te mostramos los resultados"],
        modelo: { titulo: "¿Cómo se paga?", texto: "Un plan mensual según lo que necesites. Arma tu plan aquí abajo y te enviamos el precio por WhatsApp." },
        cta: { texto: "Pedir el precio", whatsapp: "" },
        armador: [
          { id: "reels", nombre: "Videos cortos (reels)", unidad: "videos", cantidad: 10, min: 2, max: 40 },
          { id: "3d", nombre: "Recorridos en 3D", unidad: "recorridos", cantidad: 2, min: 0, max: 10 },
          { id: "marca", nombre: "Contenido de tu oficina", unidad: "piezas", cantidad: 4, min: 0, max: 20 },
          { id: "pauta", nombre: "Campañas de publicidad", unidad: "campañas", cantidad: 1, min: 0, max: 5 },
        ],
      },
      {
        id: "respaldo",
        marca: "marketing",
        nombre: "Red de respaldo",
        corto: "Si no tienes lo que piden, no pierdes al interesado",
        titulo: "No pierdas a nadie que te escribe.",
        texto: "Si a tu oficina le escribe alguien por la publicidad y no tienes lo que busca, con tu permiso y el de esa persona se lo pasamos a la red de KYRELO. Si termina comprando, tu oficina también gana.",
        recibes: ["Tus interesados siguen siendo tuyos primero", "Solo pasan a la red con tu permiso por escrito", "La persona también autoriza el uso de sus datos", "Si se vende, recibes tu parte"],
        pasos: ["Alguien escribe por tu publicidad", "Tu equipo lo atiende", "Si no tienes lo que busca, nos lo pasas con permiso", "Le buscamos el inmueble", "Si compra, tu oficina gana"],
        modelo: { titulo: "¿Cuánto ganas?", texto: "Si se vende, tu oficina recibe el 20% de la comisión por haberlo referido. Es un beneficio para las oficinas que tienen el servicio de videos y publicidad." },
        cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, tengo una oficina inmobiliaria y quiero saber más de la Red de respaldo." },
      },
      {
        id: "requerimientos",
        marca: "plataforma",
        nombre: "Ver compradores",
        corto: "Personas que ya revisamos, para tus inmuebles",
        titulo: "Compradores para los inmuebles de tu oficina.",
        texto: "Tu equipo puede ver lo que buscan nuestros compradores y enviarnos los inmuebles de la oficina que les sirven.",
        recibes: ["Compradores con dinero o crédito confirmado", "Zona, presupuesto y plazo de cada uno", "Cada asesor puede enviar inmuebles", "Visitas y trámites acompañados"],
        pasos: ["Tu equipo mira los compradores", "Envía los inmuebles que les sirven", "Te acompañamos en la visita", "Cerramos juntos"],
        modelo: { titulo: "¿Cuánto ganan?", texto: "Registrarse es gratis. Si se vende, la comisión se divide por mitades. No se paga nada antes." },
        cta: { texto: "Ver compradores", href: "/plataforma" },
        vivo: "requerimientos",
        vivoTitulo: "Compradores buscando hoy",
      },
    ],
    cambios: [
      ["Inmuebles quietos por meses", "Eliges cuáles impulsar cada mes"],
      ["Cada asesor publica a su manera", "Una imagen de oficina clara"],
      ["Interesados que se pierden", "Interesados que no se pierden"],
      ["Publicidad sin saber si funciona", "Informe de resultados cada mes"],
    ],
    promesas: ["Con la imagen de tu oficina", "No pierdes interesados", "Resultados cada mes"],
    cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, tengo una oficina inmobiliaria y quiero agendar una reunión." },
    seo: "Videos, publicidad e imagen para oficinas inmobiliarias de la Sabana: tú eliges qué inmuebles impulsar.",
  },

  /* ─────────────── Constructoras ─────────────── */
  {
    id: "constructoras",
    yo: "Soy constructora",
    quien: "una constructora",
    titular: "Empieza a vender tu proyecto",
    resalta: "desde el plano.",
    bajada: "Mostramos tu proyecto en 3D antes de construirlo y lanzamos la preventa en redes. Te acompañamos de tres formas:",
    necesidades: [
      { texto: "Voy a lanzar un proyecto", servicio: "lanzamiento" },
      { texto: "Necesito material para la sala de ventas", servicio: "sala" },
      { texto: "¿Por qué KYRELO y no vendedores sueltos?", servicio: "porque" },
    ],
    servicios: [
      {
        id: "lanzamiento",
        marca: "marketing",
        nombre: "Lanzamiento",
        corto: "3D, videos y publicidad de preventa",
        titulo: "Mostramos tu proyecto antes de que exista.",
        texto: "Hacemos animaciones en 3D del lote, el entorno y la torre, videos del proyecto y la publicidad de preventa para que te escriban personas interesadas.",
        recibes: ["Animaciones 3D del lote, el entorno y la torre", "Videos cortos del proyecto", "Piezas para la campaña", "Publicidad de preventa", "Informe de resultados cada mes"],
        pasos: ["Conocemos tu proyecto", "Lo animamos en 3D", "Lanzamos la preventa en redes", "Te mostramos los resultados cada mes"],
        modelo: { titulo: "¿Cómo se paga?", texto: "Un plan mensual o por lanzamiento, según tu proyecto. Arma tu plan aquí abajo y te enviamos el precio por WhatsApp." },
        cta: { texto: "Pedir el precio", whatsapp: "" },
        armador: [
          { id: "3d", nombre: "Animaciones en 3D", unidad: "animaciones", cantidad: 2, min: 1, max: 8 },
          { id: "reels", nombre: "Videos cortos (reels)", unidad: "videos", cantidad: 6, min: 2, max: 30 },
          { id: "campana", nombre: "Piezas para la campaña", unidad: "piezas", cantidad: 8, min: 2, max: 30 },
          { id: "pauta", nombre: "Campañas de publicidad", unidad: "campañas", cantidad: 1, min: 0, max: 4 },
        ],
      },
      {
        id: "sala",
        marca: "marketing",
        nombre: "Sala de ventas",
        corto: "El mismo material en la sala, en redes y con los aliados",
        titulo: "Todos cuentan tu proyecto de la misma forma.",
        texto: "Hacemos el material para la sala de ventas, para la publicidad y para los agentes que venden tu proyecto. Así el comprador recibe la misma información en todas partes.",
        recibes: ["Material para la sala de ventas", "Material para agentes y aliados", "Fichas y recorridos", "Contenido del avance de obra"],
        pasos: ["Definimos cómo contar tu proyecto", "Hacemos el material de la sala", "Lo compartimos con agentes y en redes", "Lo actualizamos con el avance de obra"],
        modelo: { titulo: "¿Cómo se paga?", texto: "Va dentro del plan de tu proyecto. Lo armamos contigo en la reunión." },
        cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, soy de una constructora y necesito material para la sala de ventas." },
      },
      {
        id: "porque",
        marca: "inmobiliaria",
        nombre: "Por qué KYRELO",
        corto: "También somos inmobiliaria",
        titulo: "Sabemos qué quiere ver un comprador.",
        texto: "KYRELO también es inmobiliaria: hablamos todos los días con compradores de la Sabana. Por eso sabemos qué preguntan antes de visitar y lo mostramos en tu material.",
        recibes: ["Un solo equipo en vez de varios vendedores", "El mismo mensaje en todas partes", "Experiencia con compradores de la zona", "Resultados claros cada mes"],
        pasos: ["Conocemos al comprador de la zona", "Lo convertimos en material", "Un solo equipo lo hace todo", "Medimos los resultados cada mes"],
        cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, soy de una constructora y quiero agendar una reunión sobre un proyecto." },
      },
    ],
    cambios: [
      ["Imágenes que no muestran bien el proyecto", "Lote, entorno y torre en 3D"],
      ["Preventa que avanza lento", "Publicidad desde el primer día"],
      ["Cada vendedor dice algo distinto", "Un solo equipo y un solo mensaje"],
      ["No saber qué busca el comprador", "Sabemos qué busca: también somos inmobiliaria"],
    ],
    promesas: ["Tu proyecto en 3D", "Preventa desde el plano", "Un solo equipo"],
    cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, soy de una constructora y quiero agendar una reunión sobre un proyecto." },
    seo: "Empieza a vender tu proyecto desde el plano: 3D, videos y publicidad de preventa con KYRELO.",
  },
];

export const buscarPerfil = (id: string) => PERFILES.find((p) => p.id === id);
