import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Sitemap dinámico: el catálogo + cada inmueble publicado.
// Ayuda a que Google indexe las landings para las campañas.

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://sabanaosbylaurasoto.netlify.app";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rutas: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/inmuebles`,
      changeFrequency: "daily",
      priority: 1,
    },
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
