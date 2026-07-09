"use client";

import { useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const TIPOS = [
  { v: "auto", txt: "Detectar automáticamente" },
  { v: "certificado_tradicion", txt: "Certificado de tradición y libertad" },
  { v: "promesa_compraventa", txt: "Promesa de compraventa" },
];

const RIESGO_COLOR: Record<string, string> = {
  alto: "border-[#E8D8D3] bg-[#F7EFEC] text-[#8E3B31]",
  medio: "border-[#EADFC3] bg-[#FBF6EA] text-[#8A7433]",
  bajo: "border-linea bg-fondo text-neutro",
};

export default function DocumentosPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState("auto");
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<any>(null);

  async function analizar() {
    if (!archivo) return;
    if (archivo.size > 4.5 * 1024 * 1024) {
      setError("El PDF pesa más de 4.5 MB. Compítelo o divídelo e intenta de nuevo.");
      return;
    }
    setAnalizando(true);
    setError(null);
    setAnalisis(null);

    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = () => rej(new Error("No se pudo leer el archivo"));
        r.readAsDataURL(archivo);
      });

      const resp = await fetch("/api/analizar-documento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archivo_base64: base64,
          nombre_archivo: archivo.name,
          tipo_documento: tipo === "auto" ? null : tipo,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.mensaje ?? "Error al analizar el documento.");
      } else {
        setAnalisis(data.analisis);
      }
    } catch {
      setError("Error al procesar el archivo. Intenta de nuevo.");
    }
    setAnalizando(false);
  }

  return (
    <div>
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-laton">
          Notariado e inmobiliario
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium">
          Análisis de documentos
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutro">
          Sube un certificado de tradición y libertad, una promesa de compraventa
          o cualquier documento notarial en PDF, y la IA te entrega propietarios,
          gravámenes, cláusulas de riesgo, fechas clave y recomendaciones.
        </p>
      </div>

      {/* Uploader */}
      <div className="mt-6 rounded-xl border border-linea bg-superficie p-5">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t.v}
              onClick={() => setTipo(t.v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                tipo === t.v
                  ? "border-bosque bg-bosque text-white"
                  : "border-linea bg-superficie text-neutro hover:border-bosque hover:text-bosque"
              }`}
            >
              {t.txt}
            </button>
          ))}
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-linea bg-fondo px-6 py-10 text-center transition hover:border-bosque">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              setArchivo(e.target.files?.[0] ?? null);
              setAnalisis(null);
              setError(null);
            }}
          />
          <span className="text-3xl text-linea">⎙</span>
          <span className="mt-2 text-sm font-medium text-tinta">
            {archivo ? archivo.name : "Haz clic para subir el PDF"}
          </span>
          <span className="mt-1 text-xs text-neutro">
            {archivo
              ? `${(archivo.size / 1024 / 1024).toFixed(2)} MB`
              : "Máximo 4.5 MB"}
          </span>
        </label>

        <button
          onClick={analizar}
          disabled={!archivo || analizando}
          className="mt-4 w-full rounded-lg bg-bosque px-5 py-3 text-sm font-medium text-white transition hover:bg-bosque-oscuro disabled:opacity-50 sm:w-auto"
        >
          {analizando ? "Analizando con IA… (30-60 seg)" : "Analizar documento"}
        </button>

        {error && (
          <p className="mt-3 rounded-lg border border-[#E8D8D3] bg-[#F7EFEC] px-4 py-2.5 text-sm text-[#8E3B31]">
            {error}
          </p>
        )}
      </div>

      {/* Resultado */}
      {analisis && (
        <div className="mt-8 space-y-5">
          {/* Alertas primero: es lo que importa */}
          {Array.isArray(analisis.alertas) && analisis.alertas.length > 0 && (
            <div className="rounded-xl border border-[#E8D8D3] bg-[#F7EFEC] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8E3B31]">
                ⚠ Alertas ({analisis.alertas.length})
              </p>
              <ul className="mt-3 space-y-2">
                {analisis.alertas.map((a: string, i: number) => (
                  <li key={i} className="text-sm text-[#8E3B31]">
                    · {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumen ejecutivo */}
          {analisis.resumen_ejecutivo && (
            <Seccion titulo="Resumen ejecutivo">
              <p className="text-sm leading-relaxed text-tinta">
                {analisis.resumen_ejecutivo}
              </p>
            </Seccion>
          )}

          {/* Datos del inmueble / matrícula */}
          <Seccion titulo="Datos generales">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { k: "Tipo de documento", v: legible(analisis.tipo_documento) },
                { k: "Matrícula", v: analisis.numero_matricula ?? analisis.inmueble?.matricula },
                { k: "Círculo registral", v: analisis.circulo_registral },
                { k: "Ubicación", v: analisis.ubicacion ?? analisis.inmueble?.direccion },
                { k: "Tipo de inmueble", v: analisis.tipo_inmueble ?? analisis.inmueble?.tipo },
                { k: "Área", v: analisis.area ?? analisis.inmueble?.area },
                { k: "Precio de venta", v: analisis.precio_venta },
                { k: "Fecha de la promesa", v: analisis.fecha_promesa },
                { k: "Fecha de escritura", v: analisis.fecha_escritura },
                { k: "Notaría", v: analisis.notaria },
                { k: "Penalizaciones", v: analisis.penalizaciones },
              ]
                .filter((d) => d.v)
                .map((d) => (
                  <div
                    key={d.k}
                    className="rounded-lg border border-linea bg-fondo px-3 py-2"
                  >
                    <p className="text-xs text-neutro">{d.k}</p>
                    <p className="text-sm font-medium text-tinta">{String(d.v)}</p>
                  </div>
                ))}
            </div>
            {analisis.resumen_contenido && (
              <p className="mt-3 text-sm text-neutro">{analisis.resumen_contenido}</p>
            )}
          </Seccion>

          {/* Propietarios / partes */}
          {(analisis.propietarios_actuales?.length > 0 ||
            analisis.partes_involucradas?.length > 0 ||
            analisis.vendedor ||
            analisis.comprador) && (
            <Seccion titulo="Propietarios y partes">
              <div className="space-y-2">
                {analisis.vendedor?.nombre && (
                  <Persona rol="Vendedor" p={analisis.vendedor} />
                )}
                {analisis.comprador?.nombre && (
                  <Persona rol="Comprador" p={analisis.comprador} />
                )}
                {(analisis.propietarios_actuales ?? []).map((p: any, i: number) => (
                  <Persona
                    key={i}
                    rol={`Propietario${p.porcentaje ? ` · ${p.porcentaje}` : ""}`}
                    p={p}
                  />
                ))}
                {(analisis.partes_involucradas ?? []).map((p: any, i: number) => (
                  <Persona key={`pi-${i}`} rol={p.rol ?? "Parte"} p={p} />
                ))}
              </div>
            </Seccion>
          )}

          {/* Gravámenes */}
          {analisis.gravamenes_vigentes?.length > 0 && (
            <Seccion titulo="Gravámenes y limitaciones">
              <div className="space-y-2">
                {analisis.gravamenes_vigentes.map((g: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-linea bg-fondo px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-tinta">
                        {g.tipo}
                        {g.acreedor ? ` · ${g.acreedor}` : ""}
                      </p>
                      <p className="text-xs text-neutro">
                        {[g.anotacion ? `Anotación ${g.anotacion}` : null, g.fecha]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        String(g.estado).toLowerCase().includes("vigente")
                          ? RIESGO_COLOR.alto
                          : RIESGO_COLOR.bajo
                      }`}
                    >
                      {g.estado ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Cláusulas de la promesa */}
          {analisis.clausulas_importantes?.length > 0 && (
            <Seccion titulo="Cláusulas importantes">
              <div className="space-y-2">
                {analisis.clausulas_importantes.map((c: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-linea bg-fondo px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-tinta">{c.clausula}</p>
                      {c.riesgo && (
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            RIESGO_COLOR[String(c.riesgo).toLowerCase()] ??
                            RIESGO_COLOR.bajo
                          }`}
                        >
                          riesgo {c.riesgo}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutro">{c.resumen}</p>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Forma de pago */}
          {analisis.forma_pago && (
            <Seccion titulo="Forma de pago">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { k: "Arras", v: analisis.forma_pago.arras },
                  { k: "Cuota inicial", v: analisis.forma_pago.cuota_inicial },
                  { k: "Crédito hipotecario", v: analisis.forma_pago.credito_hipotecario },
                  { k: "Subsidio", v: analisis.forma_pago.subsidio },
                  { k: "Saldo", v: analisis.forma_pago.saldo },
                ]
                  .filter((d) => d.v)
                  .map((d) => (
                    <div
                      key={d.k}
                      className="rounded-lg border border-linea bg-fondo px-3 py-2"
                    >
                      <p className="text-xs text-neutro">{d.k}</p>
                      <p className="text-sm font-medium text-tinta">{String(d.v)}</p>
                    </div>
                  ))}
              </div>
              {analisis.forma_pago.plazos?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {analisis.forma_pago.plazos.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-neutro">
                      · {p}
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          )}

          {/* Cadena de títulos */}
          {analisis.cadena_titulos?.length > 0 && (
            <Seccion titulo={`Cadena de títulos (${analisis.cadena_titulos.length} anotaciones)`}>
              <div className="space-y-2">
                {analisis.cadena_titulos.map((t: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-linea bg-fondo px-3 py-2.5"
                  >
                    <p className="text-sm text-tinta">
                      <span className="font-semibold">
                        {t.anotacion ? `#${t.anotacion}` : ""}
                      </span>{" "}
                      {t.tipo}
                      {t.fecha ? ` · ${t.fecha}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-neutro">
                      {[t.de && `De: ${t.de}`, t.a && `A: ${t.a}`]
                        .filter(Boolean)
                        .join("  →  ")}
                      {t.resumen ? `  ·  ${t.resumen}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </Seccion>
          )}

          {/* Fechas clave / obligaciones (genérico) */}
          {analisis.fechas_clave?.length > 0 && (
            <Seccion titulo="Fechas clave">
              <ul className="space-y-1">
                {analisis.fechas_clave.map((f: any, i: number) => (
                  <li key={i} className="text-sm text-tinta">
                    <span className="font-medium">{f.fecha}</span> — {f.concepto}
                  </li>
                ))}
              </ul>
            </Seccion>
          )}
          {analisis.obligaciones?.length > 0 && (
            <Seccion titulo="Obligaciones">
              <ul className="space-y-1">
                {analisis.obligaciones.map((o: string, i: number) => (
                  <li key={i} className="text-sm text-neutro">
                    · {o}
                  </li>
                ))}
              </ul>
            </Seccion>
          )}

          {/* Recomendaciones */}
          {analisis.recomendaciones?.length > 0 && (
            <Seccion titulo="Recomendaciones">
              <ul className="space-y-2">
                {analisis.recomendaciones.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-tinta">
                    ✓ {r}
                  </li>
                ))}
              </ul>
            </Seccion>
          )}

          <p className="text-xs text-neutro">
            Este análisis es generado por IA como apoyo preliminar y puede contener
            errores u omisiones. No reemplaza el estudio de títulos de un abogado.
            Verifica siempre contra el documento original.
          </p>
        </div>
      )}
    </div>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-linea bg-superficie p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-laton">
        {titulo}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Persona({ rol, p }: { rol: string; p: any }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-linea bg-fondo px-3 py-2.5">
      <p className="text-sm font-medium text-tinta">{p.nombre}</p>
      <p className="text-xs text-neutro">
        {[rol, p.documento && `CC/NIT ${p.documento}`].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

function legible(v: string | null | undefined) {
  if (!v) return null;
  return String(v).replace(/_/g, " ");
}
