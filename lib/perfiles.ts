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
    titular: "Dinos qué buscas.",
    resalta: "Nosotros encontramos el inmueble.",
    bajada: "Dejas de recorrer portales y visitas solo lo que sí te sirve, en Chía, Cajicá, Cota, Sopó y Bogotá norte.",
    necesidades: [
      { texto: "Ya sé qué estoy buscando", servicio: "busqueda" },
      { texto: "Quiero ver qué hay disponible", servicio: "inventario" },
    ],
    servicios: [
      {
        id: "busqueda",
        marca: "inmobiliaria",
        nombre: "Búsqueda a tu medida",
        corto: "Te buscamos el inmueble",
        titulo: "Nos dices qué buscas; nosotros lo encontramos.",
        texto: "Confirmamos tu búsqueda y buscamos en nuestro inventario y en la red de agentes y oficinas aliadas de la Sabana. Tus datos nunca se publican.",
        recibes: [
          "Una selección privada, hasta en 3 rondas",
          "Solo inmuebles disponibles y con el precio de hoy",
          "Certificado de tradición revisado antes de visitar",
          "Acompañamiento en la visita",
          "Promesa, banco y notaría con nosotros",
        ],
        pasos: ["Nos cuentas qué buscas en 60 segundos", "Confirmamos tu búsqueda", "Recibes tu selección privada", "Visitas lo que te sirve", "Te acompañamos hasta la escritura"],
        modelo: { titulo: "Cuánto te cuesta", texto: "Nada. Nuestros honorarios los paga la parte vendedora el día del cierre." },
        cta: { texto: "Contarles qué busco", href: "/casas/sabana-norte" },
      },
      {
        id: "inventario",
        marca: "inmobiliaria",
        nombre: "Inmuebles disponibles",
        corto: "Captados y revisados por KYRELO",
        titulo: "Inmuebles captados y revisados por KYRELO.",
        texto: "Una selección con la información que importa: áreas, administración, parqueaderos y papeles revisados. Si alguno te interesa, agendamos la visita.",
        recibes: ["Información completa de cada inmueble", "El precio de hoy", "Visita con cita", "Certificado de tradición disponible"],
        pasos: ["Miras los inmuebles", "Nos escribes por el que te interesa", "Agendamos la visita", "Te acompañamos hasta el cierre"],
        modelo: { titulo: "Cuánto te cuesta", texto: "Nada. Acompañarte no tiene costo para ti." },
        cta: { texto: "Ver todos los inmuebles", href: "/inmuebles" },
        vivo: "catalogo",
        vivoTitulo: "Disponibles hoy",
      },
    ],
    cambios: [
      ["Cientos de anuncios repetidos", "Una selección hecha para ti"],
      ["Precios que ya no son", "El precio de hoy, confirmado"],
      ["Visitas que no sirven", "Solo visitas lo que encaja"],
      ["Papeles que aparecen tarde", "Certificado de tradición revisado antes"],
    ],
    promesas: ["Sin costo para ti", "Tus datos nunca se publican", "Precio y papeles revisados"],
    cta: { texto: "Contarles qué busco", href: "/casas/sabana-norte" },
    seo: "Dinos qué vivienda buscas en la Sabana y KYRELO encuentra el inmueble. Sin costo para el comprador.",
  },

  /* ─────────────── Propietarios ─────────────── */
  {
    id: "propietarios",
    yo: "Quiero vender o arrendar mi inmueble",
    quien: "un propietario",
    titular: "Tu inmueble, frente a compradores",
    resalta: "que ya conocemos.",
    bajada: "Vende o arrienda vivienda premium en la Sabana sin pasear curiosos.",
    necesidades: [
      { texto: "Quiero vender", servicio: "venta" },
      { texto: "Quiero arrendar", servicio: "arriendo" },
    ],
    servicios: [
      {
        id: "venta",
        marca: "inmobiliaria",
        nombre: "Vender",
        corto: "Con compradores verificados",
        titulo: "Vende frente a compradores que ya conocemos.",
        texto: "Antes de publicar, KYRELO ya tiene compradores verificados buscando. Tu inmueble llega a quien busca algo así, con el material que merece.",
        recibes: [
          "Revisión del precio de mercado y de los papeles",
          "Fotos, video, ficha y textos de venta",
          "Presentación a compradores verificados",
          "Visitas solo con quienes pueden comprar",
          "Promesa, banco, notaría y escrituración",
        ],
        pasos: ["Hablamos de tu inmueble", "Revisamos precio y papeles", "Producimos su material", "Lo presentamos a compradores verificados", "Cerramos contigo"],
        modelo: { titulo: "Cuándo pagas", texto: "Solo cuando se escritura. La comisión de corretaje te la explicamos en la primera conversación." },
        cta: { texto: "Quiero vender mi inmueble", whatsapp: "Hola KYRELO, quiero vender mi inmueble." },
        vivo: "requerimientos",
        vivoTitulo: "Compradores verificados buscando hoy",
      },
      {
        id: "arriendo",
        marca: "inmobiliaria",
        nombre: "Arrendar",
        corto: "Te conseguimos el arrendatario",
        titulo: "Arrienda a quien sí puede cumplir.",
        texto: "Te conseguimos el arrendatario para tu inmueble. Solo hacemos el corretaje: no administramos el arriendo ni recibimos dineros de terceros.",
        recibes: ["Material del inmueble", "Interesados filtrados antes de visitar", "Visitas con cita", "Acompañamiento hasta la firma del contrato"],
        pasos: ["Hablamos de tu inmueble", "Producimos su material", "Filtramos a los interesados", "Firmas el contrato"],
        modelo: { titulo: "Cuándo pagas", texto: "Solo cuando se firma el contrato. Te explicamos la comisión en la primera conversación." },
        cta: { texto: "Quiero arrendar mi inmueble", whatsapp: "Hola KYRELO, quiero arrendar mi inmueble." },
      },
    ],
    cambios: [
      ["Llegan curiosos a ver la casa", "Solo visitan quienes pueden comprar"],
      ["Fotos que no muestran cómo se vive", "Material de venta profesional"],
      ["Publicado en cinco portales, sin resultados", "Compradores verificados esperando"],
      ["Papeleo eterno", "Promesa, banco y notaría con nosotros"],
    ],
    promesas: ["Compradores verificados", "Material profesional", "Acompañamiento hasta la escritura"],
    cta: { texto: "Quiero vender o arrendar", whatsapp: "Hola KYRELO, quiero vender o arrendar mi inmueble." },
    seo: "Vende o arrienda tu vivienda en la Sabana frente a compradores verificados, con material profesional y acompañamiento hasta la escritura.",
  },

  /* ─────────────── Agentes ─────────────── */
  {
    id: "agentes",
    yo: "Soy agente inmobiliario independiente",
    quien: "un agente inmobiliario",
    titular: "Compradores reales para tu inventario.",
    resalta: "Material que te hace vender.",
    bajada: "Tres formas de trabajar con KYRELO: ver compradores verificados, vender los inmuebles que ya captamos y presentar mejor los tuyos.",
    necesidades: [
      { texto: "Tengo inmuebles captados y busco compradores", servicio: "requerimientos" },
      { texto: "Tengo un comprador y no tengo el inmueble", servicio: "captados" },
      { texto: "Quiero que mis inmuebles se vean mejor", servicio: "marketing" },
    ],
    servicios: [
      {
        id: "requerimientos",
        marca: "plataforma",
        nombre: "Requerimientos de compradores",
        corto: "Compradores verificados buscando",
        titulo: "Compradores verificados que ya están buscando.",
        texto: "Cada requerimiento es un comprador real con presupuesto, forma de pago, zona y plazo confirmados. Los ves sin cuenta; si tienes un inmueble que encaja, lo postulas.",
        recibes: [
          "Requerimientos sin datos personales del comprador",
          "Presupuesto, zona, tipo de inmueble y plazo",
          "Postulación con el enlace a tus fotos",
          "Visita acompañada por KYRELO",
          "Promesa, banco, notaría y escrituración acompañados",
        ],
        pasos: ["Ves los requerimientos, sin cuenta", "Si tienes algo que encaja, te registras y postulas", "Presentamos tu inmueble al comprador", "Visita acompañada y cierre"],
        modelo: { titulo: "Cómo ganas", texto: "Registro gratis y sin exclusividad. Ganas al cierre: 40% de la comisión en tus tres primeros cierres y 50/50 desde el cuarto." },
        cta: { texto: "Ver requerimientos", href: "/plataforma" },
        vivo: "requerimientos",
        vivoTitulo: "Requerimientos activos",
      },
      {
        id: "captados",
        marca: "plataforma",
        nombre: "Inmuebles captados por KYRELO",
        corto: "Vende lo que ya captamos",
        titulo: "¿Tienes el comprador? Nosotros tenemos el inmueble.",
        texto: "Inmuebles con mandato firmado y el material de venta listo. Tú traes al comprador; KYRELO pone el inmueble, el material y el papeleo.",
        recibes: ["Inmuebles con mandato firmado", "Fotos, video, ficha técnica y textos de venta listos", "Comisión publicada: no se negocia caso por caso", "Sin exclusividad ni cuota"],
        pasos: ["Miras los inmuebles disponibles, sin cuenta", "Solicitas la asociación", "Recibes el kit de venta", "Visita, promesa y escritura con KYRELO"],
        modelo: { titulo: "Cómo ganas", texto: "Reparto 50/50 de la comisión al cierre. No sales a captar y no pagas nada por adelantado." },
        cta: { texto: "Ver inmuebles disponibles", href: "/plataforma" },
        vivo: "inmuebles",
        vivoTitulo: "Inmuebles de KYRELO disponibles",
      },
      {
        id: "marketing",
        marca: "marketing",
        nombre: "Marketing para tus captados",
        corto: "Reels, recorridos y pauta",
        titulo: "Tus inmuebles, presentados como se venden.",
        texto: "Grabas con tu celular; KYRELO edita, anima y prepara la pauta de los inmuebles que captas. Los que más venden no saben más de ventas: presentan mejor.",
        recibes: ["Reels editados con tus videos", "Recorridos o planos animados", "Piezas listas para pauta", "Una ronda de ajustes por pieza"],
        pasos: ["Nos cuentas qué inmuebles quieres mover", "Armamos el plan del mes", "Grabas; nosotros producimos", "Entrega lista para publicar y pautar"],
        modelo: { titulo: "Cómo funciona", texto: "Es un servicio aparte, con plan mensual a la medida de tus inmuebles. Ármalo aquí y te lo cotizamos por mensaje." },
        cta: { texto: "Cotizar mi plan", whatsapp: "" },
        armador: [
          { id: "reels", nombre: "Reels editados", unidad: "reels", cantidad: 4, min: 1, max: 20 },
          { id: "3d", nombre: "Recorridos animados", unidad: "recorridos", cantidad: 1, min: 0, max: 6 },
          { id: "pauta", nombre: "Piezas para pauta", unidad: "piezas", cantidad: 1, min: 0, max: 10 },
        ],
      },
    ],
    cambios: [
      ["Prospectar sin parar", "Compradores que ya están buscando"],
      ["Salir a captar para tener qué vender", "Inmuebles captados, listos para vender"],
      ["Material improvisado", "Reels y recorridos con tus videos"],
      ["El papeleo solo", "Promesa, banco y notaría acompañados"],
    ],
    promesas: ["Compradores verificados", "Sin exclusividad", "Tu cartera sigue siendo tuya"],
    cta: { texto: "Ver requerimientos", href: "/plataforma" },
    seo: "Compradores verificados, inmuebles captados listos para vender y material que vende: KYRELO para agentes inmobiliarios de la Sabana.",
  },

  /* ─────────────── Oficinas ─────────────── */
  {
    id: "oficinas",
    yo: "Soy una oficina inmobiliaria",
    quien: "una oficina inmobiliaria",
    titular: "Tú eliges qué inmuebles potenciar.",
    resalta: "Nosotros los presentamos mejor.",
    bajada: "Marketing para tu inventario y tu marca, una red de respaldo para tus interesados y compradores verificados para tus inmuebles.",
    necesidades: [
      { texto: "Tengo inventario quieto hace meses", servicio: "marketing" },
      { texto: "Me llegan interesados que no encajan", servicio: "respaldo" },
      { texto: "Quiero compradores para mis inmuebles", servicio: "requerimientos" },
    ],
    servicios: [
      {
        id: "marketing",
        marca: "marketing",
        nombre: "Marketing de oficina",
        corto: "Material, pauta y marca",
        titulo: "Tú eliges qué inmuebles potenciar.",
        texto: "Cada mes eliges los inmuebles que quieres mover. KYRELO produce su material con los videos de tu equipo, corre la pauta y trabaja la marca de tu oficina.",
        recibes: [
          "Reels editados de los inmuebles que elijas",
          "Recorridos en 3D",
          "Piezas de marca: equipo, día a día y cierres",
          "Campañas de pauta enfocadas en conversaciones",
          "Todo con la identidad de tu oficina",
          "Reporte mensual de alcance y conversaciones",
        ],
        pasos: ["Reunión de 20 minutos", "Eliges qué potenciar y armamos el plan", "Tu equipo graba; nosotros producimos", "Pauta, conversaciones y reporte"],
        modelo: { titulo: "Cómo funciona", texto: "Plan mensual a la medida de tu inventario. Ármalo aquí y te lo cotizamos por mensaje." },
        cta: { texto: "Cotizar mi plan", whatsapp: "" },
        armador: [
          { id: "reels", nombre: "Reels de los inmuebles que elijas", unidad: "reels", cantidad: 10, min: 2, max: 40 },
          { id: "3d", nombre: "Recorridos en 3D", unidad: "recorridos", cantidad: 2, min: 0, max: 10 },
          { id: "marca", nombre: "Piezas de marca de la oficina", unidad: "piezas", cantidad: 4, min: 0, max: 20 },
          { id: "pauta", nombre: "Campañas de pauta", unidad: "campañas", cantidad: 1, min: 0, max: 5 },
        ],
      },
      {
        id: "respaldo",
        marca: "marketing",
        nombre: "Red de respaldo",
        corto: "Ningún interesado se pierde",
        titulo: "Ningún interesado de tu pauta se pierde.",
        texto: "Si alguien que escribe por tu pauta no encaja con tu inventario, con tu autorización y la del comprador pasa a la red de KYRELO. Si ese negocio se cierra, tu oficina gana como referidora.",
        recibes: [
          "Los interesados son de tu oficina primero",
          "Solo pasan a la red con tu autorización escrita",
          "El comprador autoriza el uso de sus datos",
          "Si se cierra, tu oficina recibe su parte como referidora",
        ],
        pasos: ["Llega un interesado por tu pauta", "Tu equipo lo atiende", "Si no encaja, pasa a la red con autorización", "KYRELO lo verifica y busca el inmueble", "Si se cierra, ganas como referidora"],
        modelo: { titulo: "Cómo ganas", texto: "Es un beneficio de ser cliente de KYRELO Marketing: si el negocio se cierra, tu oficina recibe el 20% de la comisión como referidora." },
        cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, tengo una oficina inmobiliaria y quiero saber más de la Red de respaldo." },
      },
      {
        id: "requerimientos",
        marca: "plataforma",
        nombre: "Compradores verificados",
        corto: "Para los inmuebles de tu oficina",
        titulo: "Compradores verificados para tu inventario.",
        texto: "Tus asesores ven los requerimientos de compradores verificados y postulan los inmuebles de la oficina que encajan.",
        recibes: ["Requerimientos sin datos personales del comprador", "Presupuesto, zona, tipo y plazo confirmados", "Postulación de cada asesor", "Visita acompañada y cierre con KYRELO"],
        pasos: ["Tu equipo ve los requerimientos", "Postula los inmuebles que encajan", "Visita acompañada", "Cierre"],
        modelo: { titulo: "Cómo ganan", texto: "Registro gratis. Reparto 50/50 de la comisión al cierre; nada por adelantado." },
        cta: { texto: "Ver requerimientos", href: "/plataforma" },
        vivo: "requerimientos",
        vivoTitulo: "Requerimientos activos",
      },
    ],
    cambios: [
      ["Inventario quieto hace meses", "Eliges qué potenciar cada mes"],
      ["Cada asesor publica a su manera", "Una marca de oficina clara y constante"],
      ["Interesados que no encajan", "Red de respaldo: no se pierden"],
      ["Pauta sin medición", "Reporte de alcance y conversaciones"],
    ],
    promesas: ["Contenido con tu marca", "Red de respaldo", "Reporte cada mes"],
    cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, tengo una oficina inmobiliaria y quiero agendar una reunión." },
    seo: "Material, pauta y marca para oficinas inmobiliarias de la Sabana: tú eliges qué inmuebles potenciar.",
  },

  /* ─────────────── Constructoras ─────────────── */
  {
    id: "constructoras",
    yo: "Soy constructora",
    quien: "una constructora",
    titular: "El lanzamiento empieza",
    resalta: "en el plano.",
    bajada: "Del lote en 3D a la sala de ventas: el proyecto empieza a venderse antes de la primera piedra.",
    necesidades: [
      { texto: "Voy a lanzar un proyecto", servicio: "lanzamiento" },
      { texto: "Necesito material para la sala de ventas", servicio: "sala" },
      { texto: "¿Por qué KYRELO y no vendedores sueltos?", servicio: "porque" },
    ],
    servicios: [
      {
        id: "lanzamiento",
        marca: "marketing",
        nombre: "Lanzamiento desde el plano",
        corto: "3D, reels y preventa",
        titulo: "El proyecto se vende desde el plano.",
        texto: "Animamos el lote, el entorno y la torre, y lanzamos la campaña de preventa enfocada en conversaciones con compradores.",
        recibes: ["Animaciones 3D del lote, el entorno y la torre", "Reels del proyecto", "Piezas de la campaña de lanzamiento", "Gestión de la pauta de preventa", "Reporte mensual de alcance y conversaciones"],
        pasos: ["Conocemos el proyecto: lote, producto y público", "Animamos el lote y la torre", "Lanzamos la preventa", "Medimos y ajustamos cada mes"],
        modelo: { titulo: "Cómo funciona", texto: "Plan mensual o por lanzamiento, a la medida del proyecto. Ármalo aquí y te lo cotizamos por mensaje." },
        cta: { texto: "Cotizar el lanzamiento", whatsapp: "" },
        armador: [
          { id: "3d", nombre: "Animaciones 3D: lote, entorno y torre", unidad: "animaciones", cantidad: 2, min: 1, max: 8 },
          { id: "reels", nombre: "Reels del proyecto", unidad: "reels", cantidad: 6, min: 2, max: 30 },
          { id: "campana", nombre: "Piezas de campaña", unidad: "piezas", cantidad: 8, min: 2, max: 30 },
          { id: "pauta", nombre: "Campañas de pauta", unidad: "campañas", cantidad: 1, min: 0, max: 4 },
        ],
      },
      {
        id: "sala",
        marca: "marketing",
        nombre: "Sala de ventas y aliados",
        corto: "Un solo mensaje en todas partes",
        titulo: "Un solo mensaje en la sala, la pauta y los aliados.",
        texto: "El mismo material para la sala de ventas, la pauta y los agentes y aliados que venden el proyecto. Así el comprador escucha lo mismo en todas partes.",
        recibes: ["Material para la sala de ventas", "Piezas para agentes y aliados", "Fichas y recorridos del producto", "Contenido del avance de obra"],
        pasos: ["Definimos el mensaje del proyecto", "Producimos el material de sala", "Lo entregamos a aliados y a la pauta", "Lo actualizamos con la obra"],
        modelo: { titulo: "Cómo funciona", texto: "Va dentro del plan del proyecto; lo armamos contigo en la reunión." },
        cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, soy de una constructora y necesito material para la sala de ventas." },
      },
      {
        id: "porque",
        marca: "inmobiliaria",
        nombre: "Por qué KYRELO",
        corto: "También somos inmobiliaria",
        titulo: "Sabemos lo que un comprador necesita ver.",
        texto: "KYRELO también es inmobiliaria: trabajamos todos los días con compradores de la Sabana. Por eso el material de tu proyecto responde lo que el comprador pregunta antes de visitar.",
        recibes: ["Un solo equipo en lugar de vendedores sueltos", "Un solo mensaje en todos los canales", "Experiencia con compradores verificados de la zona", "Reportes claros de alcance y conversaciones"],
        pasos: ["Conocemos al comprador de la Sabana", "Lo convertimos en material", "Un solo equipo lo ejecuta", "Medimos cada mes"],
        cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, soy de una constructora y quiero agendar una reunión sobre un proyecto." },
      },
    ],
    cambios: [
      ["Renders que no cuentan el proyecto", "Lote, entorno y torre en 3D"],
      ["Preventa lenta", "Campaña de preventa desde el primer día"],
      ["Vendedores sueltos, mensajes distintos", "Un solo equipo y un solo mensaje"],
      ["No saber qué busca el comprador", "Sabemos lo que necesita ver: también somos inmobiliaria"],
    ],
    promesas: ["Lote y torre en 3D", "Preventa desde el plano", "Un solo equipo"],
    cta: { texto: "Agenda una reunión", whatsapp: "Hola KYRELO, soy de una constructora y quiero agendar una reunión sobre un proyecto." },
    seo: "Lanzamiento de proyectos inmobiliarios desde el plano: 3D, preventa y sala de ventas, con KYRELO.",
  },
];

export const buscarPerfil = (id: string) => PERFILES.find((p) => p.id === id);
