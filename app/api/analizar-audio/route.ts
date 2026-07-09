import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const PROMPT_EXTRACCION = `Eres un asistente inmobiliario colombiano. A partir de la transcripción de un audio donde un cliente describe lo que busca, extrae la información en JSON.

Responde SOLO con un JSON válido, sin markdown ni texto adicional (si un campo no se menciona, ponlo como null):
{
  "titulo": "string (resumen corto de lo que busca, ej: 'Apto para vivir con su familia en Chía')",
  "presupuesto_min": number (pesos colombianos, sin formato),
  "presupuesto_max": number (pesos colombianos, sin formato),
  "ciudad": "string",
  "zonas": ["string"] (zonas o municipios mencionados),
  "barrio": "string",
  "area_min": number (m²),
  "area_max": number (m²),
  "habitaciones": number,
  "banos": number,
  "parqueaderos": number,
  "tipo_inmueble": "apartamento" | "casa" | "lote" | "oficina" | "local" | "bodega" | "finca" | null,
  "amenidades": ["string"] (amenidades que pide: piscina, gimnasio, terraza…),
  "preferencias": "string (todo lo cualitativo: cocina abierta, buena luz, mascotas, cerca de colegios, estilo…)",
  "urgencia": "inmediata" | "1-3 meses" | "+3 meses" | null (según los tiempos que mencione),
  "observaciones": "string (contexto adicional: situación familiar, motivo de compra, tiempos, cualquier dato útil)"
}

Reglas para el presupuesto:
- "450 millones" → 450000000. "1.200 millones" o "mil doscientos" → 1200000000.
- Si menciona un solo valor ("hasta 500"), úsalo como presupuesto_max.
- Si dice "entre X y Y", llena min y max.`;

async function extraerConClaude(
  anthropicKey: string,
  contenido: string
): Promise<Record<string, unknown> | null> {
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: PROMPT_EXTRACCION,
        messages: [
          {
            role: "user",
            content: `Mensaje/transcripción del cliente:\n\n"${contenido.slice(0, 8000)}"`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      console.error("Error Claude:", claudeRes.status, await claudeRes.text());
      return null;
    }

    const data = await claudeRes.json();
    const texto = data.content?.[0]?.text ?? "";
    const jsonLimpio = texto.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(jsonLimpio);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Transcripción: Groq (gratis) o OpenAI — el que esté configurado
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return NextResponse.json(
      { mensaje: "Falta configurar ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const textoPegado = formData.get("texto") as string | null;

    // ── Modo texto: mensaje de WhatsApp pegado, va directo a Claude ──
    if (textoPegado && textoPegado.trim().length > 5) {
      const requerimiento = await extraerConClaude(
        anthropicKey,
        textoPegado.trim()
      );
      if (!requerimiento) {
        return NextResponse.json(
          { mensaje: "La IA no pudo extraer los datos del texto. Intenta de nuevo." },
          { status: 422 }
        );
      }
      return NextResponse.json({ requerimiento, transcripcion: textoPegado.trim() });
    }

    if (!audio) {
      return NextResponse.json(
        { mensaje: "No se recibió audio ni texto para analizar." },
        { status: 400 }
      );
    }

    if (!groqKey && !openaiKey) {
      return NextResponse.json(
        { mensaje: "Falta configurar GROQ_API_KEY (gratis, en console.groq.com) para transcribir audios. Mientras tanto puedes usar la opción de pegar texto." },
        { status: 500 }
      );
    }

    if (audio.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { mensaje: "El audio es muy grande (máx. 20 MB). Recorta o comprime el archivo." },
        { status: 400 }
      );
    }

    // ── 1. Transcribir con Whisper (Groq gratis, o OpenAI si está configurado) ──
    const usarGroq = Boolean(groqKey);
    const whisperForm = new FormData();
    whisperForm.append("file", audio, audio.name || "audio.m4a");
    whisperForm.append("model", usarGroq ? "whisper-large-v3" : "whisper-1");
    whisperForm.append("language", "es");

    const whisperRes = await fetch(
      usarGroq
        ? "https://api.groq.com/openai/v1/audio/transcriptions"
        : "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${usarGroq ? groqKey : openaiKey}` },
        body: whisperForm,
      }
    );

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error("Error Whisper:", whisperRes.status, err);
      return NextResponse.json(
        { mensaje: "No se pudo transcribir el audio. Verifica tu API key de " + (usarGroq ? "Groq" : "OpenAI") + "." },
        { status: 502 }
      );
    }

    const { text: transcripcion } = await whisperRes.json();

    if (!transcripcion || transcripcion.trim().length < 10) {
      return NextResponse.json(
        { mensaje: "El audio no contiene voz clara o está vacío." },
        { status: 422 }
      );
    }

    // ── 2. Extraer el requerimiento con Claude ──
    const requerimiento = await extraerConClaude(anthropicKey, transcripcion);

    if (!requerimiento) {
      return NextResponse.json(
        { mensaje: "Se transcribió el audio pero la IA no pudo extraer los datos.", transcripcion },
        { status: 422 }
      );
    }

    return NextResponse.json({ requerimiento, transcripcion });
  } catch (err) {
    console.error("Error en analizar-audio:", err);
    return NextResponse.json(
      { mensaje: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
