import { NextRequest, NextResponse } from "next/server";
import { getOperationSession } from "../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: NextRequest) {
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

    const { data: operationalUser, error: operationalUserError } =
      await supabaseAdmin
        .from("operational_users")
        .select("id, role, is_active")
        .eq("id", session.userId)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error validando usuario operacional para eliminar suscripción:",
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
        "Rol inconsistente eliminando suscripción:",
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

    if (operationalUser.role !== "superadmin") {
      return NextResponse.json(
        {
          ok: false,
          message: "Solo el superadmin puede eliminar suscripciones.",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { subscriptionId } = body as { subscriptionId?: number };

    if (!subscriptionId) {
      return NextResponse.json(
        { ok: false, message: "Falta el id de la suscripción." },
        { status: 400 },
      );
    }

    const { data: existingSubscription, error: existingError } =
      await supabaseAdmin
        .from("subscriptions")
        .select("id, status, cliente_id, template_id, claim_id")
        .eq("id", subscriptionId)
        .single();

    if (existingError || !existingSubscription) {
      return NextResponse.json(
        { ok: false, message: "No se encontró la suscripción." },
        { status: 404 },
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("id", subscriptionId);

    if (deleteError) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo eliminar la suscripción.",
          detail: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Suscripción eliminada correctamente.",
    });
  } catch (error) {
    console.error("[subscriptions/delete] unexpected error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al eliminar la suscripción.",
      },
      { status: 500 },
    );
  }
}
