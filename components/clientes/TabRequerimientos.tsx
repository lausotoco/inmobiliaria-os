"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import FormRequerimiento from "./FormRequerimiento";
import type { Requerimiento } from "@/lib/types";

type Props = {
  clienteId: string;
  requerimientos: Requerimiento[];
};

export default function TabRequerimientos({ clienteId, requerimientos }: Props) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Requerimiento | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este requerimiento?")) return;
    setEliminando(id);
    const supabase = createClient();
    await supabase.from("requerimientos").delete().eq("id", id);
    setEliminando(null);
    router.refresh();
  }

  if (editando) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-tinta">Editar requerimiento</p>
          <button
            onClick={() => setEditando(null)}
            className="text-sm text-neutro hover:text-tinta"
          >
            ← Volver
          </button>
        </div>
        <FormRequerimiento
          clienteId={clienteId}
          requerimiento={editando}
          onGuardado={() => setEditando(null)}
        />
      </div>
    );
  }

  if (mostrarForm) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-tinta">Nuevo requerimiento</p>
          <button
            onClick={() => setMostrarForm(false)}
            className="text-sm text-neutro hover:text-tinta"
          >
            ← Volver
          </button>
        </div>
        <FormRequerimiento
          clienteId={clienteId}
          onGuardado={() => setMostrarForm(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutro">
          {requerimientos.length === 0
            ? "Sin requerimientos todavía"
            : `${requerimientos.length} requerimiento${requerimientos.length > 1 ? "s" : ""}`}
        </p>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-lg bg-bosque px-4 py-2 text-sm font-medium text-white transition hover:bg-bosque-oscuro"
        >
          + Nuevo requerimiento
        </button>
      </div>

      {requerimientos.length > 0 && (
        <div className="space-y-3">
          {requerimientos.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-linea bg-superficie p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-tinta">
                    {r.titulo || r.tipo_inmueble || "Requerimiento"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge texto={r.estado} />
                    <Badge texto={r.urgencia} />
                    {r.tipo_inmueble && <Badge texto={r.tipo_inmueble} />}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    href={`/requerimientos/${r.id}`}
                    className="rounded-lg bg-bosque-suave px-2.5 py-1.5 text-xs font-medium text-bosque transition hover:bg-bosque hover:text-white"
                  >
                    ✦ Matches
                  </Link>
                  <button
                    onClick={() => setEditando(r)}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-neutro transition hover:bg-fondo hover:text-tinta"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminar(r.id)}
                    disabled={eliminando === r.id}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-red-500 transition hover:bg-red-50"
                  >
                    {eliminando === r.id ? "…" : "Eliminar"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                {r.presupuesto_min || r.presupuesto_max ? (
                  <div>
                    <span className="text-neutro">Presupuesto: </span>
                    <span className="text-tinta">
                      {formatoCOP(r.presupuesto_min)} –{" "}
                      {formatoCOP(r.presupuesto_max)}
                    </span>
                  </div>
                ) : null}
                {r.ciudad && (
                  <div>
                    <span className="text-neutro">Ciudad: </span>
                    <span className="text-tinta">{r.ciudad}</span>
                  </div>
                )}
                {r.zonas && r.zonas.length > 0 && (
                  <div>
                    <span className="text-neutro">Zonas: </span>
                    <span className="text-tinta">{r.zonas.join(", ")}</span>
                  </div>
                )}
                {r.habitaciones !== null && (
                  <div>
                    <span className="text-neutro">Hab: </span>
                    <span className="text-tinta">{r.habitaciones}</span>
                  </div>
                )}
                {r.banos !== null && (
                  <div>
                    <span className="text-neutro">Baños: </span>
                    <span className="text-tinta">{r.banos}</span>
                  </div>
                )}
                {r.area_min || r.area_max ? (
                  <div>
                    <span className="text-neutro">Área: </span>
                    <span className="text-tinta">
                      {r.area_min ?? "—"}–{r.area_max ?? "—"} m²
                    </span>
                  </div>
                ) : null}
              </div>

              {r.preferencias && (
                <p className="mt-3 text-sm italic text-neutro">
                  "{r.preferencias}"
                </p>
              )}

              {r.amenidades && r.amenidades.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.amenidades.map((a: string) => (
                    <span
                      key={a}
                      className="rounded-full bg-bosque-suave px-2.5 py-0.5 text-xs text-bosque"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
