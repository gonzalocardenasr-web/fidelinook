import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ReceiptActionBody = {
  action?: unknown;
  transactionId?: unknown;
  transactionItemId?: unknown;
  supplierId?: unknown;
  referenceType?: unknown;
  referenceNumber?: unknown;
  transactionDate?: unknown;
  notes?: unknown;
  inventoryItemCode?: unknown;
  quantity?: unknown;
  unitCost?: unknown;
};

export async function GET(req: Request) {
  try {
    const session = await getOperationSession();

    if (!session.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Tu sesión no se encuentra activa.",
        },
        { status: 401 },
      );
    }

    if (!session.userId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tu sesión debe renovarse para identificar al usuario. Cierra sesión e inicia sesión nuevamente.",
        },
        { status: 401 },
      );
    }

    const { data: operationalUser, error: operationalUserError } =
      await supabaseAdmin
        .from("operational_users")
        .select("id, role, is_active")
        .eq("id", session.userId)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error validando usuario operacional para lectura de inventario:",
        operationalUserError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar al usuario operacional.",
        },
        { status: 500 },
      );
    }

    if (!operationalUser || !operationalUser.is_active) {
      return NextResponse.json(
        {
          ok: false,
          message: "El usuario operacional no se encuentra activo.",
        },
        { status: 403 },
      );
    }

    if (operationalUser.role !== session.role) {
      console.error(
        "Rol inconsistente leyendo inventario:",
        session.userId,
        session.role,
        operationalUser.role,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "La sesión operacional no es válida.",
        },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const transactionIdParam = url.searchParams.get("transactionId");

    if (transactionIdParam) {
      const transactionId = Number(transactionIdParam);

      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        return NextResponse.json(
          {
            ok: false,
            message: "El identificador de la recepción no es válido.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin
        .from("inventory_transactions")
        .select(
          `
          id,
          transaction_date,
          status,
          supplier_id,
          reference_type,
          reference_number,
          notes,
          posted_at,
          created_at,
          updated_at,
          suppliers (
            name
          ),
          inventory_transaction_items (
            id,
            inventory_item_id,
            quantity_change,
            unit_cost,
            notes,
            inventory_items (
              id,
              code,
              name,
              item_type,
              unit
            )
          ),
          inventory_transaction_types!inner (
            code
          )
        `,
        )
        .eq("id", transactionId)
        .eq("inventory_transaction_types.code", "PURCHASE")
        .maybeSingle();

      if (error) {
        console.error("Error cargando recepción:", error);

        return NextResponse.json(
          {
            ok: false,
            message: "No fue posible obtener la recepción.",
          },
          { status: 500 },
        );
      }

      if (!data) {
        return NextResponse.json(
          {
            ok: false,
            message: "La recepción indicada no existe.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        receipt: data,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .select("id, code, name, item_type, unit")
      .eq("is_active", true)
      .order("item_type", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando productos de inventario:", error);

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible obtener los productos de inventario.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
    });
  } catch (error) {
    console.error("Error inesperado cargando inventario:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al cargar el inventario.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getOperationSession();

    if (!session.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Tu sesión no se encuentra activa.",
        },
        { status: 401 },
      );
    }

    if (!session.userId) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tu sesión debe renovarse para identificar al usuario. Cierra sesión e inicia sesión nuevamente.",
        },
        { status: 401 },
      );
    }

    const { data: operationalUser, error: operationalUserError } =
      await supabaseAdmin
        .from("operational_users")
        .select("id, role, is_active")
        .eq("id", session.userId)
        .maybeSingle();

    if (operationalUserError) {
      console.error(
        "Error validando usuario operacional para recepción:",
        operationalUserError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar al usuario operacional.",
        },
        { status: 500 },
      );
    }

    if (!operationalUser || !operationalUser.is_active) {
      return NextResponse.json(
        {
          ok: false,
          message: "El usuario operacional no se encuentra activo.",
        },
        { status: 403 },
      );
    }

    if (operationalUser.role !== session.role) {
      console.error(
        "Rol inconsistente operando recepción:",
        session.userId,
        session.role,
        operationalUser.role,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "La sesión operacional no es válida.",
        },
        { status: 403 },
      );
    }

    const body = (await req.json()) as ReceiptActionBody;
    const action = String(body.action || "");

    if (action === "create") {
      const supplierId = Number(body.supplierId);
      const referenceType = String(body.referenceType || "");
      const referenceNumber = String(body.referenceNumber || "").trim();
      const transactionDate = String(body.transactionDate || "");
      const notes = String(body.notes || "").trim();

      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return NextResponse.json(
          { ok: false, message: "El proveedor indicado no es válido." },
          { status: 400 },
        );
      }

      if (referenceType !== "PURCHASE" && referenceType !== "INITIAL_STOCK") {
        return NextResponse.json(
          { ok: false, message: "El tipo de referencia no es válido." },
          { status: 400 },
        );
      }

      if (!transactionDate || Number.isNaN(Date.parse(transactionDate))) {
        return NextResponse.json(
          { ok: false, message: "La fecha de recepción no es válida." },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin.rpc(
        "create_inventory_transaction",
        {
          p_transaction_type_code: "PURCHASE",
          p_supplier_id: supplierId,
          p_reference_type: referenceType,
          p_reference_number: referenceNumber || null,
          p_transaction_date: new Date(transactionDate).toISOString(),
          p_notes: notes || null,
        },
      );

      if (error) {
        console.error("Error creando recepción:", error);

        return NextResponse.json(
          {
            ok: false,
            message: `No fue posible crear la recepción: ${error.message}`,
          },
          { status: 400 },
        );
      }

      const transactionId = Number(data);

      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        return NextResponse.json(
          {
            ok: false,
            message: "La recepción fue creada sin un identificador válido.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        transactionId,
      });
    }

    if (action === "add_item") {
      const transactionId = Number(body.transactionId);
      const inventoryItemCode = String(body.inventoryItemCode || "").trim();
      const quantity = Number(body.quantity);

      const unitCost =
        body.unitCost === null ||
        body.unitCost === undefined ||
        body.unitCost === ""
          ? null
          : Number(body.unitCost);

      const notes = String(body.notes || "").trim();

      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        return NextResponse.json(
          { ok: false, message: "La recepción indicada no es válida." },
          { status: 400 },
        );
      }

      if (!inventoryItemCode) {
        return NextResponse.json(
          { ok: false, message: "Debes seleccionar un producto." },
          { status: 400 },
        );
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { ok: false, message: "La cantidad debe ser mayor que cero." },
          { status: 400 },
        );
      }

      if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
        return NextResponse.json(
          {
            ok: false,
            message: "El costo unitario no puede ser negativo.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin.rpc(
        "add_inventory_transaction_item",
        {
          p_transaction_id: transactionId,
          p_inventory_item_code: inventoryItemCode,
          p_quantity_change: quantity,
          p_unit_cost: unitCost,
          p_notes: notes || null,
        },
      );

      if (error) {
        console.error("Error agregando producto a recepción:", error);

        return NextResponse.json(
          {
            ok: false,
            message: `No fue posible guardar el producto: ${error.message}`,
          },
          { status: 400 },
        );
      }

      const transactionItemId = Number(data);

      if (!Number.isInteger(transactionItemId) || transactionItemId <= 0) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "La base de datos no devolvió un identificador de línea válido.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        transactionItemId,
      });
    }

    if (action === "delete_item") {
      const transactionItemId = Number(body.transactionItemId);

      if (!Number.isInteger(transactionItemId) || transactionItemId <= 0) {
        return NextResponse.json(
          { ok: false, message: "La línea indicada no es válida." },
          { status: 400 },
        );
      }

      const { error } = await supabaseAdmin.rpc(
        "delete_inventory_transaction_item",
        {
          p_transaction_item_id: transactionItemId,
        },
      );

      if (error) {
        console.error("Error eliminando producto de recepción:", error);

        return NextResponse.json(
          {
            ok: false,
            message: `No fue posible eliminar el producto: ${error.message}`,
          },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "cancel") {
      const transactionId = Number(body.transactionId);

      if (!Number.isInteger(transactionId) || transactionId <= 0) {
        return NextResponse.json(
          { ok: false, message: "La recepción indicada no es válida." },
          { status: 400 },
        );
      }

      const { error } = await supabaseAdmin.rpc(
        "cancel_inventory_transaction",
        {
          p_transaction_id: transactionId,
        },
      );

      if (error) {
        console.error("Error cancelando recepción:", error);

        return NextResponse.json(
          {
            ok: false,
            message: `No fue posible cancelar la recepción: ${error.message}`,
          },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      {
        ok: false,
        message: "La operación de recepción indicada no es válida.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error inesperado operando recepción:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Ocurrió un error inesperado al operar la recepción.",
      },
      { status: 500 },
    );
  }
}
