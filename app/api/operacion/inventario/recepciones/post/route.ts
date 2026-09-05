import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PostReceiptBody = {
  transactionId?: unknown;
};

export async function POST(req: Request) {
  try {
    const session = await getOperationSession();

    if (!session.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Tu sesión no se encuentra activa.",
        },
        { status: 401 },
      );
    }

    if (!session.userId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tu sesión debe renovarse para identificar al usuario. Cierra sesión e inicia sesión nuevamente.",
        },
        { status: 401 },
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
        .select("id, role, is_active")
        .eq("id", session.userId)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error validando usuario operacional para recepción:",
        operationalUserError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar al usuario operacional.",
        },
        { status: 500 },
      );
    }

    if (!operationalUser || !operationalUser.is_active) {
      return NextResponse.json(
        {
          ok: false,
          message: "El usuario operacional no se encuentra activo.",
        },
        { status: 403 },
      );
    }

    if (operationalUser.role !== session.role) {
      console.error(
        "Rol inconsistente al publicar recepción:",
        session.userId,
        session.role,
        operationalUser.role,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "La sesión operacional no es válida.",
        },
        { status: 403 },
      );
    }

    const { error: postError } = await supabaseAdmin.rpc(
      "post_inventory_transaction",
      {
        p_transaction_id: transactionId,
        p_posted_by: operationalUser.id,
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
