import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { getOperationSession } from "../../../lib/operation-auth";

export async function GET() {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      sku,
      name,
      category,
      subcategory,
      operational_type,
      portion_quantity,
      has_flavors,
      max_flavors,
      allow_repeat_flavor,
      allows_toppings,
      max_toppings,
      allows_chocolate_dip,
      requires_preparation,
      is_active,
      sort_order,
      product_prices (
        id,
        channel,
        price_list,
        price,
        is_active
      ),
      product_channels (
        channel_code,
        is_enabled
      )
    `,
    )
    .order("sort_order", { ascending: true });

  if (productsError) {
    return NextResponse.json(
      { ok: false, message: productsError.message },
      { status: 500 },
    );
  }

  const { data: optionGroups, error: optionGroupsError } = await supabaseAdmin
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
    .order("id", { ascending: true });

  if (optionGroupsError) {
    return NextResponse.json(
      { ok: false, message: optionGroupsError.message },
      { status: 500 },
    );
  }

  const { data: salesChannels, error: salesChannelsError } = await supabaseAdmin
    .from("sales_channels")
    .select("code, name, channel_type, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (salesChannelsError) {
    return NextResponse.json(
      { ok: false, message: salesChannelsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    products: products || [],
    optionGroups: optionGroups || [],
    salesChannels: salesChannels || [],
  });
}
