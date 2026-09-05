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

type SaleItemType = "PRODUCT" | "CUSTOM";

function getItemType(item: unknown): SaleItemType | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const itemRecord = item as Record<string, unknown>;

  const rawItemType = String(itemRecord.item_type || "PRODUCT")
    .trim()
    .toUpperCase();

  if (rawItemType === "PRODUCT" || rawItemType === "CUSTOM") {
    return rawItemType;
  }

  return null;
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
        manual_discount_type,
        manual_discount_value,
        manual_discount_amount,
        manual_discount_reason,
        manual_discount_notes,
        total,
        loyalty_eligible_total,
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
        item_type,
        product_id,
        product_sku,
        product_name,
        quantity,
        list_unit_price,
        unit_price,
        discount_total,
        total_price,
        is_gift,
        gift_reason,
        loyalty_eligible,
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

    const { data: activeCashSession, error: activeCashSessionError } =
      await supabaseAdmin
        .from("cash_register_sessions")
        .select("id, status")
        .eq("status", "OPEN")
        .limit(1)
        .maybeSingle();

    if (activeCashSessionError) {
      console.error(
        "Error consultando caja abierta antes de crear venta:",
        activeCashSessionError,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "No fue posible validar el estado de la caja.",
        },
        { status: 500 },
      );
    }

    if (!activeCashSession) {
      return NextResponse.json(
        {
          ok: false,
          message: "Debes abrir la caja antes de registrar una venta.",
        },
        { status: 409 },
      );
    }

    const cashRegisterSessionId = Number(activeCashSession.id);

    if (
      !Number.isInteger(cashRegisterSessionId) ||
      cashRegisterSessionId <= 0
    ) {
      console.error(
        "Caja abierta con identificador inválido:",
        activeCashSession,
      );

      return NextResponse.json(
        {
          ok: false,
          message: "La sesión de caja activa no es válida.",
        },
        { status: 500 },
      );
    }

    const orderNotes = String(body.orderNotes || "").trim();

    const channel = String(body.channel || "local")
      .trim()
      .toLowerCase();

    const externalOrderId = String(body.externalOrderId || "").trim();

    const allowedChannels = ["local", "shopify", "uber_eats", "rappi"];

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

    const rawPaymentMethod = String(body.paymentMethod || "")
      .trim()
      .toLowerCase();

    let paymentMethod: string;

    if (channel === "local") {
      const allowedLocalPaymentMethods = [
        "efectivo",
        "tarjeta",
        "transferencia",
      ];

      if (!allowedLocalPaymentMethods.includes(rawPaymentMethod)) {
        return NextResponse.json(
          {
            ok: false,
            message: "Medio de pago inválido para venta local.",
          },
          { status: 400 },
        );
      }

      paymentMethod = rawPaymentMethod;
    } else {
      if (rawPaymentMethod !== "pago_electronico") {
        return NextResponse.json(
          {
            ok: false,
            message: "Las ventas digitales deben usar pago electrónico.",
          },
          { status: 400 },
        );
      }

      paymentMethod = "pago_electronico";
    }
    const items = Array.isArray(body.items) ? body.items : [];

    const rawManualDiscountType =
      typeof body.manualDiscountType === "string"
        ? body.manualDiscountType.trim().toLowerCase()
        : "";

    const manualDiscountType =
      rawManualDiscountType === "" ? null : rawManualDiscountType;

    const manualDiscountValue =
      body.manualDiscountValue === null ||
      body.manualDiscountValue === undefined ||
      body.manualDiscountValue === ""
        ? null
        : Number(body.manualDiscountValue);

    const rawManualDiscountReason =
      typeof body.manualDiscountReason === "string"
        ? body.manualDiscountReason.trim().toLowerCase()
        : "";

    const manualDiscountReason =
      rawManualDiscountReason === "" ? null : rawManualDiscountReason;

    const manualDiscountNotes =
      typeof body.manualDiscountNotes === "string"
        ? body.manualDiscountNotes.trim() || null
        : null;

    const allowedManualDiscountTypes = ["percent", "fixed"];

    const allowedManualDiscountReasons = [
      "courtesy",
      "complaint",
      "agreement",
      "exceptional_promotion",
      "service_error",
      "other",
    ];

    if (manualDiscountType !== null) {
      if (!allowedManualDiscountTypes.includes(manualDiscountType)) {
        return NextResponse.json(
          { ok: false, message: "Tipo de descuento manual inválido." },
          { status: 400 },
        );
      }

      if (
        manualDiscountValue === null ||
        !Number.isInteger(manualDiscountValue) ||
        manualDiscountValue <= 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "El valor del descuento manual debe ser un número entero mayor que cero.",
          },
          { status: 400 },
        );
      }

      if (manualDiscountType === "percent" && manualDiscountValue > 100) {
        return NextResponse.json(
          {
            ok: false,
            message: "El descuento porcentual no puede superar 100%.",
          },
          { status: 400 },
        );
      }

      if (
        manualDiscountReason === null ||
        !allowedManualDiscountReasons.includes(manualDiscountReason)
      ) {
        return NextResponse.json(
          { ok: false, message: "Motivo de descuento manual inválido." },
          { status: 400 },
        );
      }

      if (manualDiscountReason === "other" && !manualDiscountNotes) {
        return NextResponse.json(
          {
            ok: false,
            message: "Debes especificar el motivo del descuento manual.",
          },
          { status: 400 },
        );
      }
    } else if (
      manualDiscountValue !== null ||
      manualDiscountReason !== null ||
      manualDiscountNotes !== null
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "No se pueden enviar datos de descuento manual sin indicar su tipo.",
        },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, message: "La venta debe tener al menos una línea." },
        { status: 400 },
      );
    }

    const normalizedItems: Record<string, unknown>[] = [];

    for (const [index, item] of items.entries()) {
      if (!item || typeof item !== "object") {
        return NextResponse.json(
          {
            ok: false,
            message: `La línea ${index + 1} de la venta no es válida.`,
          },
          { status: 400 },
        );
      }

      const itemRecord = item as Record<string, unknown>;

      const itemType = getItemType(itemRecord);

      if (!itemType) {
        return NextResponse.json(
          {
            ok: false,
            message: `La línea ${index + 1} tiene un tipo inválido.`,
          },
          { status: 400 },
        );
      }

      const quantity = Number(itemRecord.quantity ?? 1);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          {
            ok: false,
            message:
              `La cantidad de la línea ${index + 1} ` +
              "debe ser un número entero mayor que cero.",
          },
          { status: 400 },
        );
      }

      /*
       * Ítem personalizado:
       * - no requiere product_id;
       * - no admite opciones;
       * - no admite regalo;
       * - requiere nombre y precio unitario.
       */
      if (itemType === "CUSTOM") {
        const customName =
          typeof itemRecord.custom_name === "string"
            ? itemRecord.custom_name.trim()
            : "";

        const unitPrice = Number(itemRecord.unit_price);

        const options = Array.isArray(itemRecord.options)
          ? itemRecord.options
          : [];

        const notes =
          typeof itemRecord.notes === "string" ? itemRecord.notes.trim() : "";

        const loyaltyEligibleRaw = itemRecord.loyalty_eligible;

        if (typeof loyaltyEligibleRaw !== "boolean") {
          return NextResponse.json(
            {
              ok: false,
              message:
                `El ítem personalizado de la línea ${index + 1} ` +
                "debe indicar si aporta a fidelización.",
            },
            { status: 400 },
          );
        }

        const loyaltyEligible = loyaltyEligibleRaw;

        if (!customName) {
          return NextResponse.json(
            {
              ok: false,
              message:
                `El ítem personalizado de la línea ${index + 1} ` +
                "requiere un nombre.",
            },
            { status: 400 },
          );
        }

        if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
          return NextResponse.json(
            {
              ok: false,
              message:
                `El precio del ítem personalizado de la línea ${index + 1} ` +
                "debe ser un número entero mayor que cero.",
            },
            { status: 400 },
          );
        }

        if (itemRecord.is_gift === true) {
          return NextResponse.json(
            {
              ok: false,
              message:
                "Los ítems personalizados no pueden registrarse como regalo.",
            },
            { status: 400 },
          );
        }

        if (options.length > 0) {
          return NextResponse.json(
            {
              ok: false,
              message:
                "Los ítems personalizados no pueden incluir opciones de catálogo.",
            },
            { status: 400 },
          );
        }

        normalizedItems.push({
          item_type: "CUSTOM",
          custom_name: customName,
          unit_price: unitPrice,
          quantity,
          loyalty_eligible: loyaltyEligible,
          notes: notes || null,
          options: [],
          is_gift: false,
          gift_reason: null,
        });

        continue;
      }

      /*
       * Producto de catálogo.
       */
      const productId = getItemProductId(itemRecord);

      if (!productId) {
        return NextResponse.json(
          {
            ok: false,
            message: `El producto de la línea ${index + 1} no es válido.`,
          },
          { status: 400 },
        );
      }

      const isGift = itemRecord.is_gift === true;

      const giftReason =
        typeof itemRecord.gift_reason === "string"
          ? itemRecord.gift_reason.trim()
          : "";

      if (isGift && !giftReason) {
        return NextResponse.json(
          {
            ok: false,
            message:
              `La línea ${index + 1} está marcada como regalo ` +
              "pero no tiene motivo.",
          },
          { status: 400 },
        );
      }

      normalizedItems.push({
        ...itemRecord,
        item_type: "PRODUCT",
        product_id: productId,
        quantity,
        is_gift: isGift,
        gift_reason: isGift ? giftReason : null,
      });
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
     * Los sabores del pote armado son opcionales al momento de la venta.
     * Si se seleccionan sabores, deben corresponder a bachas abiertas
     * y con stock disponible.
     *
     * Esta validación se ejecuta nuevamente en backend para evitar:
     * - solicitudes manipuladas;
     * - información desactualizada en el POS;
     * - cambios de inventario entre configuración y confirmación.
     */
    const productItems = normalizedItems.filter(
      (item) => item.item_type === "PRODUCT",
    );

    const parsedProductIds = productItems.map(getItemProductId);

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

    const { data: saleProducts, error: saleProductsError } =
      productIds.length > 0
        ? await supabaseAdmin
            .from("products")
            .select("id, sku, name")
            .in("id", productIds)
        : {
            data: [],
            error: null,
          };

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

    for (const item of productItems) {
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
        p_items: normalizedItems,
        p_cash_register_session_id: cashRegisterSessionId,
        p_actor_role: session.role,
        p_order_notes: orderNotes || null,
        p_channel: channel,
        p_external_order_id: externalOrderId || null,
        p_promotional_stamps: promotionalStamps,
        p_promotion_reason: promotionalStamps > 0 ? promotionReason : null,
        p_manual_discount_type: manualDiscountType,
        p_manual_discount_value: manualDiscountValue,
        p_manual_discount_reason: manualDiscountReason,
        p_manual_discount_notes: manualDiscountNotes,
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
          cashRegisterSessionId,
          channel,
          externalOrderId: externalOrderId || null,
          paymentMethod,
          itemLines: normalizedItems.length,
          promotionalStamps,
          promotionReason: promotionalStamps > 0 ? promotionReason : null,
          manualDiscountType,
          manualDiscountValue,
          manualDiscountReason,
          manualDiscountNotes,
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
        cashRegisterSessionId,
        channel,
        externalOrderId: externalOrderId || null,
        paymentMethod,
        itemLines: normalizedItems.length,
        promotionalStamps,
        promotionReason: promotionalStamps > 0 ? promotionReason : null,
        manualDiscountType,
        manualDiscountValue,
        manualDiscountReason,
        manualDiscountNotes,
      },

      metadata: {
        orderNotes: orderNotes || null,
        hasCustomer: customerId !== null,
        cashRegisterSessionId,
        promotionalStamps,
        promotionReason: promotionalStamps > 0 ? promotionReason : null,
        manualDiscountType,
        manualDiscountValue,
        manualDiscountReason,
        manualDiscountNotes,
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
          cashRegisterSessionId,
          paymentMethod,
          itemLines: normalizedItems.length,
          hasCustomer: customerId !== null,
          manualDiscountType,
          manualDiscountValue,
          manualDiscountReason,
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
