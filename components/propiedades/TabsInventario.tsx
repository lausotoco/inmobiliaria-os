"use client";

// components/propiedades/TabsInventario.tsx
// Propiedades y Captaciones son el mismo inventario: una barra las une.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/propiedades", etiqueta: "Todas las propiedades" },
  { href: "/captaciones", etiqueta: "Captaciones KYRELO" },
];

export default function TabsInventario() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-linea">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            pathname.startsWith(t.href)
              ? "border-bosque text-bosque"
              : "border-transparent text-neutro hover:text-tinta"
          }`}
        >
          {t.etiqueta}
        </Link>
      ))}
    </div>
  );
}
