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
    const channelCode = String(body.channelCode || "").trim();
    const isEnabled = body.isEnabled;

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

    if (typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { ok: false, message: "Estado de canal inválido." },
        { status: 400 },
      );
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      return NextResponse.json(
        { ok: false, message: productError.message },
        { status: 500 },
      );
    }

    if (!product) {
      return NextResponse.json(
        { ok: false, message: "El producto no existe." },
        { status: 404 },
      );
    }

    const { data: channel, error: channelError } = await supabaseAdmin
      .from("sales_channels")
      .select("code, is_active")
      .eq("code", channelCode)
      .maybeSingle();

    if (channelError) {
      return NextResponse.json(
        { ok: false, message: channelError.message },
        { status: 500 },
      );
    }

    if (!channel) {
      return NextResponse.json(
        { ok: false, message: "El canal no existe." },
        { status: 404 },
      );
    }

    if (!channel.is_active) {
      return NextResponse.json(
        { ok: false, message: "El canal se encuentra inactivo." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from("product_channels").upsert(
      {
        product_id: productId,
        channel_code: channelCode,
        is_enabled: isEnabled,
      },
      {
        onConflict: "product_id,channel_code",
      },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el canal.",
      },
      { status: 400 },
    );
  }
}
