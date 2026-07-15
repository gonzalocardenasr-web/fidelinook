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

const allowedStatuses = [
  "pending",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

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

    const warnings: string[] = [];

    const orderId = Number(body.orderId);
    const newStatus = String(body.newStatus || "").trim();
    const notes = body.notes ? String(body.notes) : null;

    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json(
        { ok: false, message: "orderId inválido." },
        { status: 400 },
      );
    }

    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, message: "Estado inválido." },
        { status: 400 },
      );
    }

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

    const { data, error } = await supabaseAdmin.rpc(rpcName, rpcPayload);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }

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
          external_order_id
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

        return NextResponse.json(
          {
            ok: false,
            message:
              "El pedido fue entregado, pero no se pudo completar su trazabilidad.",
          },
          { status: 500 },
        );
      }

      const saleRelation = Array.isArray(deliveredOrder.sales)
        ? deliveredOrder.sales[0] || null
        : deliveredOrder.sales || null;

      const saleId = Number(deliveredOrder.sale_id || saleRelation?.id);

      const customerId =
        saleRelation?.customer_id === null ||
        saleRelation?.customer_id === undefined
          ? null
          : Number(saleRelation.customer_id);

      if (!Number.isInteger(saleId) || saleId <= 0) {
        console.error("Pedido entregado sin sale_id válido:", deliveredOrder);

        return NextResponse.json(
          {
            ok: false,
            message:
              "El pedido fue entregado, pero no se pudo identificar su venta.",
          },
          { status: 500 },
        );
      }

      const deliveredAt =
        deliveredOrder.delivered_at || new Date().toISOString();

      /*
       * 1. Registrar el hecho transversal de entrega.
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

        return NextResponse.json(
          {
            ok: false,
            message:
              "El pedido fue entregado, pero no se pudo registrar su evento.",
          },
          { status: 500 },
        );
      }

      /*
       * 2. Reconstruir la proyección diaria únicamente cuando
       *    la venta ya tiene un cliente identificado.
       *
       * Si no tiene cliente, la venta podrá recalcularse cuando se
       * asigne posteriormente desde el historial.
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

          const projection = await rebuildDailyLoyaltyProjection({
            customerId,
            businessDate,
            policyCode: "LOYALTY_POLICY_V1",
            policyVersion: 1,
            recalculationReason: "sale.delivered",
          });

          /*
           * 1. Acreditar solo la diferencia positiva calculada para el día.
           */
          if (projection.pendingStampDelta > 0) {
            const application = await applyDailyLoyaltyCredit({
              dailyLoyaltyId: projection.dailyLoyaltyId,
              actorRole: session.role,
              reason: "Acreditación automática por venta entregada.",
            });

            if (!application.applied && application.appliedDelta > 0) {
              warnings.push(
                "La venta fue entregada, pero los sellos no pudieron acreditarse automáticamente.",
              );
            }
          }

          /*
           * 2. Convertir cualquier grupo completo de siete sellos.
           *
           * Se ejecuta incluso si esta venta no generó una diferencia
           * positiva, porque podría existir un saldo pendiente de
           * conversión proveniente de una operación anterior.
           */
          let conversion;

          try {
            conversion = await convertLoyaltyStampsToRewards({
              customerId,
              actorRole: session.role,
              reason: "Conversión automática posterior a una venta entregada.",
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
           * 3. Notificar los premios emitidos.
           *
           * El correo no forma parte de la transacción del beneficio.
           * Si falla, el premio sigue activo y disponible para canje.
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
                    .order("id", { ascending: true });

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
        } catch (projectionError) {
          /*
           * La entrega y su evento ya ocurrieron correctamente.
           * No devolvemos error operacional ni pedimos repetir la
           * acción, porque eso podría generar confusión o duplicidad.
           *
           * La proyección puede reconstruirse posteriormente desde
           * sus fuentes transaccionales.
           */
          console.error("Venta entregada, pero falló la proyección diaria:", {
            orderId,
            saleId,
            customerId,
            deliveredAt,
            error: projectionError,
          });

          warnings.push(
            "La venta fue entregada, pero la proyección de fidelización quedó pendiente de revisión.",
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      result: data,
      warnings,
      message:
        warnings.length > 0
          ? "Estado actualizado con advertencias."
          : "Estado actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando pedido:", error);

    return NextResponse.json(
      { ok: false, message: "Error inesperado al actualizar pedido." },
      { status: 500 },
    );
  }
}
