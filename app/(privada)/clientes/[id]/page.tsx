"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, formatoFecha } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import FormCliente from "@/components/clientes/FormCliente";
import TabRequerimientos from "@/components/clientes/TabRequerimientos";
import TabNotas from "@/components/clientes/TabNotas";
import TabPropiedadesEnviadas from "@/components/clientes/TabPropiedadesEnviadas";
import TabPortafolios from "@/components/clientes/TabPortafolios";
import FichaCalificacion from "@/components/compradores/FichaCalificacion";
import type { Cliente, Requerimiento, Conversacion } from "@/lib/types";

// Una sola ficha por comprador: requerimiento, calificación, portafolios,
// enviadas y notas. Se puede abrir en una pestaña con ?tab=<nombre>.
const TABS = ["requerimientos", "calificacion", "portafolios", "enviadas", "notas", "editar"] as const;
const ESTILO_BANDA: Record<string, string> = {
  A: "border-[#1A1A18] bg-[#1A1A18] text-white",
  B: "border-[#1A1A18]/25 text-[#1A1A18]",
  C: "border-linea text-neutro",
  D: "border-[#D5BBB5] text-[#8E3B31]",
};
type Tab = (typeof TABS)[number];

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [tab, setTab] = useState<Tab>("requerimientos");
  const [banda, setBanda] = useState<string | null>(null);

  // Pestaña inicial desde la URL (?tab=calificacion, ?tab=portafolios…)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && (TABS as readonly string[]).includes(t)) setTab(t as Tab);
  }, []);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    cargar();
  }, [id]);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();

    const [clienteRes, calRes, reqRes, convRes] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", id).single(),
      supabase
        .from("calificaciones")
        .select("banda_final, banda_calculada")
        .eq("cliente_id", id)
        .maybeSingle(),
      supabase
        .from("requerimientos")
        .select("*")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversaciones")
        .select("*")
        .eq("cliente_id", id)
        .order("fecha", { ascending: false }),
    ]);

    setCliente(clienteRes.data);
    setBanda(calRes.data?.banda_final ?? calRes.data?.banda_calculada ?? null);
    setRequerimientos(reqRes.data ?? []);
    setConversaciones(convRes.data ?? []);
    setCargando(false);
  }

  // Re-fetch cuando se vuelve a la pestaña (para reflejar cambios de tabs internos)
  useEffect(() => {
    if (!cargando) cargar();
  }, [tab]);

  async function cambiarRapido(campo: "estado" | "prioridad", valor: string) {
    if (!cliente) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("clientes")
      .update({ [campo]: valor })
      .eq("id", id);
    if (!error) setCliente({ ...cliente, [campo]: valor });
  }

  async function eliminarCliente() {
    if (
      !confirm(
        "¿Eliminar este cliente y todos sus datos? Esta acción no se puede deshacer."
      )
    )
      return;
    setEliminando(true);
    const supabase = createClient();
    await supabase.from("clientes").delete().eq("id", id);
    router.push("/clientes");
    router.refresh();
  }

  if (cargando) {
    return <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>;
  }

  if (!cliente) {
    return (
      <div className="mt-12 text-center">
        <p className="text-neutro">Cliente no encontrado.</p>
        <Link href="/clientes" className="mt-3 text-sm text-bosque underline">
          Volver a clientes
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Link
        href="/clientes"
        className="text-sm text-neutro transition hover:text-tinta"
      >
        ← Compradores
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-medium">{cliente.nombre}</h1>
            <button
              onClick={() => setTab("calificacion")}
              title="Ver o cambiar la calificación"
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition hover:opacity-80 ${
                banda ? ESTILO_BANDA[banda] ?? "border-linea text-neutro" : "border-linea text-neutro"
              }`}
            >
              {banda ? `Banda ${banda}` : "Sin calificar"}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-medium uppercase tracking-widest text-neutro">
                Estado
              </span>
              {["activo", "en pausa", "cerrado", "perdido"].map((e) => (
                <button
                  key={e}
                  onClick={() => cambiarRapido("estado", e)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition ${
                    cliente.estado === e
                      ? "border-bosque bg-bosque text-white"
                      : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-medium uppercase tracking-widest text-neutro">
                Prioridad
              </span>
              {["alta", "media", "baja"].map((p) => (
                <button
                  key={p}
                  onClick={() => cambiarRapido("prioridad", p)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition ${
                    cliente.prioridad === p
                      ? "border-[#1A1A18] bg-[#1A1A18] text-white"
                      : "border-linea bg-superficie text-neutro hover:border-[#1A1A18] hover:text-tinta"
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="ml-2 flex gap-1.5">
                <Badge texto={cliente.urgencia} />
                {cliente.credito_aprobado && <Badge texto="crédito aprobado" />}
              </span>
            </div>
          </div>
        </div>

        {cliente.whatsapp && (
          <a
            href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-[#1A1A18] rounded-full px-5 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-80"
          >
            WhatsApp →
          </a>
        )}
      </div>

      {/* Resumen */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { k: "WhatsApp", v: cliente.whatsapp },
          { k: "Cédula", v: cliente.cedula },
          { k: "Ciudad", v: cliente.ciudad },
          { k: "Banco", v: cliente.banco },
          {
            k: "Inicial disponible",
            v: formatoCOP(cliente.inicial_disponible),
          },
          { k: "Probabilidad", v: cliente.probabilidad_cierre ? `${cliente.probabilidad_cierre}%` : null },
          { k: "Último contacto", v: formatoFecha(cliente.ultimo_contacto) },
        ]
          .filter((x) => x.v && x.v !== "—")
          .map((x) => (
            <div
              key={x.k}
              className="rounded-lg border border-linea bg-superficie px-3 py-2.5"
            >
              <p className="text-xs text-neutro">{x.k}</p>
              <p className="mt-0.5 text-sm font-medium text-tinta">{x.v}</p>
            </div>
          ))}
      </div>

      {cliente.notas && (
        <p className="mt-4 rounded-lg border border-linea bg-superficie px-4 py-3 text-sm italic text-neutro">
          {cliente.notas}
        </p>
      )}

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-linea">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition ${
              tab === t
                ? "border-bosque text-bosque"
                : "border-transparent text-neutro hover:text-tinta"
            }`}
          >
            {t === "requerimientos"
              ? `Requerimientos (${requerimientos.length})`
              : t === "calificacion"
                ? "Calificación"
                : t === "portafolios"
                  ? "Portafolios"
                  : t === "enviadas"
                    ? "Propiedades enviadas"
                    : t === "notas"
                      ? `Notas (${conversaciones.length})`
                      : "Editar"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {tab === "requerimientos" && (
          <TabRequerimientos
            clienteId={id}
            requerimientos={requerimientos}
          />
        )}

        {tab === "calificacion" && <FichaCalificacion clienteId={id} embebida />}

        {tab === "portafolios" && (
          <TabPortafolios clienteId={id} whatsapp={cliente.whatsapp} />
        )}

        {tab === "enviadas" && <TabPropiedadesEnviadas clienteId={id} />}

        {tab === "notas" && (
          <TabNotas clienteId={id} conversaciones={conversaciones} />
        )}

        {tab === "editar" && (
          <div>
            <FormCliente cliente={cliente} />
            <div className="mt-12 rounded-xl border border-[#E8D8D3] bg-[#F7EFEC] p-6">
              <p className="text-sm font-medium text-[#8E3B31]">Zona peligrosa</p>
              <p className="mt-1 text-sm text-[#8E3B31]">
                Eliminar este cliente borra también todos sus requerimientos,
                notas y portafolios asociados.
              </p>
              <button
                onClick={eliminarCliente}
                disabled={eliminando}
                className="mt-4 rounded-lg bg-[#8E3B31] px-4 py-2 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-60"
              >
                {eliminando ? "Eliminando…" : "Eliminar cliente"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
