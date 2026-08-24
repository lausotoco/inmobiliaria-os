import { createClient } from "@/lib/supabase/server";
import { cargarConfig } from "@/lib/calificacion/datos";
import FormCalificacion from "@/components/compradores/FormCalificacion";

export default async function NuevoCompradorPage() {
  const supabase = createClient();
  const { parametros, version } = await cargarConfig(supabase);

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-widest text-laton">
        Calificación
      </p>
      <h1 className="mt-1 font-display text-3xl font-medium">Nuevo comprador</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutro">
        Los bloques están en el orden del guion de la videollamada. El puntaje se
        calcula solo, abajo, mientras escribes.
      </p>
      <div className="mt-8">
        <FormCalificacion parametros={parametros} configVersion={version} />
      </div>
    </div>
  );
}
