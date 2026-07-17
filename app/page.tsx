import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LandingKyrelo from "@/components/landing/LandingKyrelo";

// La home pública SÍ debe indexarse en Google (la app privada no)
export const metadata: Metadata = {
  title: "KYRELO — Menos búsqueda. Más cierre.",
  description:
    "Centralizamos los requerimientos reales de compradores y arrendatarios y los conectamos con brokers e inmobiliarias listos para cerrar. Bogotá y sabana norte.",
  robots: { index: true, follow: true },
};

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Todos ven la página pública; el header lleva al panel si ya inició sesión
  return <LandingKyrelo loggedIn={!!user} />;
}
