import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, clienteId } = body as {
      code?: string;
      clienteId?: number;
    };

    if (!code || !clienteId) {
      return NextResponse.json(
        { message: "Faltan datos para canjear el código." },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("subscription_claims")
      .select("*")
      .eq("claim_code", normalizedCode)
      .eq("status", "pending")
      .eq("source", "admin_code")
      .single();

    if (claimError || !claim) {
      return NextResponse.json(
        { message: "No encontramos un código válido disponible para canje." },
        { status: 404 }
      );
    }

    const { data: template, error: templateError } = await supabaseAdmin
      .from("subscription_templates")
      .select("id, duration_months")
      .eq("id", claim.template_id)
      .single();

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

    const { error: insertSubscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        cliente_id: clienteId,
        template_id: claim.template_id,
        claim_id: claim.id,
        status: "active",
        start_date: startDate,
        end_date: endDate.toISOString().slice(0, 10),
        next_cycle_date: nextCycleDate.toISOString().slice(0, 10),
      });

    if (insertSubscriptionError) {
      return NextResponse.json(
        {
          message: "No se pudo crear la suscripción activa.",
          detail: insertSubscriptionError.message,
        },
        { status: 500 }
      );
    }

    const { error: updateClaimError } = await supabaseAdmin
      .from("subscription_claims")
      .update({
        status: "claimed",
        claimed_by_cliente_id: clienteId,
        claimed_at: activatedAt.toISOString(),
      })
      .eq("id", claim.id);

    if (updateClaimError) {
      return NextResponse.json(
        {
          message:
            "La suscripción se creó, pero no se pudo actualizar el código.",
          detail: updateClaimError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Código canjeado correctamente.",
    });
  } catch (error) {
    console.error("Error canjeando código:", error);

    return NextResponse.json(
      { message: "Ocurrió un error inesperado al canjear el código." },
      { status: 500 }
    );
  }
}