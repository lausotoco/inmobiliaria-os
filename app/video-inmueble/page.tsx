import type { Metadata } from "next";
import LandingVideos from "@/components/videos/LandingVideos";

/* ============================================================
   Video por inmueble (/video-inmueble) · página pública para agentes.
   Sin precios (se ven dentro de la plataforma, con la cuenta creada),
   sin fotos reales de casas y sin prometer ventas.
   ============================================================ */

export const metadata: Metadata = {
  title: "Video por inmueble · Los agentes que más venden presentan mejor sus inmuebles",
  description:
    "Para agentes y oficinas inmobiliarias: subes un solo video y en menos de 30 minutos tienes el video de tu inmueble editado con tu logo y tu WhatsApp. Lo ves antes de pagar.",
  robots: { index: true, follow: true },
};

export default function PaginaVideoInmueble() {
  return <LandingVideos />;
}
