import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

export async function PATCH(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const productId = Number(body.productId);
    const channelCode = String(body.channelCode || "")
      .trim()
      .toLowerCase();
    const priceList = String(body.priceList || "general")
      .trim()
      .toLowerCase();
    const price = Number(body.price);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Producto inválido." },
        { status: 400 },
      );
    }

    if (!channelCode) {
      return NextResponse.json(
        { ok: false, message: "Canal inválido." },
        { status: 400 },
      );
    }

    if (!priceList) {
      return NextResponse.json(
        { ok: false, message: "Lista de precios inválida." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(price) || price < 0) {
      return NextResponse.json(
        { ok: false, message: "Precio inválido." },
        { status: 400 },
      );
    }

    const { data: priceId, error } = await supabaseAdmin.rpc(
      "set_product_price",
      {
        p_product_id: productId,
        p_channel: channelCode,
        p_price_list: priceList,
        p_price: price,
        p_currency: "CLP",
      },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      priceId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el precio.",
      },
      { status: 400 },
    );
  }
}
