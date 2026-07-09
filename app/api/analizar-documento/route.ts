import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const PROMPT_CERTIFICADO = `Eres un abogado inmobiliario colombiano experto. Analiza este certificado de tradición y libertad y responde SOLO con JSON válido:

{
  "tipo_documento": "certificado_tradicion",
  "numero_matricula": "string",
  "circulo_registral": "string",
  "ubicacion": "string (dirección y/o municipio del inmueble)",
  "tipo_inmueble": "string (apartamento, casa, lote, oficina, etc.)",
  "area": "string (área si aparece)",
  "propietarios_actuales": [
    { "nombre": "string", "documento": "string", "porcentaje": "string" }
  ],
  "cadena_titulos": [
    { "anotacion": "number", "fecha": "string", "tipo": "string (compraventa, sucesión, hipoteca, embargo, etc.)", "de": "string", "a": "string", "resumen": "string" }
  ],
  "gravamenes_vigentes": [
    { "tipo": "string (hipoteca, embargo, patrimonio de familia, afectación a vivienda familiar, condición resolutoria, etc.)", "acreedor": "string", "anotacion": "number", "fecha": "string", "estado": "string (vigente/cancelado)" }
  ],
  "alertas": ["string (lista de alertas o riesgos para un comprador, ej: hipoteca vigente, embargo, falsa tradición, sucesión incompleta, patrimonio de familia no cancelado, etc.)"],
  "resumen_ejecutivo": "string (párrafo breve: ¿se puede comprar este inmueble de forma segura? ¿qué debe resolverse antes?)",
  "recomendaciones": ["string (qué documentos pedir o pasos adicionales antes de comprar)"]
}`;

const PROMPT_PROMESA = `Eres un abogado inmobiliario colombiano experto. Analiza esta promesa de compraventa y responde SOLO con JSON válido:

{
  "tipo_documento": "promesa_compraventa",
  "fecha_promesa": "string",
  "vendedor": { "nombre": "string", "documento": "string" },
  "comprador": { "nombre": "string", "documento": "string" },
  "inmueble": {
    "matricula": "string",
    "direccion": "string",
    "tipo": "string",
    "area": "string"
  },
  "precio_venta": "string",
  "forma_pago": {
    "arras": "string (monto y tipo: confirmatorias, de retracto, penitenciales)",
    "cuota_inicial": "string",
    "credito_hipotecario": "string",
    "subsidio": "string",
    "saldo": "string",
    "plazos": ["string (fechas clave de cada pago)"]
  },
  "fecha_escritura": "string (fecha límite para firmar la escritura)",
  "notaria": "string",
  "clausulas_importantes": [
    { "clausula": "string (nombre o número)", "resumen": "string", "riesgo": "alto|medio|bajo" }
  ],
  "penalizaciones": "string (qué pasa si alguna parte incumple)",
  "alertas": ["string (cláusulas riesgosas, plazos muy cortos, montos atípicos, falta de claridad, etc.)"],
  "resumen_ejecutivo": "string (párrafo breve: ¿esta promesa protege adecuadamente al comprador?)",
  "recomendaciones": ["string (qué revisar, qué negociar, qué documentos cruzar)"]
}`;

const PROMPT_GENERICO = `Eres un abogado inmobiliario colombiano experto. Analiza este documento legal/notarial y responde SOLO con JSON válido:

{
  "tipo_documento": "string (certificado de tradición, promesa de compraventa, escritura pública, paz y salvo, poder, etc.)",
  "resumen_contenido": "string (resumen general de qué es y qué dice el documento)",
  "partes_involucradas": [
    { "rol": "string (vendedor, comprador, acreedor, etc.)", "nombre": "string", "documento": "string" }
  ],
  "inmueble": {
    "matricula": "string",
    "direccion": "string",
    "tipo": "string",
    "area": "string"
  },
  "fechas_clave": [
    { "concepto": "string", "fecha": "string" }
  ],
  "obligaciones": ["string (obligaciones de cada parte)"],
  "alertas": ["string (riesgos, cláusulas inusuales, información faltante)"],
  "resumen_ejecutivo": "string",
  "recomendaciones": ["string"]
}`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { mensaje: "Agrega ANTHROPIC_API_KEY en tu .env.local para usar el análisis notarial." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { archivo_base64, nombre_archivo, tipo_documento } = body;

    if (!archivo_base64) {
      return NextResponse.json(
        { mensaje: "Envía un archivo PDF en base64." },
        { status: 400 }
      );
    }

    // Elegir prompt según el tipo seleccionado por el usuario
    let systemPrompt: string;
    if (tipo_documento === "certificado_tradicion") {
      systemPrompt = PROMPT_CERTIFICADO;
    } else if (tipo_documento === "promesa_compraventa") {
      systemPrompt = PROMPT_PROMESA;
    } else {
      systemPrompt = PROMPT_GENERICO;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: archivo_base64,
                },
              },
              {
                type: "text",
                text: `Analiza este documento: "${nombre_archivo || "documento.pdf"}". Identifica si es un certificado de tradición y libertad, una promesa de compraventa, u otro documento notarial, y extrae toda la información relevante. Responde SOLO con el JSON.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Error API Claude (notarial):", res.status, err);
      return NextResponse.json(
        { mensaje: "Error al analizar el documento con IA." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const bloqueTexto = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      ?.pop();

    if (!bloqueTexto?.text) {
      return NextResponse.json(
        { mensaje: "No se pudo extraer información del documento." },
        { status: 422 }
      );
    }

    const jsonLimpio = bloqueTexto.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const analisis = JSON.parse(jsonLimpio);
    return NextResponse.json({ analisis });
  } catch (err) {
    console.error("Error en analizar-documento:", err);
    return NextResponse.json(
      { mensaje: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
