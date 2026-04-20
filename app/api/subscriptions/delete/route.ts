import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const auth = req.cookies.get("fidelinook_auth")?.value;
    const role = req.cookies.get("fidelinook_role")?.value;

    if (auth !== "ok" || !role) {
      return NextResponse.json(
        { ok: false, message: "No autenticado." },
        { status: 401 }
      );
    }

    if (role !== "superadmin") {
      return NextResponse.json(
        { ok: false, message: "Solo el superadmin puede eliminar suscripciones." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { subscriptionId } = body as { subscriptionId?: number };

    if (!subscriptionId) {
      return NextResponse.json(
        { ok: false, message: "Falta el id de la suscripción." },
        { status: 400 }
      );
    }

    const { data: existingSubscription, error: existingError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, cliente_id, template_id, claim_id")
      .eq("id", subscriptionId)
      .single();

    if (existingError || !existingSubscription) {
      return NextResponse.json(
        { ok: false, message: "No se encontró la suscripción." },
        { status: 404 }
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
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Suscripción eliminada correctamente.",
    });
  } catch (error) {
    console.error("[subscriptions/delete] unexpected error:", error);

    return NextResponse.json(
      { ok: false, message: "Ocurrió un error inesperado al eliminar la suscripción." },
      { status: 500 }
    );
  }
}