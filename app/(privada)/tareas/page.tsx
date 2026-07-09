"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/utils";
import Vacio from "@/components/ui/Vacio";

/* eslint-disable @typescript-eslint/no-explicit-any */

type TareaConCliente = {
  id: string;
  cliente_id: string | null;
  descripcion: string;
  fecha_limite: string | null;
  origen: string;
  tipo_auto: string | null;
  estado: string;
  created_at: string;
  clientes: { id: string; nombre: string } | null;
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function TareasPage() {
  const [tareas, setTareas] = useState<TareaConCliente[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [verCompletadas, setVerCompletadas] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Nueva tarea
  const [nuevaDesc, setNuevaDesc] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState("");
  const [creando, setCreando] = useState(false);

  // Edición inline
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editFecha, setEditFecha] = useState("");

  const supabase = createClient();

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargar() {
    setCargando(true);

    // Genera/actualiza las tareas automáticas antes de leer
    await supabase.rpc("generar_tareas_automaticas");

    const [tareasRes, clientesRes] = await Promise.all([
      supabase
        .from("tareas")
        .select("*, clientes(id, nombre)")
        .order("estado", { ascending: true })
        .order("fecha_limite", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("clientes")
        .select("id, nombre")
        .eq("estado", "activo")
        .order("nombre"),
    ]);

    setTareas((tareasRes.data as any) ?? []);
    setClientes(clientesRes.data ?? []);
    setCargando(false);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaDesc.trim()) return;
    setCreando(true);
    const { error } = await supabase.from("tareas").insert({
      descripcion: nuevaDesc.trim(),
      fecha_limite: nuevaFecha || null,
      cliente_id: nuevoCliente || null,
      origen: "manual",
    });
    if (!error) {
      setNuevaDesc("");
      setNuevaFecha("");
      setNuevoCliente("");
      await cargar();
    }
    setCreando(false);
  }

  async function cambiarEstado(t: TareaConCliente) {
    const nuevo = t.estado === "pendiente" ? "completada" : "pendiente";
    const { error } = await supabase
      .from("tareas")
      .update({ estado: nuevo })
      .eq("id", t.id);
    if (!error) {
      setTareas((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, estado: nuevo } : x))
      );
    }
  }

  function empezarEdicion(t: TareaConCliente) {
    setEditandoId(t.id);
    setEditDesc(t.descripcion);
    setEditFecha(t.fecha_limite ?? "");
  }

  async function guardarEdicion(id: string) {
    const { error } = await supabase
      .from("tareas")
      .update({ descripcion: editDesc.trim(), fecha_limite: editFecha || null })
      .eq("id", id);
    if (!error) {
      setTareas((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, descripcion: editDesc.trim(), fecha_limite: editFecha || null }
            : x
        )
      );
      setEditandoId(null);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    const { error } = await supabase.from("tareas").delete().eq("id", id);
    if (!error) setTareas((prev) => prev.filter((x) => x.id !== id));
  }

  const pendientes = tareas.filter((t) => t.estado === "pendiente");
  const completadas = tareas.filter((t) => t.estado === "completada");
  const vencidas = pendientes.filter(
    (t) => t.fecha_limite && t.fecha_limite < hoyISO()
  ).length;

  const visibles = verCompletadas ? completadas : pendientes;

  const campo =
    "rounded-lg border border-linea bg-superficie px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            Pendientes
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Tareas</h1>
        </div>
        <div className="flex gap-1.5">
          {[
            { v: false, txt: `Pendientes (${pendientes.length})` },
            { v: true, txt: `Completadas (${completadas.length})` },
          ].map((o) => (
            <button
              key={String(o.v)}
              onClick={() => setVerCompletadas(o.v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                verCompletadas === o.v
                  ? "border-bosque bg-bosque text-white"
                  : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
              }`}
            >
              {o.txt}
            </button>
          ))}
        </div>
      </div>

      {vencidas > 0 && !verCompletadas && (
        <p className="mt-4 rounded-lg border border-[#E8D8D3] bg-[#F7EFEC] px-4 py-2.5 text-sm text-[#8E3B31]">
          Tienes {vencidas} {vencidas === 1 ? "tarea vencida" : "tareas vencidas"}.
        </p>
      )}

      {/* Crear tarea */}
      <form
        onSubmit={crear}
        className="mt-6 flex flex-col gap-3 rounded-xl border border-linea bg-superficie p-4 sm:flex-row"
      >
        <input
          value={nuevaDesc}
          onChange={(e) => setNuevaDesc(e.target.value)}
          placeholder="Nueva tarea… (ej: Llamar al notario por la promesa)"
          className={`flex-1 ${campo}`}
        />
        <input
          type="date"
          value={nuevaFecha}
          onChange={(e) => setNuevaFecha(e.target.value)}
          className={campo}
        />
        <select
          value={nuevoCliente}
          onChange={(e) => setNuevoCliente(e.target.value)}
          className={campo}
        >
          <option value="">Sin cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={creando || !nuevaDesc.trim()}
          className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-50"
        >
          {creando ? "Creando…" : "+ Agregar"}
        </button>
      </form>

      {/* Lista */}
      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="✓"
            titulo={verCompletadas ? "Sin tareas completadas" : "Todo al día"}
            descripcion={
              verCompletadas
                ? "Las tareas que completes aparecerán aquí."
                : "No tienes tareas pendientes. Las automáticas aparecerán solas cuando haga falta."
            }
          />
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-linea bg-superficie">
          {visibles.map((t, i) => {
            const vencida =
              t.estado === "pendiente" &&
              !!t.fecha_limite &&
              t.fecha_limite < hoyISO();
            const editando = editandoId === t.id;

            return (
              <div
                key={t.id}
                className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center ${
                  i > 0 ? "border-t border-linea" : ""
                }`}
              >
                {/* Check */}
                <button
                  onClick={() => cambiarEstado(t)}
                  title={
                    t.estado === "pendiente"
                      ? "Marcar completada"
                      : "Reabrir tarea"
                  }
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                    t.estado === "completada"
                      ? "border-bosque bg-bosque text-white"
                      : "border-linea bg-fondo text-transparent hover:border-bosque hover:text-bosque"
                  }`}
                >
                  ✓
                </button>

                {/* Contenido */}
                <div className="min-w-0 flex-1">
                  {editando ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className={`flex-1 ${campo}`}
                        autoFocus
                      />
                      <input
                        type="date"
                        value={editFecha}
                        onChange={(e) => setEditFecha(e.target.value)}
                        className={campo}
                      />
                    </div>
                  ) : (
                    <>
                      <p
                        className={`text-sm ${
                          t.estado === "completada"
                            ? "text-neutro line-through"
                            : "text-tinta"
                        }`}
                      >
                        {t.descripcion}
                        {t.origen === "automatica" && (
                          <span className="ml-2 rounded-full border border-linea bg-fondo px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutro">
                            auto
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-neutro">
                        {t.clientes && (
                          <Link
                            href={`/clientes/${t.clientes.id}`}
                            className="text-bosque underline-offset-2 hover:underline"
                          >
                            {t.clientes.nombre}
                          </Link>
                        )}
                        {t.clientes && "  ·  "}
                        {t.fecha_limite ? (
                          <span className={vencida ? "font-medium text-[#8E3B31]" : ""}>
                            {vencida ? "Venció " : "Vence "}
                            {formatoFecha(t.fecha_limite)}
                          </span>
                        ) : (
                          "Sin fecha límite"
                        )}
                      </p>
                    </>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex shrink-0 gap-1.5">
                  {editando ? (
                    <>
                      <button
                        onClick={() => guardarEdicion(t.id)}
                        className="rounded-full bg-bosque px-3.5 py-1 text-[11px] font-medium text-white transition hover:bg-bosque-oscuro"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="rounded-full border border-linea px-3.5 py-1 text-[11px] font-medium text-neutro transition hover:text-tinta"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      {t.estado === "pendiente" && (
                        <button
                          onClick={() => empezarEdicion(t)}
                          className="rounded-full border border-linea px-3.5 py-1 text-[11px] font-medium text-neutro transition hover:border-bosque hover:text-bosque"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => eliminar(t.id)}
                        className="rounded-full border border-linea px-3.5 py-1 text-[11px] font-medium text-neutro transition hover:border-[#8E3B31] hover:text-[#8E3B31]"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
