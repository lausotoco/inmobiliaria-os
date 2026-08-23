import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingCasas from "@/components/casas/LandingCasas";
import Gtm from "@/components/casas/Gtm";
import {
  MUNICIPIOS,
  buscarMunicipio,
  tituloSeo,
  descripcionSeo,
} from "@/lib/municipios";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kyrelocorp.com";

type Props = { params: { municipio: string } };

/* Genera las 7 rutas en el build. Un municipio con activo:false
   desaparece de aquí y su URL responde 404 real. */
export function generateStaticParams() {
  return MUNICIPIOS.filter((m) => m.activo).map((m) => ({ municipio: m.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const m = buscarMunicipio(params.municipio);
  if (!m) return { title: "Página no encontrada | KYRELO" };

  const url = `${BASE}/casas/${m.slug}`;
  return {
    title: tituloSeo(m),
    description: descripcionSeo(m),
    alternates: { canonical: url },
    // Sobrescribe el noindex global del layout raíz: estas landings sí se indexan.
    robots: { index: true, follow: true },
    openGraph: {
      title: `Casas en venta en ${m.nombre} | KYRELO`,
      description:
        "Tú no recorres 400 anuncios. Nos dices qué necesitas y te presentamos solo lo que existe de verdad.",
      url,
      type: "website",
      locale: "es_CO",
      images: [{ url: `${BASE}/og-casas.jpg`, width: 1200, height: 630 }],
    },
  };
}

export default function Page({ params }: Props) {
  const municipio = buscarMunicipio(params.municipio);
  if (!municipio) notFound();
  return (
    <>
      <Gtm />
      <LandingCasas municipio={municipio} />
    </>
  );
}
