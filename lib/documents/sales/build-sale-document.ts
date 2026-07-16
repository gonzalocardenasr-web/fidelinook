import { supabaseAdmin } from "../../supabase-admin";
import { SaleDocument, SaleDocumentItem } from "./types";

function normalizePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return parsed;
}

function normalizeNonNegativeNumber(value: unknown, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} no es válido.`);
  }

  return parsed;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function getChannelLabel(channel: string) {
  const normalized = channel.trim().toLowerCase();

  if (normalized === "shopify") return "Shopify";

  if (
    normalized === "uber" ||
    normalized === "uber_eats" ||
    normalized === "ubereats"
  ) {
    return "Uber Eats";
  }

  if (normalized === "rappi") return "Rappi";

  if (
    normalized === "pedidosya" ||
    normalized === "pedidos_ya" ||
    normalized === "pedidos ya"
  ) {
    return "PedidosYa";
  }

  return "Local";
}

function getPaymentMethodLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "efectivo") return "Efectivo";
  if (normalized === "debito") return "Débito";
  if (normalized === "credito") return "Crédito";
  if (normalized === "transferencia") return "Transferencia";
  if (normalized === "manual") return "Plataforma";

  return value || "No informado";
}

function formatChileDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha de confirmación de la venta no es válida.");
  }

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function resolveRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

export async function buildSaleDocument(
  saleIdInput: number,
): Promise<SaleDocument> {
  const saleId = normalizePositiveInteger(saleIdInput, "La venta");

  const { data: sale, error } = await supabaseAdmin
    .from("sales")
    .select(
      `
      id,
      sale_number,
      channel,
      external_order_id,
      integration_source,
      status,
      subtotal,
      discount_total,
      total,
      payment_status,
      payment_method,
      actor_role,
      confirmed_at,
      created_at,
      customer_id,
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
        created_at,
        delivered_at
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
    )
    .eq("id", saleId)
    .single();

  if (error || !sale) {
    throw new Error(error?.message || "No se encontró la venta solicitada.");
  }

  const customer = resolveRelation(sale.clientes);
  const order = resolveRelation(sale.orders);

  if (!order) {
    throw new Error("La venta no tiene un pedido asociado.");
  }

  const confirmedAt =
    normalizeOptionalText(sale.confirmed_at) ||
    normalizeOptionalText(sale.created_at);

  if (!confirmedAt) {
    throw new Error("La venta no tiene fecha de confirmación.");
  }

  const items: SaleDocumentItem[] = (
    Array.isArray(sale.sale_items) ? sale.sale_items : []
  ).map((item) => ({
    id: normalizePositiveInteger(item.id, "Uno de los ítems"),

    sku: normalizeOptionalText(item.product_sku),

    name: normalizeOptionalText(item.product_name) || "Producto Nook",

    quantity: normalizePositiveInteger(item.quantity, "La cantidad del ítem"),

    unitPrice: normalizeNonNegativeNumber(
      item.unit_price,
      "El precio unitario",
    ),

    totalPrice: normalizeNonNegativeNumber(
      item.total_price,
      "El total del ítem",
    ),

    notes: normalizeOptionalText(item.notes),

    options: (Array.isArray(item.sale_item_options)
      ? item.sale_item_options
      : []
    ).map((option) => ({
      groupCode: normalizeOptionalText(option.option_group_code) || "option",

      name: normalizeOptionalText(option.option_value_name) || "Opción",

      quantity: normalizePositiveInteger(
        option.quantity || 1,
        "La cantidad de la opción",
      ),
    })),
  }));

  const sourceReference =
    `daily-loyalty:${sale.customer_id || "anonymous"}:` +
    `${order.business_date || ""}:LOYALTY_POLICY_V1:1`;

  let stampsEarned = 0;
  let rewardsIssued = 0;
  let stampBalanceAfter: number | null = null;

  if (sale.customer_id) {
    const [movementsResult, rewardsResult, accountResult] = await Promise.all([
      supabaseAdmin
        .from("loyalty_movements")
        .select("stamp_delta")
        .eq("customer_id", sale.customer_id)
        .eq("source", "daily_loyalty")
        .eq("source_reference", sourceReference),

      supabaseAdmin
        .from("customer_rewards")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", sale.customer_id)
        .eq("source", "loyalty_engine")
        .gte("issued_at", `${order.business_date}T00:00:00`),

      supabaseAdmin
        .from("loyalty_accounts")
        .select("current_stamp_balance")
        .eq("customer_id", sale.customer_id)
        .maybeSingle(),
    ]);

    if (!movementsResult.error) {
      stampsEarned = (movementsResult.data || []).reduce(
        (total, movement) =>
          total + Math.max(Number(movement.stamp_delta || 0), 0),
        0,
      );
    }

    if (!rewardsResult.error) {
      rewardsIssued = rewardsResult.count || 0;
    }

    if (!accountResult.error && accountResult.data) {
      stampBalanceAfter = Number(accountResult.data.current_stamp_balance || 0);
    }
  }

  return {
    version: 1,

    saleId: sale.id,
    saleNumber: normalizeOptionalText(sale.sale_number),

    channel: sale.channel || "local",
    channelLabel: getChannelLabel(sale.channel || "local"),

    externalOrderId: normalizeOptionalText(sale.external_order_id),

    integrationSource: normalizeOptionalText(sale.integration_source),

    status: sale.status || "confirmed",

    paymentStatus: sale.payment_status || "unknown",

    paymentMethod: sale.payment_method || "manual",

    paymentMethodLabel: getPaymentMethodLabel(sale.payment_method || "manual"),

    subtotal: normalizeNonNegativeNumber(sale.subtotal, "El subtotal"),

    discountTotal: normalizeNonNegativeNumber(
      sale.discount_total,
      "El descuento",
    ),

    total: normalizeNonNegativeNumber(sale.total, "El total"),

    actorRole: normalizeOptionalText(sale.actor_role),

    confirmedAt,
    confirmedAtChile: formatChileDateTime(confirmedAt),

    customer: {
      id: customer?.id || null,
      name: customer?.nombre || "Mostrador",
      email: normalizeOptionalText(customer?.correo),
      phone: normalizeOptionalText(customer?.telefono),
    },

    order: {
      id: normalizePositiveInteger(order.id, "El pedido"),

      businessDate: normalizeOptionalText(order.business_date),

      dailyOrderNumber:
        order.daily_order_number === null ||
        order.daily_order_number === undefined
          ? null
          : Number(order.daily_order_number),

      displayOrderCode:
        normalizeOptionalText(order.display_order_code) || `Pedido ${order.id}`,

      status: order.status || "pending",

      notes: normalizeOptionalText(order.notes),

      createdAt: normalizeOptionalText(order.created_at),

      deliveredAt: normalizeOptionalText(order.delivered_at),
    },

    items,

    loyalty: {
      stampsEarned,
      rewardsIssued,
      stampBalanceAfter,
    },

    metadata: {
      timezone: "America/Santiago",
      paperWidthMm: 80,
      generatedAt: new Date().toISOString(),
    },
  };
}
