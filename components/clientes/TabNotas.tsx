"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/utils";
import type { Conversacion } from "@/lib/types";

type Props = {
  clienteId: string;
  conversaciones: Conversacion[];
};

export default function TabNotas({ clienteId, conversaciones }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function agregar() {
    if (!texto.trim()) return;
    setGuardando(true);

    const supabase = createClient();
    await supabase.from("conversaciones").insert({
      cliente_id: clienteId,
      canal: "nota",
      direccion: "nota",
      contenido: texto.trim(),
    });

    setTexto("");
    setGuardando(false);
    router.refresh();
  }

  const iconoDireccion: Record<string, string> = {
    enviado: "→",
    recibido: "←",
    nota: "✎",
  };

  return (
    <div>
      {/* Input de nueva nota */}
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && agregar()}
          placeholder="Agregar una nota o registro de conversación…"
          className="flex-1 rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
        />
        <button
          onClick={agregar}
          disabled={guardando || !texto.trim()}
          className="shrink-0 rounded-lg bg-bosque px-4 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
        >
          {guardando ? "…" : "Guardar"}
        </button>
      </div>

      {/* Lista de notas/conversaciones */}
      {conversaciones.length === 0 ? (
        <p className="mt-6 text-center text-sm text-neutro">
          Sin notas todavía. Registra aquí tus conversaciones y observaciones.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {conversaciones.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-linea bg-superficie px-4 py-3"
            >
              <div className="flex items-center gap-2 text-xs text-neutro">
                <span>{iconoDireccion[c.direccion] ?? "•"}</span>
                <span className="capitalize">{c.canal}</span>
                <span>·</span>
                <span>{formatoFecha(c.fecha)}</span>
              </div>
              <p className="mt-1 text-sm text-tinta whitespace-pre-wrap">
                {c.contenido}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
