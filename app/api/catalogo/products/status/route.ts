import { NextResponse } from "next/server";

import { getOperationSession } from "../../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

type ProductChannelRow = {
  channel_code: string;
  is_enabled: boolean;
  sales_channels:
    | {
        code: string;
        name: string;
        is_active: boolean;
      }
    | {
        code: string;
        name: string;
        is_active: boolean;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
    const isActive = body.isActive;

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Producto inválido." },
        { status: 400 },
      );
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { ok: false, message: "Estado de producto inválido." },
        { status: 400 },
      );
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, sku, name, operational_type, is_active")
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
        { ok: false, message: "Producto no encontrado." },
        { status: 404 },
      );
    }

    if (product.is_active === isActive) {
      return NextResponse.json({
        ok: true,
        productId,
        isActive,
      });
    }

    if (isActive) {
      const { data: productChannels, error: channelsError } =
        await supabaseAdmin
          .from("product_channels")
          .select(
            `
              channel_code,
              is_enabled,
              sales_channels (
                code,
                name,
                is_active
              )
            `,
          )
          .eq("product_id", productId)
          .eq("is_enabled", true);

      if (channelsError) {
        return NextResponse.json(
          { ok: false, message: channelsError.message },
          { status: 500 },
        );
      }

      const enabledActiveChannels = (
        (productChannels || []) as ProductChannelRow[]
      )
        .map((productChannel) => ({
          productChannel,
          salesChannel: firstRelation(productChannel.sales_channels),
        }))
        .filter(
          ({ salesChannel }) => salesChannel !== null && salesChannel.is_active,
        );

      if (enabledActiveChannels.length === 0) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "No se puede activar el producto: habilita al menos un canal de venta activo.",
          },
          { status: 409 },
        );
      }

      const isCafe =
        String(product.sku || "")
          .trim()
          .toUpperCase() === "CAFE";

      let hasReadyChannel = false;

      if (isCafe) {
        const localChannel = enabledActiveChannels.find(
          ({ productChannel }) => productChannel.channel_code === "local",
        );

        if (localChannel) {
          const { data: optionPrices, error: optionPricesError } =
            await supabaseAdmin
              .from("product_option_prices")
              .select("id")
              .eq("product_id", productId)
              .eq("channel", "local")
              .eq("price_list", "general")
              .eq("is_active", true)
              .limit(1);

          if (optionPricesError) {
            return NextResponse.json(
              { ok: false, message: optionPricesError.message },
              { status: 500 },
            );
          }

          hasReadyChannel = (optionPrices || []).length > 0;
        }
      } else {
        const channelCodes = enabledActiveChannels.map(
          ({ productChannel }) => productChannel.channel_code,
        );

        const { data: prices, error: pricesError } = await supabaseAdmin
          .from("product_prices")
          .select("id")
          .eq("product_id", productId)
          .in("channel", channelCodes)
          .eq("price_list", "general")
          .eq("is_active", true)
          .limit(1);

        if (pricesError) {
          return NextResponse.json(
            { ok: false, message: pricesError.message },
            { status: 500 },
          );
        }

        hasReadyChannel = (prices || []).length > 0;
      }

      if (!hasReadyChannel) {
        return NextResponse.json(
          {
            ok: false,
            message: isCafe
              ? "No se puede activar Café: Local debe estar habilitado y tener al menos una opción con precio vigente."
              : "No se puede activar el producto: ningún canal habilitado tiene un precio vigente.",
          },
          { status: 409 },
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        is_active: isActive,
      })
      .eq("id", productId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, message: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      productId,
      isActive,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el estado del producto.",
      },
      { status: 400 },
    );
  }
}
