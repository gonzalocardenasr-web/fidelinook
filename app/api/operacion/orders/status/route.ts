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
