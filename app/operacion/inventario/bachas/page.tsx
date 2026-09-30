import BatchOpeningPanel from "@/components/inventory/BatchOpeningPanel";

export const dynamic = "force-dynamic";

export default function InventoryBatchesPage() {
  return (
    <main className="h-full overflow-hidden">
      {" "}
      <div className="mx-auto h-full w-full max-w-7xl">
        <BatchOpeningPanel />
      </div>
    </main>
  );
}
