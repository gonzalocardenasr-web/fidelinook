import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getSubscriptionCycle } from "../../../../lib/subscriptionCycle";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");

    if (!clienteId) {
      return NextResponse.json(
        { message: "Falta clienteId." },
        { status: 400 }
      );
    }

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("cliente_id", Number(clienteId))
      .eq("status", "active")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json(
        { message: "Error al buscar la suscripción activa." },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json({
        ok: true,
        subscription: null,
      });
    }

    const { data: template, error: templateError } = await supabaseAdmin
      .from("subscription_templates")
      .select("*")
      .eq("id", subscription.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { message: "No encontramos la configuración de la suscripción." },
        { status: 404 }
      );
    }

    const { cycleNumber, cycleStartDate, cycleEndDate } =
      getSubscriptionCycle(subscription.start_date);

    if (cycleNumber > template.duration_months) {
      return NextResponse.json({
        ok: true,
        subscription: null,
      });
    }

    const { data: consumptions, error: consumptionsError } = await supabaseAdmin
      .from("subscription_consumptions")
      .select("*")
      .eq("subscription_id", subscription.id)
      .eq("cycle_number", cycleNumber);

    if (consumptionsError) {
      return NextResponse.json(
        { message: "Error al obtener los consumos del ciclo actual." },
        { status: 500 }
      );
    }

    const consumido = {
      potes: consumptions?.reduce((acc, item) => acc + (item.potes || 0), 0) || 0,
      toppings:
        consumptions?.reduce((acc, item) => acc + (item.toppings || 0), 0) || 0,
      barquillos:
        consumptions?.reduce((acc, item) => acc + (item.barquillos || 0), 0) || 0,
      galletas:
        consumptions?.reduce((acc, item) => acc + (item.galletas || 0), 0) || 0,
    };

    const incluido = {
      potes: template.pots_per_month || 0,
      toppings: template.toppings_per_month || 0,
      barquillos: template.wafer_packs_per_month || 0,
      galletas: template.cookie_packs_per_month || 0,
    };

    const disponible = {
      potes: Math.max(0, incluido.potes - consumido.potes),
      toppings: Math.max(0, incluido.toppings - consumido.toppings),
      barquillos: Math.max(0, incluido.barquillos - consumido.barquillos),
      galletas: Math.max(0, incluido.galletas - consumido.galletas),
    };

    return NextResponse.json({
      ok: true,
      subscription: {
        id: subscription.id,
        clienteId: subscription.cliente_id,
        templateId: subscription.template_id,
        status: subscription.status,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        nextCycleDate: subscription.next_cycle_date,
        activatedAt: subscription.activated_at,
        name: template.name,
        durationMonths: template.duration_months,
        cycleNumber,
        cycleStartDate: cycleStartDate.toISOString().slice(0, 10),
        cycleEndDate: cycleEndDate.toISOString().slice(0, 10),
        incluido,
        consumido,
        disponible,
      },
    });
  } catch (error) {
    console.error("[active-by-client]", error);

    return NextResponse.json(
      { message: "Ocurrió un error inesperado al obtener la suscripción activa." },
      { status: 500 }
    );
  }
}