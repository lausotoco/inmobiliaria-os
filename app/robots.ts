import type { MetadataRoute } from "next";

/* ============================================================
   Qué puede rastrear Google
   ------------------------------------------------------------
   Público:  la home, el catálogo /inmuebles, las landings de
             captación /casas/*, /verificacion y /politica-de-datos.
   Privado:  la zona interna, los portafolios, el portal de brokers
             y /gracias (que además lleva noindex en la página).

   Regla más larga gana: Allow: /casas/ pesa más que Disallow: /.

   AdsBot va aparte a propósito. Google ignora el user-agent global
   para sus rastreadores de anuncios, así que la regla "*" no lo
   bloquea; se deja explícita para que nadie rompa la pauta sin
   darse cuenta al tocar este archivo.
   ============================================================ */

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kyrelocorp.com";

export default function robots(): MetadataRoute.Robots {
  const publicas = [
    "/$",
    "/inmuebles",
    "/inmuebles/",
    "/casas/",
    "/verificacion",
    "/politica-de-datos",
    "/legal/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicas,
        disallow: ["/", "/gracias"],
      },
      { userAgent: "AdsBot-Google", allow: "/" },
      { userAgent: "AdsBot-Google-Mobile", allow: "/" },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
