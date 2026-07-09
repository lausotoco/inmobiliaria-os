"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP } from "@/lib/utils";
import type { Cliente, Propiedad } from "@/lib/types";

type PropConExtras = Propiedad & { portada?: string; aceptada?: boolean };

export default function NuevoPortafolioPage() {
  const router = useRouter();
  const supabase = createClient();

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [propiedades, setPropiedades] = useState<PropConExtras[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarClientes() {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre");
    setClientes(data ?? []);
    setCargando(false);
  }

  async function elegirCliente(c: Cliente) {
    setClienteSel(c);
    setTitulo(`Selección exclusiva para ${c.nombre.split(" ")[0]}`);
    setCargando(true);

    // Propiedades disponibles
    const { data: props } = await supabase
      .from("propiedades")
      .select("*")
      .eq("estado", "disponible")
      .order("created_at", { ascending: false });

    // Matches aceptados de este cliente (van primero, preseleccionados)
    const { data: reqs } = await supabase
      .from("requerimientos")
      .select("id")
      .eq("cliente_id", c.id);

    const idsReqs = (reqs ?? []).map((r) => r.id);
    let aceptadasIds = new Set<string>();

    if (idsReqs.length > 0) {
      const { data: matches } = await supabase
        .from("matches")
        .select("propiedad_id")
        .in("requerimiento_id", idsReqs)
        .eq("estado", "aceptado");
      aceptadasIds = new Set((matches ?? []).map((m) => m.propiedad_id));
    }

    // Portadas
    const lista = (props ?? []) as PropConExtras[];
    const ids = lista.map((p) => p.id);
    if (ids.length > 0) {
      const { data: imgs } = await supabase
        .from("propiedad_imagenes")
        .select("propiedad_id, ruta_storage, orden")
        .in("propiedad_id", ids)
        .order("orden");

      const portadas: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imgs ?? []).forEach((img: any) => {
        if (!portadas[img.propiedad_id]) {
          const { data } = supabase.storage
            .from("propiedades")
            .getPublicUrl(img.ruta_storage);
          portadas[img.propiedad_id] = data.publicUrl;
        }
      });
      lista.forEach((p) => {
        p.portada = portadas[p.id];
        p.aceptada = aceptadasIds.has(p.id);
      });
    }

    // Aceptadas primero
    lista.sort((a, b) => Number(b.aceptada ?? false) - Number(a.aceptada ?? false));

    setPropiedades(lista);
    setSeleccionadas(new Set(aceptadasIds));
    setCargando(false);
    setPaso(2);
  }

  function toggle(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generar() {
    if (!clienteSel || seleccionadas.size === 0) return;
    setGenerando(true);

    // Crear el portafolio (el token se genera solo en la base de datos)
    const { data: portafolio, error } = await supabase
      .from("portafolios")
      .insert({
        cliente_id: clienteSel.id,
        titulo: titulo || null,
        mensaje_personal: mensaje || null,
        estado: "borrador",
      })
      .select("id, token")
      .single();

    if (error || !portafolio) {
      alert("Error creando el portafolio: " + (error?.message ?? ""));
      setGenerando(false);
      return;
    }

    // Insertar las propiedades en el orden en que aparecen
    const items = propiedades
      .filter((p) => seleccionadas.has(p.id))
      .map((p, idx) => ({
        portafolio_id: portafolio.id,
        propiedad_id: p.id,
        orden: idx,
      }));

    await supabase.from("portafolio_items").insert(items);

    router.push("/portafolios");
    router.refresh();
  }

  const filtradas = propiedades.filter((p) => {
    const txt = busqueda.toLowerCase();
    return (
      !busqueda ||
      p.titulo?.toLowerCase().includes(txt) ||
      p.ciudad?.toLowerCase().includes(txt) ||
      p.barrio?.toLowerCase().includes(txt)
    );
  });

  return (
    <div>
      <Link
        href="/portafolios"
        className="text-sm text-neutro transition hover:text-tinta"
      >
        ← Portafolios
      </Link>
      <h1 className="mt-2 font-display text-3xl font-medium">
        Nuevo portafolio
      </h1>

      {/* Indicador de pasos */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        {[
          { n: 1, t: "Cliente" },
          { n: 2, t: "Propiedades" },
          { n: 3, t: "Generar" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && <span className="text-linea">—</span>}
            <span
              className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                paso >= s.n
                  ? "bg-bosque text-white"
                  : "bg-linea text-neutro"
              }`}
            >
              {s.n}
            </span>
            <span className={paso >= s.n ? "font-medium text-tinta" : "text-neutro"}>
              {s.t}
            </span>
          </div>
        ))}
      </div>

      {/* ── Paso 1: elegir cliente ── */}
      {paso === 1 && (
        <div className="mt-8">
          {cargando ? (
            <p className="text-sm text-neutro">Cargando clientes…</p>
          ) : clientes.length === 0 ? (
            <p className="text-sm text-neutro">
              No tienes clientes todavía.{" "}
              <Link href="/clientes/nuevo" className="text-bosque underline">
                Crea el primero
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => elegirCliente(c)}
                  className="rounded-xl border border-linea bg-superficie p-5 text-left transition hover:border-bosque/40 hover:shadow-sm"
                >
                  <p className="font-medium text-tinta">{c.nombre}</p>
                  {c.whatsapp && (
                    <p className="mt-1 text-sm text-neutro">{c.whatsapp}</p>
                  )}
                  {c.ciudad && (
                    <p className="text-sm text-neutro">{c.ciudad}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Paso 2: elegir propiedades ── */}
      {paso === 2 && clienteSel && (
        <div className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutro">
              Cliente: <span className="font-medium text-tinta">{clienteSel.nombre}</span>
              {" · "}
              <button onClick={() => setPaso(1)} className="text-bosque underline">
                cambiar
              </button>
            </p>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar propiedad…"
              className="rounded-lg border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-bosque"
            />
          </div>

          {cargando ? (
            <p className="mt-8 text-sm text-neutro">Cargando propiedades…</p>
          ) : filtradas.length === 0 ? (
            <p className="mt-8 text-sm text-neutro">
              No hay propiedades disponibles.{" "}
              <Link href="/propiedades/nueva" className="text-bosque underline">
                Agrega una
              </Link>
              .
            </p>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtradas.map((p) => {
                  const activa = seleccionadas.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={`overflow-hidden rounded-xl border-2 text-left transition ${
                        activa
                          ? "border-bosque bg-[rgba(0,212,255,0.06)]"
                          : "border-linea bg-superficie hover:border-bosque/30"
                      }`}
                    >
                      <div className="relative">
                        {p.portada ? (
                          <img
                            src={p.portada}
                            alt=""
                            className="aspect-[16/10] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[16/10] items-center justify-center bg-fondo text-3xl text-linea">
                            ⌂
                          </div>
                        )}
                        {p.aceptada && (
                          <span className="absolute left-2 top-2 rounded bg-bosque px-2 py-0.5 text-[10px] font-medium text-white">
                            ✦ Aceptada en matching
                          </span>
                        )}
                        <span
                          className={`absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-sm font-bold ${
                            activa
                              ? "bg-bosque text-white"
                              : "bg-white/90 text-linea"
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-tinta line-clamp-1">
                          {p.titulo || p.codigo || "Propiedad"}
                        </p>
                        <p className="text-sm font-medium text-bosque">
                          {formatoCOP(p.precio)}
                        </p>
                        <p className="text-xs text-neutro">
                          {[p.barrio, p.ciudad].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-xl border border-linea bg-superficie px-5 py-3 shadow-lg">
                <p className="text-sm text-tinta">
                  <span className="font-semibold">{seleccionadas.size}</span>{" "}
                  propiedad{seleccionadas.size !== 1 ? "es" : ""} seleccionada
                  {seleccionadas.size !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => setPaso(3)}
                  disabled={seleccionadas.size === 0}
                  className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-50"
                >
                  Continuar →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Paso 3: título, mensaje y generar ── */}
      {paso === 3 && clienteSel && (
        <div className="mt-8 max-w-xl space-y-6">
          <label className="block text-sm font-medium text-tinta">
            Título del portafolio
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm outline-none focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
            />
          </label>

          <label className="block text-sm font-medium text-tinta">
            Mensaje personal (aparece al inicio del portafolio)
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              placeholder={`Hola ${clienteSel.nombre.split(" ")[0]}, seleccioné estas opciones pensando en lo que me contaste…`}
              className="mt-1.5 w-full rounded-lg border border-linea bg-fondo px-3 py-2.5 text-sm outline-none focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
            />
          </label>

          <div className="rounded-xl bg-bosque-suave px-5 py-4 text-sm text-bosque">
            Se generará una página privada con{" "}
            <strong>{seleccionadas.size} propiedad{seleccionadas.size !== 1 ? "es" : ""}</strong>{" "}
            para <strong>{clienteSel.nombre}</strong>, con una URL única e
            imposible de adivinar.
          </div>

          <div className="flex gap-3">
            <button
              onClick={generar}
              disabled={generando}
              className="rounded-lg bg-bosque px-6 py-3 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-60"
            >
              {generando ? "Generando…" : "✦ Generar portafolio"}
            </button>
            <button
              onClick={() => setPaso(2)}
              className="rounded-lg border border-linea px-5 py-3 text-sm text-neutro transition hover:bg-fondo"
            >
              ← Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
