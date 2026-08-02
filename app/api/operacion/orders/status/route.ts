import { NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "../../../../../lib/customer-events";

import {
  getBusinessDateInTimezone,
  rebuildDailyLoyaltyProjection,
} from "../../../../../lib/daily-loyalty";

import { applyDailyLoyaltyCredit } from "../../../../../lib/daily-loyalty-application";
import { convertLoyaltyStampsToRewards } from "../../../../../lib/loyalty-rewards";

import {
  createCorrelationId,
  recordAuditLogSafely,
} from "../../../../../lib/audit-logs";

const allowedStatuses = [
  "pending",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

type AllowedStatus = (typeof allowedStatuses)[number];

function isAllowedStatus(value: string): value is AllowedStatus {
  return allowedStatuses.includes(value as AllowedStatus);
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

    const warnings: string[] = [];

    const orderId = Number(body.orderId);

    const newStatus = String(body.newStatus || "")
      .trim()
      .toLowerCase();

    const normalizedNotes = String(body.notes || "").trim();
    const notes = normalizedNotes || null;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "orderId inválido.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedStatus(newStatus)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Estado inválido.",
        },
        { status: 400 },
      );
    }

    const correlationId = createCorrelationId("order-status");

    /*
     * 1. Cargar el estado previo.
     */
    const { data: currentOrder, error: currentOrderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          sale_id,
          status,
          display_order_code
        `,
      )
      .eq("id", orderId)
      .single();

    if (currentOrderError) {
      console.error(
        "Error cargando pedido antes de cambiar estado:",
        currentOrderError,
      );

      const notFound = currentOrderError.code === "PGRST116";

      return NextResponse.json(
        {
          ok: false,
          message: notFound
            ? "No se encontró el pedido indicado."
            : "No se pudo cargar el estado actual del pedido.",
        },
        {
          status: notFound ? 404 : 500,
        },
      );
    }

    if (!currentOrder) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se encontró el pedido indicado.",
        },
        { status: 404 },
      );
    }

    const currentStatus = String(currentOrder.status || "")
      .trim()
      .toLowerCase();

    /*
     * 2. Proteger contra doble clic o reintento.
     *
     * Esta validación debe ocurrir ANTES del RPC.
     */
    if (currentStatus === newStatus) {
      await recordAuditLogSafely({
        module: "operations",
        action: "order.status_change_ignored",

        entityType: "order",
        entityId: orderId,

        actorRole: session.role,
        actorIdentifier: null,

        result: "warning",

        reason: "El pedido ya se encontraba en el estado solicitado.",

        previousState: {
          status: currentOrder.status,
          saleId: currentOrder.sale_id,
          displayOrderCode: currentOrder.display_order_code,
        },

        newState: {
          requestedStatus: newStatus,
        },

        metadata: {
          notes,
        },

        correlationId,
      });

      return NextResponse.json({
        ok: true,
        result: null,
        warnings: ["El pedido ya se encontraba en ese estado."],
        message: "El pedido ya se encontraba en ese estado.",
      });
    }

    /*
     * 3. Ejecutar cambio transaccional.
     */
    const rpcName =
      newStatus === "cancelled"
        ? "cancel_order_and_sale"
        : "update_order_status";

    const rpcPayload =
      newStatus === "cancelled"
        ? {
            p_order_id: orderId,
            p_actor_role: session.role,
            p_notes: notes,
          }
        : {
            p_order_id: orderId,
            p_new_status: newStatus,
            p_actor_role: session.role,
            p_notes: notes,
          };

    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      rpcName,
      rpcPayload,
    );

    /*
     * Si el RPC falla, el cambio operacional no ocurrió.
     * En este caso sí corresponde responder ok: false.
     */
    if (rpcError) {
      await recordAuditLogSafely({
        module: "operations",

        action:
          newStatus === "cancelled"
            ? "order.cancel_failed"
            : "order.status_change_failed",

        entityType: "order",
        entityId: orderId,

        actorRole: session.role,
        actorIdentifier: null,

        result: "failure",
        reason: rpcError.message,

        previousState: {
          status: currentOrder.status,
          saleId: currentOrder.sale_id,
          displayOrderCode: currentOrder.display_order_code,
        },

        newState: {
          requestedStatus: newStatus,
        },

        metadata: {
          notes,
          rpcName,
        },

        correlationId,
      });

      return NextResponse.json(
        {
          ok: false,
          message: rpcError.message,
        },
        { status: 400 },
      );
    }

    /*
     * Desde este punto, el cambio ya ocurrió.
     * Cualquier problema posterior debe convertirse en warning.
     */
    await recordAuditLogSafely({
      module: "operations",

      action:
        newStatus === "cancelled" ? "order.cancelled" : "order.status_changed",

      entityType: "order",
      entityId: orderId,

      actorRole: session.role,
      actorIdentifier: null,

      result: "success",
      reason: notes,

      previousState: {
        status: currentOrder.status,
        saleId: currentOrder.sale_id,
        displayOrderCode: currentOrder.display_order_code,
      },

      newState: {
        status: newStatus,
        saleId: currentOrder.sale_id,
        displayOrderCode: currentOrder.display_order_code,
      },

      metadata: {
        rpcName,
      },

      correlationId,
    });

    /*
     * 4. Procesamiento posterior exclusivo de entregas.
     */
    if (newStatus === "delivered") {
      const { data: deliveredOrder, error: deliveredOrderError } =
        await supabaseAdmin
          .from("orders")
          .select(
            `
            id,
            sale_id,
            delivered_at,
            sales (
              id,
              customer_id,
              channel,
              external_order_id,
              promotional_stamps,
              promotion_reason
            )
          `,
          )
          .eq("id", orderId)
          .single();

      if (deliveredOrderError || !deliveredOrder) {
        console.error(
          "Pedido entregado, pero no se pudo recargar:",
          deliveredOrderError,
        );

        warnings.push(
          "El pedido fue entregado, pero su procesamiento posterior quedó pendiente de revisión.",
        );
      } else {
        const saleRelation = Array.isArray(deliveredOrder.sales)
          ? deliveredOrder.sales[0] || null
          : deliveredOrder.sales || null;

        const saleId = Number(deliveredOrder.sale_id || saleRelation?.id);

        const customerId =
          saleRelation?.customer_id === null ||
          saleRelation?.customer_id === undefined
            ? null
            : Number(saleRelation.customer_id);

        const promotionalStamps = Number(saleRelation?.promotional_stamps ?? 0);

        const promotionReason =
          typeof saleRelation?.promotion_reason === "string"
            ? saleRelation.promotion_reason.trim() || null
            : null;

        if (!Number.isInteger(saleId) || saleId <= 0) {
          console.error("Pedido entregado sin sale_id válido:", deliveredOrder);

          warnings.push(
            "El pedido fue entregado, pero no se pudo identificar su venta para completar la trazabilidad.",
          );
        } else {
          const deliveredAt =
            deliveredOrder.delivered_at || new Date().toISOString();

          /*
           * 4.1 Registrar evento transversal.
           */
          try {
            await recordCustomerEvent({
              customerId,
              eventType: "sale.delivered",

              sourceModule: "operations",
              sourceEntityType: "order",
              sourceEntityId: orderId,

              saleId,
              actorRole: session.role,
              occurredAt: deliveredAt,

              idempotencyKey: buildCustomerEventIdempotencyKey([
                "sale-delivered",
                saleId,
              ]),

              metadata: {
                orderId,
                channel: saleRelation?.channel || null,
                externalOrderId: saleRelation?.external_order_id || null,
                notes,
              },
            });
          } catch (eventError) {
            console.error(
              "Pedido entregado, pero falló sale.delivered:",
              eventError,
            );

            warnings.push(
              "El pedido fue entregado, pero su evento de trazabilidad quedó pendiente de revisión.",
            );
          }

          /*
           * 4.2 Procesar fidelización únicamente
           * cuando existe cliente identificado.
           */
          if (
            customerId !== null &&
            Number.isInteger(customerId) &&
            customerId > 0
          ) {
            try {
              const businessDate = getBusinessDateInTimezone({
                value: deliveredAt,
                timezone: "America/Santiago",
              });

              let projection = await rebuildDailyLoyaltyProjection({
                customerId,
                businessDate,
                policyCode: "LOYALTY_POLICY_V1",
                policyVersion: 1,
                recalculationReason: "sale.delivered",
              });

              if (
                Number.isInteger(promotionalStamps) &&
                promotionalStamps > 0
              ) {
                const promotionIdempotencyKey = `pos-sale-promotion:${saleId}`;

                const { error: promotionError } = await supabaseAdmin
                  .from("customer_daily_loyalty_promotions")
                  .upsert(
                    {
                      daily_loyalty_id: projection.dailyLoyaltyId,
                      customer_id: customerId,
                      business_date: businessDate,
                      loyalty_rule_id: null,
                      promotion_code: "POS_RRSS",
                      effect_type: "fixed_stamp_bonus",
                      multiplier: null,
                      fixed_stamp_bonus: promotionalStamps,
                      applied_stamp_bonus: promotionalStamps,
                      actor_role: session.role,
                      actor_identifier: null,
                      evidence_reference: `sale:${saleId}`,
                      idempotency_key: promotionIdempotencyKey,
                      metadata: {
                        saleId,
                        orderId,
                        reason: promotionReason,
                        source: "pos",
                      },
                    },
                    {
                      onConflict: "idempotency_key",
                      ignoreDuplicates: true,
                    },
                  );

                if (promotionError) {
                  console.error(
                    "Venta entregada, pero no se pudo registrar la promoción:",
                    {
                      orderId,
                      saleId,
                      customerId,
                      promotionalStamps,
                      error: promotionError,
                    },
                  );

                  warnings.push(
                    "El pedido fue entregado, pero los sellos promocionales quedaron pendientes de revisión.",
                  );
                } else {
                  /*
                   * La primera proyección se creó antes de registrar la promoción.
                   * La reconstruimos para incorporar el bono fijo.
                   */
                  projection = await rebuildDailyLoyaltyProjection({
                    customerId,
                    businessDate,
                    policyCode: "LOYALTY_POLICY_V1",
                    policyVersion: 1,
                    recalculationReason: "sale.promotion_registered",
                  });
                }
              }

              let loyaltyApplication:
                | Awaited<ReturnType<typeof applyDailyLoyaltyCredit>>
                | undefined;

              /*
               * 4.2.1 Acreditar diferencia positiva.
               */
              if (projection.pendingStampDelta > 0) {
                loyaltyApplication = await applyDailyLoyaltyCredit({
                  dailyLoyaltyId: projection.dailyLoyaltyId,
                  actorRole: session.role,
                  reason: "Acreditación automática por venta entregada.",
                });

                if (!loyaltyApplication.applied) {
                  warnings.push(
                    "La venta fue entregada, pero los sellos no pudieron acreditarse automáticamente.",
                  );
                }
              }

              /*
               * 4.2.2 Convertir sellos en premios.
               */
              let conversion:
                | Awaited<ReturnType<typeof convertLoyaltyStampsToRewards>>
                | undefined;

              try {
                conversion = await convertLoyaltyStampsToRewards({
                  customerId,
                  actorRole: session.role,
                  reason:
                    "Conversión automática posterior a una venta entregada.",
                });
              } catch (conversionError) {
                console.error(
                  "Los sellos fueron procesados, pero falló la conversión en premios:",
                  {
                    orderId,
                    saleId,
                    customerId,
                    businessDate,
                    error: conversionError,
                  },
                );

                warnings.push(
                  "Los sellos fueron procesados, pero la generación del premio quedó pendiente de revisión.",
                );
              }

              /*
               * 4.2.3 Notificar premios emitidos.
               *
               * El correo nunca invalida el premio.
               */
              if (
                conversion?.converted &&
                conversion.rewardsIssued > 0 &&
                conversion.rewardIds.length > 0
              ) {
                try {
                  const { data: customer, error: customerError } =
                    await supabaseAdmin
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
                      "Premio generado, pero no se pudo cargar el cliente para notificar:",
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
                        .in("id", conversion.rewardIds)
                        .order("id", {
                          ascending: true,
                        });

                    if (rewardsError) {
                      console.error(
                        "Premios generados, pero no se pudieron cargar para notificar:",
                        rewardsError,
                      );

                      warnings.push(
                        "Los premios fueron generados, pero no se pudo preparar su notificación.",
                      );
                    } else {
                      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(
                        /\/$/,
                        "",
                      );

                      if (!baseUrl) {
                        console.error(
                          "NEXT_PUBLIC_BASE_URL no está configurada para enviar correos de premios.",
                        );

                        warnings.push(
                          "Los premios fueron generados, pero el correo no pudo enviarse por configuración.",
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

                                  premioNombre:
                                    reward.name || "Helado simple gratis",

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
                          (result) => result.status === "rejected",
                        );

                        if (failedEmails.length > 0) {
                          console.error(
                            "Uno o más correos de premio no pudieron enviarse:",
                            failedEmails,
                          );

                          warnings.push(
                            conversion.rewardsIssued === 1
                              ? "El premio fue generado, pero su correo no pudo enviarse."
                              : "Los premios fueron generados, pero uno o más correos no pudieron enviarse.",
                          );
                        }
                      }
                    }
                  }
                } catch (emailPreparationError) {
                  console.error(
                    "Error inesperado notificando premios:",
                    emailPreparationError,
                  );

                  warnings.push(
                    "El premio fue generado, pero ocurrió un problema al enviar su correo.",
                  );
                }
              }

              /*
               * 4.2.4 Notificar avance de sellos cuando no se emitió premio.
               *
               * Reglas:
               * - Debe existir una acreditación nueva.
               * - La diferencia aplicada debe ser positiva.
               * - No debe haberse generado un premio en esta operación.
               * - Un error de correo nunca revierte la venta ni los sellos.
               */
              const rewardWasIssued =
                Boolean(conversion?.converted) &&
                Number(conversion?.rewardsIssued ?? 0) > 0;

              const shouldSendStampEmail =
                Boolean(loyaltyApplication?.applied) &&
                Boolean(loyaltyApplication?.movementCreated) &&
                Number(loyaltyApplication?.appliedDelta ?? 0) > 0 &&
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
                      "Sellos acreditados, pero no se pudo cargar el cliente para notificar:",
                      customerError,
                    );

                    warnings.push(
                      "Los sellos fueron acreditados, pero no se pudo preparar su correo.",
                    );
                  } else if (loyaltyAccountError || !loyaltyAccount) {
                    console.error(
                      "Sellos acreditados, pero no se pudo obtener el saldo actualizado:",
                      loyaltyAccountError,
                    );

                    warnings.push(
                      "Los sellos fueron acreditados, pero no se pudo obtener el saldo para su correo.",
                    );
                  } else if (
                    !customer.correo ||
                    !customer.nombre ||
                    !customer.public_token
                  ) {
                    console.error(
                      "Sellos acreditados, pero el cliente no tiene datos completos para notificar:",
                      {
                        customerId,
                        hasEmail: Boolean(customer.correo),
                        hasName: Boolean(customer.nombre),
                        hasPublicToken: Boolean(customer.public_token),
                      },
                    );

                    warnings.push(
                      "Los sellos fueron acreditados, pero el cliente no tiene datos completos para recibir el correo.",
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

                    const configuredGoal = Number(
                      ruleConditions.stampsRequired,
                    );

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
                        "Los sellos fueron acreditados, pero el correo no pudo enviarse por configuración.",
                      );
                    } else {
                      const emailResponse = await fetch(
                        `${baseUrl}/api/send-stamp`,
                        {
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
                        },
                      );

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
                    "Sellos acreditados, pero falló el correo de avance:",
                    {
                      orderId,
                      saleId,
                      customerId,
                      movementId: loyaltyApplication?.movementId ?? null,
                      appliedDelta: loyaltyApplication?.appliedDelta ?? null,
                      error: stampEmailError,
                    },
                  );

                  warnings.push(
                    "Los sellos fueron acreditados correctamente, pero su correo no pudo enviarse.",
                  );
                }
              }
            } catch (projectionError) {
              console.error(
                "Venta entregada, pero falló la proyección diaria:",
                {
                  orderId,
                  saleId,
                  customerId,
                  deliveredAt,
                  error: projectionError,
                },
              );

              warnings.push(
                "La venta fue entregada, pero la proyección de fidelización quedó pendiente de revisión.",
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      result: rpcResult,
      warnings,

      message:
        warnings.length > 0
          ? "Estado actualizado con advertencias."
          : "Estado actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando pedido:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al actualizar pedido.",
      },
      { status: 500 },
    );
  }
}
