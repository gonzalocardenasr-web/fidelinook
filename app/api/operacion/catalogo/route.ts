import { NextResponse } from "next/server";

import { getOperationSession } from "../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

type StockRelation =
  | { quantity: number | string }
  | { quantity: number | string }[]
  | null;

type InventoryItemRow = {
  product_id: number | null;
  option_value_id: number | null;
  inventory_stock: StockRelation;
};

type OpenBatchRow = {
  inventory_items:
    | { option_value_id: number | null }
    | { option_value_id: number | null }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET() {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const [
    { data: products, error: productsError },
    { data: optionGroups, error: optionsError },
    { data: openBatchRows, error: openBatchError },
    { data: inventoryRows, error: inventoryError },
  ] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select(
        `
          *,
          product_prices (
            id,
            channel,
            price_list,
            price,
            is_active,
            valid_from,
            valid_to
          )
        `,
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),

    supabaseAdmin
      .from("catalog_option_groups")
      .select(
        `
          id,
          code,
          name,
          is_active,
          catalog_option_values (
            id,
            code,
            name,
            is_active,
            sort_order
          )
        `,
      )
      .eq("is_active", true),

    supabaseAdmin
      .from("inventory_batches")
      .select(
        `
          inventory_items!inner (
            option_value_id
          )
        `,
      )
      .eq("status", "OPEN"),

    supabaseAdmin
      .from("inventory_items")
      .select(
        `
          product_id,
          option_value_id,
          inventory_stock (
            quantity
          )
        `,
      )
      .eq("is_active", true)
      .not("product_id", "is", null),
  ]);

  if (productsError) {
    return NextResponse.json(
      { ok: false, message: productsError.message },
      { status: 500 },
    );
  }

  if (optionsError) {
    return NextResponse.json(
      { ok: false, message: optionsError.message },
      { status: 500 },
    );
  }

  if (openBatchError) {
    return NextResponse.json(
      { ok: false, message: openBatchError.message },
      { status: 500 },
    );
  }

  if (inventoryError) {
    return NextResponse.json(
      { ok: false, message: inventoryError.message },
      { status: 500 },
    );
  }

  /*
   * Sabores disponibles para productos preparados desde bachas.
   * Una bacha OPEN está disponible aunque no existan bachas cerradas
   * adicionales en stock.
   */
  const openBatchFlavorIds = [
    ...new Set(
      ((openBatchRows ?? []) as OpenBatchRow[])
        .map((row) => {
          const inventoryItem = firstRelation(row.inventory_items);

          return Number(inventoryItem?.option_value_id);
        })
        .filter(
          (optionValueId) =>
            Number.isInteger(optionValueId) && optionValueId > 0,
        ),
    ),
  ];

  /*
   * Stock total disponible por producto.
   */
  const stockByProductId = new Map<number, number>();

  /*
   * Sabores de potes listos que tienen stock unitario disponible.
   */
  const readyPotFlavorIds = new Set<number>();

  const availableBrownieVarietyIds = new Set<number>();
  const availableMineralWaterTypeIds = new Set<number>();

  const brownieProduct = (products ?? []).find(
    (product) => String(product.sku || "").trim() === "BROWNIE",
  );

  const brownieProductId = Number(brownieProduct?.id);

  const mineralWaterProduct = (products ?? []).find(
    (product) => String(product.sku || "").trim() === "AGUA-MINERAL-500CC",
  );

  const mineralWaterProductId = Number(mineralWaterProduct?.id);

  /*
   * Variedades de brownie con stock unitario disponible.
   */

  for (const row of (inventoryRows ?? []) as InventoryItemRow[]) {
    const productId = Number(row.product_id);
    const optionValueId = Number(row.option_value_id);
    const stock = firstRelation(row.inventory_stock);
    const quantity = Number(stock?.quantity ?? 0);

    if (!Number.isInteger(productId) || productId <= 0) {
      continue;
    }

    stockByProductId.set(
      productId,
      (stockByProductId.get(productId) ?? 0) + quantity,
    );

    /*
     * POT-16-LISTO corresponde al producto ID 4 actualmente.
     * Se identifica además por option_value_id para filtrar cada sabor.
     */
    if (
      productId === 4 &&
      Number.isInteger(optionValueId) &&
      optionValueId > 0 &&
      quantity > 0
    ) {
      readyPotFlavorIds.add(optionValueId);
    }

    /*
     * Cada inventario de brownie está asociado a una variedad.
     */
    if (
      Number.isInteger(brownieProductId) &&
      productId === brownieProductId &&
      Number.isInteger(optionValueId) &&
      optionValueId > 0 &&
      quantity > 0
    ) {
      availableBrownieVarietyIds.add(optionValueId);
    }

    /*
     * Cada inventario de agua mineral está asociado a su tipo:
     * con gas o sin gas.
     */
    if (
      Number.isInteger(mineralWaterProductId) &&
      productId === mineralWaterProductId &&
      Number.isInteger(optionValueId) &&
      optionValueId > 0 &&
      quantity > 0
    ) {
      availableMineralWaterTypeIds.add(optionValueId);
    }
  }

  const alwaysVisibleSkus = new Set(["HEL-SIMPLE", "HEL-DOBLE"]);

  const productsBySku = new Map(
    (products ?? []).map((product) => [product.sku, product]),
  );

  /*
   * Los productos preparados compuestos consumen un producto base
   * y una porción desde alguna bacha abierta.
   */
  const compositeBaseSkuBySku = new Map<string, string>([
    ["WAFFLE-HELADO", "WAFFLE"],
    ["BROWNIE-HELADO", "BROWNIE"],
  ]);

  const visibleProducts = (products ?? []).filter((product) => {
    const sku = String(product.sku || "").trim();

    if (alwaysVisibleSkus.has(sku)) {
      return true;
    }

    if (sku === "POT-16-ARMADO") {
      return openBatchFlavorIds.length > 0;
    }

    if (sku === "POT-16-LISTO") {
      return readyPotFlavorIds.size > 0;
    }

    if (sku === "BROWNIE") {
      return availableBrownieVarietyIds.size > 0;
    }

    if (sku === "BROWNIE-HELADO") {
      return (
        availableBrownieVarietyIds.size > 0 && openBatchFlavorIds.length > 0
      );
    }

    if (sku === "AGUA-MINERAL-500CC") {
      return availableMineralWaterTypeIds.size > 0;
    }

    const baseProductSku = compositeBaseSkuBySku.get(sku);

    if (baseProductSku) {
      const baseProduct = productsBySku.get(baseProductSku);

      if (!baseProduct) {
        return false;
      }

      const baseProductStock =
        stockByProductId.get(Number(baseProduct.id)) ?? 0;

      return baseProductStock > 0 && openBatchFlavorIds.length > 0;
    }

    return (stockByProductId.get(Number(product.id)) ?? 0) > 0;
  });

  return NextResponse.json({
    ok: true,
    products: visibleProducts,
    optionGroups: optionGroups || [],
    openBatchFlavorIds,
    readyPotFlavorIds: [...readyPotFlavorIds],
    availableBrownieVarietyIds: [...availableBrownieVarietyIds],
    availableMineralWaterTypeIds: [...availableMineralWaterTypeIds],
  });
}
