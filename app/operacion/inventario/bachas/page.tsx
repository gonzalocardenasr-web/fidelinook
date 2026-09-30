import BatchOpeningPanel from "@/components/inventory/BatchOpeningPanel";

export const dynamic = "force-dynamic";

export default function InventoryBatchesPage() {
  return (
    <main className="h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F6F3FF] px-4 py-4">
      <div className="mx-auto h-full w-full max-w-7xl">
        <BatchOpeningPanel />
      </div>
    </main>
  );
}
