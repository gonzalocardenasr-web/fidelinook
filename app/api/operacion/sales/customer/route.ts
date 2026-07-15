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

type AssignCustomerResult = {
  sale_id: number;
  change_id?: number | null;
  previous_customer_id?: number | null;
  customer_id: number;
  customer_name?: string | null;
  changed: boolean;
};

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

    const saleId = Number(body.saleId);
    const customerId = Number(body.customerId);
    const reason = String(body.reason || "").trim();

    if (!Number.isInteger(saleId) || saleId <= 0) {
      return NextResponse.json(
        { ok: false, message: "La venta indicada no es válida." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        { ok: false, message: "El cliente indicado no es válido." },
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

    const { data, error } = await supabaseAdmin.rpc("assign_customer_to_sale", {
      p_sale_id: saleId,
      p_customer_id: customerId,
      p_actor_role: session.role,
      p_reason: reason || null,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 400 },
      );
    }

    const result =
      data && typeof data === "object" ? (data as AssignCustomerResult) : null;

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se recibió confirmación de la actualización.",
        },
        { status: 500 },
      );
    }

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
      return NextResponse.json(
        {
          ok: false,
          message:
            "El cliente fue asignado, pero no se pudo recargar la venta.",
        },
        { status: 500 },
      );
    }

    if (result.changed) {
      const changeId = Number(result.change_id);
      const previousCustomerId =
        result.previous_customer_id === null ||
        result.previous_customer_id === undefined
          ? null
          : Number(result.previous_customer_id);

      if (!Number.isInteger(changeId) || changeId <= 0) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "El cliente fue asignado, pero no se pudo identificar el cambio auditado.",
          },
          { status: 500 },
        );
      }

      const eventType =
        previousCustomerId === null
          ? "sale.customer_assigned"
          : "sale.customer_changed";

      try {
        await recordCustomerEvent({
          customerId,
          eventType,
          sourceModule: "sales",
          sourceEntityType: "sale_customer_change",
          sourceEntityId: changeId,
          saleId,
          actorRole: session.role,
          idempotencyKey: buildCustomerEventIdempotencyKey([
            "sale-customer-change",
            changeId,
          ]),
          metadata: {
            previousCustomerId,
            newCustomerId: customerId,
            reason: reason || null,
          },
        });
      } catch (eventError) {
        console.error(
          "El cliente fue asignado, pero falló el registro del evento:",
          eventError,
        );

        return NextResponse.json(
          {
            ok: false,
            message:
              "El cliente fue asignado correctamente, pero no se pudo registrar su evento.",
          },
          { status: 500 },
        );
      }
    }

    /*
     * Reconstrucción de fidelización por reasignación.
     *
     * Solo corresponde cuando la venta ya fue entregada.
     * Si aún está pendiente, preparando o lista, la proyección se
     * construirá normalmente cuando el pedido pase a delivered.
     */
    if (result.changed) {
      const previousCustomerId =
        result.previous_customer_id === null ||
        result.previous_customer_id === undefined
          ? null
          : Number(result.previous_customer_id);

      const { data: deliveredOrder, error: deliveredOrderError } =
        await supabaseAdmin
          .from("orders")
          .select("id, delivered_at")
          .eq("sale_id", saleId)
          .eq("status", "delivered")
          .not("delivered_at", "is", null)
          .order("delivered_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (deliveredOrderError) {
        console.error(
          "Cliente reasignado, pero no se pudo revisar la entrega para recalcular fidelización:",
          {
            saleId,
            previousCustomerId,
            newCustomerId: customerId,
            error: deliveredOrderError,
          },
        );

        warnings.push(
          "El cliente fue actualizado, pero no se pudo verificar si correspondía recalcular la fidelización.",
        );
      } else if (deliveredOrder?.delivered_at) {
        const businessDate = getBusinessDateInTimezone({
          value: deliveredOrder.delivered_at,
          timezone: "America/Santiago",
        });

        /*
         * Primero reconstruimos al cliente anterior.
         *
         * Como sales.customer_id ya fue actualizado por el RPC,
         * la venta reasignada dejará automáticamente de formar parte
         * de su acumulado diario.
         */
        if (
          previousCustomerId !== null &&
          Number.isInteger(previousCustomerId) &&
          previousCustomerId > 0 &&
          previousCustomerId !== customerId
        ) {
          try {
            await rebuildDailyLoyaltyProjection({
              customerId: previousCustomerId,
              businessDate,
              policyCode: "LOYALTY_POLICY_V1",
              policyVersion: 1,
              recalculationReason: "sale.customer_changed:previous_customer",
            });
          } catch (previousProjectionError) {
            console.error(
              "No se pudo reconstruir la fidelización del cliente anterior:",
              {
                saleId,
                previousCustomerId,
                businessDate,
                error: previousProjectionError,
              },
            );

            warnings.push(
              "La fidelización del cliente anterior quedó pendiente de reconstrucción.",
            );
          }
        }

        /*
         * Luego reconstruimos al cliente nuevo.
         *
         * La venta ya pertenece a este cliente y se combinará con
         * sus demás ventas entregadas del mismo día comercial.
         */
        try {
          await rebuildDailyLoyaltyProjection({
            customerId,
            businessDate,
            policyCode: "LOYALTY_POLICY_V1",
            policyVersion: 1,
            recalculationReason:
              previousCustomerId === null
                ? "sale.customer_assigned:new_customer"
                : "sale.customer_changed:new_customer",
          });
        } catch (newProjectionError) {
          console.error(
            "No se pudo reconstruir la fidelización del cliente nuevo:",
            {
              saleId,
              previousCustomerId,
              newCustomerId: customerId,
              businessDate,
              error: newProjectionError,
            },
          );

          warnings.push(
            "La fidelización del cliente asignado quedó pendiente de reconstrucción.",
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      changed: Boolean(result.changed),
      sale: updatedSale,
      warnings,
      message: result.changed
        ? warnings.length > 0
          ? "Cliente asignado correctamente, con advertencias de fidelización."
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
