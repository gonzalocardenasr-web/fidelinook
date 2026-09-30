import Link from "next/link";

export default function InventoryPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#F6F3FF] px-4 py-4">
      <div className="mx-auto w-full max-w-6xl">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/operacion/inventario/stock"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow"
          >
            <h2 className="font-semibold text-neutral-950">Stock actual</h2>

            <p className="mt-2 text-sm text-neutral-600">
              Consultar existencias disponibles, variación del día y último
              movimiento.
            </p>
          </Link>

          <Link
            href="/operacion/inventario/bachas"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow"
          >
            <h2 className="font-semibold text-neutral-950">
              Apertura de bachas
            </h2>

            <p className="mt-2 text-sm text-neutral-600">
              Abrir sabores disponibles y consultar las bachas activas.
            </p>
          </Link>

          <Link
            href="/operacion/inventario/ajustes"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow"
          >
            <h2 className="font-semibold text-neutral-950">
              Movimientos internos
            </h2>

            <p className="mt-2 text-sm text-neutral-600">
              Registrar ajustes positivos, negativos, mermas y consumo interno.
            </p>
          </Link>

          <Link
            href="/operacion/inventario/movimientos"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow"
          >
            <h2 className="font-semibold text-neutral-950">
              Historial de movimientos
            </h2>

            <p className="mt-2 text-sm text-neutral-600">
              Consultar movimientos, responsables, referencias y saldos.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
