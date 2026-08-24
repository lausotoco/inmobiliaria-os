import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cargarConfig } from "@/lib/calificacion/datos";
import FormCalificacion from "@/components/compradores/FormCalificacion";

/* Editar recalcula: cada guardado vuelve a pasar por el motor y
   deja una entrada nueva en el historial. Un comprador que era C
   en septiembre puede ser A en octubre sin que se pierda el rastro. */

export default async function EditarCalificacionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ parametros, version }, cli, cal] = await Promise.all([
    cargarConfig(supabase),
    supabase.from("clientes").select("nombre, whatsapp").eq("id", params.id).maybeSingle(),
    supabase.from("calificaciones").select("*").eq("cliente_id", params.id).maybeSingle(),
  ]);

  if (!cli.data) {
    return (
      <div className="mt-12 text-center">
        <p className="text-neutro">Comprador no encontrado.</p>
        <Link href="/compradores" className="mt-3 inline-block text-sm text-bosque underline">
          Volver
        </Link>
      </div>
    );
  }

  const c = cal.data;
  const fecha = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : "");

  const inicial = {
    nombre: cli.data.nombre ?? "",
    whatsapp: cli.data.whatsapp ?? "",
    ...(c
      ? {
          origen_lead: c.origen_lead ?? "Directo",
          lead_id: c.lead_id ?? null,
          municipios: c.municipios ?? [],
          tipo_inmueble: c.tipo_inmueble ?? "",
          motivo_mudanza: c.motivo_mudanza ?? "",
          composicion_hogar: c.composicion_hogar ?? "",
          vive_hoy_en: c.vive_hoy_en ?? "",
          presupuesto_maximo: c.presupuesto_maximo,
          ingreso_familiar: c.ingreso_familiar,
          cuota_inicial: c.cuota_inicial,
          estado_credito: c.estado_credito ?? "No ha empezado",
          carta_fecha: fecha(c.carta_fecha),
          monto_preaprobado: c.monto_preaprobado,
          carta_vigencia: fecha(c.carta_vigencia),
          ingresos_verificables: c.ingresos_verificables ?? false,
          plazo_mudanza: c.plazo_mudanza ?? "Explorando",
          evento_forzante: c.evento_forzante ?? false,
          evento_cual: c.evento_cual ?? "",
          evento_fecha: fecha(c.evento_fecha),
          necesita_vender: c.necesita_vender ?? false,
          venta_publicada: c.venta_publicada ?? false,
          venta_meses: c.venta_meses,
          venta_precio: c.venta_precio,
          venta_enlace: c.venta_enlace ?? "",
          decisores: c.decisores ?? "",
          decisores_participaron: c.decisores_participaron ?? "todos",
          ya_visito: c.ya_visito ?? false,
          notas_llamada: c.notas_llamada ?? "",
          videollamada_realizada: c.videollamada_realizada ?? false,
          documentos_entregados: c.documentos_entregados ?? false,
          rechazos_videollamada: c.rechazos_videollamada ?? 0,
          autorizacion_fecha: c.autorizacion_fecha,
          autorizacion_version: c.autorizacion_version,
        }
      : {}),
  };

  return (
    <div>
      <Link
        href={`/compradores/${params.id}`}
        className="text-sm text-neutro transition hover:text-tinta"
      >
        ← {cli.data.nombre}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-medium">
        {c ? "Editar calificación" : "Calificar comprador"}
      </h1>
      <div className="mt-8">
        <FormCalificacion
          parametros={parametros}
          configVersion={version}
          clienteId={params.id}
          inicial={inicial}
        />
      </div>
    </div>
  );
}
