"use client";

// components/clientes/TabPortafolios.tsx
// Portafolios de un comprador, desde su ficha única: crear, copiar el
// enlace, enviarlo por WhatsApp y ver las reacciones que marcó.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

type Portafolio = {
  id: string;
  token: string;
  titulo: string | null;
  estado: string;
  fecha_envio: string | null;
  created_at: string;
  portafolio_items: { id: string; reaccion: string | null }[];
};

export default function TabPortafolios({
  clienteId,
  whatsapp,
}: {
  clienteId: string;
  whatsapp?: string | null;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<Portafolio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function cargar() {
    const { data } = await supabase
      .from("portafolios")
      .select("id, token, titulo, estado, fecha_envio, created_at, portafolio_items(id, reaccion)")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });
    setItems((data as unknown as Portafolio[]) ?? []);
    setCargando(false);
  }

  const url = (token: string) => `${window.location.origin}/p/${token}`;

  async function copiar(p: Portafolio) {
    await navigator.clipboard.writeText(url(p.token));
    setCopiado(p.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function marcarEnviado(p: Portafolio) {
    if (p.estado !== "borrador") return;
    await supabase
      .from("portafolios")
      .update({ estado: "enviado", fecha_envio: new Date().toISOString() })
      .eq("id", p.id);
    cargar();
  }

  function enviarWhatsApp(p: Portafolio) {
    const digitos = (whatsapp ?? "").replace(/\D/g, "");
    const texto = encodeURIComponent(`Hola, te preparé una selección de inmuebles: ${url(p.token)}`);
    window.open(`https://wa.me/${digitos}?text=${texto}`, "_blank", "noopener,noreferrer");
    marcarEnviado(p);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutro">
          {items.length === 0
            ? "Este comprador todavía no tiene portafolios."
            : `${items.length} portafolio${items.length !== 1 ? "s" : ""}`}
        </p>
        <Link
          href={`/portafolios/nuevo?cliente=${clienteId}`}
          className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro"
        >
          + Crear portafolio
        </Link>
      </div>

      {cargando ? (
        <p className="mt-6 text-sm text-neutro">Cargando…</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((p) => {
            const total = p.portafolio_items?.length ?? 0;
            const si = (p.portafolio_items ?? []).filter((i) => i.reaccion === "interesa").length;
            const no = (p.portafolio_items ?? []).filter((i) => i.reaccion === "no_interesa").length;
            return (
              <div key={p.id} className="rounded-xl border border-linea bg-superficie p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-tinta">{p.titulo || "Portafolio"}</p>
                      <Badge texto={p.estado} />
                    </div>
                    <p className="mt-1 text-xs text-neutro">
                      {total} inmueble{total !== 1 ? "s" : ""}
                      {" · "}
                      {si + no === 0
                        ? "sin reacciones todavía"
                        : `${si} le interesa${si !== 1 ? "n" : ""} · ${no} no · ${total - si - no} sin marcar`}
                      {" · "}
                      {p.fecha_envio ? `enviado el ${formatoFecha(p.fecha_envio)}` : `creado el ${formatoFecha(p.created_at)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/p/${p.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-tinta transition hover:border-[#1A1A18]"
                    >
                      Abrir
                    </a>
                    <button
                      onClick={() => copiar(p)}
                      className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-tinta transition hover:border-[#1A1A18]"
                    >
                      {copiado === p.id ? "Copiado ✓" : "Copiar link"}
                    </button>
                    {whatsapp && (
                      <button
                        onClick={() => enviarWhatsApp(p)}
                        className="rounded-full bg-bosque px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-85"
                      >
                        Enviar por WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
