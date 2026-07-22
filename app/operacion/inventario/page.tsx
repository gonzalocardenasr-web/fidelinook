import Link from "next/link";

export default function InventoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/operacion"
          className="w-fit text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Volver a Operación
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-neutral-950">
            Inventario
          </h1>

          <p className="mt-1 text-sm text-neutral-600">
            Control de existencias y movimientos de productos.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/operacion/inventario/recepciones"
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow"
        >
          <h2 className="font-semibold text-neutral-950">Recepciones</h2>

          <p className="mt-2 text-sm text-neutral-600">
            Registrar compras recibidas desde proveedores.
          </p>
        </Link>

        <Link
          href="/operacion/inventario/bachas"
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow"
        >
          <h2 className="font-semibold text-neutral-950">Apertura de bachas</h2>

          <p className="mt-2 text-sm text-neutral-600">
            Abrir sabores disponibles y consultar las bachas activas.
          </p>
        </Link>

        <Link
          href="/operacion/inventario/ajustes"
          className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow"
        >
          <h2 className="font-semibold text-neutral-950">
            Movimientos internos
          </h2>

          <p className="mt-2 text-sm text-neutral-600">
            Registrar ajustes positivos, negativos, mermas y consumo interno.
          </p>
        </Link>
      </section>
    </main>
  );
}
