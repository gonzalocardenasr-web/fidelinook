import { NextResponse } from "next/server";
import { getOperationSession } from "../../../../lib/operation-auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getSubscriptionCycle } from "../../../../lib/subscriptionCycle";

async function validateOperationalUser() {
  const session = await getOperationSession();

  if (!session.ok || !session.userId) {
    return {
      error: NextResponse.json(
        { ok: false, message: "No autenticado." },
        { status: 401 }
      ),
    };
  }

  const { data: operationalUser, error } = await supabaseAdmin
    .from("operational_users")
    .select("id, role, is_active")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) {
    return {
      error: NextResponse.json(
        { ok: false, message: "No fue posible validar al usuario operacional." },
        { status: 500 }
      ),
    };
  }

  if (
    !operationalUser ||
    !operationalUser.is_active ||
    operationalUser.role !== session.role
  ) {
    return {
      error: NextResponse.json(
        { ok: false, message: "Usuario operacional no autorizado." },
        { status: 403 }
      ),
    };
  }

  return { error: null };
}

export async function GET(req: Request) {
  const validation = await validateOperationalUser();

  if (validation.error) {
    return validation.error;
  }

  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");

    if (!clienteId) {
      return NextResponse.json(
        { message: "Falta clienteId." },
        { status: 400 }
      );
    }

    // 🔴 1. Traer TODAS las suscripciones activas
    const { data: subscriptions, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("cliente_id", Number(clienteId))
      .eq("status", "active");

    if (error) {
      return NextResponse.json(
        { message: "Error al obtener suscripciones." },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        ok: true,
        subscriptions: [],
      });
    }

    const resultado = [];

    for (const subscription of subscriptions) {
      const { data: template } = await supabaseAdmin
        .from("subscription_templates")
        .select("*")
        .eq("id", subscription.template_id)
        .single();

      if (!template) continue;

      const { cycleNumber, cycleStartDate, cycleEndDate } =
        getSubscriptionCycle(subscription.start_date);

      if (cycleNumber > template.duration_months) continue;

      const { data: consumptions } = await supabaseAdmin
        .from("subscription_consumptions")
        .select("*")
        .eq("subscription_id", subscription.id)
        .eq("cycle_number", cycleNumber);

      const consumido = {
        potes: consumptions?.reduce((acc, c) => acc + c.potes, 0) || 0,
        toppings: consumptions?.reduce((acc, c) => acc + c.toppings, 0) || 0,
        barquillos:
          consumptions?.reduce((acc, c) => acc + c.barquillos, 0) || 0,
        galletas:
          consumptions?.reduce((acc, c) => acc + c.galletas, 0) || 0,
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
        barquillos: Math.max(
          0,
          incluido.barquillos - consumido.barquillos
        ),
        galletas: Math.max(0, incluido.galletas - consumido.galletas),
      };

      resultado.push({
        id: subscription.id,
        name: template.name,
        status: subscription.status,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        durationMonths: template.duration_months,
        cycleNumber,
        cycleStartDate: cycleStartDate.toISOString().slice(0, 10),
        cycleEndDate: cycleEndDate.toISOString().slice(0, 10),
        incluido,
        consumido,
        disponible,
      });
    }

    return NextResponse.json({
      ok: true,
      subscriptions: resultado,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error inesperado." },
      { status: 500 }
    );
  }
}