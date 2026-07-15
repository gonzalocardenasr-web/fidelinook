import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";

type RedeemRewardRpcResult = {
  customer_id?: unknown;
  reward_id?: unknown;
  legacy_reward_id?: unknown;
  reward_name?: unknown;
  reward_type?: unknown;
  campaign_id?: unknown;
  redeemed_at?: unknown;
  event_id?: unknown;
  event_created?: unknown;
  redeemed?: unknown;
  already_redeemed?: unknown;
};

function getErrorStatus(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("no se encontró") ||
    normalized.includes("no existe")
  ) {
    return 404;
  }

  if (
    normalized.includes("no se encuentra activo") ||
    normalized.includes("vencido") ||
    normalized.includes("tarjeta activa") ||
    normalized.includes("correo verificado") ||
    normalized.includes("no es válido")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "No autenticado.",
      },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    const customerId = Number(body.customerId);
    const rewardReference = String(body.rewardId || "").trim();

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El cliente indicado no es válido.",
        },
        { status: 400 },
      );
    }

    if (!rewardReference) {
      return NextResponse.json(
        {
          ok: false,
          message: "El premio indicado no es válido.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("redeem_customer_reward", {
      p_customer_id: customerId,
      p_reward_reference: rewardReference,
      p_actor_role: session.role,
      p_actor_identifier: null,
    });

    if (error) {
      console.error("Error canjeando premio:", error);

      return NextResponse.json(
        {
          ok: false,
          message: error.message || "No se pudo canjear el premio.",
        },
        {
          status: getErrorStatus(String(error.message || "")),
        },
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        {
          ok: false,
          message: "El canje no entregó una respuesta válida.",
        },
        { status: 500 },
      );
    }

    const result = data as RedeemRewardRpcResult;

    const rewardId = Number(result.reward_id);
    const rewardName = String(result.reward_name || "Premio Nook");

    if (!Number.isInteger(rewardId) || rewardId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El canje no entregó un premio válido.",
        },
        { status: 500 },
      );
    }

    /*
     * El correo es posterior al canje.
     * Si falla, el premio permanece correctamente canjeado.
     */
    let emailSent = false;

    if (Boolean(result.redeemed)) {
      try {
        const { data: customer, error: customerError } = await supabaseAdmin
          .from("clientes")
          .select(
            `
              nombre,
              correo,
              public_token
            `,
          )
          .eq("id", customerId)
          .single();

        if (customerError || !customer) {
          console.error(
            "Premio canjeado, pero no se pudo cargar el cliente:",
            customerError,
          );
        } else {
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
                  premioNombre: rewardName,
                  publicToken: customer.public_token,
                }),
              },
            );

            emailSent = emailResponse.ok;

            if (!emailResponse.ok) {
              console.error(
                "El correo de canje respondió con error:",
                emailResponse.status,
              );
            }
          }
        }
      } catch (emailError) {
        console.error("Error enviando correo de canje:", emailError);
      }
    }

    return NextResponse.json({
      ok: true,

      reward: {
        id: rewardId,
        legacyRewardId: result.legacy_reward_id || null,
        name: rewardName,
        type: result.reward_type || null,
        redeemedAt: result.redeemed_at || null,
      },

      redeemed: Boolean(result.redeemed),
      alreadyRedeemed: Boolean(result.already_redeemed),

      emailSent,

      message: Boolean(result.already_redeemed)
        ? "El premio ya había sido canjeado."
        : `Premio canjeado correctamente: ${rewardName}.`,
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
