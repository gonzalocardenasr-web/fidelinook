import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";
import { getSubscriptionCycle } from "../../../../lib/subscriptionCycle";
import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "../../../../lib/customer-events";

type ConsumptionAmounts = {
  potes: number;
  toppings: number;
  barquillos: number;
  galletas: number;
};

function normalizePositiveInteger(value: unknown) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function POST(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    const subscriptionId = Number(body.subscriptionId);
    const clienteId = Number(body.clienteId);

    const amounts: ConsumptionAmounts = {
      potes: normalizePositiveInteger(body.potes) ?? -1,
      toppings: normalizePositiveInteger(body.toppings) ?? -1,
      barquillos: normalizePositiveInteger(body.barquillos) ?? -1,
      galletas: normalizePositiveInteger(body.galletas) ?? -1,
    };

    if (
      !Number.isInteger(subscriptionId) ||
      subscriptionId <= 0 ||
      !Number.isInteger(clienteId) ||
      clienteId <= 0
    ) {
      return NextResponse.json(
        { ok: false, message: "Faltan datos obligatorios válidos." },
        { status: 400 },
      );
    }

    if (Object.values(amounts).some((value) => value < 0)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Las cantidades deben ser números enteros iguales o mayores que cero.",
        },
        { status: 400 },
      );
    }

    const totalRequested =
      amounts.potes + amounts.toppings + amounts.barquillos + amounts.galletas;

    if (totalRequested === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes registrar al menos un producto consumido.",
        },
        { status: 400 },
      );
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select(
        `
        id,
        cliente_id,
        template_id,
        status,
        start_date
      `,
      )
      .eq("id", subscriptionId)
      .eq("cliente_id", clienteId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { ok: false, message: "Suscripción no encontrada." },
        { status: 404 },
      );
    }

    if (subscription.status !== "active") {
      return NextResponse.json(
        { ok: false, message: "La suscripción no está activa." },
        { status: 400 },
      );
    }

    const { data: template, error: templateError } = await supabaseAdmin
      .from("subscription_templates")
      .select(
        `
        id,
        name,
        pots_per_month,
        toppings_per_month,
        wafer_packs_per_month,
        cookie_packs_per_month
      `,
      )
      .eq("id", subscription.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        {
          ok: false,
          message: "No encontramos la configuración de la suscripción.",
        },
        { status: 404 },
      );
    }

    if (amounts.potes > 0 && template.pots_per_month === 0) {
      return NextResponse.json(
        { ok: false, message: "Esta suscripción no incluye potes." },
        { status: 400 },
      );
    }

    if (amounts.toppings > 0 && template.toppings_per_month === 0) {
      return NextResponse.json(
        { ok: false, message: "Esta suscripción no incluye toppings." },
        { status: 400 },
      );
    }

    if (amounts.barquillos > 0 && template.wafer_packs_per_month === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Esta suscripción no incluye barquillos.",
        },
        { status: 400 },
      );
    }

    if (amounts.galletas > 0 && template.cookie_packs_per_month === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Esta suscripción no incluye galletas.",
        },
        { status: 400 },
      );
    }

    const { cycleNumber, cycleStartDate, cycleEndDate } = getSubscriptionCycle(
      subscription.start_date,
    );

    const { data: consumptions, error: consError } = await supabaseAdmin
      .from("subscription_consumptions")
      .select("potes, toppings, barquillos, galletas")
      .eq("subscription_id", subscriptionId)
      .eq("cycle_number", cycleNumber);

    if (consError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Error al obtener los consumos actuales.",
        },
        { status: 500 },
      );
    }

    const totalConsumido = (consumptions || []).reduce<ConsumptionAmounts>(
      (acc, consumption) => ({
        potes: acc.potes + Number(consumption.potes || 0),
        toppings: acc.toppings + Number(consumption.toppings || 0),
        barquillos: acc.barquillos + Number(consumption.barquillos || 0),
        galletas: acc.galletas + Number(consumption.galletas || 0),
      }),
      {
        potes: 0,
        toppings: 0,
        barquillos: 0,
        galletas: 0,
      },
    );

    if (
      amounts.potes >
      Number(template.pots_per_month || 0) - totalConsumido.potes
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "No tienes suficientes potes disponibles.",
        },
        { status: 400 },
      );
    }

    if (
      amounts.toppings >
      Number(template.toppings_per_month || 0) - totalConsumido.toppings
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "No tienes suficientes toppings disponibles.",
        },
        { status: 400 },
      );
    }

    if (
      amounts.barquillos >
      Number(template.wafer_packs_per_month || 0) - totalConsumido.barquillos
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "No tienes suficientes barquillos disponibles.",
        },
        { status: 400 },
      );
    }

    if (
      amounts.galletas >
      Number(template.cookie_packs_per_month || 0) - totalConsumido.galletas
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "No tienes suficientes galletas disponibles.",
        },
        { status: 400 },
      );
    }

    const { data: consumption, error: insertError } = await supabaseAdmin
      .from("subscription_consumptions")
      .insert({
        subscription_id: subscriptionId,
        cliente_id: clienteId,
        cycle_number: cycleNumber,
        cycle_start_date: cycleStartDate,
        cycle_end_date: cycleEndDate,
        potes: amounts.potes,
        toppings: amounts.toppings,
        barquillos: amounts.barquillos,
        galletas: amounts.galletas,
      })
      .select("id, created_at")
      .single();

    if (insertError || !consumption) {
      return NextResponse.json(
        {
          ok: false,
          message: "Error al registrar el consumo.",
        },
        { status: 500 },
      );
    }

    try {
      await recordCustomerEvent({
        customerId: clienteId,
        eventType: "subscription.consumed",
        sourceModule: "subscriptions",
        sourceEntityType: "subscription_consumption",
        sourceEntityId: consumption.id,
        actorRole: session.role,
        occurredAt: consumption.created_at || new Date(),
        idempotencyKey: buildCustomerEventIdempotencyKey([
          "subscription-consumed",
          consumption.id,
        ]),
        metadata: {
          subscriptionId,
          subscriptionTemplateId: template.id,
          subscriptionName: template.name || null,
          cycleNumber,
          cycleStartDate,
          cycleEndDate,
          potes: amounts.potes,
          toppings: amounts.toppings,
          barquillos: amounts.barquillos,
          galletas: amounts.galletas,
        },
      });
    } catch (eventError) {
      console.error(
        "Consumo registrado, pero falló el registro del evento:",
        eventError,
      );

      /*
       * Revertimos el consumo recién creado para evitar que el usuario
       * reciba un error y luego repita una operación que sí quedó guardada.
       */
      const { error: rollbackError } = await supabaseAdmin
        .from("subscription_consumptions")
        .delete()
        .eq("id", consumption.id);

      if (rollbackError) {
        console.error(
          "No se pudo revertir el consumo después del error de evento:",
          rollbackError,
        );

        return NextResponse.json(
          {
            ok: false,
            message:
              "El consumo fue registrado, pero ocurrió un problema de trazabilidad. No repitas la operación y contacta al administrador.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message:
            "No se pudo registrar el evento del consumo. La operación fue revertida.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      consumptionId: consumption.id,
      message: "Consumo registrado correctamente.",
    });
  } catch (error) {
    console.error("[register-consumption]", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al registrar el consumo.",
      },
      { status: 500 },
    );
  }
}
