import InventoryStockTable from "@/components/inventory/InventoryStockTable";

export default function InventoryStockPage() {
  return (
    <main className="h-full">
      {" "}
      <div className="mx-auto w-full max-w-[1600px]">
        <InventoryStockTable />
      </div>
    </main>
  );
}
