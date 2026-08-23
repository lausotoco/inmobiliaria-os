"use client";

/* ============================================================
   Atribución publicitaria
   ------------------------------------------------------------
   Captura gclid / wbraid / gbraid y las UTM EN LA PRIMERA VISITA
   y las guarda en sessionStorage, porque el comprador puede
   navegar dentro del sitio antes de llenar el formulario y perder
   los parámetros de la URL.

   El gclid es lo único que después permite decirle a Google Ads
   cuáles leads se volvieron compradores reales. Si no se captura,
   no se puede reconstruir.
   ============================================================ */

const CLAVE = "kyrelo_atribucion";

export type Atribucion = {
  gclid: string | null;
  wbraid: string | null;
  gbraid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_url: string | null;
  referrer: string | null;
  canal: string;
};

const VACIA: Atribucion = {
  gclid: null,
  wbraid: null,
  gbraid: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  landing_url: null,
  referrer: null,
  canal: "DIR",
};

/** Canal, en el orden de prioridad del encargo. */
function calcularCanal(p: URLSearchParams): string {
  if (p.get("gclid") || p.get("wbraid") || p.get("gbraid")) return "GADS";

  const fuente = (p.get("utm_source") || "").toLowerCase();
  if (!fuente) return "DIR";
  if (fuente.includes("instagram")) return "IG";
  if (fuente.includes("facebook") || fuente.includes("meta")) return "META";

  // Cualquier otra fuente: en mayúsculas, máximo 8 caracteres.
  const limpia = fuente.replace(/[^a-z0-9]/g, "").toUpperCase().slice(0, 8);
  return limpia || "DIR";
}

/** Lee lo guardado; si es la primera visita, lo calcula y lo guarda. */
export function obtenerAtribucion(): Atribucion {
  if (typeof window === "undefined") return VACIA;

  try {
    const guardado = sessionStorage.getItem(CLAVE);
    if (guardado) return { ...VACIA, ...JSON.parse(guardado) };
  } catch {
    // sessionStorage bloqueado (modo privado, cookies de terceros).
    // Se sigue sin persistir: mejor un lead sin atribución que ningún lead.
  }

  const p = new URLSearchParams(window.location.search);
  const dato = (k: string) => p.get(k) || null;

  const atribucion: Atribucion = {
    gclid: dato("gclid"),
    wbraid: dato("wbraid"),
    gbraid: dato("gbraid"),
    utm_source: dato("utm_source"),
    utm_medium: dato("utm_medium"),
    utm_campaign: dato("utm_campaign"),
    utm_term: dato("utm_term"),
    utm_content: dato("utm_content"),
    landing_url: window.location.href,
    referrer: document.referrer || null,
    canal: calcularCanal(p),
  };

  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(atribucion));
  } catch {
    /* sin persistencia, pero el lead de esta página sí se guarda */
  }

  return atribucion;
}

/** Código de referencia: GADS-CHIA · IG-COTA · META-SABANA-NORTE · DIR-CAJICA */
export function calcularRefCode(canal: string, slugMunicipio: string): string {
  return `${canal}-${slugMunicipio.toUpperCase()}`;
}
