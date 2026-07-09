export default function Vacio({
  icono,
  titulo,
  descripcion,
  children,
}: {
  icono: string;
  titulo: string;
  descripcion: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-linea bg-superficie px-6 py-16 text-center">
      <span className="text-4xl">{icono}</span>
      <p className="mt-4 font-display text-lg font-medium">{titulo}</p>
      <p className="mt-1 max-w-sm text-sm text-neutro">{descripcion}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
