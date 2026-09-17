"use client";

// La calificación ahora vive dentro de la ficha única del comprador.
// Esta ruta se conserva para enlaces viejos y redirige a esa pestaña.

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function RedireccionComprador() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/clientes/${id}?tab=calificacion`);
  }, [id, router]);
  return <p className="mt-12 text-center text-sm text-neutro">Abriendo la ficha…</p>;
}
