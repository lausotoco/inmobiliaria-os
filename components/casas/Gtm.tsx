"use client";

/* ============================================================
   Google Tag Manager — solo en las páginas de captación
   ------------------------------------------------------------
   Va aquí y no en el layout raíz a propósito: el panel privado,
   los portafolios y la plataforma de brokers no necesitan medirse
   con la cuenta de publicidad.

   El ID es público (se ve en el código fuente de cualquier sitio),
   igual que el Pixel de Meta que ya está en el layout. Por eso va
   escrito aquí y no en una variable de entorno: una variable menos
   que se pueda quedar sin configurar en Netlify.
   ============================================================ */

import Script from "next/script";

export const GTM_ID = "GTM-K74PCDPX";

export default function Gtm() {
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
