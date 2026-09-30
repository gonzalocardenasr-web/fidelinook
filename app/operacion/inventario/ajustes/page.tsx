import InventoryAdjustmentPanel from "@/components/inventory/InventoryAdjustmentPanel";

export const dynamic = "force-dynamic";

export default function InventoryAdjustmentsPage() {
  return (
    <main className="h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F6F3FF] px-4 py-4">
      <div className="mx-auto h-full w-full max-w-7xl">
        <InventoryAdjustmentPanel />
      </div>
    </main>
  );
}
