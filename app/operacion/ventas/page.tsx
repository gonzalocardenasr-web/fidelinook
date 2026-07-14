"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SaleItemOption = {
  id: number;
  option_group_code: string;
  option_value_name: string;
  quantity: number;
};

type SaleItem = {
  id: number;
  product_sku?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  sale_item_options?: SaleItemOption[];
};

type SaleOrder = {
  id: number;
  business_date?: string | null;
  daily_order_number?: number | null;
  display_order_code: string;
  status: string;
  notes?: string | null;
  created_at?: string | null;
};

type SaleCustomer = {
  id: number;
  nombre?: string | null;
  correo?: string | null;
  telefono?: string | null;
};

type Sale = {
  id: number;
  sale_number?: string | null;
  channel: string;
  external_order_id?: string | null;
  integration_source?: string | null;
  received_at?: string | null;
  customer_id?: number | null;
  status: string;
  subtotal: number;
  discount_total: number;
  total: number;
  payment_status: string;
  payment_method: string;
  actor_role?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  clientes?: SaleCustomer | null;
  orders?: SaleOrder[];
  sale_items?: SaleItem[];
};

type SortField = "date" | "total" | "customer" | "channel";
type SortDirection = "asc" | "desc";

function formatMoney(value?: number | null) {
  return `$${Number(value || 0).toLocaleString("es-CL")}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(value));
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

function getChannelClassName(channel?: string | null) {
  const normalized = String(channel || "local").toLowerCase();

  if (normalized === "shopify") {
    return "bg-blue-100 text-blue-800";
  }

  if (
    normalized === "uber" ||
    normalized === "uber_eats" ||
    normalized === "ubereats"
  ) {
    return "bg-green-100 text-green-800";
  }

  if (normalized === "rappi") {
    return "bg-orange-100 text-orange-800";
  }

  if (
    normalized === "pedidosya" ||
    normalized === "pedidos_ya" ||
    normalized === "pedidos ya"
  ) {
    return "bg-red-100 text-red-800";
  }

  return "bg-violet-100 text-violet-800";
}

function getPaymentMethodLabel(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "efectivo") return "Efectivo";
  if (normalized === "debito") return "Débito";
  if (normalized === "credito") return "Crédito";
  if (normalized === "transferencia") return "Transferencia";
  if (normalized === "manual") return "Plataforma";

  return value || "—";
}

function getOrderStatusLabel(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "pending") return "Pendiente";
  if (normalized === "preparing") return "Preparando";
  if (normalized === "ready") return "Listo";
  if (normalized === "delivered") return "Entregado";
  if (normalized === "cancelled") return "Cancelado";

  return value || "—";
}

function getStatusClassName(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "pending") {
    return "bg-amber-100 text-amber-800";
  }

  if (normalized === "preparing") {
    return "bg-blue-100 text-blue-800";
  }

  if (normalized === "ready") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (normalized === "delivered") {
    return "bg-neutral-200 text-neutral-700";
  }

  if (normalized === "cancelled") {
    return "bg-red-100 text-red-800";
  }

  return "bg-neutral-100 text-neutral-600";
}

export default function HistorialVentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    cargarVentas();
  }, []);

  async function cargarVentas() {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/operacion/sales");
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar historial.");
        return;
      }

      setSales(Array.isArray(data.sales) ? data.sales : []);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando historial.");
    } finally {
      setLoading(false);
    }
  }

  function changeSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "date" ? "desc" : "asc");
  }

  function clearFilters() {
    setSearch("");
    setChannelFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
    setCustomerFilter("all");
    setSortField("date");
    setSortDirection("desc");
  }

  const filteredSales = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = sales.filter((sale) => {
      const order = sale.orders?.[0] || null;
      const customer = sale.clientes;
      const itemCount = (sale.sale_items || []).reduce(
        (acc, item) => acc + item.quantity,
        0,
      );

      const matchesSearch =
        !normalizedSearch ||
        [
          sale.id,
          sale.sale_number,
          sale.channel,
          getChannelLabel(sale.channel),
          sale.external_order_id,
          sale.payment_method,
          order?.display_order_code,
          order?.status,
          customer?.nombre,
          customer?.correo,
          customer?.telefono,
          itemCount,
          sale.total,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedSearch),
        );

      const matchesChannel =
        channelFilter === "all" || sale.channel === channelFilter;

      const matchesPayment =
        paymentFilter === "all" || sale.payment_method === paymentFilter;

      const matchesStatus =
        statusFilter === "all" || order?.status === statusFilter;

      const matchesCustomer =
        customerFilter === "all" ||
        (customerFilter === "identified" && Boolean(sale.clientes)) ||
        (customerFilter === "counter" && !sale.clientes);

      return (
        matchesSearch &&
        matchesChannel &&
        matchesPayment &&
        matchesStatus &&
        matchesCustomer
      );
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === "date") {
        const dateA = new Date(a.confirmed_at || a.created_at).getTime();

        const dateB = new Date(b.confirmed_at || b.created_at).getTime();

        comparison = dateA - dateB;
      }

      if (sortField === "total") {
        comparison = Number(a.total || 0) - Number(b.total || 0);
      }

      if (sortField === "customer") {
        comparison = String(a.clientes?.nombre || "Mostrador").localeCompare(
          String(b.clientes?.nombre || "Mostrador"),
          "es",
        );
      }

      if (sortField === "channel") {
        comparison = getChannelLabel(a.channel).localeCompare(
          getChannelLabel(b.channel),
          "es",
        );
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    sales,
    search,
    channelFilter,
    paymentFilter,
    statusFilter,
    customerFilter,
    sortField,
    sortDirection,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    channelFilter !== "all" ||
    paymentFilter !== "all" ||
    statusFilter !== "all" ||
    customerFilter !== "all";

  return (
    <main className="min-h-screen bg-[#F6F3FF] p-3">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1600px] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/operacion"
              className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-bold text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50"
            >
              ← Operación
            </Link>

            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight text-neutral-900">
                Historial de ventas
              </h1>

              <p className="text-[11px] text-neutral-500">
                Consulta operacional de ventas locales y digitales.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cargarVentas}
            disabled={loading}
            className="shrink-0 cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </header>

        {message && (
          <div className="mt-2 shrink-0 rounded-lg border border-red-100 bg-white px-3 py-2 text-[12px] font-semibold text-red-700">
            {message}
          </div>
        )}

        <section className="mt-2 flex min-h-0 flex-1 flex-col rounded-xl bg-white p-3 shadow-sm">
          <div className="shrink-0">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[260px] flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Búsqueda general
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pedido, cliente, canal, teléfono o referencia"
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[12px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="w-36">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Canal
                </label>

                <select
                  value={channelFilter}
                  onChange={(event) => setChannelFilter(event.target.value)}
                  className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="all">Todos</option>
                  <option value="local">Local</option>
                  <option value="shopify">Shopify</option>
                  <option value="uber_eats">Uber Eats</option>
                  <option value="rappi">Rappi</option>
                  <option value="pedidosya">PedidosYa</option>
                </select>
              </div>

              <div className="w-36">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Pago
                </label>

                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="all">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="manual">Plataforma</option>
                </select>
              </div>

              <div className="w-36">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Estado
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendiente</option>
                  <option value="preparing">Preparando</option>
                  <option value="ready">Listo</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div className="w-36">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Cliente
                </label>

                <select
                  value={customerFilter}
                  onChange={(event) => setCustomerFilter(event.target.value)}
                  className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="all">Todos</option>
                  <option value="identified">Identificado</option>
                  <option value="counter">Mostrador</option>
                </select>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="h-9 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-bold text-neutral-600 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Limpiar
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-neutral-500">
                <strong className="font-black text-neutral-900">
                  {filteredSales.length}
                </strong>{" "}
                transacción
                {filteredSales.length === 1 ? "" : "es"}
              </p>

              <p className="text-[10px] text-neutral-400">
                Últimas 50 ventas registradas
              </p>
            </div>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-lg border border-neutral-200">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-neutral-100">
                <tr className="border-b border-neutral-200">
                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    <button
                      type="button"
                      onClick={() => changeSort("date")}
                      className="cursor-pointer hover:text-violet-700"
                    >
                      Fecha y hora{" "}
                      {sortField === "date"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    Pedido
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    <button
                      type="button"
                      onClick={() => changeSort("channel")}
                      className="cursor-pointer hover:text-violet-700"
                    >
                      Canal{" "}
                      {sortField === "channel"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    Ref. externa
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    <button
                      type="button"
                      onClick={() => changeSort("customer")}
                      className="cursor-pointer hover:text-violet-700"
                    >
                      Cliente{" "}
                      {sortField === "customer"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    Ítems
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    Pago
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    Estado
                  </th>

                  <th className="whitespace-nowrap px-3 py-2 text-right text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    <button
                      type="button"
                      onClick={() => changeSort("total")}
                      className="cursor-pointer hover:text-violet-700"
                    >
                      Total{" "}
                      {sortField === "total"
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </button>
                  </th>

                  <th className="w-16 px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100 bg-white">
                {loading && sales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-[12px] text-neutral-500"
                    >
                      Cargando ventas...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-[12px] text-neutral-400"
                    >
                      No hay ventas que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const order = sale.orders?.[0] || null;

                    const totalItems = (sale.sale_items || []).reduce(
                      (acc, item) => acc + item.quantity,
                      0,
                    );

                    return (
                      <tr
                        key={sale.id}
                        className="transition hover:bg-violet-50/50"
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-neutral-600">
                          {formatDateTime(sale.confirmed_at || sale.created_at)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2">
                          <p className="text-[11px] font-black text-neutral-900">
                            {order?.display_order_code ||
                              sale.sale_number ||
                              `Venta #${sale.id}`}
                          </p>

                          <p className="text-[9px] text-neutral-400">
                            Venta #{sale.id}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black ${getChannelClassName(
                              sale.channel,
                            )}`}
                          >
                            {getChannelLabel(sale.channel)}
                          </span>
                        </td>

                        <td className="max-w-40 truncate px-3 py-2 text-[11px] text-neutral-600">
                          {sale.external_order_id || "—"}
                        </td>

                        <td className="max-w-48 px-3 py-2">
                          <p className="truncate text-[11px] font-bold text-neutral-800">
                            {sale.clientes?.nombre || "Mostrador"}
                          </p>

                          {sale.clientes?.telefono && (
                            <p className="truncate text-[9px] text-neutral-400">
                              {sale.clientes.telefono}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2 text-center text-[11px] font-bold text-neutral-700">
                          {totalItems}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-neutral-600">
                          {getPaymentMethodLabel(sale.payment_method)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${getStatusClassName(
                              order?.status,
                            )}`}
                          >
                            {getOrderStatusLabel(order?.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-2 text-right text-[12px] font-black text-violet-700">
                          {formatMoney(sale.total)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-2 text-center">
                          <button
                            type="button"
                            disabled
                            title="Disponible en DEV-024.1C"
                            className="cursor-not-allowed rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-bold text-neutral-400"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
