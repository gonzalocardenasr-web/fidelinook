import Link from "next/link";

import InventoryStockTable from "@/components/inventory/InventoryStockTable";

export default function InventoryStockPage() {
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
            Stock actual
          </h1>

          <p className="mt-1 text-sm text-neutral-600">
            Consulta el stock disponible, su variación durante el día y el
            último movimiento de cada SKU.
          </p>
        </div>
      </header>

      <InventoryStockTable />
    </main>
  );
}
