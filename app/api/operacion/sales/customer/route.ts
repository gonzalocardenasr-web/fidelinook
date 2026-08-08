import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

type LoyaltyApplicationResult = {
  applied?: boolean;
  movement_id?: number | null;
  movement_created?: boolean;
  applied_delta?: number;
};

type LoyaltyConversionResult = {
  converted?: boolean;
  rewards_issued?: number;
  reward_ids?: number[];
  balance_after?: number;
  reason?: string | null;
};

type AssignCustomerWithLoyaltyResult = {
  sale_id: number;
  change_id?: number | null;

  previous_customer_id?: number | null;

  customer_id: number;
  customer_name?: string | null;

  changed: boolean;
  delivered?: boolean;

  business_date?: string | null;

  promotion_moved?: boolean;

  previous_projection?: Record<string, unknown> | null;
  previous_application?: LoyaltyApplicationResult | null;

  new_projection?: Record<string, unknown> | null;
  new_application?: LoyaltyApplicationResult | null;

  new_conversion?: LoyaltyConversionResult | null;
};

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

    const warnings: string[] = [];

    const saleId = Number(body.saleId);
    const customerId = Number(body.customerId);
    const reason = String(body.reason || "").trim();

    if (!Number.isInteger(saleId) || saleId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "La venta indicada no es válida.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "El cliente indicado no es válido.",
        },
        { status: 400 },
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        {
          ok: false,
          message: "El motivo no puede superar los 500 caracteres.",
        },
        { status: 400 },
      );
    }

    /*
     * =========================================================
     * 1. REASIGNACIÓN ATÓMICA
     *
     * El RPC se hace responsable de:
     *
     * - cambiar sales.customer_id;
     * - registrar sale_customer_changes;
     * - registrar sale.customer_assigned / changed;
     * - mover la promoción POS asociada a la venta;
     * - recalcular cliente anterior;
     * - materializar reversa si corresponde;
     * - recalcular cliente nuevo;
     * - materializar crédito si corresponde;
     * - convertir sellos en premios;
     * - verificar pending_stamp_delta = 0.
     *
     * Si algo falla, PostgreSQL revierte TODO.
     * =========================================================
     */

    const { data, error } = await supabaseAdmin.rpc(
      "assign_customer_to_sale_with_loyalty",
      {
        p_sale_id: saleId,
        p_customer_id: customerId,
        p_actor_role: session.role,
        p_actor_identifier: null,
        p_reason: reason || null,
      },
    );

    if (error) {
      console.error(
        "No se pudo reasignar la venta con reconciliación de fidelización:",
        {
          saleId,
          customerId,
          error,
        },
      );

      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 400 },
      );
    }

    const result =
      data && typeof data === "object"
        ? (data as AssignCustomerWithLoyaltyResult)
        : null;

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "No se recibió confirmación de la actualización del cliente.",
        },
        { status: 500 },
      );
    }

    /*
     * =========================================================
     * 2. RECARGAR VENTA
     *
     * Desde este punto la operación patrimonial YA terminó
     * correctamente.
     *
     * Cualquier problema posterior NO debe revertir la operación.
     * =========================================================
     */

    const { data: updatedSale, error: updatedSaleError } = await supabaseAdmin
      .from("sales")
      .select(
        `
            id,
            customer_id,
            clientes (
              id,
              nombre,
              correo,
              telefono
            )
          `,
      )
      .eq("id", saleId)
      .single();

    if (updatedSaleError) {
      console.error(
        "Venta reasignada correctamente, pero no se pudo recargar:",
        {
          saleId,
          customerId,
          error: updatedSaleError,
        },
      );

      warnings.push(
        "El cliente fue asignado correctamente, pero no se pudo recargar la venta.",
      );
    }

    /*
     * =========================================================
     * 3. NOTIFICACIONES POSTERIORES
     *
     * Los correos son side effects.
     *
     * Nunca deben invalidar:
     * - reasignación;
     * - sellos;
     * - reversas;
     * - premios.
     * =========================================================
     */

    if (result.changed && result.delivered) {
      const newApplication =
        result.new_application && typeof result.new_application === "object"
          ? result.new_application
          : null;

      const conversion =
        result.new_conversion && typeof result.new_conversion === "object"
          ? result.new_conversion
          : null;

      const appliedDelta = Number(newApplication?.applied_delta ?? 0);

      const movementCreated = Boolean(newApplication?.movement_created);

      const rewardsIssued = Number(conversion?.rewards_issued ?? 0);

      const rewardIds = Array.isArray(conversion?.reward_ids)
        ? conversion.reward_ids
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0)
        : [];

      const rewardWasIssued =
        Boolean(conversion?.converted) &&
        Number.isInteger(rewardsIssued) &&
        rewardsIssued > 0 &&
        rewardIds.length > 0;

      /*
       * =======================================================
       * 3.1 NOTIFICAR PREMIO NUEVO
       * =======================================================
       */

      if (rewardWasIssued) {
        try {
          const { data: customer, error: customerError } = await supabaseAdmin
            .from("clientes")
            .select(
              `
                  id,
                  nombre,
                  correo,
                  public_token
                `,
            )
            .eq("id", customerId)
            .single();

          if (customerError || !customer) {
            console.error(
              "Premio generado tras reasignación, pero no se pudo cargar el cliente:",
              customerError,
            );

            warnings.push(
              "El premio fue generado correctamente, pero no se pudo preparar su correo.",
            );
          } else {
            const { data: issuedRewards, error: rewardsError } =
              await supabaseAdmin
                .from("customer_rewards")
                .select(
                  `
                  id,
                  name,
                  expires_at
                `,
                )
                .in("id", rewardIds)
                .order("id", {
                  ascending: true,
                });

            if (rewardsError) {
              console.error(
                "Premio generado tras reasignación, pero no se pudo cargar:",
                rewardsError,
              );

              warnings.push(
                "El premio fue generado correctamente, pero no se pudo preparar su notificación.",
              );
            } else {
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(
                /\/$/,
                "",
              );

              if (!baseUrl) {
                console.error(
                  "NEXT_PUBLIC_BASE_URL no está configurada para notificar premios.",
                );

                warnings.push(
                  "El premio fue generado correctamente, pero el correo no pudo enviarse por configuración.",
                );
              } else {
                const emailResults = await Promise.allSettled(
                  (issuedRewards || []).map(async (reward) => {
                    const emailResponse = await fetch(
                      `${baseUrl}/api/send-prize`,
                      {
                        method: "POST",

                        headers: {
                          "Content-Type": "application/json",
                        },

                        body: JSON.stringify({
                          email: customer.correo,
                          nombre: customer.nombre,

                          premioNombre: reward.name || "Helado simple gratis",

                          vencimiento: reward.expires_at,

                          publicToken: customer.public_token,
                        }),
                      },
                    );

                    if (!emailResponse.ok) {
                      throw new Error(
                        `El correo del premio ${reward.id} respondió ${emailResponse.status}.`,
                      );
                    }

                    return reward.id;
                  }),
                );

                const failedEmails = emailResults.filter(
                  (emailResult) => emailResult.status === "rejected",
                );

                if (failedEmails.length > 0) {
                  console.error(
                    "Uno o más correos de premio no pudieron enviarse:",
                    failedEmails,
                  );

                  warnings.push(
                    rewardsIssued === 1
                      ? "El premio fue generado, pero su correo no pudo enviarse."
                      : "Los premios fueron generados, pero uno o más correos no pudieron enviarse.",
                  );
                }
              }
            }
          }
        } catch (notificationError) {
          console.error(
            "Error inesperado notificando premio posterior a reasignación:",
            notificationError,
          );

          warnings.push(
            "El premio fue generado correctamente, pero ocurrió un problema al enviar su correo.",
          );
        }
      }

      /*
       * =======================================================
       * 3.2 NOTIFICAR AVANCE DE SELLOS
       *
       * Solo:
       * - hubo movimiento nuevo;
       * - delta > 0;
       * - no se emitió premio.
       *
       * Nunca enviamos correo por una reversa.
       * =======================================================
       */

      const shouldSendStampEmail =
        movementCreated &&
        Number.isInteger(appliedDelta) &&
        appliedDelta > 0 &&
        !rewardWasIssued;

      if (shouldSendStampEmail) {
        try {
          const [
            { data: customer, error: customerError },

            { data: loyaltyAccount, error: loyaltyAccountError },

            { data: rewardRule, error: rewardRuleError },
          ] = await Promise.all([
            supabaseAdmin
              .from("clientes")
              .select(
                `
                  id,
                  nombre,
                  correo,
                  public_token
                `,
              )
              .eq("id", customerId)
              .single(),

            supabaseAdmin
              .from("loyalty_accounts")
              .select("current_stamp_balance")
              .eq("customer_id", customerId)
              .single(),

            supabaseAdmin
              .from("loyalty_rules")
              .select("conditions")
              .eq("code", "LOYALTY_REWARD_THRESHOLD")
              .eq("version", 1)
              .eq("configuration_version", "LOYALTY_POLICY_V1")
              .limit(1)
              .maybeSingle(),
          ]);

          if (customerError || !customer) {
            console.error(
              "Sellos reconciliados tras reasignación, pero no se pudo cargar el cliente:",
              customerError,
            );

            warnings.push(
              "Los sellos fueron procesados correctamente, pero no se pudo preparar su correo.",
            );
          } else if (loyaltyAccountError || !loyaltyAccount) {
            console.error(
              "Sellos reconciliados tras reasignación, pero no se pudo obtener el saldo:",
              loyaltyAccountError,
            );

            warnings.push(
              "Los sellos fueron procesados correctamente, pero no se pudo obtener el saldo para su correo.",
            );
          } else if (
            !customer.correo ||
            !customer.nombre ||
            !customer.public_token
          ) {
            console.error(
              "Sellos reconciliados, pero faltan datos del cliente para notificar:",
              {
                customerId,
                hasEmail: Boolean(customer.correo),
                hasName: Boolean(customer.nombre),
                hasPublicToken: Boolean(customer.public_token),
              },
            );

            warnings.push(
              "Los sellos fueron procesados correctamente, pero el cliente no tiene datos completos para recibir el correo.",
            );
          } else {
            if (rewardRuleError) {
              console.error(
                "No se pudo cargar la meta de fidelización; se utilizará 7:",
                rewardRuleError,
              );
            }

            const ruleConditions =
              rewardRule?.conditions &&
              typeof rewardRule.conditions === "object"
                ? (rewardRule.conditions as Record<string, unknown>)
                : {};

            const configuredGoal = Number(ruleConditions.stampsRequired);

            const metaSellos =
              Number.isInteger(configuredGoal) && configuredGoal > 0
                ? configuredGoal
                : 7;

            const sellosActuales = Number(
              loyaltyAccount.current_stamp_balance ?? 0,
            );

            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(
              /\/$/,
              "",
            );

            if (!baseUrl) {
              console.error(
                "NEXT_PUBLIC_BASE_URL no está configurada para enviar correos de sellos.",
              );

              warnings.push(
                "Los sellos fueron procesados correctamente, pero el correo no pudo enviarse por configuración.",
              );
            } else {
              const emailResponse = await fetch(`${baseUrl}/api/send-stamp`, {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  email: customer.correo,
                  nombre: customer.nombre,
                  sellosActuales,
                  metaSellos,
                  publicToken: customer.public_token,
                }),
              });

              if (!emailResponse.ok) {
                const emailErrorBody = await emailResponse
                  .text()
                  .catch(() => "");

                throw new Error(
                  `El correo de sellos respondió ${emailResponse.status}. ${emailErrorBody}`,
                );
              }
            }
          }
        } catch (stampEmailError) {
          console.error(
            "Sellos reconciliados tras reasignación, pero falló el correo:",
            {
              saleId,
              customerId,
              appliedDelta,
              error: stampEmailError,
            },
          );

          warnings.push(
            "Los sellos fueron procesados correctamente, pero su correo no pudo enviarse.",
          );
        }
      }
    }

    /*
     * =========================================================
     * 4. RESPUESTA
     * =========================================================
     */

    return NextResponse.json({
      ok: true,

      changed: Boolean(result.changed),

      sale: updatedSale || null,

      loyalty: {
        delivered: Boolean(result.delivered),

        businessDate: result.business_date || null,

        promotionMoved: Boolean(result.promotion_moved),

        previousApplication: result.previous_application || null,

        newApplication: result.new_application || null,

        conversion: result.new_conversion || null,
      },

      warnings,

      message: result.changed
        ? warnings.length > 0
          ? "Cliente asignado correctamente, con advertencias posteriores."
          : "Cliente asignado correctamente."
        : "La venta ya estaba asignada a este cliente.",
    });
  } catch (error) {
    console.error("Error asignando cliente a venta:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al asignar el cliente.",
      },
      { status: 500 },
    );
  }
}
