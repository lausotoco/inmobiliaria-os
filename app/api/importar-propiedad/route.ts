import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Eres un asistente que extrae información de inmuebles a partir de anuncios inmobiliarios colombianos.
Debes responder SOLO con un JSON válido, sin markdown ni texto adicional.

Extrae estos campos (si no encuentras un campo, ponlo como null):
{
  "titulo": "string",
  "precio": number (en pesos colombianos, sin puntos ni comas),
  "area": number (en metros cuadrados),
  "habitaciones": number,
  "banos": number,
  "parqueaderos": number,
  "administracion": number (en pesos colombianos),
  "estrato": number (1-6),
  "descripcion": "string (resumen breve del inmueble en 2-3 frases)",
  "amenidades": ["string"] (lista de amenidades encontradas),
  "barrio": "string",
  "ciudad": "string",
  "direccion": "string",
  "asesor": "string",
  "inmobiliaria": "string",
  "telefono": "string",
  "codigo": "string (código del inmueble en el portal)"
}

Convierte siempre el precio a número entero sin formato. Por ejemplo: "$450.000.000" → 450000000.
Si el texto menciona "millones", multiplica. Por ejemplo: "450 millones" → 450000000.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { mensaje: "Agrega ANTHROPIC_API_KEY en tu archivo .env.local para usar la importación con IA." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { url, texto } = body;

    // ── Ruta 1: URL → Claude busca la página con web search ──
    if (url && !texto) {
      const propiedad = await extraerDesdeUrl(apiKey, url);
      if (propiedad) {
        return NextResponse.json({ propiedad, fuente: "ia-web-search" });
      }
      return NextResponse.json(
        { mensaje: "No se pudo leer esa URL. Intenta con el Plan B: pega el texto del anuncio." },
        { status: 422 }
      );
    }

    // ── Ruta 2: texto pegado → Claude extrae campos ──
    if (texto) {
      const propiedad = await extraerDesdeTexto(apiKey, texto);
      if (propiedad) {
        return NextResponse.json({ propiedad, fuente: "ia-desde-texto" });
      }
      return NextResponse.json(
        { mensaje: "No se pudo extraer información del texto." },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { mensaje: "Envía una URL o texto para importar." },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error en importar-propiedad:", err);
    return NextResponse.json(
      { mensaje: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// ── Claude con Web Search: lee la URL directamente ──
async function extraerDesdeUrl(
  apiKey: string,
  url: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: [
          {
            role: "user",
            content: `Busca y lee este anuncio inmobiliario: ${url}

Extrae TODA la información del inmueble que encuentres en esa página.
Responde SOLO con el JSON, sin explicaciones.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Error API Claude (web search):", res.status, await res.text());
      return null;
    }

    const data = await res.json();

    // Claude puede devolver múltiples bloques (web_search_tool_result, text, etc.)
    // Buscamos el último bloque de texto que debería ser el JSON
    const bloqueTexto = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      ?.pop();

    if (!bloqueTexto?.text) return null;

    const jsonLimpio = bloqueTexto.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    return JSON.parse(jsonLimpio);
  } catch (err) {
    console.error("Error en extraerDesdeUrl:", err);
    return null;
  }
}

// ── Claude sin web search: extrae de texto pegado ──
async function extraerDesdeTexto(
  apiKey: string,
  texto: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Extrae la información de este anuncio inmobiliario:\n\n${texto.slice(0, 5000)}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const respuesta = data.content?.[0]?.text ?? "";

    const jsonLimpio = respuesta
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    return JSON.parse(jsonLimpio);
  } catch {
    return null;
  }
}
