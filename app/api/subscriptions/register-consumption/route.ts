import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getSubscriptionCycle } from "../../../../lib/subscriptionCycle";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      subscriptionId,
      clienteId,
      potes = 0,
      toppings = 0,
      barquillos = 0,
      galletas = 0,
    } = body;

    // 🔴 1. Validación básica
    if (!subscriptionId || !clienteId) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios." },
        { status: 400 }
      );
    }

    // 🔴 2. Obtener suscripción
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("cliente_id", clienteId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { message: "Suscripción no encontrada." },
        { status: 404 }
      );
    }

    // 🔴 3. Validar estado
    if (subscription.status !== "active") {
      return NextResponse.json(
        { message: "La suscripción no está activa." },
        { status: 400 }
      );
    }

    // 🔴 4. Obtener template
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

    // 🔴 5. Validar productos incluidos
    if (potes > 0 && template.pots_per_month === 0) {
      return NextResponse.json(
        { message: "Esta suscripción no incluye potes." },
        { status: 400 }
      );
    }

    if (toppings > 0 && template.toppings_per_month === 0) {
      return NextResponse.json(
        { message: "Esta suscripción no incluye toppings." },
        { status: 400 }
      );
    }

    if (barquillos > 0 && template.wafer_packs_per_month === 0) {
      return NextResponse.json(
        { message: "Esta suscripción no incluye barquillos." },
        { status: 400 }
      );
    }

    if (galletas > 0 && template.cookie_packs_per_month === 0) {
      return NextResponse.json(
        { message: "Esta suscripción no incluye galletas." },
        { status: 400 }
      );
    }

    // 🔴 6. Calcular ciclo actual
    const { cycleNumber, cycleStartDate, cycleEndDate } =
      getSubscriptionCycle(subscription.start_date);

    // 🔴 7. Obtener consumos del ciclo actual
    const { data: consumptions, error: consError } = await supabaseAdmin
      .from("subscription_consumptions")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .eq("cycle_number", cycleNumber);

    if (consError) {
      return NextResponse.json(
        { message: "Error al obtener consumos actuales." },
        { status: 500 }
      );
    }

    const totalConsumido = {
      potes: consumptions?.reduce((acc, c) => acc + c.potes, 0) || 0,
      toppings: consumptions?.reduce((acc, c) => acc + c.toppings, 0) || 0,
      barquillos:
        consumptions?.reduce((acc, c) => acc + c.barquillos, 0) || 0,
      galletas:
        consumptions?.reduce((acc, c) => acc + c.galletas, 0) || 0,
    };

    // 🔴 8. Validar disponibilidad
    if (potes > template.pots_per_month - totalConsumido.potes) {
      return NextResponse.json(
        { message: "No tienes suficientes potes disponibles." },
        { status: 400 }
      );
    }

    if (toppings > template.toppings_per_month - totalConsumido.toppings) {
      return NextResponse.json(
        { message: "No tienes suficientes toppings disponibles." },
        { status: 400 }
      );
    }

    if (
      barquillos >
      template.wafer_packs_per_month - totalConsumido.barquillos
    ) {
      return NextResponse.json(
        { message: "No tienes suficientes barquillos disponibles." },
        { status: 400 }
      );
    }

    if (
      galletas >
      template.cookie_packs_per_month - totalConsumido.galletas
    ) {
      return NextResponse.json(
        { message: "No tienes suficientes galletas disponibles." },
        { status: 400 }
      );
    }

    // 🔴 9. Insertar consumo
    const { error: insertError } = await supabaseAdmin
      .from("subscription_consumptions")
      .insert({
        subscription_id: subscriptionId,
        cliente_id: clienteId,
        cycle_number: cycleNumber,
        cycle_start_date: cycleStartDate,
        cycle_end_date: cycleEndDate,
        potes,
        toppings,
        barquillos,
        galletas,
      });

    if (insertError) {
      return NextResponse.json(
        { message: "Error al registrar consumo." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Consumo registrado correctamente.",
    });
  } catch (error) {
    console.error("[register-consumption]", error);

    return NextResponse.json(
      { message: "Error inesperado." },
      { status: 500 }
    );
  }
}