export type InventorySupplier = {
  id: number;
  code: string;
  name: string;
  supplier_type: string;
};

type InventorySuppliersResponse = {
  ok?: boolean;
  message?: string;
  suppliers?: InventorySupplier[];
};

export async function getActiveInventorySuppliers(): Promise<
  InventorySupplier[]
> {
  const response = await fetch(
    "/api/operacion/inventario/recepciones?resource=suppliers",
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as InventorySuppliersResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.message ?? "No fue posible cargar los proveedores.",
    );
  }

  return payload.suppliers ?? [];
}
