import Link from "next/link";

import BatchOpeningPanel from "@/components/inventory/BatchOpeningPanel";

export const dynamic = "force-dynamic";

export default function InventoryBatchesPage() {
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
            Apertura de bachas
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Abre los sabores disponibles y controla qué bachas están activas.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <BatchOpeningPanel />
      </div>
    </main>
  );
}
