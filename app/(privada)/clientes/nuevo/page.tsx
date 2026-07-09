import FormCliente from "@/components/clientes/FormCliente";

export default function NuevoClientePage() {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-widest text-laton">
        CRM
      </p>
      <h1 className="mt-1 font-display text-3xl font-medium">Nuevo cliente</h1>
      <div className="mt-8">
        <FormCliente />
      </div>
    </div>
  );
}
