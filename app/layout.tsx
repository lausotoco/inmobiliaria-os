import type { Metadata } from "next";
import "./globals.css";
import { APP } from "@/lib/config";

export const metadata: Metadata = {
  title: APP.nombre,
  description: APP.descripcion,
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Fraunces = serif editorial premium (titulares/logo) · Inter = sans neutra (cuerpo/plataforma) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
