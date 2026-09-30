import InventoryMovementHistory from "@/components/inventory/InventoryMovementHistory";

export default function InventoryMovementsPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#F6F3FF] px-4 py-4">
      <div className="mx-auto w-full max-w-[1600px]">
        <InventoryMovementHistory />
      </div>
    </main>
  );
}
