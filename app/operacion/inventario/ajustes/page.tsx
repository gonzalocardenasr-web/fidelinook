import InventoryAdjustmentPanel from "@/components/inventory/InventoryAdjustmentPanel";

export const dynamic = "force-dynamic";

export default function InventoryAdjustmentsPage() {
  return (
    <main className="h-full overflow-hidden">
      <div className="mx-auto h-full w-full max-w-7xl">
        <InventoryAdjustmentPanel />
      </div>
    </main>
  );
}
