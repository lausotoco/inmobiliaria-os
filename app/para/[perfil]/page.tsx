import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PerfilLanding from "@/components/perfiles/PerfilLanding";
import { PERFILES, buscarPerfil } from "@/lib/perfiles";

/* Una landing por perfil de cliente: /para/compradores, /para/propietarios,
   /para/agentes, /para/oficinas y /para/constructoras (textos en lib/perfiles.ts) */

export function generateStaticParams() {
  return PERFILES.map((p) => ({ perfil: p.id }));
}

export function generateMetadata({ params }: { params: { perfil: string } }): Metadata {
  const p = buscarPerfil(params.perfil);
  if (!p) return {};
  return {
    title: `${p.yo} · KYRELO`,
    description: p.seo,
    robots: { index: true, follow: true },
  };
}

export default function Page({ params }: { params: { perfil: string } }) {
  const p = buscarPerfil(params.perfil);
  if (!p) notFound();
  return <PerfilLanding id={p.id} />;
}
