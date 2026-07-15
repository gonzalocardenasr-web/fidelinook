import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";
import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "../../../../lib/customer-events";

type LegacyReward = {
  id: string | number;
  nombre?: string;
  descripcion?: string | null;
  estado?: "activo" | "usado" | "caducado";
  vencimiento?: string | null;
  tipo?: string | null;
  campana_id?: number | null;
  fecha_canje?: string | null;
  [key: string]: unknown;
};

function isExpired(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() < Date.now();
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

    const customerId = Number(body.customerId);
    const rewardId = String(body.rewardId || "").trim();

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El cliente indicado no es válido.",
        },
        { status: 400 },
      );
    }

    if (!rewardId) {
      return NextResponse.json(
        {
          ok: false,
          message: "El premio indicado no es válido.",
        },
        { status: 400 },
      );
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("clientes")
      .select(
        `
          id,
          nombre,
          correo,
          public_token,
          premios,
          tarjeta_activa,
          email_verificado,
          fecha_ultimo_canje
        `,
      )
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se encontró el cliente.",
        },
        { status: 404 },
      );
    }

    if (!customer.tarjeta_activa || !customer.email_verificado) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "El cliente debe tener su tarjeta activa y correo verificado para canjear premios.",
        },
        { status: 400 },
      );
    }

    const previousRewards: LegacyReward[] = Array.isArray(customer.premios)
      ? [...customer.premios]
      : [];

    const rewardIndex = previousRewards.findIndex(
      (reward) =>
        String(reward?.id) === rewardId && reward?.estado === "activo",
    );

    if (rewardIndex === -1) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "No se encontró un premio activo con el identificador indicado.",
        },
        { status: 404 },
      );
    }

    const selectedReward = previousRewards[rewardIndex];

    if (isExpired(selectedReward.vencimiento)) {
      return NextResponse.json(
        {
          ok: false,
          message: "El premio seleccionado está vencido y no puede canjearse.",
        },
        { status: 400 },
      );
    }

    const redeemedAt = new Date().toISOString();

    const updatedRewards = previousRewards.map(
      (reward, index): LegacyReward =>
        index === rewardIndex
          ? {
              ...reward,
              estado: "usado",
              fecha_canje: redeemedAt,
            }
          : reward,
    );

    const { error: updateCustomerError } = await supabaseAdmin
      .from("clientes")
      .update({
        premios: updatedRewards,
        fecha_ultimo_canje: redeemedAt,
      })
      .eq("id", customerId);

    if (updateCustomerError) {
      console.error(
        "Error actualizando premio del cliente:",
        updateCustomerError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo canjear el premio.",
        },
        { status: 500 },
      );
    }

    const campaignId =
      selectedReward.campana_id === null ||
      selectedReward.campana_id === undefined
        ? null
        : Number(selectedReward.campana_id);

    let campaignTrackingUpdated = false;

    if (
      selectedReward.tipo === "campana" &&
      Number.isInteger(campaignId) &&
      Number(campaignId) > 0
    ) {
      const { error: campaignTrackingError } = await supabaseAdmin
        .from("campana_clientes")
        .update({
          estado: "canjeado",
          canjeado_at: redeemedAt,
        })
        .eq("campana_id", campaignId)
        .eq("cliente_id", customerId)
        .eq("premio_id", rewardId);

      if (campaignTrackingError) {
        console.error(
          "Error actualizando tracking de campaña:",
          campaignTrackingError,
        );

        await rollbackCustomerReward({
          customerId,
          previousRewards,
          previousRedeemedAt: customer.fecha_ultimo_canje,
        });

        return NextResponse.json(
          {
            ok: false,
            message:
              "No se pudo completar la trazabilidad del premio. El canje fue revertido.",
          },
          { status: 500 },
        );
      }

      campaignTrackingUpdated = true;
    }

    try {
      await recordCustomerEvent({
        customerId,
        eventType: "loyalty.reward_redeemed",
        sourceModule: "loyalty",
        sourceEntityType: "legacy_reward",
        sourceEntityId: rewardId,
        actorRole: session.role,
        occurredAt: redeemedAt,
        idempotencyKey: buildCustomerEventIdempotencyKey([
          "reward-redeemed",
          customerId,
          rewardId,
        ]),
        metadata: {
          rewardName: selectedReward.nombre || "Premio Nook",
          rewardType: selectedReward.tipo || null,
          campaignId,
          expiresAt: selectedReward.vencimiento || null,
          legacyRewardId: rewardId,
        },
      });
    } catch (eventError) {
      console.error(
        "Premio canjeado, pero falló el registro del evento:",
        eventError,
      );

      if (campaignTrackingUpdated && campaignId) {
        const { error: campaignRollbackError } = await supabaseAdmin
          .from("campana_clientes")
          .update({
            estado: "asignado",
            canjeado_at: null,
          })
          .eq("campana_id", campaignId)
          .eq("cliente_id", customerId)
          .eq("premio_id", rewardId);

        if (campaignRollbackError) {
          console.error(
            "No se pudo revertir el tracking de campaña:",
            campaignRollbackError,
          );
        }
      }

      const rollbackCompleted = await rollbackCustomerReward({
        customerId,
        previousRewards,
        previousRedeemedAt: customer.fecha_ultimo_canje,
      });

      if (!rollbackCompleted) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "El premio fue canjeado, pero ocurrió un problema de trazabilidad. No repitas la operación y contacta al administrador.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message:
            "No se pudo registrar el evento del canje. La operación fue revertida.",
        },
        { status: 500 },
      );
    }

    /*
     * El correo es posterior al hecho de negocio.
     * Si falla, el canje sigue siendo válido.
     */
    let emailSent = false;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");

      if (!baseUrl) {
        console.error("NEXT_PUBLIC_BASE_URL no está configurada.");
      } else {
        const emailResponse = await fetch(
          `${baseUrl}/api/send-reward-redeemed`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: customer.correo,
              nombre: customer.nombre,
              premioNombre: selectedReward.nombre || "Premio Nook",
              publicToken: customer.public_token,
            }),
          },
        );

        emailSent = emailResponse.ok;
      }
    } catch (emailError) {
      console.error("Error enviando correo de canje:", emailError);
    }

    return NextResponse.json({
      ok: true,
      reward: {
        ...selectedReward,
        estado: "usado",
        fecha_canje: redeemedAt,
      },
      emailSent,
      message: `Premio canjeado correctamente: ${
        selectedReward.nombre || "Premio Nook"
      }.`,
    });
  } catch (error) {
    console.error("Error inesperado canjeando premio:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al canjear el premio.",
      },
      { status: 500 },
    );
  }
}

async function rollbackCustomerReward({
  customerId,
  previousRewards,
  previousRedeemedAt,
}: {
  customerId: number;
  previousRewards: LegacyReward[];
  previousRedeemedAt?: string | null;
}) {
  const { error } = await supabaseAdmin
    .from("clientes")
    .update({
      premios: previousRewards,
      fecha_ultimo_canje: previousRedeemedAt || null,
    })
    .eq("id", customerId);

  if (error) {
    console.error(
      "No se pudo revertir el premio del cliente:",
      customerId,
      error,
    );

    return false;
  }

  return true;
}
