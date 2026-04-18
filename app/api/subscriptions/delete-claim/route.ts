import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { claimId } = body as { claimId?: number };

    if (!claimId) {
      return NextResponse.json(
        { message: "Falta claimId." },
        { status: 400 }
      );
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("subscription_claims")
      .select("id, status")
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { message: "No encontramos el claim." },
        { status: 404 }
      );
    }

    if (claim.status !== "pending") {
      return NextResponse.json(
        { message: "Solo se pueden eliminar claims pendientes." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("subscription_claims")
      .delete()
      .eq("id", claimId);

    if (deleteError) {
      return NextResponse.json(
        { message: "No se pudo eliminar el claim.", detail: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Claim eliminado correctamente.",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error inesperado al eliminar el claim." },
      { status: 500 }
    );
  }
}