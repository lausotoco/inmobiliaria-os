import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { MUNICIPIOS, politicaAprobadaPorAbogado } from "@/lib/municipios";

// Sitemap dinámico: el catálogo + cada inmueble publicado.
// Ayuda a que Google indexe las landings para las campañas.

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kyrelocorp.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rutas: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    {
      url: `${BASE}/inmuebles`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Landings de captación de compradores (una por municipio activo)
    ...MUNICIPIOS.filter((m) => m.activo).map((m) => ({
      url: `${BASE}/casas/${m.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    { url: `${BASE}/verificacion`, changeFrequency: "monthly", priority: 0.6 },
    // Solo entra al sitemap si está aprobada (si no, va con noindex)
    ...(politicaAprobadaPorAbogado
      ? [
          {
            url: `${BASE}/politica-de-datos`,
            changeFrequency: "yearly" as const,
            priority: 0.3,
          },
        ]
      : []),
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.rpc("captaciones_publicas");
    for (const p of data ?? []) {
      if (p.slug) {
        rutas.push({
          url: `${BASE}/inmuebles/${p.slug}`,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Si Supabase no responde, al menos se publica el catálogo.
  }

  return rutas;
}
