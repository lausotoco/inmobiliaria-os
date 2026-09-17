// lib/acuerdos.ts
// Texto del acuerdo con agentes y datos de quien firma por KYRELO.
// Cuando exista la SAS: cambia FIRMANTE_KYRELO (marca, NIT, representante).

export const FIRMANTE_KYRELO = {
  marca: "KYRELO (Kyrelocorp)",
  nombre: "Laura Valentina Padilla Soto",
  documento: "",            // cédula o NIT; se puede escribir al generar cada acuerdo
  ciudad: "Chía, Cundinamarca",
};

export const REGLAS = {
  pctComision: 0.03,        // comisión total sobre el precio de venta
  mesesNoElusion: 12,       // protección del cliente referido
  mesesVigencia: 12,
  diasFacturacion: 10,
  pctPenal: 100,            // % de la comisión de KYRELO que se paga como pena
};

export type DatosAcuerdo = {
  tipo: "comprador_kyrelo" | "inmueble_kyrelo" | "alianza_general";
  agente_nombre: string;
  agente_documento?: string | null;
  agente_empresa?: string | null;
  agente_telefono?: string | null;
  agente_email?: string | null;
  referencia?: string | null;       // "comprador #R-0122" · "inmueble SAB-012"
  pct_comision: number;             // 0.03
  pct_kyrelo: number;               // 0.60 · 0.50
  firmante: { marca: string; nombre: string; documento: string; ciudad: string };
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function tituloAcuerdo(tipo: DatosAcuerdo["tipo"]) {
  if (tipo === "inmueble_kyrelo") return "Acuerdo de alianza comercial · inmueble captado por KYRELO";
  if (tipo === "alianza_general") return "Acuerdo marco de alianza comercial y corretaje compartido";
  return "Acuerdo de alianza comercial y corretaje compartido · comprador referido por KYRELO";
}

export function clausulasAcuerdo(d: DatosAcuerdo): { titulo: string; texto: string }[] {
  const f = d.firmante;
  const ref = d.referencia ? ` identificado como ${d.referencia}` : "";
  const agente = `${d.agente_nombre}${d.agente_documento ? `, identificado con cédula ${d.agente_documento}` : ""}${d.agente_empresa ? `, de ${d.agente_empresa}` : ""}`;
  const pctAgente = pct(1 - d.pct_kyrelo);
  const pctKyrelo = pct(d.pct_kyrelo);
  return [
    {
      titulo: "Partes",
      texto: `Entre ${f.marca}, representada por ${f.nombre}${f.documento ? `, identificada con ${f.documento}` : ""}, con domicilio en ${f.ciudad}, en adelante "KYRELO", y ${agente}${d.agente_telefono ? `, teléfono ${d.agente_telefono}` : ""}${d.agente_email ? `, correo ${d.agente_email}` : ""}, en adelante "el AGENTE", se celebra el presente acuerdo, regido por las normas del contrato de corretaje (artículos 1340 a 1346 del Código de Comercio) y por las siguientes cláusulas.`,
    },
    {
      titulo: "Primera · Objeto",
      texto: `KYRELO pone en contacto al AGENTE con compradores verificados que ella ha captado y calificado, o le entrega inmuebles captados por KYRELO con su material de venta, para que el AGENTE aporte inmuebles o compradores y las partes concreten negocios de compraventa de forma conjunta. Este acuerdo aplica al negocio${ref || " que se identifique en la plataforma"} y a los demás negocios que se generen entre las partes dentro de la plataforma KYRELO.`,
    },
    {
      titulo: "Segunda · Origen del cliente",
      texto: `El AGENTE declara que conoció al comprador${ref} a través de KYRELO y que no tenía relación comercial previa con él ni con su grupo familiar respecto de la búsqueda de este inmueble. Postular un inmueble a un requerimiento de KYRELO equivale a hacer esta declaración. Si el AGENTE ya conocía al comprador, debe informarlo por escrito a KYRELO antes de postular; de lo contrario, se entiende que el cliente es referido por KYRELO.`,
    },
    {
      titulo: "Tercera · No elusión",
      texto: `Durante la vigencia de este acuerdo y hasta ${REGLAS.mesesNoElusion} meses después de su terminación, el AGENTE se obliga a: (a) no contactar, negociar ni cerrar directamente, ni por interpuesta persona, ningún negocio con el comprador referido por KYRELO ni con su grupo familiar, por fuera de la plataforma; (b) tratándose de inmuebles de KYRELO, no contactar al propietario ni a la administración del conjunto para negociar por fuera; (c) no entregar los datos del comprador o del inmueble a terceros. Toda negociación con un cliente referido se hará con acompañamiento de KYRELO.`,
    },
    {
      titulo: "Cuarta · Comisión y reparto",
      texto: `La comisión total del negocio será del ${pct(d.pct_comision)} sobre el precio de venta, o la que se haya pactado con el propietario. Si en el negocio participan otras inmobiliarias, la comisión total se divide primero entre las partes que intervienen y la porción que corresponde a KYRELO y al AGENTE se reparte así: ${pctAgente} para el AGENTE y ${pctKyrelo} para KYRELO. Regla general de la plataforma: en compradores referidos por KYRELO, 40% para el AGENTE en sus tres primeros cierres y 50/50 desde el cuarto; en inmuebles captados por KYRELO, 50/50 con el material de venta incluido. La comisión se causa únicamente cuando el negocio se cierra (firma de escritura pública o, en su defecto, promesa con arras según lo pacte cada parte con su cliente). Cada parte factura su porción dentro de los ${REGLAS.diasFacturacion} días hábiles siguientes al recibo del pago de la comisión.`,
    },
    {
      titulo: "Quinta · Obligaciones del agente",
      texto: `(a) Entregar información veraz del inmueble, incluida la matrícula inmobiliaria y el tipo de exclusividad; (b) informar a KYRELO el avance de cada negocio (visita, oferta, promesa, escritura); (c) atender al comprador con diligencia y respeto; (d) cumplir la Ley 1581 de 2012 sobre datos personales respecto de la información que reciba.`,
    },
    {
      titulo: "Sexta · Obligaciones de KYRELO",
      texto: `(a) Entregar compradores verificados (presupuesto, plazo y forma de pago confirmados) o inmuebles con mandato y material de venta; (b) acompañar el proceso desde el acuerdo hasta la firma: promesa, banco, notaría y escrituración; (c) registrar en la plataforma el avance del negocio y el reparto de la comisión.`,
    },
    {
      titulo: "Séptima · Confidencialidad y datos personales",
      texto: `La información de compradores, propietarios e inmuebles es confidencial. Las partes autorizan el tratamiento de sus datos personales conforme a la política de tratamiento de datos de KYRELO (kyrelocorp.com/politica-de-datos).`,
    },
    {
      titulo: "Octava · Vigencia",
      texto: `Este acuerdo rige desde su aceptación y por ${REGLAS.mesesVigencia} meses, prorrogables automáticamente por periodos iguales mientras el AGENTE mantenga su cuenta activa. Cualquiera de las partes puede terminarlo con aviso escrito de quince (15) días, sin perjuicio de los negocios en curso y de la cláusula de no elusión.`,
    },
    {
      titulo: "Novena · Cláusula penal",
      texto: `El incumplimiento de la cláusula de no elusión obliga al AGENTE a pagar a KYRELO, a título de pena, el ${REGLAS.pctPenal}% de la comisión que le habría correspondido a KYRELO en ese negocio, sin necesidad de requerimiento previo y sin perjuicio de la indemnización de los demás perjuicios y de la suspensión de su cuenta en la plataforma.`,
    },
    {
      titulo: "Décima · Aceptación electrónica",
      texto: `El AGENTE acepta este acuerdo haciendo clic en "Acepto" en el enlace enviado por KYRELO, indicando su nombre y número de documento. Esa aceptación, junto con la fecha y hora registradas por la plataforma, constituye firma electrónica en los términos del artículo 7 de la Ley 527 de 1999 y del Decreto 2364 de 2012, y las partes la reconocen como plena prueba del acuerdo.`,
    },
    {
      titulo: "Undécima · Ley aplicable y conflictos",
      texto: `Este acuerdo se rige por las leyes de Colombia. Las diferencias se resolverán primero por arreglo directo; de no lograrse en quince (15) días, mediante conciliación, y en último caso ante los jueces competentes de ${f.ciudad}.`,
    },
  ];
}
