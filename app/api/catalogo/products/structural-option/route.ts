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
    const rawOptionGroupId = body.optionGroupId;

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { ok: false, message: "Producto inválido." },
        { status: 400 },
      );
    }

    let optionGroupId: number | null = null;

    if (
      rawOptionGroupId !== null &&
      rawOptionGroupId !== undefined &&
      rawOptionGroupId !== ""
    ) {
      optionGroupId = Number(rawOptionGroupId);

      if (!Number.isInteger(optionGroupId) || optionGroupId <= 0) {
        return NextResponse.json(
          { ok: false, message: "Grupo de opciones inválido." },
          { status: 400 },
        );
      }
    }

    const { error } = await supabaseAdmin.rpc(
      "set_product_structural_option_group",
      {
        p_product_id: productId,
        p_option_group_id: optionGroupId,
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
            : "No fue posible actualizar la opción estructural.",
      },
      { status: 400 },
    );
  }
}
