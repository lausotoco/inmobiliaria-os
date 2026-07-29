"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP } from "@/lib/utils";

type Item = {
  id: string;
  titulo: string | null;
  ciudad: string | null;
  zonas: string[] | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  habitaciones: number | null;
  score: number | null;
  created_at: string;
  clientes: { id: string; nombre: string } | null;
};

function nivel(score: number | null) {
  const s = score ?? 0;
  if (s >= 80) return { texto: "Alta", clase: "border-cobre text-cobre" };
  if (s >= 40) return { texto: "Media", clase: "border-linea text-neutro" };
  return { texto: "Baja", clase: "border-linea text-neutro" };
}

export default function PorRevisarPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("requerimientos")
      .select(
        "id, titulo, ciudad, zonas, presupuesto_min, presupuesto_max, habitaciones, score, created_at, clientes(id, nombre)"
      )
      .eq("estado", "por_revisar")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false });
    setItems((data as Item[] | null) ?? []);
    setCargando(false);
  }

  async function aprobar(id: string) {
    const supabase = createClient();
    await supabase.from("requerimientos").update({ estado: "activo" }).eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function descartar(id: string) {
    const supabase = createClient();
    await supabase.from("requerimientos").update({ estado: "cancelado" }).eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-widest text-laton">
        Bandeja del bot
      </p>
      <h1 className="mt-1 font-display text-3xl font-medium">Por revisar</h1>

      {cargando ? (
        <p className="mt-8 text-sm text-neutro">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-neutro">
          No hay requerimientos por revisar. Cuando el bot te traiga uno, aparece aquí.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-linea rounded-xl border border-linea bg-superficie">
          {items.map((r) => {
            const n = nivel(r.score);
            const cliente = r.clientes?.nombre || "Cliente sin identificar";
            const presu = r.presupuesto_max
              ? formatoCOP(r.presupuesto_max)
              : r.presupuesto_min
              ? formatoCOP(r.presupuesto_min)
              : "presupuesto abierto";
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-tinta">{cliente}</p>
                  <p className="text-sm text-neutro">
                    {r.titulo || "Requerimiento"} ·{" "}
                    {r.ciudad || r.zonas?.[0] || "—"} · {presu}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${n.clase}`}
                >
                  {n.texto}
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => aprobar(r.id)}
                    className="rounded-full bg-bosque px-4 py-1.5 text-xs font-medium text-superficie transition hover:bg-bosque-oscuro"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => descartar(r.id)}
                    className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-neutro transition hover:border-tinta"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
