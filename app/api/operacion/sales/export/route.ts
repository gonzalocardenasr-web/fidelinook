import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getOperationSession } from "../../../../../lib/operation-auth";

type ExportOrder = {
  display_order_code?: string | null;
  status?: string | null;
  notes?: string | null;
};

type ExportCustomer = {
  nombre?: string | null;
  telefono?: string | null;
  correo?: string | null;
};

type ExportSaleItem = {
  product_name?: string | null;
  quantity?: number | null;
};

type ExportSale = {
  id: number;
  sale_number?: string | null;
  channel?: string | null;
  external_order_id?: string | null;
  subtotal?: number | null;
  discount_total?: number | null;
  total?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  actor_role?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  clientes?: ExportCustomer | null;
  orders?: ExportOrder[] | null;
  sale_items?: ExportSaleItem[] | null;
};

function sanitizeSearch(value: string) {
  return value.replace(/[,%()]/g, " ").trim();
}

function getChannelLabel(channel?: string | null) {
  const normalized = String(channel || "local").toLowerCase();

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

function getPaymentMethodLabel(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "efectivo") return "Efectivo";
  if (normalized === "tarjeta") return "Tarjeta";
  if (normalized === "transferencia") return "Transferencia";
  if (normalized === "pago_electronico") return "Pago electrónico";

  // Valores históricos: se mantienen para ventas anteriores.
  if (normalized === "debito") return "Débito";
  if (normalized === "credito") return "Crédito";
  if (normalized === "manual") return "Plataforma";

  return value || "";
}

function getPaymentStatusLabel(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "paid") return "Pagado";
  if (normalized === "pending") return "Pendiente";
  if (normalized === "refunded") return "Reembolsado";
  if (normalized === "cancelled") return "Cancelado";

  return value || "";
}

function getOrderStatusLabel(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "pending") return "Pendiente";
  if (normalized === "preparing") return "Preparando";
  if (normalized === "ready") return "Listo";
  if (normalized === "delivered") return "Entregado";
  if (normalized === "cancelled") return "Cancelado";

  return value || "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function formatProducts(items?: ExportSaleItem[] | null) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return items
    .map((item) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const productName = String(item.product_name || "Producto");

      return `${quantity}x ${productName}`;
    })
    .join(" | ");
}

function getTotalItems(items?: ExportSaleItem[] | null) {
  if (!Array.isArray(items)) return 0;

  return items.reduce(
    (total, item) => total + Math.max(1, Number(item.quantity || 1)),
    0,
  );
}

/*
 * Utilizamos punto y coma como separador porque suele abrirse
 * correctamente en Excel con configuración regional chilena.
 */
function escapeCsvValue(value: unknown) {
  const text = String(value ?? "")
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ");

  if (text.includes(";") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsvRow(values: unknown[]) {
  return values.map(escapeCsvValue).join(";");
}

function buildFileName(dateFrom?: string | null, dateTo?: string | null) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());

  if (dateFrom || dateTo) {
    const fromLabel = dateFrom ? dateFrom.slice(0, 10) : "inicio";

    const toLabel = dateTo ? dateTo.slice(0, 10) : today;

    return `ventas-nook-${fromLabel}-${toLabel}.csv`;
  }

  return `ventas-nook-${today}.csv`;
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

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = String(searchParams.get("search") || "").trim();
    const channel = String(searchParams.get("channel") || "").trim();
    const paymentMethod = String(
      searchParams.get("paymentMethod") || "",
    ).trim();
    const orderStatus = String(searchParams.get("orderStatus") || "").trim();
    const customerType = String(searchParams.get("customerType") || "").trim();

    let candidateSaleIds: Set<number> | null = null;

    function intersectCandidateIds(ids: number[]) {
      const nextIds = new Set(ids);

      if (candidateSaleIds === null) {
        candidateSaleIds = nextIds;
        return;
      }

      candidateSaleIds = new Set(
        [...candidateSaleIds].filter((id) => nextIds.has(id)),
      );
    }

    /*
     * Filtro por estado de pedido.
     */
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

      intersectCandidateIds(
        (statusOrders || [])
          .map((order) => Number(order.sale_id))
          .filter((id) => Number.isFinite(id)),
      );
    }

    /*
     * Búsqueda general sobre ventas, clientes y pedidos.
     */
    if (search) {
      const safeSearch = sanitizeSearch(search);
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
        const saleId = Number(sale.id);

        if (Number.isFinite(saleId)) {
          searchSaleIds.add(saleId);
        }
      }

      const numericSearch = Number(search);

      if (Number.isInteger(numericSearch) && numericSearch > 0) {
        const { data: numericSales, error: numericSalesError } =
          await supabaseAdmin
            .from("sales")
            .select("id")
            .eq("id", numericSearch);

        if (numericSalesError) {
          return NextResponse.json(
            { ok: false, message: numericSalesError.message },
            { status: 500 },
          );
        }

        for (const sale of numericSales || []) {
          const saleId = Number(sale.id);

          if (Number.isFinite(saleId)) {
            searchSaleIds.add(saleId);
          }
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
          const saleId = Number(sale.id);

          if (Number.isFinite(saleId)) {
            searchSaleIds.add(saleId);
          }
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

      intersectCandidateIds([...searchSaleIds]);
    }

    const headers = [
      "ID venta",
      "Código pedido",
      "Fecha y hora",
      "Canal",
      "Referencia externa",
      "Cliente",
      "Teléfono",
      "Correo",
      "Cantidad ítems",
      "Productos",
      "Medio de pago",
      "Estado de pago",
      "Estado del pedido",
      "Subtotal",
      "Descuentos",
      "Total",
      "Nota del pedido",
      "Operador",
    ];

    /*
     * Si no existen coincidencias, generamos igualmente un CSV
     * válido con sus encabezados.
     */
    if (candidateSaleIds !== null && candidateSaleIds.size === 0) {
      const emptyCsv = `\uFEFF${buildCsvRow(headers)}\r\n`;

      return new Response(emptyCsv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${buildFileName(
            dateFrom,
            dateTo,
          )}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const allSales: ExportSale[] = [];
    const batchSize = 1000;
    let batchStart = 0;

    /*
     * Supabase limita la cantidad de registros por respuesta.
     * Recorremos internamente el resultado en bloques de 1.000
     * para exportar todo el universo filtrado.
     */
    while (true) {
      let query = supabaseAdmin.from("sales").select(
        `
          id,
          sale_number,
          channel,
          external_order_id,
          subtotal,
          discount_total,
          total,
          payment_status,
          payment_method,
          actor_role,
          confirmed_at,
          created_at,
          clientes (
            nombre,
            telefono,
            correo
          ),
          orders (
            display_order_code,
            status,
            notes
          ),
          sale_items (
            product_name,
            quantity
          )
        `,
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

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(batchStart, batchStart + batchSize - 1);

      if (error) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: 500 },
        );
      }

      const batch = (data || []) as ExportSale[];

      allSales.push(...batch);

      if (batch.length < batchSize) {
        break;
      }

      batchStart += batchSize;
    }

    const rows = allSales.map((sale) => {
      const order = sale.orders?.[0] || null;
      const customer = sale.clientes || null;

      return [
        sale.id,
        order?.display_order_code || sale.sale_number || `Venta #${sale.id}`,
        formatDateTime(sale.confirmed_at || sale.created_at),
        getChannelLabel(sale.channel),
        sale.external_order_id || "",
        customer?.nombre || "Mostrador",
        customer?.telefono || "",
        customer?.correo || "",
        getTotalItems(sale.sale_items),
        formatProducts(sale.sale_items),
        getPaymentMethodLabel(sale.payment_method),
        getPaymentStatusLabel(sale.payment_status),
        getOrderStatusLabel(order?.status),
        Number(sale.subtotal || 0),
        Number(sale.discount_total || 0),
        Number(sale.total || 0),
        order?.notes || "",
        sale.actor_role || "",
      ];
    });

    const csv = [buildCsvRow(headers), ...rows.map(buildCsvRow)].join("\r\n");

    /*
     * BOM UTF-8 para conservar tildes, eñes y símbolos
     * al abrir el archivo en Excel.
     */
    const csvWithBom = `\uFEFF${csv}\r\n`;

    return new Response(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildFileName(
          dateFrom,
          dateTo,
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exportando historial de ventas:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error inesperado al exportar las ventas.",
      },
      { status: 500 },
    );
  }
}
