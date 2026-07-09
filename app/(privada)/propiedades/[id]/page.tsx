"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import FormPropiedad from "@/components/propiedades/FormPropiedad";
import GaleriaUpload from "@/components/propiedades/GaleriaUpload";
import type { Propiedad, PropiedadImagen } from "@/lib/types";

type Tab = "galeria" | "editar";

export default function PropiedadDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [imagenes, setImagenes] = useState<PropiedadImagen[]>([]);
  const [tab, setTab] = useState<Tab>("galeria");
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    cargar();
  }, [id]);

  // Refresh when switching tabs
  useEffect(() => {
    if (!cargando) cargar();
  }, [tab]);

  async function cargar() {
    setCargando(true);
    const supabase = createClient();

    const [propRes, imgRes] = await Promise.all([
      supabase.from("propiedades").select("*").eq("id", id).single(),
      supabase
        .from("propiedad_imagenes")
        .select("*")
        .eq("propiedad_id", id)
        .order("orden"),
    ]);

    setPropiedad(propRes.data);
    setImagenes(imgRes.data ?? []);
    setCargando(false);
  }

  async function eliminarPropiedad() {
    if (!confirm("¿Eliminar esta propiedad y todas sus imágenes?")) return;
    setEliminando(true);
    const supabase = createClient();

    // Eliminar imágenes del storage
    if (imagenes.length > 0) {
      await supabase.storage
        .from("propiedades")
        .remove(imagenes.map((i) => i.ruta_storage));
    }

    await supabase.from("propiedades").delete().eq("id", id);
    router.push("/propiedades");
    router.refresh();
  }

  if (cargando) {
    return <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>;
  }

  if (!propiedad) {
    return (
      <div className="mt-12 text-center">
        <p className="text-neutro">Propiedad no encontrada.</p>
        <Link href="/propiedades" className="mt-3 text-sm text-bosque underline">
          Volver a propiedades
        </Link>
      </div>
    );
  }

  const supabase = createClient();
  function urlPublica(ruta: string) {
    const { data } = supabase.storage.from("propiedades").getPublicUrl(ruta);
    return data.publicUrl;
  }

  const detalles = [
    { k: "Precio", v: formatoCOP(propiedad.precio) },
    { k: "Área", v: propiedad.area ? `${propiedad.area} m²` : null },
    { k: "Habitaciones", v: propiedad.habitaciones },
    { k: "Baños", v: propiedad.banos },
    { k: "Parqueaderos", v: propiedad.parqueaderos },
    { k: "Administración", v: formatoCOP(propiedad.administracion) },
    { k: "Estrato", v: propiedad.estrato },
    { k: "Ciudad", v: propiedad.ciudad },
    { k: "Barrio", v: propiedad.barrio },
    { k: "Inmobiliaria", v: propiedad.inmobiliaria },
    { k: "Asesor", v: propiedad.asesor },
    { k: "Teléfono", v: propiedad.telefono },
  ].filter((d) => d.v && d.v !== "—");

  return (
    <div>
      <Link
        href="/propiedades"
        className="text-sm text-neutro transition hover:text-tinta"
      >
        ← Propiedades
      </Link>

      {/* Header con imagen principal */}
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
        {imagenes.length > 0 && (
          <img
            src={urlPublica(imagenes[0].ruta_storage)}
            alt={propiedad.titulo ?? "Propiedad"}
            className="aspect-[16/10] w-full max-w-md rounded-xl object-cover lg:w-80"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-medium">
                {propiedad.titulo || propiedad.codigo || "Propiedad"}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge texto={propiedad.estado} />
                {propiedad.ciudad && (
                  <span className="text-sm text-neutro">{propiedad.ciudad}</span>
                )}
                {propiedad.barrio && (
                  <span className="text-sm text-neutro">· {propiedad.barrio}</span>
                )}
              </div>
            </div>
            {propiedad.precio && (
              <p className="shrink-0 font-display text-2xl font-medium text-bosque">
                {formatoCOP(propiedad.precio)}
              </p>
            )}
          </div>

          {/* Detalles rápidos */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {detalles.map((d) => (
              <div
                key={d.k}
                className="rounded-lg border border-linea bg-fondo px-3 py-2"
              >
                <p className="text-xs text-neutro">{d.k}</p>
                <p className="text-sm font-medium text-tinta">{d.v}</p>
              </div>
            ))}
          </div>

          {propiedad.url_original && (
            <a
              href={propiedad.url_original}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-bosque underline transition hover:text-bosque-oscuro"
            >
              Ver anuncio original →
            </a>
          )}
        </div>
      </div>

      {/* Descripción */}
      {propiedad.descripcion && (
        <div className="mt-6 rounded-xl border border-linea bg-superficie p-5">
          <p className="text-sm leading-relaxed text-tinta whitespace-pre-wrap">
            {propiedad.descripcion}
          </p>
        </div>
      )}

      {/* Amenidades */}
      {propiedad.amenidades && (propiedad.amenidades as string[]).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(propiedad.amenidades as string[]).map((a) => (
            <span
              key={a}
              className="rounded-full bg-bosque-suave px-3 py-1 text-xs font-medium text-bosque"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-linea">
        {(["galeria", "editar"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition ${
              tab === t
                ? "border-bosque text-bosque"
                : "border-transparent text-neutro hover:text-tinta"
            }`}
          >
            {t === "galeria"
              ? `Galería (${imagenes.length})`
              : "Editar"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "galeria" && (
          <GaleriaUpload propiedadId={id} imagenes={imagenes} />
        )}

        {tab === "editar" && (
          <div>
            <FormPropiedad propiedad={propiedad} />
            <div className="mt-12 rounded-xl border border-[#E8D8D3] bg-[#F7EFEC] p-6">
              <p className="text-sm font-medium text-[#8E3B31]">Zona peligrosa</p>
              <p className="mt-1 text-sm text-[#8E3B31]">
                Eliminar esta propiedad borra también todas sus imágenes y la
                retira de cualquier portafolio o match.
              </p>
              <button
                onClick={eliminarPropiedad}
                disabled={eliminando}
                className="mt-4 rounded-lg bg-[#8E3B31] px-4 py-2 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-60"
              >
                {eliminando ? "Eliminando…" : "Eliminar propiedad"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
