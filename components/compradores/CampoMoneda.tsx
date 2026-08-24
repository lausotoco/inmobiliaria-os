"use client";

/* Campo de pesos que se formatea mientras se escribe.
   Guarda un número limpio y muestra "1.300.000.000". Se llena
   durante una videollamada: escribir sin ver los separadores es
   la forma más fácil de equivocarse en un cero. */

type Props = {
  valor: number | null;
  onChange: (valor: number | null) => void;
  placeholder?: string;
  id?: string;
};

const formato = (n: number) => n.toLocaleString("es-CO");

export default function CampoMoneda({ valor, onChange, placeholder, id }: Props) {
  return (
    <div className="relative mt-1.5">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutro">
        $
      </span>
      <input
        id={id}
        inputMode="numeric"
        value={valor === null || Number.isNaN(valor) ? "" : formato(valor)}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, "");
          onChange(digitos === "" ? null : Number(digitos));
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-linea bg-fondo py-2.5 pl-7 pr-3 text-sm tabular-nums text-tinta outline-none transition focus:border-bosque focus:ring-2 focus:ring-bosque-suave"
      />
    </div>
  );
}
