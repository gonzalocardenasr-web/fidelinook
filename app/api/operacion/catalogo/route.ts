import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

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
    .order("sort_order", { ascending: true });

  if (productsError) {
    return NextResponse.json(
      { ok: false, message: productsError.message },
      { status: 500 },
    );
  }

  const { data: optionGroups, error: optionsError } = await supabaseAdmin
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
    .eq("is_active", true);

  if (optionsError) {
    return NextResponse.json(
      { ok: false, message: optionsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    products: products || [],
    optionGroups: optionGroups || [],
  });
}
