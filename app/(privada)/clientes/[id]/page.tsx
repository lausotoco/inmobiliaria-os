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
import type { Cliente, Requerimiento, Conversacion } from "@/lib/types";

const TABS = ["requerimientos", "notas", "editar"] as const;
type Tab = (typeof TABS)[number];

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [tab, setTab] = useState<Tab>("requerimientos");
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    cargar();
  }, [id]);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();

    const [clienteRes, reqRes, convRes] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", id).single(),
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
    setRequerimientos(reqRes.data ?? []);
    setConversaciones(convRes.data ?? []);
    setCargando(false);
  }

  // Re-fetch cuando se vuelve a la pestaña (para reflejar cambios de tabs internos)
  useEffect(() => {
    if (!cargando) cargar();
  }, [tab]);

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
        ← Clientes
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium">{cliente.nombre}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge texto={cliente.estado} />
            <Badge texto={cliente.urgencia} />
            {cliente.credito_aprobado && <Badge texto="crédito aprobado" />}
          </div>
        </div>

        {cliente.whatsapp && (
          <a
            href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            WhatsApp →
          </a>
        )}
      </div>

      {/* Resumen */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { k: "WhatsApp", v: cliente.whatsapp },
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

        {tab === "notas" && (
          <TabNotas clienteId={id} conversaciones={conversaciones} />
        )}

        {tab === "editar" && (
          <div>
            <FormCliente cliente={cliente} />
            <div className="mt-12 rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-medium text-red-700">Zona peligrosa</p>
              <p className="mt-1 text-sm text-red-600">
                Eliminar este cliente borra también todos sus requerimientos,
                notas y portafolios asociados.
              </p>
              <button
                onClick={eliminarCliente}
                disabled={eliminando}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
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
