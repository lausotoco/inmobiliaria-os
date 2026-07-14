import type { MetadataRoute } from "next";

// Solo el portal público /inmuebles es indexable.
// El resto del sistema (zona privada, portafolios privados, broker)
// queda fuera de los buscadores.

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://sabanaosbylaurasoto.netlify.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/inmuebles", "/inmuebles/"],
        disallow: "/",
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
