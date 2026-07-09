"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { codigoSabana } from "@/lib/utils";
import Vacio from "@/components/ui/Vacio";

/* eslint-disable @typescript-eslint/no-explicit-any */

type VisitaFull = {
  id: string;
  cliente_id: string;
  propiedad_id: string | null;
  fecha: string | null;
  estado: string;
  notas: string | null;
  clientes: { id: string; nombre: string; whatsapp: string | null } | null;
  propiedades: {
    id: string;
    consecutivo: number | null;
    titulo: string | null;
    barrio: string | null;
    ciudad: string | null;
    direccion: string | null;
  } | null;
};

type PropOpcion = {
  id: string;
  consecutivo: number | null;
  titulo: string | null;
  barrio: string | null;
  ciudad: string | null;
};

const hoyISO = () => new Date().toISOString().slice(0, 10);

function fechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso + "T12:00:00"));
}

function hora(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export default function AgendaPage() {
  const [visitas, setVisitas] = useState<VisitaFull[]>([]);
  const [clientes, setClientes] = useState<
    { id: string; nombre: string; whatsapp: string | null }[]
  >([]);
  const [propiedades, setPropiedades] = useState<PropOpcion[]>([]);
  const [gustadasIds, setGustadasIds] = useState<string[]>([]);
  const [verPasadas, setVerPasadas] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Nueva visita
  const [nCliente, setNCliente] = useState("");
  const [nPropiedad, setNPropiedad] = useState("");
  const [nFecha, setNFecha] = useState("");
  const [nHora, setNHora] = useState("");
  const [nNotas, setNNotas] = useState("");
  const [creando, setCreando] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al elegir cliente, cargar qué propiedades le gustaron (para sugerirlas primero)
  useEffect(() => {
    async function cargarGustadas() {
      if (!nCliente) {
        setGustadasIds([]);
        return;
      }
      const { data } = await supabase
        .from("portafolio_items")
        .select("propiedad_id, estatus, portafolio:portafolios!inner(cliente_id)")
        .eq("portafolio.cliente_id", nCliente)
        .eq("estatus", "le gustó");
      setGustadasIds(((data as any) ?? []).map((x: any) => x.propiedad_id));
    }
    cargarGustadas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nCliente]);

  async function cargar() {
    setCargando(true);
    const [visRes, cliRes, propRes] = await Promise.all([
      supabase
        .from("visitas")
        .select(
          `id, cliente_id, propiedad_id, fecha, estado, notas,
           clientes ( id, nombre, whatsapp ),
           propiedades ( id, consecutivo, titulo, barrio, ciudad, direccion )`
        )
        .order("fecha", { ascending: true }),
      supabase
        .from("clientes")
        .select("id, nombre, whatsapp")
        .eq("estado", "activo")
        .order("nombre"),
      supabase
        .from("propiedades")
        .select("id, consecutivo, titulo, barrio, ciudad")
        .neq("estado", "vendida")
        .order("consecutivo"),
    ]);
    setVisitas(((visRes.data as any) ?? []) as VisitaFull[]);
    setClientes(cliRes.data ?? []);
    setPropiedades((propRes.data as any) ?? []);
    setCargando(false);
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nCliente || !nPropiedad || !nFecha || !nHora) return;
    setCreando(true);
    const fechaISO = new Date(`${nFecha}T${nHora}`).toISOString();
    const { error } = await supabase.from("visitas").insert({
      cliente_id: nCliente,
      propiedad_id: nPropiedad,
      fecha: fechaISO,
      estado: "programada",
      notas: nNotas || null,
    });
    if (!error) {
      setNPropiedad("");
      setNNotas("");
      await cargar();
    }
    setCreando(false);
  }

  async function cambiarEstado(id: string, estado: string) {
    const { error } = await supabase
      .from("visitas")
      .update({ estado })
      .eq("id", id);
    if (!error)
      setVisitas((prev) => prev.map((v) => (v.id === id ? { ...v, estado } : v)));
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta visita?")) return;
    const { error } = await supabase.from("visitas").delete().eq("id", id);
    if (!error) setVisitas((prev) => prev.filter((v) => v.id !== id));
  }

  /** Genera y abre el mensaje de WhatsApp con el recorrido del día para un cliente */
  async function enviarRecordatorio(grupo: VisitaFull[]) {
    const cliente = grupo[0].clientes;
    const dia = grupo[0].fecha!.slice(0, 10);
    const primerNombre = cliente?.nombre?.split(" ")[0] ?? "";

    const lineas = grupo.map((v, i) => {
      const p = v.propiedades;
      const codigo = p ? codigoSabana(p.consecutivo) : "";
      const ubicacion = [p?.direccion, p?.barrio, p?.ciudad]
        .filter(Boolean)
        .join(", ");
      const maps = ubicacion
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ubicacion}, Colombia`)}`
        : "";
      return [
        `${i + 1}. ${hora(v.fecha!)} — ${codigo}${p?.titulo ? ` · ${p.titulo}` : ""}`,
        ubicacion ? `   📍 ${ubicacion}` : "",
        maps ? `   ${maps}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    });

    const mensaje = [
      `Hola ${primerNombre} 👋`,
      ``,
      `Te confirmo nuestro recorrido de visitas del ${fechaLarga(dia)}:`,
      ``,
      lineas.join("\n\n"),
      ``,
      `Nos encontramos en la primera dirección. Cualquier cambio me avisas por aquí. ¡Nos vemos!`,
    ].join("\n");

    const numero = cliente?.whatsapp?.replace(/\D/g, "") ?? "";
    const waUrl = numero
      ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    // Abrir WhatsApp de inmediato (Safari bloquea popups tras await)
    window.open(waUrl, "_blank");

    // Registrar el envío en el historial del cliente
    await supabase.from("conversaciones").insert({
      cliente_id: grupo[0].cliente_id,
      canal: "whatsapp",
      direccion: "enviado",
      contenido: `Recordatorio de visitas del ${fechaLarga(dia)}: ${grupo.length} ${grupo.length === 1 ? "propiedad" : "propiedades"}.`,
    });
  }

  // ── Agrupar: programadas futuras (o de hoy) vs pasadas/cerradas ──
  const ahoraDia = hoyISO();
  const activas = visitas.filter(
    (v) =>
      v.estado === "programada" && v.fecha && v.fecha.slice(0, 10) >= ahoraDia
  );
  const pasadas = visitas
    .filter(
      (v) =>
        v.estado !== "programada" ||
        !v.fecha ||
        v.fecha.slice(0, 10) < ahoraDia
    )
    .reverse();

  const visibles = verPasadas ? pasadas : activas;

  // Agrupar por día y, dentro del día, por cliente (para el recordatorio)
  const porDia: Record<string, VisitaFull[]> = {};
  visibles.forEach((v) => {
    const dia = v.fecha ? v.fecha.slice(0, 10) : "sin-fecha";
    (porDia[dia] = porDia[dia] ?? []).push(v);
  });
  const dias = Object.keys(porDia).sort(
    (a, b) => (verPasadas ? b.localeCompare(a) : a.localeCompare(b))
  );

  // Propiedades ordenadas: primero las que le gustaron al cliente elegido
  const propsOrdenadas = [...propiedades].sort((a, b) => {
    const ga = gustadasIds.includes(a.id) ? 0 : 1;
    const gb = gustadasIds.includes(b.id) ? 0 : 1;
    return ga - gb || (a.consecutivo ?? 999) - (b.consecutivo ?? 999);
  });

  const campo =
    "rounded-lg border border-linea bg-superficie px-3 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            Citas y visitas
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Agenda</h1>
        </div>
        <div className="flex gap-1.5">
          {[
            { v: false, txt: `Próximas (${activas.length})` },
            { v: true, txt: `Historial (${pasadas.length})` },
          ].map((o) => (
            <button
              key={String(o.v)}
              onClick={() => setVerPasadas(o.v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                verPasadas === o.v
                  ? "border-bosque bg-bosque text-white"
                  : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
              }`}
            >
              {o.txt}
            </button>
          ))}
        </div>
      </div>

      {/* Agendar visita */}
      <form
        onSubmit={crear}
        className="mt-6 rounded-xl border border-linea bg-superficie p-4"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-laton">
          Agendar visita
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={nCliente}
            onChange={(e) => setNCliente(e.target.value)}
            required
            className={campo}
          >
            <option value="">Cliente *</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select
            value={nPropiedad}
            onChange={(e) => setNPropiedad(e.target.value)}
            required
            className={campo}
          >
            <option value="">Propiedad *</option>
            {propsOrdenadas.map((p) => (
              <option key={p.id} value={p.id}>
                {gustadasIds.includes(p.id) ? "♥ " : ""}
                {codigoSabana(p.consecutivo)} ·{" "}
                {p.titulo || [p.barrio, p.ciudad].filter(Boolean).join(", ") || "Propiedad"}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={nFecha}
            min={hoyISO()}
            onChange={(e) => setNFecha(e.target.value)}
            required
            className={campo}
          />
          <input
            type="time"
            value={nHora}
            onChange={(e) => setNHora(e.target.value)}
            required
            className={campo}
          />
          <button
            type="submit"
            disabled={creando}
            className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-50"
          >
            {creando ? "Agendando…" : "+ Agendar"}
          </button>
        </div>
        <input
          value={nNotas}
          onChange={(e) => setNNotas(e.target.value)}
          placeholder="Notas (opcional): portería, quién recibe, llaves…"
          className={`mt-3 w-full ${campo}`}
        />
        {nCliente && gustadasIds.length > 0 && (
          <p className="mt-2 text-[11px] text-neutro">
            ♥ = propiedades que le gustaron a este cliente (aparecen primero).
          </p>
        )}
      </form>

      {/* Lista agrupada por día */}
      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="📅"
            titulo={verPasadas ? "Sin historial" : "Sin visitas próximas"}
            descripcion={
              verPasadas
                ? "Las visitas realizadas o canceladas aparecerán aquí."
                : "Agenda tu primera visita con el formulario de arriba."
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {dias.map((dia) => {
            // Sub-agrupar por cliente para el botón de recordatorio
            const porCliente: Record<string, VisitaFull[]> = {};
            porDia[dia].forEach((v) => {
              (porCliente[v.cliente_id] = porCliente[v.cliente_id] ?? []).push(v);
            });

            return (
              <div key={dia}>
                <p className="border-b border-linea pb-2 text-xs font-semibold uppercase tracking-widest text-tinta">
                  {dia === "sin-fecha" ? "Sin fecha" : fechaLarga(dia)}
                  {dia === hoyISO() && (
                    <span className="ml-2 rounded-full bg-bosque px-2 py-0.5 text-[9px] font-semibold uppercase text-white">
                      Hoy
                    </span>
                  )}
                </p>

                {Object.values(porCliente).map((grupo) => (
                  <div
                    key={grupo[0].cliente_id + dia}
                    className="mt-3 overflow-hidden rounded-xl border border-linea bg-superficie"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea bg-fondo px-4 py-2.5">
                      <Link
                        href={`/clientes/${grupo[0].cliente_id}`}
                        className="text-sm font-medium text-tinta transition hover:text-bosque"
                      >
                        {grupo[0].clientes?.nombre ?? "Cliente"}
                        <span className="ml-2 text-xs font-normal text-neutro">
                          {grupo.length}{" "}
                          {grupo.length === 1 ? "propiedad" : "propiedades"}
                        </span>
                      </Link>
                      {!verPasadas && (
                        <button
                          onClick={() => enviarRecordatorio(grupo)}
                          className="rounded-full bg-[#141414] px-4 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-80"
                        >
                          Enviar recordatorio →
                        </button>
                      )}
                    </div>

                    {grupo.map((v, i) => (
                      <div
                        key={v.id}
                        className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center ${
                          i > 0 ? "border-t border-linea" : ""
                        }`}
                      >
                        <span className="w-16 shrink-0 text-sm font-semibold text-tinta">
                          {v.fecha ? hora(v.fecha) : "—"}
                        </span>
                        <div className="min-w-0 flex-1">
                          {v.propiedades ? (
                            <p className="text-sm">
                              <Link
                                href={`/propiedades/${v.propiedades.id}`}
                                className="font-semibold uppercase tracking-wider text-bosque underline-offset-2 hover:underline"
                              >
                                {codigoSabana(v.propiedades.consecutivo)}
                              </Link>
                              <span className="ml-2 text-tinta">
                                {v.propiedades.titulo || "Propiedad"}
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm text-neutro">
                              Propiedad eliminada
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-neutro">
                            {[
                              v.propiedades?.direccion,
                              v.propiedades?.barrio,
                              v.propiedades?.ciudad,
                            ]
                              .filter(Boolean)
                              .join(", ") || "Sin dirección registrada"}
                            {v.notas ? `  ·  ${v.notas}` : ""}
                            {verPasadas && v.estado !== "programada"
                              ? `  ·  ${v.estado}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {v.estado === "programada" && (
                            <>
                              <button
                                onClick={() => cambiarEstado(v.id, "realizada")}
                                className="rounded-full border border-linea px-3 py-1 text-[11px] font-medium text-neutro transition hover:border-bosque hover:text-bosque"
                              >
                                Realizada
                              </button>
                              <button
                                onClick={() => cambiarEstado(v.id, "cancelada")}
                                className="rounded-full border border-linea px-3 py-1 text-[11px] font-medium text-neutro transition hover:border-[#8E3B31] hover:text-[#8E3B31]"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => eliminar(v.id)}
                            className="rounded-full border border-linea px-3 py-1 text-[11px] font-medium text-neutro transition hover:border-[#8E3B31] hover:text-[#8E3B31]"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
