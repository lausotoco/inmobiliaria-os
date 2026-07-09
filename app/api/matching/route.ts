import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { mensaje: "Agrega ANTHROPIC_API_KEY en tu .env.local para usar el matching con IA." },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ mensaje: "No autorizado." }, { status: 401 });
  }

  try {
    const { requerimiento_id } = await request.json();
    if (!requerimiento_id) {
      return NextResponse.json(
        { mensaje: "Falta el requerimiento_id." },
        { status: 400 }
      );
    }

    // ── 1. Traer el requerimiento con su cliente ──
    const { data: req, error: errReq } = await supabase
      .from("requerimientos")
      .select("*, clientes(id, nombre, credito_aprobado, banco, inicial_disponible, urgencia)")
      .eq("id", requerimiento_id)
      .single();

    if (errReq || !req) {
      return NextResponse.json(
        { mensaje: "Requerimiento no encontrado." },
        { status: 404 }
      );
    }

    // ── 2. Filtro duro en SQL (criterios eliminatorios) ──
    let query = supabase
      .from("propiedades")
      .select("*")
      .eq("estado", "disponible");

    // Presupuesto: hasta 10% por encima del máximo (a veces se negocia)
    if (req.presupuesto_max) {
      query = query.lte("precio", req.presupuesto_max * 1.1);
    }

    const { data: todasCandidatas } = await query.limit(50);

    if (!todasCandidatas || todasCandidatas.length === 0) {
      return NextResponse.json({
        matches: [],
        mensaje: "No hay propiedades disponibles que pasen el filtro de presupuesto.",
      });
    }

    // Filtro de ubicación en memoria (ciudad o zonas del requerimiento)
    const lugares = [
      ...(req.ciudad ? [req.ciudad.toLowerCase()] : []),
      ...((req.zonas as string[] | null)?.map((z) => z.toLowerCase()) ?? []),
    ];

    let candidatas = todasCandidatas;
    if (lugares.length > 0) {
      const filtradas = todasCandidatas.filter((p) => {
        const ciudadProp = (p.ciudad ?? "").toLowerCase();
        const barrioProp = (p.barrio ?? "").toLowerCase();
        return lugares.some(
          (l) => ciudadProp.includes(l) || l.includes(ciudadProp) || barrioProp.includes(l)
        );
      });
      // Si el filtro de ubicación elimina todo, mantener todas (la IA penalizará)
      if (filtradas.length > 0) candidatas = filtradas;
    }

    // ── 3. Excluir propiedades ya aceptadas/descartadas para este requerimiento ──
    const { data: matchesExistentes } = await supabase
      .from("matches")
      .select("propiedad_id, estado")
      .eq("requerimiento_id", requerimiento_id)
      .in("estado", ["aceptado", "descartado"]);

    const excluidas = new Set(
      (matchesExistentes ?? []).map((m) => m.propiedad_id)
    );
    candidatas = candidatas.filter((p) => !excluidas.has(p.id)).slice(0, 15);

    if (candidatas.length === 0) {
      return NextResponse.json({
        matches: [],
        mensaje: "Todas las propiedades compatibles ya fueron evaluadas (aceptadas o descartadas).",
      });
    }

    // ── 4. Descartes previos del cliente (la IA aprende de ellos) ──
    const { data: reqsDelCliente } = await supabase
      .from("requerimientos")
      .select("id")
      .eq("cliente_id", req.cliente_id);

    const idsReqs = (reqsDelCliente ?? []).map((r) => r.id);

    const { data: descartes } = await supabase
      .from("matches")
      .select("motivo_descarte, propiedades(titulo, barrio, ciudad)")
      .in("requerimiento_id", idsReqs)
      .eq("estado", "descartado")
      .not("motivo_descarte", "is", null)
      .limit(10);

    // ── 5. Llamar a Claude para calificar ──
    const resultados = await calificarConIA(apiKey, req, candidatas, descartes ?? []);

    if (!resultados) {
      return NextResponse.json(
        { mensaje: "La IA no pudo calificar las propiedades. Intenta de nuevo." },
        { status: 500 }
      );
    }

    // ── 6. Guardar/actualizar los matches ──
    const filas = resultados
      .filter((r) => candidatas.some((c) => c.id === r.propiedad_id))
      .map((r) => ({
        requerimiento_id,
        propiedad_id: r.propiedad_id,
        score: Math.max(0, Math.min(100, Math.round(r.score))),
        probabilidad_cierre:
          r.probabilidad_cierre !== undefined && r.probabilidad_cierre !== null
            ? Math.max(0, Math.min(100, Math.round(r.probabilidad_cierre)))
            : null,
        explicacion: r.explicacion,
        estado: "sugerido",
      }));

    if (filas.length > 0) {
      await supabase
        .from("matches")
        .upsert(filas, { onConflict: "requerimiento_id,propiedad_id" });
    }

    return NextResponse.json({ matches: filas, total: filas.length });
  } catch (err) {
    console.error("Error en matching:", err);
    return NextResponse.json(
      { mensaje: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// ── Claude califica cada candidata contra el requerimiento ──

type Resultado = {
  propiedad_id: string;
  score: number;
  probabilidad_cierre?: number | null;
  explicacion: string;
};

async function calificarConIA(
  apiKey: string,
  req: Record<string, unknown>,
  candidatas: Record<string, unknown>[],
  descartes: Record<string, unknown>[]
): Promise<Resultado[] | null> {
  const cliente = (req.clientes ?? {}) as Record<string, unknown>;
  const datosCliente = {
    credito_aprobado: cliente.credito_aprobado,
    banco: cliente.banco,
    inicial_disponible: cliente.inicial_disponible,
    urgencia_cliente: cliente.urgencia,
  };

  const requerimiento = {
    presupuesto_min: req.presupuesto_min,
    presupuesto_max: req.presupuesto_max,
    ciudad: req.ciudad,
    zonas: req.zonas,
    barrio: req.barrio,
    area_min: req.area_min,
    area_max: req.area_max,
    habitaciones: req.habitaciones,
    banos: req.banos,
    parqueaderos: req.parqueaderos,
    tipo_inmueble: req.tipo_inmueble,
    amenidades: req.amenidades,
    preferencias: req.preferencias,
    observaciones: req.observaciones,
  };

  const propiedades = candidatas.map((p) => ({
    id: p.id,
    titulo: p.titulo,
    precio: p.precio,
    area: p.area,
    habitaciones: p.habitaciones,
    banos: p.banos,
    parqueaderos: p.parqueaderos,
    administracion: p.administracion,
    estrato: p.estrato,
    barrio: p.barrio,
    ciudad: p.ciudad,
    amenidades: p.amenidades,
    descripcion: typeof p.descripcion === "string" ? p.descripcion.slice(0, 400) : null,
  }));

  const descartesTexto =
    descartes.length > 0
      ? `\n\nDESCARTES PREVIOS DE ESTE CLIENTE (aprende de esto — si una propiedad tiene características similares a las descartadas, penaliza el score y menciónalo):\n${descartes
          .map((d) => {
            const prop = d.propiedades as Record<string, unknown> | null;
            return `- "${prop?.titulo ?? "propiedad"}" (${prop?.barrio ?? ""}, ${prop?.ciudad ?? ""}): descartada porque "${d.motivo_descarte}"`;
          })
          .join("\n")}`
      : "";

  const prompt = `Eres un experto inmobiliario colombiano. Evalúa la compatibilidad entre lo que busca un cliente y cada propiedad candidata, Y la probabilidad real de cierre.

PERFIL FINANCIERO Y URGENCIA DEL CLIENTE:
${JSON.stringify(datosCliente, null, 2)}

REQUERIMIENTO DEL CLIENTE:
${JSON.stringify(requerimiento, null, 2)}${descartesTexto}

PROPIEDADES CANDIDATAS:
${JSON.stringify(propiedades, null, 2)}

Para CADA propiedad devuelve DOS métricas de 0 a 100 y una explicación breve (2-3 frases) en español:

1. "score" — COMPATIBILIDAD: qué tanto la propiedad cumple lo que el cliente pide.
2. "probabilidad_cierre" — PROBABILIDAD DE CIERRE: qué tan probable es que este cliente COMPRE esta propiedad, considerando:
   - Ajuste financiero: precio vs presupuesto, inicial disponible vs precio (una inicial del 20-30% es lo normal en Colombia), crédito aprobado o no.
   - Urgencia: "inmediata" sube la probabilidad; "+3 meses" la baja.
   - Compatibilidad general: si no le encaja, difícilmente compra.
   La probabilidad de cierre suele ser MENOR que el score de compatibilidad.

Criterios:
- Presupuesto: dentro del rango = bien; por encima del máximo = penaliza fuerte.
- Ubicación: ciudad/zona/barrio deseados = suma mucho.
- Área, habitaciones, baños, parqueaderos: cumplir o superar lo pedido = bien; por debajo = penaliza.
- Amenidades pedidas presentes = suma.
- Las PREFERENCIAS en texto libre son muy importantes: interpreta cosas como "cocina abierta", "buena iluminación", "acepta mascotas", "cerca de colegios" y busca evidencia en la descripción de cada propiedad.
- La explicación debe mencionar lo que cumple Y lo que le falta.

Responde SOLO con un JSON válido, sin markdown, con este formato exacto:
[{"propiedad_id": "uuid", "score": 87, "probabilidad_cierre": 62, "explicacion": "..."}]`;

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
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Error API Claude (matching):", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const texto = data.content?.[0]?.text ?? "";
    const jsonLimpio = texto
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    return JSON.parse(jsonLimpio);
  } catch (err) {
    console.error("Error en calificarConIA:", err);
    return null;
  }
}
