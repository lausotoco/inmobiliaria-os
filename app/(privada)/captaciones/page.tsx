"use client";

// app/(privada)/captaciones/page.tsx
// Centro de control de las captaciones propias: qué está publicado
// en el portal público /inmuebles, qué está destacado y los links
// para compartir o usar en campañas de Google.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatoCOP, codigoSabana } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Vacio from "@/components/ui/Vacio";
import type { Propiedad } from "@/lib/types";

type Captacion = Propiedad & { imagen?: string | null };

function Interruptor({
  activo,
  onClick,
}: {
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300 ${
        activo ? "bg-[#1A1A18]" : "bg-[#D9D9D3]"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-all duration-300 ${
          activo ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function CaptacionesPage() {
  const [captaciones, setCaptaciones] = useState<Captacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const supabase = createClient();
    const { data: props } = await supabase
      .from("propiedades")
      .select("*")
      .eq("es_captacion", true)
      .order("destacada", { ascending: false })
      .order("updated_at", { ascending: false });

    const lista: Captacion[] = props ?? [];

    // Primera imagen de cada captación
    if (lista.length > 0) {
      const { data: imgs } = await supabase
        .from("propiedad_imagenes")
        .select("propiedad_id, ruta_storage, orden")
        .in(
          "propiedad_id",
          lista.map((p) => p.id)
        )
        .order("orden");
      const primera = new Map<string, string>();
      (imgs ?? []).forEach((i) => {
        if (!primera.has(i.propiedad_id))
          primera.set(i.propiedad_id, i.ruta_storage);
      });
      lista.forEach((p) => (p.imagen = primera.get(p.id) ?? null));
    }

    setCaptaciones(lista);
    setCargando(false);
  }

  async function actualizar(id: string, campos: Partial<Propiedad>) {
    // Actualización optimista
    setCaptaciones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...campos } : p))
    );
    const supabase = createClient();
    await supabase.from("propiedades").update(campos).eq("id", id);
    cargar();
  }

  function urlImagen(ruta: string) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/propiedades/${ruta}`;
  }

  function copiar(texto: string, clave: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(clave);
    setTimeout(() => setCopiado(null), 2000);
  }

  const publicadas = captaciones.filter(
    (p) => p.publicada_web && p.estado === "disponible"
  ).length;

  if (cargando) {
    return <p className="mt-12 text-center text-sm text-neutro">Cargando…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium">Captaciones</h1>
          <p className="mt-1 text-sm text-neutro">
            {captaciones.length} captación{captaciones.length !== 1 ? "es" : ""}{" "}
            · {publicadas} publicada{publicadas !== 1 ? "s" : ""} en la web
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              copiar(`${window.location.origin}/inmuebles`, "catalogo")
            }
            className="rounded-full border border-linea px-5 py-2.5 text-sm font-medium text-tinta transition hover:border-[#1A1A18]"
          >
            {copiado === "catalogo" ? "Copiado ✓" : "Copiar link del catálogo"}
          </button>
          <a
            href="/inmuebles"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#1A1A18] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-80"
          >
            Ver portal público →
          </a>
        </div>
      </div>

      {captaciones.length === 0 ? (
        <div className="mt-10">
          <Vacio
            icono="⌂"
            titulo="Aún no tienes captaciones"
            descripcion="Abre una propiedad y activa el interruptor «Captación propia». Aparecerá aquí lista para publicar."
          />
          <div className="mt-4 text-center">
            <Link
              href="/propiedades"
              className="text-sm text-tinta underline transition hover:opacity-70"
            >
              Ir a propiedades
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {captaciones.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-xl border border-linea bg-superficie p-4 sm:flex-row sm:items-center"
            >
              {/* Miniatura */}
              <Link href={`/propiedades/${p.id}`} className="shrink-0">
                {p.imagen ? (
                  <img
                    src={urlImagen(p.imagen)}
                    alt={p.titulo ?? "Propiedad"}
                    className="aspect-[4/3] w-full rounded-lg object-cover sm:w-32"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-fondo text-2xl text-neutro sm:w-32">
                    ⌂
                  </div>
                )}
              </Link>

              {/* Datos */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-widest text-neutro">
                  {codigoSabana(p.consecutivo)}
                </p>
                <Link
                  href={`/propiedades/${p.id}`}
                  className="mt-0.5 block truncate text-[15px] font-medium text-tinta transition hover:opacity-70"
                >
                  {p.titulo || "Propiedad"}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-tinta">
                    {formatoCOP(p.precio)}
                  </span>
                  <span className="text-xs text-neutro">
                    {[p.barrio, p.ciudad].filter(Boolean).join(" · ")}
                  </span>
                  <Badge texto={p.estado} />
                  {p.destacada && (
                    <span className="rounded-full border border-[#1A1A18] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#1A1A18]">
                      Destacada
                    </span>
                  )}
                </div>
                {p.estado !== "disponible" && p.publicada_web && (
                  <p className="mt-1.5 text-xs text-[#8E3B31]">
                    No aparece en el catálogo porque su estado no es
                    «disponible».
                  </p>
                )}
              </div>

              {/* Controles */}
              <div className="flex shrink-0 flex-col gap-2.5 border-t border-linea pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <label className="flex items-center justify-between gap-4 text-xs text-neutro">
                  Publicada
                  <Interruptor
                    activo={p.publicada_web}
                    onClick={() =>
                      actualizar(p.id, { publicada_web: !p.publicada_web })
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-4 text-xs text-neutro">
                  Destacada
                  <Interruptor
                    activo={p.destacada}
                    onClick={() =>
                      actualizar(p.id, { destacada: !p.destacada })
                    }
                  />
                </label>
                {p.slug && (
                  <button
                    onClick={() =>
                      copiar(
                        `${window.location.origin}/inmuebles/${p.slug}`,
                        p.id
                      )
                    }
                    className="rounded-full border border-linea px-4 py-1.5 text-xs font-medium text-tinta transition hover:border-[#1A1A18]"
                  >
                    {copiado === p.id ? "Copiado ✓" : "Copiar link"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
