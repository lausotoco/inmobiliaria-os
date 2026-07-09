"use client";

import { useState } from "react";
import ImportarPropiedad from "@/components/propiedades/ImportarPropiedad";
import FormPropiedad from "@/components/propiedades/FormPropiedad";
import type { Propiedad } from "@/lib/types";

export default function NuevaPropiedadPage() {
  const [datosImportados, setDatosImportados] = useState<Partial<Propiedad> | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  function handleImportado(datos: Record<string, unknown>) {
    setDatosImportados(datos as Partial<Propiedad>);
    setMostrarForm(true);
  }

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-widest text-laton">
        Propiedades
      </p>
      <h1 className="mt-1 font-display text-3xl font-medium">
        Nueva propiedad
      </h1>

      {!mostrarForm && (
        <div className="mt-8 max-w-2xl">
          <ImportarPropiedad onImportado={handleImportado} />

          <div className="mt-6 text-center">
            <button
              onClick={() => setMostrarForm(true)}
              className="text-sm text-neutro transition hover:text-bosque"
            >
              O registrar manualmente sin importar →
            </button>
          </div>
        </div>
      )}

      {mostrarForm && (
        <div className="mt-8">
          {datosImportados && (
            <div className="mb-6 rounded-lg bg-bosque-suave px-4 py-3">
              <p className="text-sm text-bosque">
                Datos importados automáticamente. Revisa y completa lo que falte
                antes de guardar.
              </p>
            </div>
          )}
          <FormPropiedad datosIniciales={datosImportados ?? undefined} />
        </div>
      )}
    </div>
  );
}
