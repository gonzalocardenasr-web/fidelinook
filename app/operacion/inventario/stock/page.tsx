import InventoryStockTable from "@/components/inventory/InventoryStockTable";

export default function InventoryStockPage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#F6F3FF] px-4 py-4">
      <div className="mx-auto w-full max-w-[1600px]">
        <InventoryStockTable />
      </div>
    </main>
  );
}
