import { supabase } from "@/lib/supabase";

export type InventorySupplier = {
  id: number;
  code: string;
  name: string;
  supplier_type: string;
};

export async function getActiveInventorySuppliers(): Promise<
  InventorySupplier[]
> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, code, name, supplier_type")
    .eq("is_active", true)
    .eq("supplier_type", "EXTERNAL")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`No fue posible cargar los proveedores: ${error.message}`);
  }

  return (data ?? []) as InventorySupplier[];
}
