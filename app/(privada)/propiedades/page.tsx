"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, codigoSabana } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Vacio from "@/components/ui/Vacio";
import type { Propiedad, PropiedadImagen } from "@/lib/types";

const ESTADOS = ["todos", "disponible", "reservada", "en negociación", "vendida"];

type PropiedadConImagen = Propiedad & { portada?: string };

export default function PropiedadesPage() {
  const [propiedades, setPropiedades] = useState<PropiedadConImagen[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargando, setCargando] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const { data: props } = await supabase
      .from("propiedades")
      .select("*")
      .order("created_at", { ascending: false });

    if (!props || props.length === 0) {
      setPropiedades([]);
      setCargando(false);
      return;
    }

    // Traer la primera imagen de cada propiedad
    const ids = props.map((p: Propiedad) => p.id);
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

    setPropiedades(
      (props as Propiedad[]).map((p) => ({
        ...p,
        portada: portadas[p.id],
      }))
    );
    setCargando(false);
  }

  const filtradas = propiedades.filter((p) => {
    const txt = busqueda.toLowerCase();
    const coincide =
      !busqueda ||
      p.titulo?.toLowerCase().includes(txt) ||
      p.ciudad?.toLowerCase().includes(txt) ||
      p.barrio?.toLowerCase().includes(txt) ||
      p.codigo?.toLowerCase().includes(txt) ||
      codigoSabana(p.consecutivo).toLowerCase().includes(txt) ||
      String(p.consecutivo ?? "").includes(txt) ||
      p.inmobiliaria?.toLowerCase().includes(txt);
    const estadoOk = filtroEstado === "todos" || p.estado === filtroEstado;
    return coincide && estadoOk;
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-laton">
            Inventario
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium">Propiedades</h1>
        </div>
        <Link
          href="/propiedades/nueva"
          className="shrink-0 rounded-lg bg-bosque px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-bosque-oscuro"
        >
          + Nueva propiedad
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título, ciudad, barrio, código…"
          className="flex-1 rounded-lg border border-linea bg-superficie px-4 py-2.5 text-sm text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
        />
        <div className="flex gap-1.5 overflow-x-auto">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                filtroEstado === e
                  ? "border-bosque bg-bosque text-white"
                  : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="mt-8">
          <Vacio
            icono="⌂"
            titulo={propiedades.length === 0 ? "Sin propiedades" : "Sin resultados"}
            descripcion={
              propiedades.length === 0
                ? "Agrega tu primer inmueble pegando un enlace o registrándolo manualmente."
                : "Prueba con otra búsqueda o filtro."
            }
          >
            {propiedades.length === 0 && (
              <Link
                href="/propiedades/nueva"
                className="rounded-lg bg-bosque px-5 py-2.5 text-sm font-medium text-white transition hover:bg-bosque-oscuro"
              >
                + Nueva propiedad
              </Link>
            )}
          </Vacio>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((p) => (
            <Link
              key={p.id}
              href={`/propiedades/${p.id}`}
              className="group overflow-hidden rounded-xl border border-linea bg-superficie transition hover:border-bosque/30 hover:shadow-sm"
            >
              {p.portada ? (
                <img
                  src={p.portada}
                  alt={p.titulo ?? "Propiedad"}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center bg-fondo text-4xl text-linea">
                  ⌂
                </div>
              )}
              <div className="p-4">
                {p.consecutivo !== null && (
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-neutro">
                    {codigoSabana(p.consecutivo)}
                  </p>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-tinta group-hover:text-bosque transition line-clamp-1">
                    {p.titulo || p.codigo || "Sin título"}
                  </p>
                  <Badge texto={p.estado} />
                </div>
                {p.precio && (
                  <p className="mt-1 font-display text-lg font-medium text-bosque">
                    {formatoCOP(p.precio)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutro">
                  {p.area && <span>{p.area} m²</span>}
                  {p.habitaciones !== null && <span>{p.habitaciones} hab</span>}
                  {p.banos !== null && <span>{p.banos} baños</span>}
                  {p.parqueaderos !== null && <span>{p.parqueaderos} parq</span>}
                </div>
                {(p.ciudad || p.barrio) && (
                  <p className="mt-1.5 text-xs text-neutro">
                    {[p.barrio, p.ciudad].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
