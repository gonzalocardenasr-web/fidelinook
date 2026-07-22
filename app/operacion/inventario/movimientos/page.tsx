import Link from "next/link";

import InventoryMovementHistory from "@/components/inventory/InventoryMovementHistory";

export default function InventoryMovementsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/operacion/inventario"
          className="w-fit text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Volver a Inventario
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-neutral-950">
            Historial de movimientos
          </h1>

          <p className="mt-1 text-sm text-neutral-600">
            Consulta la trazabilidad del ledger de inventario por fecha,
            producto, tipo, usuario y referencia.
          </p>
        </div>
      </header>

      <InventoryMovementHistory />
    </main>
  );
}
