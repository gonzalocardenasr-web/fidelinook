import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../lib/operation-auth";
import {
  buildCustomerEventIdempotencyKey,
  recordCustomerEvent,
} from "../../../../lib/customer-events";
import {
  buildAuditIdempotencyKey,
  createCorrelationId,
  recordAuditLogSafely,
} from "../../../../lib/audit-logs";

function getCreatedSaleId(result: unknown): number | null {
  if (!result) return null;

  if (Array.isArray(result)) {
    for (const item of result) {
      const saleId = getCreatedSaleId(item);

      if (saleId) return saleId;
    }

    return null;
  }

  if (typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;

  const directCandidates = [record.sale_id, record.saleId, record.id];

  for (const candidate of directCandidates) {
    const parsed = Number(candidate);

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (record.sale && typeof record.sale === "object") {
    return getCreatedSaleId(record.sale);
  }

  if (record.result && typeof record.result === "object") {
    return getCreatedSaleId(record.result);
  }

  return null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getItemProductId(item: unknown): number | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const productId = Number((item as Record<string, unknown>).product_id);

  return Number.isInteger(productId) && productId > 0 ? productId : null;
}

function getItemFlavorIds(item: unknown): number[] {
  if (!item || typeof item !== "object") {
    return [];
  }

  const options = (item as Record<string, unknown>).options;

  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .filter((option) => {
      if (!option || typeof option !== "object") {
        return false;
      }

      return (
        String((option as Record<string, unknown>).option_group_code || "")
          .trim()
          .toLowerCase() === "flavor"
      );
    })
    .map((option) =>
      Number((option as Record<string, unknown>).option_value_id),
    )
    .filter(
      (optionValueId) => Number.isInteger(optionValueId) && optionValueId > 0,
    );
}

export async function GET(req: Request) {
  const session = await getOperationSession();

  if (!session.ok) {
    return NextResponse.json(
      { ok: false, message: "No autenticado." },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    const requestedPage = Number(searchParams.get("page") || 1);
    const requestedPageSize = Number(searchParams.get("pageSize") || 50);

    const page =
      Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;

    const pageSize =
      Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.min(Math.floor(requestedPageSize), 100)
        : 50;

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = String(searchParams.get("search") || "").trim();
    const channel = String(searchParams.get("channel") || "").trim();
    const paymentMethod = String(
      searchParams.get("paymentMethod") || "",
    ).trim();
    const orderStatus = String(searchParams.get("orderStatus") || "").trim();
    const customerType = String(searchParams.get("customerType") || "").trim();

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    /*
     * Algunos filtros dependen de tablas relacionadas:
     * - estado del pedido → orders
     * - búsqueda por cliente → clientes
     * - búsqueda por código del pedido → orders
     *
     * Primero obtenemos los IDs de ventas candidatas y luego
     * aplicamos esa lista a la consulta principal.
     */
    let candidateSaleIds: Set<number> | null = null;

    function intersectCandidateIds(
      currentIds: Set<number> | null,
      ids: number[],
    ): Set<number> {
      const nextIds = new Set(ids);

      if (currentIds === null) {
        return nextIds;
      }

      return new Set([...currentIds].filter((id) => nextIds.has(id)));
    }

    if (orderStatus) {
      const { data: statusOrders, error: statusError } = await supabaseAdmin
        .from("orders")
        .select("sale_id")
        .eq("status", orderStatus);

      if (statusError) {
        return NextResponse.json(
          { ok: false, message: statusError.message },
          { status: 500 },
        );
      }

      candidateSaleIds = intersectCandidateIds(
        candidateSaleIds,
        (statusOrders || [])
          .map((order) => Number(order.sale_id))
          .filter((id) => Number.isFinite(id)),
      );
    }

    if (search) {
      const safeSearch = search.replace(/[,%()]/g, " ").trim();
      const searchSaleIds = new Set<number>();

      const { data: directSales, error: directSalesError } = await supabaseAdmin
        .from("sales")
        .select("id")
        .or(
          [
            `sale_number.ilike.%${safeSearch}%`,
            `external_order_id.ilike.%${safeSearch}%`,
            `channel.ilike.%${safeSearch}%`,
            `payment_method.ilike.%${safeSearch}%`,
          ].join(","),
        );

      if (directSalesError) {
        return NextResponse.json(
          { ok: false, message: directSalesError.message },
          { status: 500 },
        );
      }

      for (const sale of directSales || []) {
        searchSaleIds.add(Number(sale.id));
      }

      const numericSearch = Number(search);

      if (Number.isInteger(numericSearch) && numericSearch > 0) {
        const { data: numericSale, error: numericSaleError } =
          await supabaseAdmin
            .from("sales")
            .select("id")
            .eq("id", numericSearch);

        if (numericSaleError) {
          return NextResponse.json(
            { ok: false, message: numericSaleError.message },
            { status: 500 },
          );
        }

        for (const sale of numericSale || []) {
          searchSaleIds.add(Number(sale.id));
        }
      }

      const { data: matchingCustomers, error: customersError } =
        await supabaseAdmin
          .from("clientes")
          .select("id")
          .or(
            [
              `nombre.ilike.%${safeSearch}%`,
              `correo.ilike.%${safeSearch}%`,
              `telefono.ilike.%${safeSearch}%`,
            ].join(","),
          );

      if (customersError) {
        return NextResponse.json(
          { ok: false, message: customersError.message },
          { status: 500 },
        );
      }

      const customerIds = (matchingCustomers || [])
        .map((customer) => Number(customer.id))
        .filter((id) => Number.isFinite(id));

      if (customerIds.length > 0) {
        const { data: customerSales, error: customerSalesError } =
          await supabaseAdmin
            .from("sales")
            .select("id")
            .in("customer_id", customerIds);

        if (customerSalesError) {
          return NextResponse.json(
            { ok: false, message: customerSalesError.message },
            { status: 500 },
          );
        }

        for (const sale of customerSales || []) {
          searchSaleIds.add(Number(sale.id));
        }
      }

      const { data: matchingOrders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select("sale_id")
        .or(
          [
            `display_order_code.ilike.%${safeSearch}%`,
            `status.ilike.%${safeSearch}%`,
          ].join(","),
        );

      if (ordersError) {
        return NextResponse.json(
          { ok: false, message: ordersError.message },
          { status: 500 },
        );
      }

      for (const order of matchingOrders || []) {
        const saleId = Number(order.sale_id);

        if (Number.isFinite(saleId)) {
          searchSaleIds.add(saleId);
        }
      }

      candidateSaleIds = intersectCandidateIds(candidateSaleIds, [
        ...searchSaleIds,
      ]);
    }

    /*
     * Si los filtros relacionados no encontraron ninguna venta,
     * respondemos inmediatamente sin ejecutar una consulta inválida
     * con .in("id", []).
     */
    if (candidateSaleIds !== null && candidateSaleIds.size === 0) {
      return NextResponse.json({
        ok: true,
        sales: [],
        pagination: {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 1,
          from: 0,
          to: 0,
        },
      });
    }

    let query = supabaseAdmin.from("sales").select(
      `
        id,
        sale_number,
        channel,
        external_order_id,
        integration_source,
        received_at,
        customer_id,
        status,
        subtotal,
        discount_total,
        total,
        payment_status,
        payment_method,
        actor_role,
        confirmed_at,
        created_at,
        clientes (
          id,
          nombre,
          correo,
          telefono
        ),
        orders (
          id,
          business_date,
          daily_order_number,
          display_order_code,
          status,
          notes,
          created_at
        ),
        sale_items (
          id,
          product_sku,
          product_name,
          quantity,
          unit_price,
          total_price,
          notes,
          sale_item_options (
            id,
            option_group_code,
            option_value_name,
            quantity
          )
        )
      `,
      {
        count: "exact",
      },
    );

    if (candidateSaleIds !== null) {
      query = query.in("id", [...candidateSaleIds]);
    }

    if (channel) {
      query = query.eq("channel", channel);
    }

    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod);
    }

    if (customerType === "identified") {
      query = query.not("customer_id", "is", null);
    }

    if (customerType === "counter") {
      query = query.is("customer_id", null);
    }

    if (dateFrom) {
      const parsedDateFrom = new Date(dateFrom);

      if (Number.isNaN(parsedDateFrom.getTime())) {
        return NextResponse.json(
          { ok: false, message: "Fecha inicial inválida." },
          { status: 400 },
        );
      }

      query = query.gte("created_at", parsedDateFrom.toISOString());
    }

    if (dateTo) {
      const parsedDateTo = new Date(dateTo);

      if (Number.isNaN(parsedDateTo.getTime())) {
        return NextResponse.json(
          { ok: false, message: "Fecha final inválida." },
          { status: 400 },
        );
      }

      query = query.lt("created_at", parsedDateTo.toISOString());
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const total = count || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      ok: true,
      sales: data || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        from: total === 0 ? 0 : rangeFrom + 1,
        to: Math.min(rangeFrom + (data?.length || 0), total),
      },
    });
  } catch (error) {
    console.error("Error cargando historial de ventas:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al cargar el historial de ventas.",
      },
      { status: 500 },
    );
  }
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

    const correlationId = createCorrelationId("sale-create");

    const orderNotes = String(body.orderNotes || "").trim();

    const channel = String(body.channel || "local")
      .trim()
      .toLowerCase();

    const externalOrderId = String(body.externalOrderId || "").trim();

    const allowedChannels = [
      "local",
      "shopify",
      "uber_eats",
      "rappi",
      "pedidosya",
    ];

    if (!allowedChannels.includes(channel)) {
      return NextResponse.json(
        { ok: false, message: "Canal de venta inválido." },
        { status: 400 },
      );
    }

    if (channel !== "local" && !externalOrderId) {
      return NextResponse.json(
        {
          ok: false,
          message: "Los pedidos digitales requieren un número externo.",
        },
        { status: 400 },
      );
    }

    const customerId =
      body.customerId === null ||
      body.customerId === undefined ||
      body.customerId === ""
        ? null
        : Number(body.customerId);

    const paymentMethod = String(body.paymentMethod || "manual").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, message: "La venta debe tener al menos un producto." },
        { status: 400 },
      );
    }

    const promotionalStamps = Number(body.promotionalStamps ?? 0);

    const promotionReason =
      typeof body.promotionReason === "string"
        ? body.promotionReason.trim() || null
        : null;

    if (
      !Number.isInteger(promotionalStamps) ||
      promotionalStamps < 0 ||
      promotionalStamps > 5
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "Los sellos promocionales deben estar entre 0 y 5.",
        },
        { status: 400 },
      );
    }

    if (promotionalStamps > 0 && customerId === null) {
      return NextResponse.json(
        {
          ok: false,
          message: "Los sellos promocionales requieren un cliente.",
        },
        { status: 400 },
      );
    }

    if (promotionalStamps > 0 && !promotionReason) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debe indicar el motivo de la promoción.",
        },
        { status: 400 },
      );
    }

    /*
     * GL-004:
     * Los potes armados solo pueden venderse utilizando sabores
     * que tengan una bacha abierta y stock disponible.
     *
     * Esta validación se ejecuta nuevamente en backend para evitar:
     * - solicitudes manipuladas;
     * - información desactualizada en el POS;
     * - cambios de inventario entre configuración y confirmación.
     */
    const parsedProductIds = items.map(getItemProductId);

    if (parsedProductIds.some((productId) => productId === null)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Uno o más productos de la venta no son válidos.",
        },
        { status: 400 },
      );
    }

    const productIds = [
      ...new Set(
        parsedProductIds.filter(
          (productId): productId is number => productId !== null,
        ),
      ),
    ];

    const { data: saleProducts, error: saleProductsError } = await supabaseAdmin
      .from("products")
      .select("id, sku, name")
      .in("id", productIds);

    if (saleProductsError) {
      console.error(
        "Error validando productos antes de crear venta:",
        saleProductsError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar los productos de la venta.",
        },
        { status: 500 },
      );
    }

    const productsById = new Map(
      (saleProducts || []).map((product) => [Number(product.id), product]),
    );

    const armedPotFlavorIds = new Set<number>();

    for (const item of items) {
      const productId = getItemProductId(item);

      if (!productId) {
        continue;
      }

      const product = productsById.get(productId);

      if (!product) {
        return NextResponse.json(
          {
            ok: false,
            message: "Uno o más productos ya no están disponibles.",
          },
          { status: 400 },
        );
      }

      if (product.sku !== "POT-16-ARMADO") {
        continue;
      }

      const flavorIds = getItemFlavorIds(item);

      if (flavorIds.length === 0) {
        return NextResponse.json(
          {
            ok: false,
            message: `${product.name} requiere al menos un sabor.`,
          },
          { status: 400 },
        );
      }

      for (const flavorId of flavorIds) {
        armedPotFlavorIds.add(flavorId);
      }
    }

    if (armedPotFlavorIds.size > 0) {
      const requestedFlavorIds = [...armedPotFlavorIds];

      const { data: batchItemRows, error: batchItemsError } =
        await supabaseAdmin
          .from("inventory_items")
          .select(
            `
          id,
          option_value_id,
          catalog_option_values!inventory_items_option_value_id_fkey (
            id,
            name
          )
        `,
          )
          .eq("item_type", "BATCH")
          .eq("is_active", true)
          .in("option_value_id", requestedFlavorIds);

      if (batchItemsError) {
        console.error(
          "Error validando inventario de sabores:",
          batchItemsError,
        );

        return NextResponse.json(
          {
            ok: false,
            message: "No fue posible validar la disponibilidad de los sabores.",
          },
          { status: 500 },
        );
      }

      const inventoryItemIds = (batchItemRows || [])
        .map((row) => Number(row.id))
        .filter(
          (inventoryItemId) =>
            Number.isInteger(inventoryItemId) && inventoryItemId > 0,
        );

      const { data: openBatchRows, error: openBatchesError } =
        inventoryItemIds.length > 0
          ? await supabaseAdmin
              .from("inventory_batches")
              .select("inventory_item_id")
              .eq("status", "OPEN")
              .in("inventory_item_id", inventoryItemIds)
          : {
              data: [],
              error: null,
            };

      if (openBatchesError) {
        console.error("Error validando bachas abiertas:", openBatchesError);

        return NextResponse.json(
          {
            ok: false,
            message: "No fue posible validar las bachas abiertas.",
          },
          { status: 500 },
        );
      }

      const openInventoryItemIds = new Set(
        (openBatchRows || []).map((row) => Number(row.inventory_item_id)),
      );

      const availableFlavorIds = new Set<number>();
      const flavorNamesById = new Map<number, string>();

      for (const row of batchItemRows || []) {
        const inventoryItemId = Number(row.id);
        const optionValueId = Number(row.option_value_id);

        const optionValue = firstRelation(row.catalog_option_values);

        if (
          Number.isInteger(optionValueId) &&
          optionValueId > 0 &&
          optionValue?.name
        ) {
          flavorNamesById.set(optionValueId, optionValue.name);
        }

        const hasOpenBatch = openInventoryItemIds.has(inventoryItemId);

        if (
          Number.isInteger(optionValueId) &&
          optionValueId > 0 &&
          hasOpenBatch
        ) {
          availableFlavorIds.add(optionValueId);
        }
      }

      const unavailableFlavorId = requestedFlavorIds.find(
        (flavorId) => !availableFlavorIds.has(flavorId),
      );

      if (unavailableFlavorId) {
        const flavorName =
          flavorNamesById.get(unavailableFlavorId) ||
          `ID ${unavailableFlavorId}`;

        return NextResponse.json(
          {
            ok: false,
            message:
              `El sabor ${flavorName} ya no tiene una bacha ` +
              "abierta disponible. Actualiza el pedido.",
          },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabaseAdmin.rpc(
      "create_local_sale_with_order",
      {
        p_customer_id: customerId,
        p_payment_method: paymentMethod,
        p_items: items,
        p_actor_role: session.role,
        p_order_notes: orderNotes || null,
        p_channel: channel,
        p_external_order_id: externalOrderId || null,
        p_promotional_stamps: promotionalStamps,
        p_promotion_reason: promotionalStamps > 0 ? promotionReason : null,
      },
    );

    if (error) {
      await recordAuditLogSafely({
        module: "pos",
        action: "sale.create_failed",

        entityType: "sale",
        entityId: null,

        actorRole: session.role,
        actorIdentifier: null,

        result: "failure",
        reason: error.message,

        newState: {
          customerId,
          channel,
          externalOrderId: externalOrderId || null,
          paymentMethod,
          itemLines: items.length,
          promotionalStamps,
          promotionReason: promotionalStamps > 0 ? promotionReason : null,
        },

        correlationId,
      });
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }

    const createdSaleId = getCreatedSaleId(data);

    if (!createdSaleId) {
      console.error(
        "Venta creada, pero el RPC no entregó un sale_id reconocible:",
        data,
      );

      return NextResponse.json(
        {
          ok: false,
          message:
            "La venta fue creada, pero no se pudo identificar su registro.",
        },
        { status: 500 },
      );
    }

    await recordAuditLogSafely({
      module: "pos",
      action: "sale.created",

      entityType: "sale",
      entityId: createdSaleId,

      actorRole: session.role,
      actorIdentifier: null,

      result: "success",

      newState: {
        saleId: createdSaleId,
        customerId,
        channel,
        externalOrderId: externalOrderId || null,
        paymentMethod,
        itemLines: items.length,
        promotionalStamps,
        promotionReason: promotionalStamps > 0 ? promotionReason : null,
      },

      metadata: {
        orderNotes: orderNotes || null,
        hasCustomer: customerId !== null,
        promotionalStamps,
        promotionReason: promotionalStamps > 0 ? promotionReason : null,
      },

      correlationId,

      idempotencyKey: buildAuditIdempotencyKey([
        "audit",
        "sale-created",
        createdSaleId,
      ]),
    });

    const warnings: string[] = [];

    /*
     * La venta ya fue creada correctamente.
     * El registro del evento es trazabilidad secundaria:
     * si falla, no debemos informar al cajero que la venta falló,
     * porque eso podría provocar una venta duplicada.
     */
    try {
      await recordCustomerEvent({
        customerId,
        eventType: "sale.created",
        sourceModule: "sales",
        sourceEntityType: "sale",
        sourceEntityId: createdSaleId,
        saleId: createdSaleId,
        actorRole: session.role,
        idempotencyKey: buildCustomerEventIdempotencyKey([
          "sale-created",
          createdSaleId,
        ]),
        metadata: {
          channel,
          externalOrderId: externalOrderId || null,
          paymentMethod,
          itemLines: items.length,
          hasCustomer: customerId !== null,
        },
      });
    } catch (eventError) {
      console.error(
        "Venta creada, pero falló el registro del evento sale.created:",
        eventError,
      );

      warnings.push(
        "La venta fue creada, pero su trazabilidad quedó pendiente de revisión.",
      );
    }

    return NextResponse.json({
      ok: true,
      saleId: createdSaleId,
      result: data,
      warnings,
      message:
        warnings.length > 0
          ? "Venta creada correctamente, con advertencias."
          : "Venta creada correctamente.",
    });
  } catch (error) {
    console.error("Error creando venta:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al crear la venta.",
      },
      { status: 500 },
    );
  }
}
