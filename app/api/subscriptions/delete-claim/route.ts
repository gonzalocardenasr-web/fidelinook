import { NextResponse } from "next/server";
import { getOperationSession } from "../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

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

    const { data: operationalUser, error: operationalUserError } =
      await supabaseAdmin
        .from("operational_users")
        .select("id, role, is_active")
        .eq("id", session.userId)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error validando usuario operacional para eliminar claim:",
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
        "Rol inconsistente eliminando claim:",
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
          message: "Solo el superadmin puede eliminar claims.",
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { claimId } = body as { claimId?: number };

    if (!claimId) {
      return NextResponse.json({ message: "Falta claimId." }, { status: 400 });
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("subscription_claims")
      .select("id, status")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { message: "No encontramos el claim." },
        { status: 404 },
      );
    }

    if (claim.status !== "pending") {
      return NextResponse.json(
        { message: "Solo se pueden eliminar claims pendientes." },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("subscription_claims")
      .delete()
      .eq("id", claimId);

    if (deleteError) {
      return NextResponse.json(
        {
          message: "No se pudo eliminar el claim.",
          detail: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Claim eliminado correctamente.",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error inesperado al eliminar el claim." },
      { status: 500 },
    );
  }
}
