// El buscador del nuevo KYRELO (corre en el Mac de Laura con Claude Code) le manda aquí
// las opciones que encontró en los portales para cada comprador. Este endpoint:
//   1. crea el comprador y su requerimiento si todavía no existen en la plataforma;
//   2. guarda cada inmueble (fuente 'portal') y su match con el requerimiento;
//   3. le manda a Laura, por Telegram, cada opción nueva con botones para aprobarla
//      (va al portafolio del comprador) o descartarla.
// Solo entra con la llave BUSCADOR_KEY (vive en Netlify y en el Mac de Laura).
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTelefono } from "@/lib/telefono";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ORG_ID = "00000000-0000-0000-0000-000000000001"; // Mi Inmobiliaria
const LAURA_TELEGRAM_ID = 5233569330;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type Datos = {
  area?: number | null;
  habitaciones?: number | null;
  banos?: number | null;
  parqueaderos?: number | null;
  administracion?: number | null;
  estrato?: number | null;
  barrio?: string | null;
  ciudad?: string | null;
  tipo?: string | null;
};

type Opcion = {
  id: string;
  nota: number;
  titulo: string;
  precio: number;
  detalle?: string;
  porque?: string;
  ojo?: string;
  url: string;
  publica?: string;
  fuera?: boolean;
  datos?: Datos;
};

type Comprador = {
  requerimiento_id?: string | null;
  nombre?: string;
  whatsapp?: string | null;
  requerimiento?: {
    titulo?: string | null;
    presupuesto_max?: number | null;
    ciudad?: string | null;
    zonas?: string[] | null;
    tipo_inmueble?: string | null;
    parqueaderos?: number | null;
    preferencias?: string | null;
    urgencia?: string | null;
  };
};

type Cuerpo = {
  comprador: Comprador;
  fecha?: string;
  resumen?: string;
  opciones: Opcion[];
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pesos(n: number) {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

async function telegram(texto: string, teclado?: unknown) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: LAURA_TELEGRAM_ID,
      text: texto,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(teclado ? { reply_markup: teclado } : {}),
    }),
  });
}

/** Los requerimientos activos de la plataforma, para que el buscador sepa por quién buscar. */
export async function GET(req: NextRequest) {
  const llave = process.env.BUSCADOR_KEY;
  if (!llave || req.headers.get("x-buscador-key") !== llave) {
    return NextResponse.json({ mensaje: "No autorizado." }, { status: 401 });
  }
  const db = createAdminClient();
  if (!db) return NextResponse.json({ mensaje: "Falta la llave de Supabase." }, { status: 500 });
  const { data, error } = await db
    .from("requerimientos")
    .select(
      "id, titulo, presupuesto_min, presupuesto_max, ciudad, zonas, barrio, area_min, habitaciones, banos, parqueaderos, tipo_inmueble, preferencias, financiacion, urgencia, observaciones, created_at, clientes(id, nombre, whatsapp, urgencia)"
    )
    .eq("estado", "activo")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ mensaje: error.message }, { status: 500 });
  return NextResponse.json({ requerimientos: data ?? [] });
}

export async function POST(req: NextRequest) {
  const llave = process.env.BUSCADOR_KEY;
  if (!llave || req.headers.get("x-buscador-key") !== llave) {
    return NextResponse.json({ mensaje: "No autorizado." }, { status: 401 });
  }
  const db = createAdminClient();
  if (!db) return NextResponse.json({ mensaje: "Falta la llave de Supabase." }, { status: 500 });

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await req.json()) as Cuerpo;
  } catch {
    return NextResponse.json({ mensaje: "El cuerpo no es JSON." }, { status: 400 });
  }
  const comprador = cuerpo.comprador ?? {};
  const opciones = Array.isArray(cuerpo.opciones) ? cuerpo.opciones : [];
  if (opciones.length === 0) {
    return NextResponse.json({ mensaje: "No llegaron opciones." }, { status: 400 });
  }

  // ── 1. El comprador y su requerimiento ──
  let requerimientoId = comprador.requerimiento_id ?? null;
  let clienteId: string | null = null;
  let nombreCliente = comprador.nombre ?? "Comprador";

  if (requerimientoId) {
    const { data: r } = await db
      .from("requerimientos")
      .select("id, cliente_id, clientes(nombre)")
      .eq("id", requerimientoId)
      .maybeSingle();
    if (!r) return NextResponse.json({ mensaje: "Ese requerimiento no existe." }, { status: 404 });
    clienteId = r.cliente_id;
    const c = r.clientes as unknown as { nombre: string } | { nombre: string }[] | null;
    nombreCliente = (Array.isArray(c) ? c[0]?.nombre : c?.nombre) ?? nombreCliente;
  } else {
    if (!comprador.nombre) {
      return NextResponse.json({ mensaje: "Falta el nombre del comprador." }, { status: 400 });
    }
    let whatsapp: string | null = null;
    if (comprador.whatsapp) {
      const t = normalizarTelefono(comprador.whatsapp);
      whatsapp = t.ok ? t.normalizado : comprador.whatsapp;
    }
    const { data: c, error: ec } = await db
      .from("clientes")
      .insert({
        organization_id: ORG_ID,
        nombre: comprador.nombre,
        whatsapp,
        urgencia: comprador.requerimiento?.urgencia ?? null,
        notas: "Creado por el buscador de KYRELO.",
      })
      .select("id")
      .single();
    if (ec || !c) {
      return NextResponse.json({ mensaje: `No pude crear el comprador: ${ec?.message ?? ""}` }, { status: 500 });
    }
    clienteId = c.id;
    const rq = comprador.requerimiento ?? {};
    const { data: r, error: er } = await db
      .from("requerimientos")
      .insert({
        organization_id: ORG_ID,
        cliente_id: clienteId,
        titulo: rq.titulo ?? null,
        presupuesto_max: rq.presupuesto_max ?? null,
        ciudad: rq.ciudad ?? null,
        zonas: rq.zonas ?? null,
        tipo_inmueble: rq.tipo_inmueble ?? null,
        parqueaderos: rq.parqueaderos ?? null,
        preferencias: rq.preferencias ?? null,
        urgencia: rq.urgencia ?? null,
        observaciones: "Lo alimenta el buscador de portales.",
        estado: "activo",
      })
      .select("id")
      .single();
    if (er || !r) {
      return NextResponse.json({ mensaje: `No pude crear el requerimiento: ${er?.message ?? ""}` }, { status: 500 });
    }
    requerimientoId = r.id;
  }

  // ── 2. Inmuebles y matches ──
  const nuevas: { match_id: string; opcion: Opcion }[] = [];
  let repetidas = 0;
  let bajaronPrecio = 0;

  for (const o of opciones) {
    if (!o.url || !o.titulo) continue;
    const d = o.datos ?? {};

    const { data: existente } = await db
      .from("propiedades")
      .select("id, precio")
      .eq("url_original", o.url)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let propiedadId: string;
    if (existente) {
      propiedadId = existente.id;
      if (o.precio && Number(existente.precio) !== Number(o.precio)) {
        const { data: upd } = await db
          .from("propiedades")
          .update({ precio: o.precio, updated_at: new Date().toISOString() })
          .eq("id", propiedadId)
          .select("id");
        if (upd && upd.length > 0 && Number(existente.precio) > Number(o.precio)) bajaronPrecio++;
      }
    } else {
      const { data: p, error: ep } = await db
        .from("propiedades")
        .insert({
          organization_id: ORG_ID,
          fuente: "portal",
          codigo: o.id,
          titulo: o.titulo,
          precio: o.precio ?? null,
          area: d.area ?? null,
          habitaciones: d.habitaciones ?? null,
          banos: d.banos ?? null,
          parqueaderos: d.parqueaderos ?? null,
          administracion: d.administracion ?? null,
          estrato: d.estrato ?? null,
          barrio: d.barrio ?? null,
          ciudad: d.ciudad ?? null,
          tipo: d.tipo ?? null,
          descripcion: o.detalle ?? null,
          inmobiliaria: o.publica ?? null,
          url_original: o.url,
          estado: "disponible",
        })
        .select("id")
        .single();
      if (ep || !p) {
        console.error("buscador: no pude guardar el inmueble", ep?.message);
        continue;
      }
      propiedadId = p.id;
    }

    const { data: m } = await db
      .from("matches")
      .select("id, estado")
      .eq("requerimiento_id", requerimientoId)
      .eq("propiedad_id", propiedadId)
      .maybeSingle();

    const explicacion = [o.porque, o.fuera ? "Se pasa del presupuesto." : null].filter(Boolean).join(" ");
    const score = Math.max(0, Math.min(100, Math.round(Number(o.nota) || 0)));

    if (m) {
      // Ya la vio Laura: no se vuelve a mandar. Solo se refresca la nota si sigue sugerida.
      repetidas++;
      if (m.estado === "sugerido") {
        await db.from("matches").update({ score, explicacion, ojo: o.ojo ?? null }).eq("id", m.id).select("id");
      }
      continue;
    }
    const { data: nuevo, error: em } = await db
      .from("matches")
      .insert({
        organization_id: ORG_ID,
        requerimiento_id: requerimientoId,
        propiedad_id: propiedadId,
        score,
        explicacion,
        ojo: o.ojo ?? null,
        estado: "sugerido",
      })
      .select("id")
      .single();
    if (em || !nuevo) {
      console.error("buscador: no pude guardar el match", em?.message);
      continue;
    }
    nuevas.push({ match_id: nuevo.id, opcion: o });
  }

  // ── 3. A Telegram, con botones ──
  if (nuevas.length > 0) {
    const titulo = `<b>Buscador · ${esc(nombreCliente)}</b>\n${nuevas.length} opci${nuevas.length === 1 ? "ón nueva" : "ones nuevas"}` +
      (repetidas > 0 ? ` · ${repetidas} ya vistas` : "") +
      (bajaronPrecio > 0 ? ` · ${bajaronPrecio} bajaron de precio` : "") +
      (cuerpo.resumen ? `\n\n${esc(cuerpo.resumen)}` : "");
    await telegram(titulo);

    nuevas.sort((a, b) => (b.opcion.nota ?? 0) - (a.opcion.nota ?? 0));
    for (const { match_id, opcion: o } of nuevas) {
      const lineas = [
        `<b>${esc(o.titulo)}</b> · nota ${o.nota}${o.fuera ? " · se pasa del presupuesto" : ""}`,
        `${pesos(o.precio)}${o.detalle ? ` · ${esc(o.detalle)}` : ""}`,
      ];
      if (o.porque) lineas.push(`Encaja: ${esc(o.porque)}`);
      if (o.ojo) lineas.push(`Ojo: ${esc(o.ojo)}`);
      if (o.publica) lineas.push(`Publica: ${esc(o.publica)}`);
      await telegram(lineas.join("\n"), {
        inline_keyboard: [
          [
            { text: "✅ Al portafolio", callback_data: `opc_ok:${match_id}` },
            { text: "✖ No", callback_data: `opc_no:${match_id}` },
          ],
          [{ text: "Ver aviso", url: o.url }],
        ],
      });
    }
  }

  return NextResponse.json({
    ok: true,
    cliente_id: clienteId,
    requerimiento_id: requerimientoId,
    nuevas: nuevas.length,
    repetidas,
    bajaron_precio: bajaronPrecio,
  });
}
