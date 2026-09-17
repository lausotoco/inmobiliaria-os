import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LandingKyrelo from "@/components/landing/LandingKyrelo";

// La home pública SÍ debe indexarse en Google (la app privada no)
export const metadata: Metadata = {
  title: "KYRELO — Menos búsqueda. Más cierre.",
  description:
    "Compradores verificados de vivienda en la Sabana de Bogotá, conectados con brokers e inmobiliarias. Captamos inmuebles y compartimos la comisión con la red.",
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
