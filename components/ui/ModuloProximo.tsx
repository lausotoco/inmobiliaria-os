export default function ModuloProximo({
  modulo,
  titulo,
  descripcion,
}: {
  modulo: number;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div>
      <h1 className="font-display text-3xl font-medium">{titulo}</h1>
      <div className="mt-8 max-w-xl rounded-2xl border border-dashed border-linea bg-superficie p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-laton">
          Módulo {modulo}
        </p>
        <p className="mt-3 text-neutro">{descripcion}</p>
        <p className="mt-3 text-sm text-neutro">
          Se construye en la siguiente fase. La base de datos ya está lista
          para recibirlo.
        </p>
      </div>
    </div>
  );
}
