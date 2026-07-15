import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";
import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "../../../../../lib/customer-events";

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

      if (deliveredOrderError) {
        console.error(
          "Pedido entregado, pero no se pudo recargar para registrar el evento:",
          deliveredOrderError,
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

      try {
        await recordCustomerEvent({
          customerId,
          eventType: "sale.delivered",
          sourceModule: "operations",
          sourceEntityType: "order",
          sourceEntityId: orderId,
          saleId,
          actorRole: session.role,
          occurredAt: deliveredOrder.delivered_at || new Date(),
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
          "Pedido entregado, pero falló el registro de sale.delivered:",
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
    }

    return NextResponse.json({
      ok: true,
      result: data,
    });
  } catch (error) {
    console.error("Error actualizando pedido:", error);

    return NextResponse.json(
      { ok: false, message: "Error inesperado al actualizar pedido." },
      { status: 500 },
    );
  }
}
