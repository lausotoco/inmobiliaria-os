"use client";

// app/acuerdo/[token]/page.tsx — Acuerdo con el agente, por enlace (sin login).
// El agente lo lee, escribe nombre y documento y toca "Acepto": firma
// electrónica simple (Ley 527/1999 art. 7 · Decreto 2364/2012). Se puede
// imprimir o guardar como PDF desde el mismo enlace.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clausulasAcuerdo, tituloAcuerdo, FIRMANTE_KYRELO, REGLAS, type DatosAcuerdo } from "@/lib/acuerdos";

const C = { fondo: "#F1EFE8", negro: "#1A1A18", gris: "#5F5E5A", linea: "#E0DDD2", cobre: "#B87333", rojo: "#8E3B31" };

function fechaLarga(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AcuerdoPublicoPage() {
  const { token } = useParams<{ token: string }>();
  const supabase = createClient();
  const [acuerdo, setAcuerdo] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("acuerdo_publico", { p_token: token }).then(({ data }) => {
      setAcuerdo(data ?? null);
      if (data?.agente?.nombre) setNombre(data.agente.nombre);
      setCargando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function aceptar() {
    if (!nombre.trim() || !documento.trim()) { setError("Escribe tu nombre completo y tu número de documento."); return; }
    if (!acepto) { setError("Marca la casilla para confirmar que leíste el acuerdo."); return; }
    setEnviando(true); setError("");
    const { error: err } = await supabase.rpc("aceptar_acuerdo", { p_token: token, p_nombre: nombre.trim(), p_documento: documento.trim() });
    setEnviando(false);
    if (err) { setError(err.message); return; }
    const { data } = await supabase.rpc("acuerdo_publico", { p_token: token });
    setAcuerdo(data ?? null);
  }

  if (cargando) return <main className="min-h-screen px-6 py-20 text-center text-sm" style={{ backgroundColor: C.fondo, color: C.gris }}>Cargando acuerdo…</main>;
  if (!acuerdo) return <main className="min-h-screen px-6 py-20 text-center" style={{ backgroundColor: C.fondo, color: C.negro }}><p className="text-xl font-semibold">Este acuerdo no está disponible</p><p className="mt-2 text-sm" style={{ color: C.gris }}>El enlace puede ser incorrecto o haber sido retirado.</p></main>;

  const d: DatosAcuerdo = {
    tipo: acuerdo.tipo,
    agente_nombre: acuerdo.datos?.agente_nombre ?? acuerdo.agente?.nombre ?? "El agente",
    agente_documento: acuerdo.aceptado_documento ?? acuerdo.datos?.agente_documento ?? null,
    agente_empresa: acuerdo.datos?.agente_empresa ?? acuerdo.agente?.empresa ?? null,
    agente_telefono: acuerdo.datos?.agente_telefono ?? acuerdo.agente?.telefono ?? null,
    agente_email: acuerdo.datos?.agente_email ?? acuerdo.agente?.email ?? null,
    referencia: acuerdo.datos?.referencia ?? null,
    pct_comision: Number(acuerdo.pct_comision ?? REGLAS.pctComision),
    pct_kyrelo: Number(acuerdo.pct_kyrelo ?? 0.6),
    firmante: acuerdo.datos?.firmante ?? FIRMANTE_KYRELO,
  };
  const aceptado = acuerdo.estado === "aceptado";
  const clausulas = clausulasAcuerdo(d);

  return (
    <main className="min-h-screen antialiased" style={{ backgroundColor: C.fondo, color: C.negro, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`@media print { .no-imprimir { display: none !important; } main { background: white !important; } .hoja { box-shadow: none !important; border: 0 !important; } }`}</style>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.24em" }}>KYRELO · Acuerdo con agente</p>
          <button onClick={() => window.print()} className="rounded-full border px-5 py-2 text-[13px] font-medium" style={{ borderColor: C.linea, color: C.negro }}>Descargar en PDF</button>
        </div>

        <article className="hoja rounded-2xl border bg-white px-6 py-8 sm:px-10 sm:py-12" style={{ borderColor: C.linea }}>
          <h1 className="text-[22px] font-semibold leading-snug sm:text-[26px]" style={{ fontFamily: "Fraunces, Georgia, serif", letterSpacing: "-0.01em" }}>{tituloAcuerdo(d.tipo)}</h1>
          <p className="mt-2 text-[12px]" style={{ color: C.gris }}>
            Acuerdo n.º {String(acuerdo.id).slice(0, 8).toUpperCase()} · generado el {fechaLarga(acuerdo.created_at)}{d.referencia ? ` · ${d.referencia}` : ""}
          </p>

          <div className="mt-8 space-y-6">
            {clausulas.map((c) => (
              <section key={c.titulo}>
                <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.14em" }}>{c.titulo}</p>
                <p className="mt-1.5 text-[14px] leading-[1.8]" style={{ color: C.negro }}>{c.texto}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 border-t pt-6" style={{ borderColor: C.linea }}>
            {aceptado ? (
              <div>
                <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.14em" }}>Aceptado electrónicamente</p>
                <p className="mt-2 text-[14px]">
                  <span className="font-semibold">{acuerdo.aceptado_nombre}</span>, documento {acuerdo.aceptado_documento}, el {fechaLarga(acuerdo.aceptado_at)}.
                </p>
                <p className="mt-1 text-[12px]" style={{ color: C.gris }}>Por KYRELO: {d.firmante.nombre}{d.firmante.documento ? `, ${d.firmante.documento}` : ""} · {d.firmante.marca}.</p>
              </div>
            ) : (
              <div className="no-imprimir">
                <p className="text-[11px] font-semibold uppercase" style={{ color: C.cobre, letterSpacing: "0.14em" }}>Aceptar este acuerdo</p>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: C.gris }}>Escribe tu nombre completo y tu número de documento tal como aparecen en tu cédula. Al tocar "Acepto" queda registrada la fecha y hora.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-[11px] uppercase tracking-[0.12em]" style={{ color: C.gris }}>Nombre completo
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-[14px] normal-case tracking-normal outline-none" style={{ borderColor: C.linea, color: C.negro }} /></label>
                  <label className="text-[11px] uppercase tracking-[0.12em]" style={{ color: C.gris }}>Número de cédula
                    <input value={documento} onChange={(e) => setDocumento(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-[14px] normal-case tracking-normal outline-none" style={{ borderColor: C.linea, color: C.negro }} /></label>
                </div>
                <label className="mt-4 flex items-start gap-3 text-[13px]">
                  <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>Leí el acuerdo completo, incluidas las cláusulas de no elusión y la cláusula penal, y lo acepto.</span>
                </label>
                {error && <p className="mt-3 text-[12px]" style={{ color: C.rojo }}>{error}</p>}
                <button onClick={aceptar} disabled={enviando} className="mt-5 rounded-full px-8 py-3 text-[13px] font-semibold text-white disabled:opacity-50" style={{ backgroundColor: C.negro }}>
                  {enviando ? "Registrando…" : "Acepto el acuerdo"}
                </button>
              </div>
            )}
          </div>
        </article>

        <p className="mt-6 text-center text-[11px]" style={{ color: C.gris }}>KYRELO · Kyrelocorp · Menos búsqueda. Más cierre.</p>
      </div>
    </main>
  );
}
