"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Vacio from "@/components/ui/Vacio";

type PortafolioLista = {
  id: string;
  token: string;
  titulo: string | null;
  mensaje_personal: string | null;
  estado: string;
  fecha_envio: string | null;
  created_at: string;
  clientes: { id: string; nombre: string; whatsapp: string | null } | null;
  portafolio_items: { id: string }[];
};

export default function PortafoliosPage() {
  const router = useRouter();
  const supabase = createClient();
  const [portafolios, setPortafolios] = useState<PortafolioLista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase
      .from("portafolios")
      .select("id, token, titulo, mensaje_personal, estado, fecha_envio, created_at, clientes(id, nombre, whatsapp), portafolio_items(id)")
      .order("created_at", { ascending: false });
    setPortafolios((data as unknown as PortafolioLista[]) ?? []);
    setCargando(false);
  }

  function urlPortafolio(token: string) {
    return `${window.location.origin}/p/${token}`;
  }

  async function copiarLink(p: PortafolioLista) {
    await navigator.clipboard.writeText(urlPortafolio(p.token));
    setCopiado(p.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function enviarWhatsApp(p: PortafolioLista) {
    const url = urlPortafolio(p.token);
    const nombre = p.clientes?.nombre?.split(" ")[0] ?? "";
    const texto = encodeURIComponent(
      `Hola ${nombre} 👋 Preparé un portafolio exclusivo con propiedades seleccionadas para ti. Míralo aquí:\n\n${url}`
    );

    const numero = p.clientes?.whatsapp?.replace(/\D/g, "") ?? "";
    const waUrl = numero
      ? `https://wa.me/${numero}?text=${texto}`
      : `https://wa.me/?text=${texto}`;

    // Abrir WhatsApp INMEDIATAMENTE (Safari bloquea ventanas abiertas
    // después de operaciones asíncronas), y registrar el envío después.
    window.open(waUrl, "_blank");

    await supabase
      .from("portafolios")
      .update({ estado: "enviado", fecha_envio: new Date().toISOString() })
      .eq("id", p.id);

    if (p.clientes?.id) {
      await supabase.from("conversaciones").insert({
        cliente_id: p.clientes.id,
        canal: "whatsapp",
        direccion: "enviado",
        contenido: `Portafolio enviado: "${p.titulo ?? "Sin título"}" → ${url}`,
      });
      await supabase
        .from("clientes")
        .update({ ultimo_contacto: new Date().toISOString() })
        .eq("id", p.clientes.id);
    }

    cargar();
  }

  async function eliminar(p: PortafolioLista) {
    if (!confirm("¿Eliminar este portafolio? El enlace dejará de funcionar.")) return;
    await supabase.from("portafolios").delete().eq("id", p.id);
    cargar();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            El corazón del sistema
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Portafolios</h1>
        </div>
        <Link
          href="/portafolios/nuevo"
          className="shrink-0 rounded-lg bg-bosque px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-bosque-oscuro"
        >
          + Nuevo portafolio
        </Link>
      </div>

      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : portafolios.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="▤"
            titulo="Sin portafolios"
            descripcion="Genera tu primera página privada: selecciona un cliente, elige propiedades y envíala por WhatsApp."
          >
            <Link
              href="/portafolios/nuevo"
              className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro"
            >
              + Nuevo portafolio
            </Link>
          </Vacio>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {portafolios.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-linea bg-superficie p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-tinta">
                      {p.titulo || "Portafolio"}
                    </p>
                    <Badge texto={p.estado} />
                  </div>
                  <p className="mt-0.5 text-sm text-neutro">
                    Para{" "}
                    <Link
                      href={`/clientes/${p.clientes?.id}`}
                      className="text-bosque underline"
                    >
                      {p.clientes?.nombre}
                    </Link>
                    {" · "}
                    {p.portafolio_items.length} propiedad
                    {p.portafolio_items.length !== 1 ? "es" : ""}
                    {" · "}
                    creado {formatoFecha(p.created_at)}
                    {p.fecha_envio && ` · enviado ${formatoFecha(p.fecha_envio)}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/p/${p.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-linea px-3.5 py-2 text-xs font-medium text-tinta transition hover:bg-fondo"
                  >
                    Ver ↗
                  </a>
                  <button
                    onClick={() => copiarLink(p)}
                    className="rounded-lg border border-linea px-3.5 py-2 text-xs font-medium text-tinta transition hover:bg-fondo"
                  >
                    {copiado === p.id ? "✓ Copiado" : "Copiar enlace"}
                  </button>
                  <button
                    onClick={() => enviarWhatsApp(p)}
                    className="rounded-lg bg-[#1A1A18] rounded-full px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-80"
                  >
                    Enviar por WhatsApp
                  </button>
                  <button
                    onClick={() => eliminar(p)}
                    className="rounded-lg px-2 py-2 text-xs text-neutro transition hover:text-[#8E3B31]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
