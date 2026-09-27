import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { authorizeOperationSession } from "@/lib/operation-rbac";

type PostReceiptBody = {
  transactionId?: unknown;
};

export async function POST(req: Request) {
  try {
    const session = await getOperationSession();

    const authorization = authorizeOperationSession(
      session,
      "inventory.receipts.manage",
    );

    if (!authorization.ok) {
      return NextResponse.json(
        { ok: false, message: authorization.message },
        { status: authorization.status },
      );
    }

    const body = (await req.json()) as PostReceiptBody;
    const transactionId = Number(body.transactionId);

    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "La recepción indicada no es válida.",
        },
        { status: 400 },
      );
    }

    const { data: operationalUser, error: operationalUserError } =
      await supabaseAdmin
        .from("operational_users")
        .select("auth_user_id")
        .eq("id", authorization.session.userId)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error obteniendo identidad operacional para recepción:",
        operationalUserError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible obtener la identidad operacional.",
        },
        { status: 500 },
      );
    }

    if (!operationalUser?.auth_user_id) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "El usuario operacional no tiene una identidad de inventario asociada.",
        },
        { status: 403 },
      );
    }

    const { error: postError } = await supabaseAdmin.rpc(
      "post_inventory_transaction",
      {
        p_transaction_id: transactionId,
        p_posted_by: operationalUser.auth_user_id,
      },
    );

    if (postError) {
      console.error("Error publicando recepción:", postError);

      return NextResponse.json(
        {
          ok: false,
          message: `No fue posible publicar la recepción: ${postError.message}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Error inesperado publicando recepción:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al publicar la recepción.",
      },
      { status: 500 },
    );
  }
}
