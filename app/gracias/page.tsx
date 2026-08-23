import type { Metadata } from "next";
import Gracias from "@/components/casas/Gracias";
import Gtm from "@/components/casas/Gtm";

/* La conversión de Google Ads se mide con "la URL contiene /gracias".
   Por eso es una navegación real y no un mensaje en la misma página.
   Nunca indexable. */
export const metadata: Metadata = {
  title: "Gracias | KYRELO",
  robots: { index: false, follow: false },
};

export default function Page({
  searchParams,
}: {
  searchParams: { wa?: string | string[] };
}) {
  const crudo = Array.isArray(searchParams.wa) ? searchParams.wa[0] : searchParams.wa;
  return (
    <>
      <Gtm />
      <Gracias mensajeCrudo={crudo ?? null} />
    </>
  );
}
