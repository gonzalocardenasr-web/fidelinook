"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ClienteSelector, {
  ClienteSelectorValue,
} from "../../../components/client/ClienteSelector";

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

function formatRepeatedNames(names: string[]) {
  const counts = names.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
    .join(" + ");
}

function getItemOptions(item: SaleItem) {
  const options = Array.isArray(item.sale_item_options)
    ? item.sale_item_options
    : [];

  const flavors = options
    .filter(
      (option) =>
        option.option_group_code === "flavor" ||
        option.option_group_code === "sabor",
    )
    .map((option) => option.option_value_name)
    .filter(Boolean);

  const toppings = options
    .filter(
      (option) =>
        option.option_group_code === "topping" ||
        option.option_group_code === "toppings",
    )
    .map((option) => option.option_value_name)
    .filter(Boolean);

  return {
    flavors,
    toppings,
  };
}

export default function HistorialVentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerCandidate, setCustomerCandidate] =
    useState<ClienteSelectorValue | null>(null);
  const [customerChangeReason, setCustomerChangeReason] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerChangeMessage, setCustomerChangeMessage] = useState("");
  const [customerSelectorResetKey, setCustomerSelectorResetKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  useEffect(() => {
    if (!selectedSale) {
      setEditingCustomer(false);
      setCustomerCandidate(null);
      setCustomerChangeReason("");
      setCustomerChangeMessage("");
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (editingCustomer) {
          cancelCustomerChange();
          return;
        }

        setSelectedSale(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedSale, editingCustomer]);

  async function cargarVentas(
    targetPage = page,
    filterOverrides?: {
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      channel?: string;
      paymentMethod?: string;
      orderStatus?: string;
      customerType?: string;
    },
  ) {
    try {
      setLoading(true);
      setMessage("");

      const effectiveDateFrom =
        filterOverrides?.dateFrom !== undefined
          ? filterOverrides.dateFrom
          : dateFrom;

      const effectiveDateTo =
        filterOverrides?.dateTo !== undefined ? filterOverrides.dateTo : dateTo;

      const effectiveSearch =
        filterOverrides?.search !== undefined ? filterOverrides.search : search;

      const effectiveChannel =
        filterOverrides?.channel !== undefined
          ? filterOverrides.channel
          : channelFilter;

      const effectivePaymentMethod =
        filterOverrides?.paymentMethod !== undefined
          ? filterOverrides.paymentMethod
          : paymentFilter;

      const effectiveOrderStatus =
        filterOverrides?.orderStatus !== undefined
          ? filterOverrides.orderStatus
          : statusFilter;

      const effectiveCustomerType =
        filterOverrides?.customerType !== undefined
          ? filterOverrides.customerType
          : customerFilter;

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });

      if (effectiveDateFrom) {
        const startDate = new Date(`${effectiveDateFrom}T00:00:00`);

        params.set("dateFrom", startDate.toISOString());
      }

      if (effectiveDateTo) {
        const endDateExclusive = new Date(`${effectiveDateTo}T00:00:00`);

        endDateExclusive.setDate(endDateExclusive.getDate() + 1);

        params.set("dateTo", endDateExclusive.toISOString());
      }

      if (effectiveSearch.trim()) {
        params.set("search", effectiveSearch.trim());
      }

      if (effectiveChannel !== "all") {
        params.set("channel", effectiveChannel);
      }

      if (effectivePaymentMethod !== "all") {
        params.set("paymentMethod", effectivePaymentMethod);
      }

      if (effectiveOrderStatus !== "all") {
        params.set("orderStatus", effectiveOrderStatus);
      }

      if (effectiveCustomerType !== "all") {
        params.set("customerType", effectiveCustomerType);
      }

      const res = await fetch(`/api/operacion/sales?${params.toString()}`);

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar historial.");
        return;
      }

      const nextSales = Array.isArray(data.sales) ? data.sales : [];

      setSales(nextSales);

      setSelectedSale((current) => {
        if (!current) return null;

        return nextSales.find((sale: Sale) => sale.id === current.id) || null;
      });

      setPage(data.pagination?.page || targetPage);
      setTotalSales(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando historial.");
    } finally {
      setLoading(false);
    }
  }

  async function exportarCsv() {
    try {
      setExporting(true);
      setMessage("");

      if (dateFrom && dateTo && dateFrom > dateTo) {
        setMessage("La fecha inicial no puede ser posterior a la fecha final.");
        return;
      }

      const params = new URLSearchParams();

      if (dateFrom) {
        const startDate = new Date(`${dateFrom}T00:00:00`);

        params.set("dateFrom", startDate.toISOString());
      }

      if (dateTo) {
        const endDateExclusive = new Date(`${dateTo}T00:00:00`);

        endDateExclusive.setDate(endDateExclusive.getDate() + 1);

        params.set("dateTo", endDateExclusive.toISOString());
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (channelFilter !== "all") {
        params.set("channel", channelFilter);
      }

      if (paymentFilter !== "all") {
        params.set("paymentMethod", paymentFilter);
      }

      if (statusFilter !== "all") {
        params.set("orderStatus", statusFilter);
      }

      if (customerFilter !== "all") {
        params.set("customerType", customerFilter);
      }

      const queryString = params.toString();

      const res = await fetch(
        `/api/operacion/sales/export${queryString ? `?${queryString}` : ""}`,
      );

      if (!res.ok) {
        let errorMessage = "No se pudo exportar el historial.";

        try {
          const data = await res.json();
          errorMessage = data.message || errorMessage;
        } catch {
          // La respuesta podría no ser JSON.
        }

        setMessage(errorMessage);
        return;
      }

      const blob = await res.blob();

      const disposition = res.headers.get("Content-Disposition") || "";

      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);

      const filename = filenameMatch?.[1] || "ventas-nook.csv";

      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = downloadUrl;
      anchor.download = filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error exportando ventas:", error);
      setMessage("Error inesperado al exportar las ventas.");
    } finally {
      setExporting(false);
    }
  }

  function startCustomerChange() {
    setCustomerCandidate(null);
    setCustomerChangeReason("");
    setCustomerChangeMessage("");
    setCustomerSelectorResetKey((current) => current + 1);
    setEditingCustomer(true);
  }

  function cancelCustomerChange() {
    setEditingCustomer(false);
    setCustomerCandidate(null);
    setCustomerChangeReason("");
    setCustomerChangeMessage("");
    setCustomerSelectorResetKey((current) => current + 1);
  }

  async function saveCustomerChange() {
    if (!selectedSale) return;

    if (!customerCandidate) {
      setCustomerChangeMessage("Selecciona un cliente.");
      return;
    }

    try {
      setSavingCustomer(true);
      setCustomerChangeMessage("");

      const res = await fetch("/api/operacion/sales/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saleId: selectedSale.id,
          customerId: customerCandidate.id,
          reason: customerChangeReason.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCustomerChangeMessage(
          data.message || "No se pudo asignar el cliente.",
        );
        return;
      }

      const updatedCustomer = data.sale?.clientes || null;
      const updatedCustomerId = data.sale?.customer_id || null;

      const updateSale = (sale: Sale): Sale => {
        if (sale.id !== selectedSale.id) return sale;

        return {
          ...sale,
          customer_id: updatedCustomerId,
          clientes: updatedCustomer,
        };
      };

      setSales((current) => current.map(updateSale));

      setSelectedSale((current) => (current ? updateSale(current) : current));

      setCustomerChangeMessage(
        data.message || "Cliente asignado correctamente.",
      );

      setEditingCustomer(false);
      setCustomerCandidate(null);
      setCustomerChangeReason("");
      setCustomerSelectorResetKey((current) => current + 1);
    } catch (error) {
      console.error("Error asignando cliente:", error);
      setCustomerChangeMessage("Error inesperado al asignar el cliente.");
    } finally {
      setSavingCustomer(false);
    }
  }

  function applyFilters() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setMessage("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }

    setPage(1);
    setSelectedSale(null);
    cargarVentas(1);
  }

  function clearDateFilters() {
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setSelectedSale(null);

    cargarVentas(1, {
      dateFrom: "",
      dateTo: "",
    });
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || loading) {
      return;
    }

    setPage(nextPage);
    cargarVentas(nextPage);
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
    setDateFrom("");
    setDateTo("");
    setSortField("date");
    setSortDirection("desc");
    setPage(1);
    setSelectedSale(null);

    cargarVentas(1, {
      dateFrom: "",
      dateTo: "",
      search: "",
      channel: "all",
      paymentMethod: "all",
      orderStatus: "all",
      customerType: "all",
    });
  }

  const filteredSales = useMemo(() => {
    return [...sales].sort((a, b) => {
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
  }, [sales, sortField, sortDirection]);

  const hasActiveFilters =
    search.trim() !== "" ||
    channelFilter !== "all" ||
    paymentFilter !== "all" ||
    statusFilter !== "all" ||
    customerFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  const selectedOrder = selectedSale?.orders?.[0] || null;
  const selectedItems = selectedSale?.sale_items || [];

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

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={exportarCsv}
              disabled={loading || exporting}
              className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Exportando..." : "Exportar CSV"}
            </button>

            <button
              type="button"
              onClick={() => cargarVentas(page)}
              disabled={loading}
              className="cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </header>

        {message && (
          <div className="mt-2 shrink-0 rounded-lg border border-red-100 bg-white px-3 py-2 text-[12px] font-semibold text-red-700">
            {message}
          </div>
        )}

        <section className="mt-2 flex min-h-0 flex-1 flex-col rounded-xl bg-white p-3 shadow-sm">
          <div className="shrink-0">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-36">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Desde
                </label>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-[11px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="w-36">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Hasta
                </label>

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-[11px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <button
                type="button"
                onClick={clearDateFilters}
                disabled={loading || (!dateFrom && !dateTo)}
                className="h-9 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-bold text-neutral-600 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Todas las fechas
              </button>
              <div className="min-w-[260px] flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  Búsqueda general
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFilters();
                    }
                  }}
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
                onClick={applyFilters}
                disabled={loading}
                className="h-9 cursor-pointer rounded-lg bg-neutral-900 px-3 text-[11px] font-bold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aplicar filtros
              </button>

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
                resultado{filteredSales.length === 1 ? "" : "s"} en esta página
              </p>

              <p className="text-[10px] text-neutral-500">
                Mostrando{" "}
                <strong className="font-black text-neutral-800">
                  {totalSales === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>
                {"–"}
                <strong className="font-black text-neutral-800">
                  {Math.min(page * pageSize, totalSales)}
                </strong>{" "}
                de{" "}
                <strong className="font-black text-neutral-800">
                  {totalSales}
                </strong>{" "}
                ventas
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
                            onClick={() => setSelectedSale(sale)}
                            className="cursor-pointer rounded-md border border-violet-200 bg-white px-2 py-1 text-[10px] font-bold text-violet-700 transition hover:bg-violet-50 active:scale-[0.98]"
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
          <footer className="mt-2 flex shrink-0 items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>

            <div className="text-center">
              <p className="text-[11px] font-bold text-neutral-700">
                Página {page} de {totalPages}
              </p>

              <p className="text-[9px] text-neutral-400">
                Hasta {pageSize} transacciones por página
              </p>
            </div>

            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente →
            </button>
          </footer>
        </section>
      </div>
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={() => {
              if (editingCustomer) {
                cancelCustomerChange();
                return;
              }

              setSelectedSale(null);
            }}
            className="absolute inset-0 cursor-default"
          />

          <aside className="relative z-10 flex h-full w-full max-w-[460px] flex-col border-l border-neutral-200 bg-white shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-violet-600">
                  Detalle de venta
                </p>

                <h2 className="mt-0.5 text-lg font-black leading-tight text-neutral-900">
                  {selectedOrder?.display_order_code ||
                    selectedSale.sale_number ||
                    `Venta #${selectedSale.id}`}
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black ${getChannelClassName(
                      selectedSale.channel,
                    )}`}
                  >
                    {getChannelLabel(selectedSale.channel)}
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${getStatusClassName(
                      selectedOrder?.status,
                    )}`}
                  >
                    {getOrderStatusLabel(selectedOrder?.status)}
                  </span>
                </div>

                {selectedSale.external_order_id && (
                  <p className="mt-1 text-[10px] font-semibold text-neutral-500">
                    Ref. externa: {selectedSale.external_order_id}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (editingCustomer) {
                    cancelCustomerChange();
                    return;
                  }

                  setSelectedSale(null);
                }}
                className="shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-50"
              >
                Cerrar
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <section className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                    Fecha y hora
                  </p>

                  <p className="mt-0.5 text-[11px] font-bold text-neutral-800">
                    {formatDateTime(
                      selectedSale.confirmed_at || selectedSale.created_at,
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                    Medio de pago
                  </p>

                  <p className="mt-0.5 text-[11px] font-bold text-neutral-800">
                    {getPaymentMethodLabel(selectedSale.payment_method)}
                  </p>
                </div>

                <div className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                    Estado del pago
                  </p>

                  <p className="mt-0.5 text-[11px] font-bold text-neutral-800">
                    {selectedSale.payment_status || "—"}
                  </p>
                </div>

                <div className="rounded-lg bg-neutral-50 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                    Operador
                  </p>

                  <p className="mt-0.5 text-[11px] font-bold text-neutral-800">
                    {selectedSale.actor_role || "—"}
                  </p>
                </div>
              </section>

              <section className="mt-3 rounded-lg border border-neutral-200 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      Cliente
                    </p>

                    <p className="mt-0.5 truncate text-[12px] font-black text-neutral-900">
                      {selectedSale.clientes?.nombre || "Mostrador"}
                    </p>

                    {(selectedSale.clientes?.telefono ||
                      selectedSale.clientes?.correo) && (
                      <div className="mt-1 space-y-0.5 text-[10px] text-neutral-500">
                        {selectedSale.clientes?.telefono && (
                          <p>{selectedSale.clientes.telefono}</p>
                        )}

                        {selectedSale.clientes?.correo && (
                          <p className="break-all">
                            {selectedSale.clientes.correo}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!editingCustomer && (
                    <button
                      type="button"
                      onClick={startCustomerChange}
                      className="shrink-0 cursor-pointer rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[10px] font-black text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
                    >
                      {selectedSale.clientes ? "Cambiar" : "Asignar"}
                    </button>
                  )}
                </div>

                {editingCustomer && (
                  <div className="mt-3 border-t border-neutral-100 pt-3">
                    <ClienteSelector
                      value={customerCandidate}
                      onChange={setCustomerCandidate}
                      resetKey={customerSelectorResetKey}
                    />

                    <div className="mt-2">
                      <label className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Motivo opcional
                      </label>

                      <input
                        value={customerChangeReason}
                        onChange={(event) =>
                          setCustomerChangeReason(event.target.value)
                        }
                        maxLength={500}
                        placeholder="Ej: cliente se registró después de la compra"
                        className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[11px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                    </div>

                    {customerChangeMessage && (
                      <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[10px] font-semibold leading-snug text-amber-800">
                        {customerChangeMessage}
                      </p>
                    )}

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={cancelCustomerChange}
                        disabled={savingCustomer}
                        className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={saveCustomerChange}
                        disabled={!customerCandidate || savingCustomer}
                        className="cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingCustomer ? "Guardando..." : "Asignar cliente"}
                      </button>
                    </div>
                  </div>
                )}

                {!editingCustomer && customerChangeMessage && (
                  <p className="mt-2 rounded-md bg-green-50 px-2 py-1.5 text-[10px] font-semibold leading-snug text-green-800">
                    {customerChangeMessage}
                  </p>
                )}
              </section>

              <section className="mt-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-neutral-500">
                    Productos
                  </p>

                  <span className="text-[10px] text-neutral-400">
                    {selectedItems.reduce(
                      (acc, item) => acc + item.quantity,
                      0,
                    )}{" "}
                    ítems
                  </span>
                </div>

                <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-neutral-50">
                  {selectedItems.map((item) => {
                    const { flavors, toppings } = getItemOptions(item);

                    return (
                      <div key={item.id} className="px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-neutral-900">
                              {item.quantity}x {item.product_name}
                            </p>

                            {item.product_sku && (
                              <p className="mt-0.5 text-[9px] text-neutral-400">
                                SKU: {item.product_sku}
                              </p>
                            )}
                          </div>

                          <p className="shrink-0 text-[11px] font-black text-violet-700">
                            {formatMoney(item.total_price)}
                          </p>
                        </div>

                        <div className="mt-1 space-y-0.5 text-[10px] leading-snug text-neutral-600">
                          {flavors.length > 0 && (
                            <p>
                              <span className="font-bold">Sabores:</span>{" "}
                              {formatRepeatedNames(flavors)}
                            </p>
                          )}

                          {toppings.length > 0 && (
                            <p>
                              <span className="font-bold">Toppings:</span>{" "}
                              {formatRepeatedNames(toppings)}
                            </p>
                          )}

                          {item.notes && (
                            <p>
                              <span className="font-bold">Detalle:</span>{" "}
                              {item.notes}
                            </p>
                          )}

                          <p className="text-neutral-400">
                            Unitario: {formatMoney(item.unit_price)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {selectedOrder?.notes && (
                <section className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[10px] font-semibold leading-snug text-amber-800">
                  <span className="font-black">Nota del pedido:</span>{" "}
                  {selectedOrder.notes}
                </section>
              )}

              <section className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-3 text-neutral-600">
                    <span>Subtotal</span>
                    <span className="font-bold">
                      {formatMoney(selectedSale.subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-neutral-600">
                    <span>Descuentos</span>
                    <span className="font-bold">
                      {formatMoney(selectedSale.discount_total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-2">
                    <span className="text-[12px] font-black text-neutral-900">
                      Total
                    </span>

                    <span className="text-base font-black text-violet-700">
                      {formatMoney(selectedSale.total)}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-neutral-200 bg-white p-3">
              <button
                type="button"
                disabled
                title="Disponible en un desarrollo posterior"
                className="cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-bold text-neutral-400"
              >
                Reimprimir
              </button>

              <button
                type="button"
                disabled
                title="Disponible en un desarrollo posterior"
                className="cursor-not-allowed rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-bold text-neutral-400"
              >
                Anular
              </button>
            </footer>
          </aside>
        </div>
      )}
    </main>
  );
}
