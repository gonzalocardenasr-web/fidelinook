import Link from "next/link";

import InventoryAdjustmentPanel from "@/components/inventory/InventoryAdjustmentPanel";

export const dynamic = "force-dynamic";

export default function InventoryAdjustmentsPage() {
  return (
    <main className="mx-auto flex h-screen w-full max-w-7xl flex-col gap-4 overflow-hidden px-4 py-5">
      <header className="shrink-0">
        <Link
          href="/operacion/inventario"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Volver a Inventario
        </Link>

        <div className="mt-2">
          <h1 className="text-2xl font-semibold text-neutral-950">
            Movimientos internos
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Registra ajustes, mermas y consumos internos para cualquier SKU.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <InventoryAdjustmentPanel />
      </div>
    </main>
  );
}
