import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { claimId, clienteId } = body as {
      claimId?: number;
      clienteId?: number;
    };

    console.log("[activate-assigned] body:", { claimId, clienteId });

    if (!claimId || !clienteId) {
      return NextResponse.json(
        { message: "Faltan datos para activar la suscripción." },
        { status: 400 }
      );
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("subscription_claims")
      .select("*")
      .eq("id", claimId)
      .eq("assigned_cliente_id", clienteId)
      .eq("status", "pending")
      .single();

    console.log("[activate-assigned] claim:", claim);
    console.log("[activate-assigned] claimError:", claimError);

    if (claimError || !claim) {
      return NextResponse.json(
        { message: "No encontramos una suscripción pendiente válida." },
        { status: 404 }
      );
    }

    const { data: template, error: templateError } = await supabaseAdmin
      .from("subscription_templates")
      .select("id, duration_months")
      .eq("id", claim.template_id)
      .single();

    console.log("[activate-assigned] template:", template);
    console.log("[activate-assigned] templateError:", templateError);

    if (templateError || !template) {
      return NextResponse.json(
        { message: "No encontramos la configuración de la suscripción." },
        { status: 404 }
      );
    }

    const activatedAt = new Date();
    const startDate = activatedAt.toISOString().slice(0, 10);

    const endDate = new Date(activatedAt);
    endDate.setMonth(endDate.getMonth() + template.duration_months);

    const nextCycleDate = new Date(activatedAt);
    nextCycleDate.setMonth(nextCycleDate.getMonth() + 1);

    const { data: insertedSubscription, error: insertSubscriptionError } =
      await supabaseAdmin
        .from("subscriptions")
        .insert({
          cliente_id: clienteId,
          template_id: claim.template_id,
          claim_id: claim.id,
          status: "active",
          start_date: startDate,
          end_date: endDate.toISOString().slice(0, 10),
          next_cycle_date: nextCycleDate.toISOString().slice(0, 10),
          activated_at: activatedAt.toISOString(),
        })
        .select()
        .single();

    console.log(
      "[activate-assigned] insertedSubscription:",
      insertedSubscription
    );
    console.log(
      "[activate-assigned] insertSubscriptionError:",
      insertSubscriptionError
    );

    if (insertSubscriptionError) {
      return NextResponse.json(
        {
          message: "No se pudo crear la suscripción activa.",
          detail: insertSubscriptionError.message,
        },
        { status: 500 }
      );
    }

    const { data: updatedClaim, error: updateClaimError } = await supabaseAdmin
      .from("subscription_claims")
      .update({
        status: "claimed",
        claimed_by_cliente_id: clienteId,
        claimed_at: activatedAt.toISOString(),
      })
      .eq("id", claim.id)
      .select()
      .single();

    console.log("[activate-assigned] updatedClaim:", updatedClaim);
    console.log("[activate-assigned] updateClaimError:", updateClaimError);

    if (updateClaimError) {
      return NextResponse.json(
        {
          message:
            "La suscripción se creó, pero no se pudo actualizar el claim.",
          detail: updateClaimError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Suscripción activada correctamente.",
    });
  } catch (error) {
    console.error("[activate-assigned] unexpected error:", error);

    return NextResponse.json(
      { message: "Ocurrió un error inesperado al activar la suscripción." },
      { status: 500 }
    );
  }
}