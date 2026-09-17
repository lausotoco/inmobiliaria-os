"use client";

// components/portafolio/Reacciones.tsx
// El comprador marca "Me interesa" / "No me interesa" en cada inmueble del
// portafolio, sin login: el token del enlace es la autorización. La función
// reaccionar_portafolio valida que el inmueble pertenezca a ese portafolio.

import { createContext, useContext, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Misma paleta editorial de app/p/[token]/page.tsx
const C = {
  negro: "#1A1A18",
  gris: "#5F5E5A",
  grisClaro: "#A8A69E",
  linea: "#E0DDD2",
  cobre: "#B87333",
  rojo: "#8E3B31",
};

export type Reaccion = { interesa: boolean; motivo: string | null } | null;

export const MOTIVOS: { clave: string; label: string }[] = [
  { clave: "precio", label: "Precio" },
  { clave: "zona", label: "Zona" },
  { clave: "tamano", label: "Tamaño" },
  { clave: "estado", label: "Estado" },
  { clave: "distribucion", label: "Distribución" },
];

type Ctx = {
  total: number;
  reacciones: Record<string, Reaccion>;
  guardar: (propiedadId: string, interesa: boolean, motivo: string | null) => Promise<boolean>;
};

const ReaccionesCtx = createContext<Ctx | null>(null);

export function ReaccionesProvider({
  token,
  total,
  inicial,
  children,
}: {
  token: string;
  total: number;
  inicial: Record<string, Reaccion>;
  children: React.ReactNode;
}) {
  const [reacciones, setReacciones] = useState<Record<string, Reaccion>>(inicial);
  const supabase = createClient();

  async function guardar(propiedadId: string, interesa: boolean, motivo: string | null) {
    const { error } = await supabase.rpc("reaccionar_portafolio", {
      p_token: token,
      p_propiedad_id: propiedadId,
      p_interesa: interesa,
      p_motivo: motivo,
    });
    if (error) {
      console.error("Error guardando reacción:", error);
      return false;
    }
    setReacciones((prev) => ({ ...prev, [propiedadId]: { interesa, motivo } }));
    return true;
  }

  return (
    <ReaccionesCtx.Provider value={{ total, reacciones, guardar }}>
      {children}
    </ReaccionesCtx.Provider>
  );
}

export function Reaccion({
  propiedadId,
  waHref,
}: {
  propiedadId: string;
  waHref: string | null;
}) {
  const ctx = useContext(ReaccionesCtx);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  if (!ctx) return null;

  const actual = ctx.reacciones[propiedadId] ?? null;
  const dijoSi = actual?.interesa === true;
  const dijoNo = actual !== null && actual.interesa === false;

  async function marcar(interesa: boolean, motivo: string | null) {
    setGuardando(true);
    setError(false);
    const ok = await ctx!.guardar(propiedadId, interesa, motivo);
    setGuardando(false);
    if (!ok) setError(true);
  }

  const pildora = (activo: boolean) => ({
    backgroundColor: activo ? C.negro : "transparent",
    color: activo ? "#FFFFFF" : C.negro,
    borderColor: activo ? C.negro : C.linea,
    letterSpacing: "0.02em",
  });

  return (
    <div className="mt-10">
      <p
        className="text-[11px] font-medium uppercase"
        style={{ color: C.grisClaro, letterSpacing: "0.14em" }}
      >
        ¿Qué te pareció este inmueble?
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={guardando}
          aria-pressed={dijoSi}
          onClick={() => marcar(true, null)}
          className="rounded-full border px-8 py-3.5 text-[13px] font-semibold transition-opacity duration-300 hover:opacity-80 disabled:opacity-50"
          style={pildora(dijoSi)}
        >
          Me interesa
        </button>
        <button
          type="button"
          disabled={guardando}
          aria-pressed={dijoNo}
          onClick={() => marcar(false, dijoNo ? actual!.motivo : null)}
          className="rounded-full border px-8 py-3.5 text-[13px] font-semibold transition-opacity duration-300 hover:opacity-80 disabled:opacity-50"
          style={pildora(dijoNo)}
        >
          No me interesa
        </button>
      </div>

      {dijoNo && (
        <div className="mt-5">
          <p className="text-[12px]" style={{ color: C.gris }}>
            ¿Por qué no? Elige una opción.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {MOTIVOS.map((m) => {
              const activo = actual!.motivo === m.clave;
              return (
                <button
                  key={m.clave}
                  type="button"
                  disabled={guardando}
                  aria-pressed={activo}
                  onClick={() => marcar(false, m.clave)}
                  className="rounded-full border px-4 py-1.5 text-[12px] font-medium transition-colors duration-300 disabled:opacity-50"
                  style={{
                    borderColor: activo ? C.cobre : C.linea,
                    color: activo ? C.cobre : C.negro,
                    backgroundColor: activo ? "#FFFFFF" : "transparent",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-[12px]" style={{ color: C.rojo }}>
          No se pudo guardar. Intenta de nuevo.
        </p>
      )}

      {!error && actual && (
        <p className="mt-3 text-[12px]" style={{ color: C.gris }}>
          Guardado.
          {dijoSi && waHref && (
            <>
              {" "}¿Agendamos visita?{" "}
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
                style={{ color: C.negro }}
              >
                Escríbeme por WhatsApp
              </a>
              .
            </>
          )}
        </p>
      )}
    </div>
  );
}

export function ReaccionesCierre() {
  const ctx = useContext(ReaccionesCtx);
  if (!ctx || ctx.total === 0) return null;
  const hechas = Object.values(ctx.reacciones).filter(Boolean).length;
  if (hechas < ctx.total) return null;
  return (
    <p
      className="border-t pt-10 text-center text-[15px] font-light"
      style={{ borderColor: C.linea, color: C.gris }}
    >
      Listo. Con esto ajustamos la siguiente selección.
    </p>
  );
}
