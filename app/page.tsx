import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LandingKyrelo from "@/components/landing/LandingKyrelo";

// La home pública SÍ debe indexarse en Google (la app privada no)
export const metadata: Metadata = {
  title: "KYRELO · El ecosistema inmobiliario de la Sabana",
  description:
    "Inmobiliaria, plataforma de compradores verificados y marketing inmobiliario para agentes, oficinas y constructoras en Chía, Cajicá, Cota, Sopó y Bogotá norte.",
  robots: { index: true, follow: true },
};

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Según el rol, el botón "Ir a mi panel" lleva al lugar correcto
  let panelHref = "/dashboard";
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();
    const esBroker = !perfil || perfil.rol === "broker";
    panelHref = esBroker ? "/broker" : "/dashboard";
  }

  return <LandingKyrelo loggedIn={!!user} panelHref={panelHref} />;
}
