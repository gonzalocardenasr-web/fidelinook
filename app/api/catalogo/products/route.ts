import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

export async function PATCH(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  const body = await req.json();

  const productId = Number(body.productId);
  const name = String(body.name || "").trim();
  const isActive = Boolean(body.isActive);
  const price = Number(body.price);

  if (!productId || Number.isNaN(productId)) {
    return NextResponse.json(
      { ok: false, message: "Producto inválido." },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "El nombre es obligatorio." },
      { status: 400 },
    );
  }

  if (Number.isNaN(price) || price < 0) {
    return NextResponse.json(
      { ok: false, message: "Precio inválido." },
      { status: 400 },
    );
  }

  const { error: productError } = await supabaseAdmin
    .from("products")
    .update({
      name,
      is_active: isActive,
    })
    .eq("id", productId);

  if (productError) {
    return NextResponse.json(
      { ok: false, message: productError.message },
      { status: 500 },
    );
  }

  const { data: currentPrice, error: priceReadError } = await supabaseAdmin
    .from("product_prices")
    .select("id, price")
    .eq("product_id", productId)
    .eq("channel", "local")
    .eq("price_list", "general")
    .eq("is_active", true)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (priceReadError) {
    return NextResponse.json(
      { ok: false, message: priceReadError.message },
      { status: 500 },
    );
  }

  if (!currentPrice) {
    const { error: insertError } = await supabaseAdmin
      .from("product_prices")
      .insert({
        product_id: productId,
        channel: "local",
        price_list: "general",
        price,
        currency: "CLP",
        is_active: true,
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, message: insertError.message },
        { status: 500 },
      );
    }
  } else if (Number(currentPrice.price) !== price) {
    const { error: closeError } = await supabaseAdmin
      .from("product_prices")
      .update({
        is_active: false,
        valid_to: new Date().toISOString(),
      })
      .eq("id", currentPrice.id);

    if (closeError) {
      return NextResponse.json(
        { ok: false, message: closeError.message },
        { status: 500 },
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("product_prices")
      .insert({
        product_id: productId,
        channel: "local",
        price_list: "general",
        price,
        currency: "CLP",
        is_active: true,
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, message: insertError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
