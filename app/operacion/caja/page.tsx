"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type CashRegisterSession = {
  id: number;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  opened_by_role: string;
  opening_amount: number;
  opening_notes: string | null;
  closed_at: string | null;
  closed_by_role: string | null;
  expected_cash_amount: number | null;
  counted_cash_amount: number | null;
  cash_difference: number | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
};

type CashRegisterResponse = {
  ok: boolean;
  hasOpenSession?: boolean;
  session?: CashRegisterSession | null;
  message?: string;
};

type CashMovementType = "CASH_IN" | "CASH_OUT";

type CashMovementReason =
  | "FUND_REPLENISHMENT"
  | "AUTHORIZED_INCOME"
  | "MINOR_PURCHASE"
  | "OPERATING_EXPENSE"
  | "AUTHORIZED_WITHDRAWAL"
  | "DOCUMENTED_CORRECTION"
  | "OTHER";

type CashRegisterMovement = {
  id: number;
  cash_register_session_id: number;
  movement_type: CashMovementType;
  amount: number;
  reason: CashMovementReason;
  notes: string | null;
  created_by_role: string;
  created_at: string;
};

type CashMovementTotals = {
  cashIn: number;
  cashOut: number;
  net: number;
};

type CashMovementsResponse = {
  ok: boolean;
  hasOpenSession?: boolean;
  cashRegisterSessionId?: number | null;
  movements?: CashRegisterMovement[];
  totals?: CashMovementTotals;
  movement?: CashRegisterMovement;
  message?: string;
};

type CashClosingPreview = {
  cashRegisterSessionId: number;
  openingAmount: number;
  cashSalesAmount: number;
  cashSalesCount: number;
  cashInAmount: number;
  cashInCount: number;
  cashOutAmount: number;
  cashOutCount: number;
  expectedCashAmount: number;
  countedCashAmount: number;
  cashDifference: number;
  requiresNotes: boolean;
};

type CashClosingPreviewResponse = {
  ok: boolean;
  preview?: CashClosingPreview;
  message?: string;
};

type CashClosingResult = {
  id: number;
  status: "CLOSED";
  opening_amount: number;
  cash_sales_amount: number;
  cash_sales_count: number;
  cash_in_amount: number;
  cash_in_count: number;
  cash_out_amount: number;
  cash_out_count: number;
  expected_cash_amount: number;
  counted_cash_amount: number;
  cash_difference: number;
  closing_notes: string | null;
  closed_by_role: string;
  closed_at: string;
};

type CashClosingResponse = {
  ok: boolean;
  closing?: CashClosingResult;
  message?: string;
};

type CashClosingHistoryItem = {
  id: number;
  status: "CLOSED";
  opened_at: string;
  opened_by_role: string;
  opening_amount: number;
  opening_notes: string | null;
  closed_at: string;
  closed_by_role: string;
  expected_cash_amount: number;
  counted_cash_amount: number;
  cash_difference: number;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
};

type CashClosingHistoryResponse = {
  ok: boolean;
  closings?: CashClosingHistoryItem[];
  total?: number;
  returned?: number;
  limit?: number;
  message?: string;
};

type CashClosingDetailSummary = {
  openingAmount: number;
  cashSalesAmount: number;
  cashSalesCount: number;
  cashInAmount: number;
  cashInCount: number;
  cashOutAmount: number;
  cashOutCount: number;
  expectedCashAmount: number;
  countedCashAmount: number;
  cashDifference: number;
};

type CashClosingSaleOrder = {
  id: number;
  displayOrderCode: string;
  businessDate: string;
  dailyOrderNumber: number;
  status: string;
};

type CashClosingCashSale = {
  id: number;
  saleNumber: string;
  total: number;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  actorRole: string | null;
  confirmedAt: string;
  order: CashClosingSaleOrder | null;
};

type SaleDetailOption = {
  id: number;
  option_group_code: string;
  option_value_name: string;
  quantity: number;
};

type SaleDetailItem = {
  id: number;
  product_sku: string | null;
  product_name: string;
  quantity: number;
  list_unit_price: number | null;
  unit_price: number;
  discount_total: number;
  total_price: number;
  is_gift: boolean;
  gift_reason: string | null;
  notes: string | null;
  sale_item_options: SaleDetailOption[];
};

type SaleDetailOrder = {
  id: number;
  business_date: string | null;
  daily_order_number: number | null;
  display_order_code: string;
  status: string;
  notes: string | null;
  created_at: string | null;
};

type SaleDetailCustomer = {
  id: number;
  nombre: string | null;
  correo: string | null;
  telefono: string | null;
};

type SaleDetail = {
  id: number;
  sale_number: string | null;
  cash_register_session_id: number | null;
  channel: string;
  external_order_id: string | null;
  integration_source: string | null;
  received_at: string | null;
  customer_id: number | null;
  status: string;
  subtotal: number;
  discount_total: number;
  manual_discount_type: "percent" | "fixed" | null;
  manual_discount_value: number | null;
  manual_discount_amount: number | null;
  manual_discount_reason: string | null;
  manual_discount_notes: string | null;
  total: number;
  payment_status: string;
  payment_method: string;
  actor_role: string | null;
  confirmed_at: string | null;
  created_at: string;
  clientes: SaleDetailCustomer | null;
  orders: SaleDetailOrder[];
  sale_items: SaleDetailItem[];
};

type SaleDetailResponse = {
  ok: boolean;
  sale?: SaleDetail;
  message?: string;
};

type CashClosingDetail = {
  session: CashClosingHistoryItem;
  summary: CashClosingDetailSummary;
  movements: CashRegisterMovement[];
  cashSales: CashClosingCashSale[];
};

type CashClosingDetailResponse = {
  ok: boolean;
  detail?: CashClosingDetail;
  message?: string;
};

const CASH_IN_REASONS: Array<{
  value: CashMovementReason;
  label: string;
}> = [
  {
    value: "FUND_REPLENISHMENT",
    label: "Reposición de fondo",
  },
  {
    value: "AUTHORIZED_INCOME",
    label: "Ingreso autorizado",
  },
  {
    value: "DOCUMENTED_CORRECTION",
    label: "Corrección documentada",
  },
  {
    value: "OTHER",
    label: "Otro",
  },
];

const CASH_OUT_REASONS: Array<{
  value: CashMovementReason;
  label: string;
}> = [
  {
    value: "MINOR_PURCHASE",
    label: "Compra menor",
  },
  {
    value: "OPERATING_EXPENSE",
    label: "Gasto operativo",
  },
  {
    value: "AUTHORIZED_WITHDRAWAL",
    label: "Retiro autorizado",
  },
  {
    value: "DOCUMENTED_CORRECTION",
    label: "Corrección documentada",
  },
  {
    value: "OTHER",
    label: "Otro",
  },
];

const REASON_LABELS: Record<CashMovementReason, string> = {
  FUND_REPLENISHMENT: "Reposición de fondo",
  AUTHORIZED_INCOME: "Ingreso autorizado",
  MINOR_PURCHASE: "Compra menor",
  OPERATING_EXPENSE: "Gasto operativo",
  AUTHORIZED_WITHDRAWAL: "Retiro autorizado",
  DOCUMENTED_CORRECTION: "Corrección documentada",
  OTHER: "Otro",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  preparing: "En preparación",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

  if (normalized === "rappi" || normalized === "rapi") {
    return "Rappi";
  }

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

function getManualDiscountTypeLabel(value?: string | null) {
  if (value === "percent") return "Porcentaje";
  if (value === "fixed") return "Monto fijo";

  return value || "—";
}

function getManualDiscountReasonLabel(value?: string | null) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "courtesy") return "Cortesía comercial";
  if (normalized === "complaint") return "Reclamo cliente";
  if (normalized === "agreement") return "Convenio";
  if (normalized === "exceptional_promotion") {
    return "Promoción excepcional";
  }
  if (normalized === "service_error") return "Error en atención";
  if (normalized === "other") return "Otro";

  return value || "—";
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

function getSaleItemOptions(item: SaleDetailItem) {
  const options = Array.isArray(item.sale_item_options)
    ? item.sale_item_options
    : [];

  const flavors = options
    .filter((option) => ["flavor", "sabor"].includes(option.option_group_code))
    .map((option) => option.option_value_name)
    .filter(Boolean);

  const toppings = options
    .filter((option) =>
      ["topping", "toppings"].includes(option.option_group_code),
    )
    .map((option) => option.option_value_name)
    .filter(Boolean);

  const otherOptions = options
    .filter(
      (option) =>
        !["flavor", "sabor", "topping", "toppings"].includes(
          option.option_group_code,
        ),
    )
    .map((option) => option.option_value_name)
    .filter(Boolean);

  return {
    flavors,
    toppings,
    otherOptions,
  };
}

function getDefaultReason(movementType: CashMovementType): CashMovementReason {
  return movementType === "CASH_IN" ? "AUTHORIZED_INCOME" : "MINOR_PURCHASE";
}

export default function CashRegisterPage() {
  const [session, setSession] = useState<CashRegisterSession | null>(null);

  const [movements, setMovements] = useState<CashRegisterMovement[]>([]);
  const [movementTotals, setMovementTotals] = useState<CashMovementTotals>({
    cashIn: 0,
    cashOut: 0,
    net: 0,
  });

  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  const [movementType, setMovementType] =
    useState<CashMovementType>("CASH_OUT");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] =
    useState<CashMovementReason>("MINOR_PURCHASE");
  const [movementNotes, setMovementNotes] = useState("");
  const [showMovementForm, setShowMovementForm] = useState(false);

  const [showClosingForm, setShowClosingForm] = useState(false);
  const [countedCashAmount, setCountedCashAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [closingPreview, setClosingPreview] =
    useState<CashClosingPreview | null>(null);

  const [selectedSaleDetail, setSelectedSaleDetail] =
    useState<SaleDetail | null>(null);

  const [loadingSaleDetail, setLoadingSaleDetail] = useState(false);
  const [saleDetailError, setSaleDetailError] = useState("");

  const [completedClosing, setCompletedClosing] =
    useState<CashClosingResult | null>(null);

  const [closingHistory, setClosingHistory] = useState<
    CashClosingHistoryItem[]
  >([]);

  const [loadingClosingHistory, setLoadingClosingHistory] = useState(false);

  const [selectedClosingId, setSelectedClosingId] = useState<number | null>(
    null,
  );

  const [closingDetail, setClosingDetail] = useState<CashClosingDetail | null>(
    null,
  );

  const [loadingClosingDetail, setLoadingClosingDetail] = useState(false);
  const [closingDetailError, setClosingDetailError] = useState("");

  const [loadingClosingPreview, setLoadingClosingPreview] = useState(false);
  const [submittingClosing, setSubmittingClosing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );

  const movementReasons = useMemo(
    () => (movementType === "CASH_IN" ? CASH_IN_REASONS : CASH_OUT_REASONS),
    [movementType],
  );

  const closingDetailCashSalesTotal = useMemo(() => {
    if (!closingDetail) {
      return 0;
    }

    return closingDetail.cashSales.reduce(
      (total, sale) => total + sale.total,
      0,
    );
  }, [closingDetail]);

  const closingDetailCashSalesMatch =
    closingDetail !== null &&
    closingDetail.cashSales.length === closingDetail.summary.cashSalesCount &&
    closingDetailCashSalesTotal === closingDetail.summary.cashSalesAmount;

  const loadMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);

      const response = await fetch("/api/operacion/caja/movimientos", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as CashMovementsResponse;

      if (!response.ok || !data.ok) {
        setMovements([]);
        setMovementTotals({
          cashIn: 0,
          cashOut: 0,
          net: 0,
        });

        setMessageType("error");
        setMessage(
          data.message || "No fue posible consultar los movimientos de caja.",
        );
        return;
      }

      setMovements(data.movements ?? []);
      setMovementTotals(
        data.totals ?? {
          cashIn: 0,
          cashOut: 0,
          net: 0,
        },
      );
    } catch (error) {
      console.error("Error consultando movimientos:", error);

      setMovements([]);
      setMovementTotals({
        cashIn: 0,
        cashOut: 0,
        net: 0,
      });

      setMessageType("error");
      setMessage("Ocurrió un error al consultar los movimientos de caja.");
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  const loadClosingHistory = useCallback(async () => {
    try {
      setLoadingClosingHistory(true);

      const response = await fetch("/api/operacion/caja/cierres?limit=10", {
        cache: "no-store",
      });

      const data = (await response.json()) as CashClosingHistoryResponse;

      if (!response.ok || !data.ok) {
        setClosingHistory([]);
        return;
      }

      setClosingHistory(data.closings ?? []);
    } catch (error) {
      console.error("Error consultando historial de cierres:", error);

      setClosingHistory([]);
    } finally {
      setLoadingClosingHistory(false);
    }
  }, []);

  const loadClosingDetail = useCallback(async (closingId: number) => {
    try {
      setSelectedClosingId(closingId);
      setClosingDetail(null);
      setClosingDetailError("");
      setSelectedSaleDetail(null);
      setSaleDetailError("");
      setLoadingClosingDetail(true);

      const response = await fetch(`/api/operacion/caja/cierres/${closingId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as CashClosingDetailResponse;

      if (!response.ok || !data.ok || !data.detail) {
        setClosingDetailError(
          data.message || "No fue posible consultar el detalle del cierre.",
        );
        return;
      }

      if (data.detail.session.id !== closingId) {
        setClosingDetailError(
          "El detalle recibido no corresponde al cierre seleccionado.",
        );
        return;
      }

      setClosingDetail(data.detail);
    } catch (error) {
      console.error("Error consultando detalle del cierre:", error);

      setClosingDetailError(
        "Ocurrió un error al consultar el detalle del cierre.",
      );
    } finally {
      setLoadingClosingDetail(false);
    }
  }, []);

  const loadSaleDetail = useCallback(
    async (saleId: number, expectedCashSessionId: number) => {
      try {
        setSelectedSaleDetail(null);
        setSaleDetailError("");
        setLoadingSaleDetail(true);

        const response = await fetch(`/api/operacion/sales/${saleId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as SaleDetailResponse;

        if (!response.ok || !data.ok || !data.sale) {
          setSaleDetailError(
            data.message || "No fue posible consultar el detalle de la venta.",
          );
          return;
        }

        if (data.sale.id !== saleId) {
          setSaleDetailError(
            "El detalle recibido no corresponde a la venta seleccionada.",
          );
          return;
        }

        if (data.sale.cash_register_session_id !== expectedCashSessionId) {
          setSaleDetailError(
            "La venta no pertenece al cierre de caja seleccionado.",
          );
          return;
        }

        setSelectedSaleDetail(data.sale);
      } catch (error) {
        console.error("Error consultando detalle de venta:", error);

        setSaleDetailError(
          "Ocurrió un error al consultar el detalle de la venta.",
        );
      } finally {
        setLoadingSaleDetail(false);
      }
    },
    [],
  );

  const loadCashRegister = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as CashRegisterResponse;

      if (!response.ok || !data.ok) {
        setSession(null);
        setMovements([]);
        setMovementTotals({
          cashIn: 0,
          cashOut: 0,
          net: 0,
        });

        setMessageType("error");
        setMessage(data.message || "No fue posible consultar la caja.");
        return;
      }

      const activeSession = data.session ?? null;

      setSession(activeSession);

      if (activeSession) {
        await loadMovements();
      } else {
        setMovements([]);
        setMovementTotals({
          cashIn: 0,
          cashOut: 0,
          net: 0,
        });

        resetClosingState();
      }

      await loadClosingHistory();
    } catch (error) {
      console.error("Error consultando caja:", error);

      setSession(null);
      setMovements([]);
      setMovementTotals({
        cashIn: 0,
        cashOut: 0,
        net: 0,
      });

      setMessageType("error");
      setMessage("Ocurrió un error al consultar el estado de la caja.");
    } finally {
      setLoading(false);
    }
  }, [loadMovements, loadClosingHistory]);

  useEffect(() => {
    void loadCashRegister();
  }, [loadCashRegister]);

  function selectMovementType(type: CashMovementType) {
    if (showClosingForm || loadingClosingPreview || submittingClosing) {
      return;
    }

    setMovementType(type);
    setMovementReason(getDefaultReason(type));
    setMovementAmount("");
    setMovementNotes("");
    setMessage("");
    setShowMovementForm(true);
  }

  function closeMovementForm() {
    setShowMovementForm(false);
    setMovementAmount("");
    setMovementNotes("");
    setMovementReason(getDefaultReason(movementType));
  }

  function resetClosingState() {
    setShowClosingForm(false);
    setCountedCashAmount("");
    setClosingNotes("");
    setClosingPreview(null);
    setLoadingClosingPreview(false);
    setSubmittingClosing(false);
  }

  function startClosing() {
    closeMovementForm();
    setCountedCashAmount("");
    setClosingNotes("");
    setClosingPreview(null);
    setMessage("");
    setShowClosingForm(true);
  }

  function cancelClosing() {
    if (loadingClosingPreview || submittingClosing) {
      return;
    }

    resetClosingState();
    setMessage("");
  }

  function handleCountedCashAmountChange(value: string) {
    setCountedCashAmount(value);

    /*
     * Si el conteo cambia después de calcular el resumen,
     * la previsualización deja de ser válida.
     */
    if (closingPreview) {
      setClosingPreview(null);
    }
  }

  async function previewClosing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessageType("error");
      setMessage("No existe una caja abierta para cerrar.");
      return;
    }

    const normalizedAmount = countedCashAmount.trim();
    const parsedAmount = Number(normalizedAmount);

    if (
      normalizedAmount === "" ||
      !Number.isInteger(parsedAmount) ||
      parsedAmount < 0
    ) {
      setMessageType("error");
      setMessage(
        "El efectivo contado debe ser un número entero mayor o igual a cero.",
      );
      return;
    }

    try {
      setLoadingClosingPreview(true);
      setClosingPreview(null);
      setMessage("");

      const response = await fetch("/api/operacion/caja/cierre/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countedCashAmount: parsedAmount,
        }),
      });

      const data = (await response.json()) as CashClosingPreviewResponse;

      if (!response.ok || !data.ok || !data.preview) {
        setMessageType("error");
        setMessage(
          data.message ||
            "No fue posible calcular la previsualización del cierre.",
        );
        return;
      }

      if (data.preview.cashRegisterSessionId !== session.id) {
        setMessageType("error");
        setMessage(
          "La sesión de caja cambió durante el cálculo. Actualiza la página antes de continuar.",
        );
        return;
      }

      setClosingPreview(data.preview);

      setMessageType(data.preview.cashDifference === 0 ? "success" : "info");

      setMessage(
        data.message ||
          (data.preview.cashDifference === 0
            ? "El conteo coincide con el efectivo esperado."
            : "El conteo presenta una diferencia de caja."),
      );
    } catch (error) {
      console.error("Error calculando previsualización del cierre:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al calcular el cierre de caja.");
    } finally {
      setLoadingClosingPreview(false);
    }
  }

  async function confirmClosing() {
    if (!session) {
      setMessageType("error");
      setMessage("No existe una caja abierta para cerrar.");
      return;
    }

    if (!closingPreview) {
      setMessageType("error");
      setMessage("Debes revisar el conteo antes de confirmar el cierre.");
      return;
    }

    const normalizedNotes = closingNotes.trim();

    if (closingPreview.requiresNotes && !normalizedNotes) {
      setMessageType("error");
      setMessage(
        "Debes registrar una observación cuando exista una diferencia de caja.",
      );
      return;
    }

    try {
      setSubmittingClosing(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja/cierre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countedCashAmount: closingPreview.countedCashAmount,
          closingNotes: normalizedNotes,
        }),
      });

      const data = (await response.json()) as CashClosingResponse;

      if (!response.ok || !data.ok || !data.closing) {
        setMessageType("error");
        setMessage(data.message || "No fue posible cerrar la caja.");
        return;
      }

      const completedClosingResult = data.closing;

      resetClosingState();

      /*
       * El backend ya cerró la sesión. Se recarga el estado para confirmar
       * que no exista una sesión abierta y luego se conserva el comprobante
       * recibido desde el cierre transaccional.
       */
      await loadCashRegister();

      setCompletedClosing(completedClosingResult);

      setMessageType("success");
      setMessage(data.message || "Caja cerrada correctamente.");
    } catch (error) {
      console.error("Error confirmando cierre de caja:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al confirmar el cierre de caja.");
    } finally {
      setSubmittingClosing(false);
    }
  }

  function finishCompletedClosing() {
    setCompletedClosing(null);
    setMessage("");
    setOpeningAmount("");
    setOpeningNotes("");
  }

  function closeClosingDetail() {
    setSelectedClosingId(null);
    setClosingDetail(null);
    setClosingDetailError("");
    setLoadingClosingDetail(false);

    setSelectedSaleDetail(null);
    setSaleDetailError("");
    setLoadingSaleDetail(false);
  }

  async function openCashRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedAmount = openingAmount.trim();
    const parsedAmount = Number(normalizedAmount);

    if (
      normalizedAmount === "" ||
      !Number.isInteger(parsedAmount) ||
      parsedAmount < 0
    ) {
      setMessageType("error");
      setMessage(
        "El fondo inicial debe ser un número entero mayor o igual a cero.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          openingAmount: parsedAmount,
          openingNotes: openingNotes.trim(),
        }),
      });

      const data = (await response.json()) as CashRegisterResponse;

      if (!response.ok || !data.ok) {
        if (data.session) {
          setSession(data.session);
        }

        setMessageType("error");
        setMessage(data.message || "No fue posible abrir la caja.");
        return;
      }

      setSession(data.session ?? null);
      setOpeningAmount("");
      setOpeningNotes("");
      setCompletedClosing(null);
      setMovements([]);
      setMovementTotals({
        cashIn: 0,
        cashOut: 0,
        net: 0,
      });

      setMessageType("success");
      setMessage(data.message || "Caja abierta correctamente.");

      await loadMovements();
    } catch (error) {
      console.error("Error abriendo caja:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al abrir la caja.");
    } finally {
      setSubmitting(false);
    }
  }

  async function registerMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessageType("error");
      setMessage("Debes abrir la caja antes de registrar movimientos.");
      return;
    }

    const normalizedAmount = movementAmount.trim();
    const parsedAmount = Number(normalizedAmount);
    const normalizedNotes = movementNotes.trim();

    if (
      normalizedAmount === "" ||
      !Number.isInteger(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setMessageType("error");
      setMessage("El monto debe ser un número entero mayor que cero.");
      return;
    }

    if (movementReason === "OTHER" && !normalizedNotes) {
      setMessageType("error");
      setMessage("Debes explicar el motivo del movimiento.");
      return;
    }

    try {
      setSubmittingMovement(true);
      setMessage("");

      const response = await fetch("/api/operacion/caja/movimientos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movementType,
          amount: parsedAmount,
          reason: movementReason,
          notes: normalizedNotes,
        }),
      });

      const data = (await response.json()) as CashMovementsResponse;

      if (!response.ok || !data.ok) {
        setMessageType("error");
        setMessage(
          data.message || "No fue posible registrar el movimiento de caja.",
        );
        return;
      }

      setMovementAmount("");
      setMovementNotes("");
      setMovementReason(getDefaultReason(movementType));
      setShowMovementForm(false);

      setMessageType("success");
      setMessage(data.message || "Movimiento registrado correctamente.");

      await loadMovements();
    } catch (error) {
      console.error("Error registrando movimiento:", error);

      setMessageType("error");
      setMessage("Ocurrió un error inesperado al registrar el movimiento.");
    } finally {
      setSubmittingMovement(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F3FF] p-3">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] w-full max-w-[1600px] flex-col">
        <header className="flex shrink-0 flex-col gap-3 rounded-xl bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/operacion"
              className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-bold text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50"
            >
              ← Operación
            </Link>

            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight text-neutral-900">
                Caja
              </h1>

              <p className="text-[11px] text-neutral-500">
                Apertura, movimientos y cierre de efectivo.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void loadCashRegister()}
              disabled={
                loading ||
                loadingMovements ||
                loadingClosingHistory ||
                loadingClosingPreview ||
                submittingClosing
              }
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-bold text-neutral-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || loadingMovements ? "Actualizando..." : "Actualizar"}
            </button>

            {session && !showClosingForm && (
              <button
                type="button"
                onClick={startClosing}
                disabled={
                  loadingMovements ||
                  submittingMovement ||
                  loadingClosingPreview ||
                  submittingClosing
                }
                className="cursor-pointer rounded-lg bg-neutral-900 px-3 py-2 text-[12px] font-black text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cerrar caja
              </button>
            )}
          </div>
        </header>

        {message && (
          <div
            className={`mt-2 shrink-0 rounded-lg border px-3 py-2 text-[12px] font-semibold ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
          {loading ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-neutral-600">
                Consultando estado de la caja...
              </p>
            </section>
          ) : session ? (
            <>
              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="text-[14px] font-black text-neutral-900">
                          Caja abierta
                        </h2>

                        <span className="text-[11px] font-semibold text-neutral-400">
                          Sesión #{session.id}
                        </span>
                      </div>

                      <p className="text-[10px] text-neutral-500">
                        La sesión se encuentra disponible para registrar ventas
                        y movimientos.
                      </p>
                    </div>
                  </div>

                  <dl className="grid gap-2 sm:grid-cols-3 lg:min-w-[650px]">
                    <div className="rounded-lg bg-neutral-50 px-3 py-2">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Fondo inicial
                      </dt>

                      <dd className="mt-0.5 text-[13px] font-black text-neutral-900">
                        {formatCurrency(session.opening_amount)}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-neutral-50 px-3 py-2">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Apertura
                      </dt>

                      <dd className="mt-0.5 text-[11px] font-bold text-neutral-800">
                        {formatDateTime(session.opened_at)}
                      </dd>
                    </div>

                    <div className="rounded-lg bg-neutral-50 px-3 py-2">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Responsable
                      </dt>

                      <dd className="mt-0.5 text-[11px] font-bold capitalize text-neutral-800">
                        {session.opened_by_role}
                      </dd>
                    </div>
                  </dl>
                </div>

                {session.opening_notes && (
                  <div className="mt-3 border-t border-neutral-100 pt-3">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      Observaciones de apertura
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-[11px] text-neutral-600">
                      {session.opening_notes}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-[14px] font-black text-neutral-900">
                      Movimientos de efectivo
                    </h2>

                    <p className="text-[10px] text-neutral-500">
                      Ingresos y salidas manuales distintas de las ventas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectMovementType("CASH_IN")}
                      disabled={
                        showClosingForm ||
                        loadingClosingPreview ||
                        submittingClosing
                      }
                      className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-black text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Ingreso
                    </button>

                    <button
                      type="button"
                      onClick={() => selectMovementType("CASH_OUT")}
                      disabled={
                        showClosingForm ||
                        loadingClosingPreview ||
                        submittingClosing
                      }
                      className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-black text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      − Salida
                    </button>
                  </div>
                </div>

                <dl className="mt-3 grid overflow-hidden rounded-lg border border-neutral-200 sm:grid-cols-3">
                  <div className="border-b border-neutral-200 px-3 py-2 sm:border-b-0 sm:border-r">
                    <dt className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      Otros ingresos
                    </dt>

                    <dd className="mt-0.5 text-[13px] font-black text-emerald-700">
                      +{formatCurrency(movementTotals.cashIn)}
                    </dd>
                  </div>

                  <div className="border-b border-neutral-200 px-3 py-2 sm:border-b-0 sm:border-r">
                    <dt className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      Salidas
                    </dt>

                    <dd className="mt-0.5 text-[13px] font-black text-red-700">
                      −{formatCurrency(movementTotals.cashOut)}
                    </dd>
                  </div>

                  <div className="px-3 py-2">
                    <dt className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      Efecto neto
                    </dt>

                    <dd
                      className={`mt-0.5 text-[13px] font-black ${
                        movementTotals.net > 0
                          ? "text-emerald-700"
                          : movementTotals.net < 0
                            ? "text-red-700"
                            : "text-neutral-700"
                      }`}
                    >
                      {movementTotals.net > 0 ? "+" : ""}
                      {formatCurrency(movementTotals.net)}
                    </dd>
                  </div>
                </dl>

                {showMovementForm && (
                  <form
                    onSubmit={registerMovement}
                    className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                          Nuevo movimiento
                        </p>

                        <h3 className="mt-0.5 text-[13px] font-black text-neutral-900">
                          {movementType === "CASH_IN"
                            ? "Registrar ingreso"
                            : "Registrar salida"}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={closeMovementForm}
                        disabled={submittingMovement}
                        className="cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="movementAmount"
                          className="mb-1 block text-[10px] font-bold text-neutral-700"
                        >
                          Monto
                        </label>

                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[11px] font-semibold text-neutral-500">
                            $
                          </span>

                          <input
                            id="movementAmount"
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={movementAmount}
                            onChange={(event) =>
                              setMovementAmount(event.target.value)
                            }
                            placeholder="0"
                            required
                            className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-7 pr-3 text-[12px] text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="movementReason"
                          className="mb-1 block text-[10px] font-bold text-neutral-700"
                        >
                          Motivo
                        </label>

                        <select
                          id="movementReason"
                          value={movementReason}
                          onChange={(event) =>
                            setMovementReason(
                              event.target.value as CashMovementReason,
                            )
                          }
                          className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[12px] text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        >
                          {movementReasons.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label
                        htmlFor="movementNotes"
                        className="mb-1 block text-[10px] font-bold text-neutral-700"
                      >
                        Observaciones
                        {movementReason !== "OTHER" && (
                          <span className="ml-1 font-normal text-neutral-500">
                            opcional
                          </span>
                        )}
                      </label>

                      <textarea
                        id="movementNotes"
                        value={movementNotes}
                        onChange={(event) =>
                          setMovementNotes(event.target.value)
                        }
                        rows={2}
                        maxLength={500}
                        required={movementReason === "OTHER"}
                        placeholder={
                          movementReason === "OTHER"
                            ? "Describe obligatoriamente el motivo."
                            : "Agrega información de respaldo cuando corresponda."
                        }
                        className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                      />
                    </div>

                    <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeMovementForm}
                        disabled={submittingMovement}
                        className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={submittingMovement}
                        className={`cursor-pointer rounded-lg px-3 py-2 text-[11px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          movementType === "CASH_IN"
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {submittingMovement
                          ? "Registrando..."
                          : movementType === "CASH_IN"
                            ? "Confirmar ingreso"
                            : "Confirmar salida"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[12px] font-black text-neutral-900">
                      Historial de la sesión
                    </h3>

                    <span className="text-[10px] font-medium text-neutral-400">
                      {movements.length} movimiento
                      {movements.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {loadingMovements ? (
                    <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                      <p className="text-sm text-neutral-600">
                        Consultando movimientos...
                      </p>
                    </div>
                  ) : movements.length === 0 ? (
                    <div className="mt-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-center">
                      <p className="text-[11px] font-bold text-neutral-700">
                        No hay movimientos manuales registrados.
                      </p>

                      <p className="mt-0.5 text-[10px] text-neutral-500">
                        Las ventas en efectivo no aparecen aquí porque se
                        contabilizan automáticamente en el cierre.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
                      <div className="divide-y divide-neutral-200">
                        {movements.map((movement) => {
                          const isCashIn = movement.movement_type === "CASH_IN";

                          return (
                            <article
                              key={movement.id}
                              className="flex flex-col gap-2 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 gap-3">
                                <span
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black ${
                                    isCashIn
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {isCashIn ? "+" : "−"}
                                </span>

                                <div className="min-w-0">
                                  <p className="text-[11px] font-black text-neutral-900">
                                    {REASON_LABELS[movement.reason]}
                                  </p>

                                  <p className="mt-0.5 text-[9px] text-neutral-400">
                                    {formatDateTime(movement.created_at)}
                                    {" · "}
                                    <span className="capitalize">
                                      {movement.created_by_role}
                                    </span>
                                  </p>

                                  {movement.notes && (
                                    <p className="mt-1 whitespace-pre-wrap text-[10px] text-neutral-500">
                                      {movement.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <p
                                className={`shrink-0 text-[12px] font-black ${
                                  isCashIn ? "text-emerald-700" : "text-red-700"
                                }`}
                              >
                                {isCashIn ? "+" : "−"}
                                {formatCurrency(movement.amount)}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {showClosingForm && (
                <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <form
                    onSubmit={(event) => {
                      if (closingPreview) {
                        event.preventDefault();
                        return;
                      }

                      void previewClosing(event);
                    }}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                          {closingPreview ? "Paso 2 de 2" : "Paso 1 de 2"}
                        </p>

                        <h2 className="mt-0.5 text-[14px] font-black text-neutral-900">
                          {closingPreview
                            ? "Revisar cierre de caja"
                            : "Contar efectivo"}
                        </h2>

                        <p className="mt-0.5 text-[10px] text-neutral-500">
                          {closingPreview
                            ? "Verifica los montos antes de confirmar el cierre definitivo."
                            : "Ingresa el total físico presente en la caja, incluyendo el fondo inicial."}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={cancelClosing}
                        disabled={loadingClosingPreview || submittingClosing}
                        className="cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>

                    {!closingPreview && (
                      <div className="mt-5">
                        <label
                          htmlFor="countedCashAmount"
                          className="mb-2 block text-sm font-semibold text-neutral-800"
                        >
                          Efectivo contado
                        </label>

                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-neutral-500">
                            $
                          </span>

                          <input
                            id="countedCashAmount"
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            value={countedCashAmount}
                            onChange={(event) =>
                              handleCountedCashAmountChange(event.target.value)
                            }
                            placeholder="0"
                            required
                            autoFocus
                            disabled={
                              loadingClosingPreview || submittingClosing
                            }
                            className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-8 pr-4 text-sm text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
                          />
                        </div>

                        <p className="mt-2 text-xs text-neutral-500">
                          Cuenta billetes y monedas antes de consultar el
                          efectivo esperado por el sistema.
                        </p>
                      </div>
                    )}

                    {!closingPreview && (
                      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          El efectivo esperado permanece oculto
                        </p>

                        <p className="mt-1 text-xs text-amber-800">
                          Esto evita que el conteo físico sea ajustado para
                          coincidir artificialmente con el sistema.
                        </p>
                      </div>
                    )}

                    {closingPreview && (
                      <div className="mt-5 space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl border border-neutral-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Fondo inicial
                            </p>

                            <p className="mt-2 text-lg font-bold text-neutral-950">
                              {formatCurrency(closingPreview.openingAmount)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-neutral-200 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                              Ventas en efectivo
                            </p>

                            <p className="mt-2 text-lg font-bold text-neutral-950">
                              {formatCurrency(closingPreview.cashSalesAmount)}
                            </p>

                            <p className="mt-0.5 text-[10px] text-neutral-500">
                              {closingPreview.cashSalesCount} venta
                              {closingPreview.cashSalesCount === 1 ? "" : "s"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                              Otros ingresos
                            </p>

                            <p className="mt-2 text-lg font-bold text-emerald-900">
                              +{formatCurrency(closingPreview.cashInAmount)}
                            </p>

                            <p className="mt-1 text-xs text-emerald-700">
                              {closingPreview.cashInCount} movimiento
                              {closingPreview.cashInCount === 1 ? "" : "s"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                              Salidas
                            </p>

                            <p className="mt-2 text-lg font-bold text-red-900">
                              −{formatCurrency(closingPreview.cashOutAmount)}
                            </p>

                            <p className="mt-1 text-xs text-red-700">
                              {closingPreview.cashOutCount} movimiento
                              {closingPreview.cashOutCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                              Efectivo esperado
                            </p>

                            <p className="mt-2 text-2xl font-bold text-violet-950">
                              {formatCurrency(
                                closingPreview.expectedCashAmount,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                              Efectivo contado
                            </p>

                            <p className="mt-2 text-2xl font-bold text-neutral-950">
                              {formatCurrency(closingPreview.countedCashAmount)}
                            </p>
                          </div>

                          <div
                            className={`rounded-2xl border p-5 ${
                              closingPreview.cashDifference === 0
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-red-200 bg-red-50"
                            }`}
                          >
                            <p
                              className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                                closingPreview.cashDifference === 0
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              Diferencia
                            </p>

                            <p
                              className={`mt-2 text-2xl font-bold ${
                                closingPreview.cashDifference === 0
                                  ? "text-emerald-900"
                                  : "text-red-900"
                              }`}
                            >
                              {closingPreview.cashDifference > 0 ? "+" : ""}
                              {formatCurrency(closingPreview.cashDifference)}
                            </p>

                            <p
                              className={`mt-1 text-xs ${
                                closingPreview.cashDifference === 0
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {closingPreview.cashDifference === 0
                                ? "El conteo coincide con el sistema."
                                : closingPreview.cashDifference > 0
                                  ? "Existe un sobrante de efectivo."
                                  : "Existe un faltante de efectivo."}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="closingNotes"
                            className="mb-2 block text-sm font-semibold text-neutral-800"
                          >
                            Observaciones del cierre
                            {!closingPreview.requiresNotes && (
                              <span className="ml-1 font-normal text-neutral-500">
                                opcional
                              </span>
                            )}
                          </label>

                          <textarea
                            id="closingNotes"
                            value={closingNotes}
                            onChange={(event) =>
                              setClosingNotes(event.target.value)
                            }
                            rows={3}
                            maxLength={500}
                            required={closingPreview.requiresNotes}
                            disabled={submittingClosing}
                            placeholder={
                              closingPreview.requiresNotes
                                ? "Explica obligatoriamente la causa conocida o probable de la diferencia."
                                : "Agrega información relevante del cierre cuando corresponda."
                            }
                            className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
                          />

                          {closingPreview.requiresNotes && (
                            <p className="mt-2 text-xs font-medium text-red-700">
                              La observación es obligatoria porque existe una
                              diferencia de caja.
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm font-semibold text-amber-900">
                            Confirmación definitiva
                          </p>

                          <p className="mt-1 text-xs text-amber-800">
                            Al confirmar, la sesión quedará cerrada y no será
                            posible registrar nuevas ventas ni movimientos en
                            esta caja.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      {closingPreview ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setClosingPreview(null);
                              setClosingNotes("");
                              setMessage("");
                            }}
                            disabled={submittingClosing}
                            className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Volver a contar
                          </button>

                          <button
                            type="button"
                            onClick={() => void confirmClosing()}
                            disabled={submittingClosing}
                            className="cursor-pointer rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {submittingClosing
                              ? "Cerrando caja..."
                              : "Confirmar cierre de caja"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={cancelClosing}
                            disabled={
                              loadingClosingPreview || submittingClosing
                            }
                            className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={
                              loadingClosingPreview || submittingClosing
                            }
                            className="cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingClosingPreview
                              ? "Calculando cierre..."
                              : "Revisar conteo"}
                          </button>
                        </>
                      )}
                    </div>
                  </form>
                </section>
              )}
            </>
          ) : completedClosing ? (
            <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                    Caja cerrada
                  </span>

                  <h2 className="mt-3 text-xl font-bold text-neutral-950">
                    Comprobante de cierre
                  </h2>

                  <p className="mt-1 text-sm text-neutral-600">
                    Revisa el resultado y prepara el respaldo físico del
                    efectivo.
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Sesión
                  </p>

                  <p className="mt-1 text-sm font-bold text-neutral-950">
                    #{completedClosing.id}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Fondo inicial
                  </dt>

                  <dd className="mt-2 text-lg font-bold text-neutral-950">
                    {formatCurrency(completedClosing.opening_amount)}
                  </dd>
                </div>

                <div className="rounded-2xl bg-neutral-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Ventas en efectivo
                  </dt>

                  <dd className="mt-2 text-lg font-bold text-neutral-950">
                    {formatCurrency(completedClosing.cash_sales_amount)}
                  </dd>

                  <p className="mt-0.5 text-[10px] text-neutral-500">
                    {completedClosing.cash_sales_count} venta
                    {completedClosing.cash_sales_count === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Otros ingresos
                  </dt>

                  <dd className="mt-2 text-lg font-bold text-emerald-900">
                    +{formatCurrency(completedClosing.cash_in_amount)}
                  </dd>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                    Salidas
                  </dt>

                  <dd className="mt-2 text-lg font-bold text-red-900">
                    −{formatCurrency(completedClosing.cash_out_amount)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                    Efectivo esperado
                  </p>

                  <p className="mt-2 text-2xl font-bold text-violet-950">
                    {formatCurrency(completedClosing.expected_cash_amount)}
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Efectivo contado
                  </p>

                  <p className="mt-2 text-2xl font-bold text-neutral-950">
                    {formatCurrency(completedClosing.counted_cash_amount)}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    completedClosing.cash_difference === 0
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                      completedClosing.cash_difference === 0
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    Diferencia
                  </p>

                  <p
                    className={`mt-2 text-2xl font-bold ${
                      completedClosing.cash_difference === 0
                        ? "text-emerald-900"
                        : "text-red-900"
                    }`}
                  >
                    {completedClosing.cash_difference > 0 ? "+" : ""}
                    {formatCurrency(completedClosing.cash_difference)}
                  </p>

                  <p
                    className={`mt-1 text-xs ${
                      completedClosing.cash_difference === 0
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {completedClosing.cash_difference === 0
                      ? "Cierre sin diferencias."
                      : completedClosing.cash_difference > 0
                        ? "Cierre con sobrante."
                        : "Cierre con faltante."}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Efectivo para respaldar
                </p>

                <p className="mt-2 text-3xl font-bold text-violet-950">
                  {formatCurrency(completedClosing.counted_cash_amount)}
                </p>

                <p className="mt-2 text-sm text-violet-800">
                  Este monto corresponde al efectivo físico declarado al cerrar
                  la sesión y debe quedar asociado al comprobante o sobre de
                  caja.
                </p>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Fecha de cierre
                  </dt>

                  <dd className="mt-2 text-sm font-semibold text-neutral-900">
                    {formatDateTime(completedClosing.closed_at)}
                  </dd>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Responsable
                  </dt>

                  <dd className="mt-2 text-sm font-semibold capitalize text-neutral-900">
                    {completedClosing.closed_by_role}
                  </dd>
                </div>
              </dl>

              {completedClosing.closing_notes && (
                <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Observaciones del cierre
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
                    {completedClosing.closing_notes}
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Antes de finalizar
                </p>

                <p className="mt-1 text-xs text-amber-800">
                  Confirma que el efectivo haya sido retirado o resguardado
                  según el procedimiento operativo de Nook.
                </p>
              </div>

              <button
                type="button"
                onClick={finishCompletedClosing}
                className="mt-5 w-full cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Finalizar y volver a apertura
              </button>
            </section>
          ) : (
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div>
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                  Caja cerrada
                </span>

                <h2 className="mt-3 text-xl font-bold text-neutral-950">
                  Abrir caja
                </h2>

                <p className="mt-1 text-sm text-neutral-600">
                  Registra el fondo inicial antes de comenzar la operación.
                </p>
              </div>

              <form
                onSubmit={openCashRegister}
                className="mt-6 flex flex-col gap-5"
              >
                <div>
                  <label
                    htmlFor="openingAmount"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Fondo inicial
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-neutral-500">
                      $
                    </span>

                    <input
                      id="openingAmount"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={openingAmount}
                      onChange={(event) => setOpeningAmount(event.target.value)}
                      placeholder="0"
                      required
                      className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-8 pr-4 text-sm text-neutral-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <p className="mt-2 text-xs text-neutral-500">
                    Ingresa el efectivo físico disponible al iniciar la jornada.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="openingNotes"
                    className="mb-2 block text-sm font-semibold text-neutral-800"
                  >
                    Observaciones
                    <span className="ml-1 font-normal text-neutral-500">
                      opcional
                    </span>
                  </label>

                  <textarea
                    id="openingNotes"
                    value={openingNotes}
                    onChange={(event) => setOpeningNotes(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Ejemplo: fondo inicial entregado por administración."
                    className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Abriendo caja..." : "Abrir caja"}
                </button>
              </form>
            </section>
          )}
        </div>

        {!loading && (
          <>
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                    Auditoría
                  </p>

                  <h2 className="mt-0.5 text-lg font-black text-neutral-900">
                    Últimos cierres
                  </h2>

                  <p className="text-[11px] text-neutral-500">
                    Consulta los últimos cierres registrados.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-neutral-500">
                    {closingHistory.length} registro
                    {closingHistory.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {loadingClosingHistory ? (
                <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-sm text-neutral-600">
                    Consultando historial...
                  </p>
                </div>
              ) : closingHistory.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
                  <p className="text-[11px] font-bold text-neutral-700">
                    Todavía no existen cierres registrados.
                  </p>

                  <p className="mt-0.5 text-[10px] text-neutral-500">
                    Los cierres aparecerán aquí una vez finalizada una sesión de
                    caja.
                  </p>
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                          Sesión
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                          Cierre
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                          Responsable
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                          Esperado
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                          Contado
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                          Diferencia
                        </th>

                        <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                          Detalle
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {closingHistory.map((item) => (
                        <tr
                          key={item.id}
                          className={`border-t border-neutral-200 ${
                            selectedClosingId === item.id
                              ? "bg-violet-50"
                              : "bg-white"
                          }`}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-semibold text-neutral-950">
                            #{item.id}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                            {formatDateTime(item.closed_at)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 capitalize text-neutral-700">
                            {item.closed_by_role}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                            {formatCurrency(item.expected_cash_amount)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                            {formatCurrency(item.counted_cash_amount)}
                          </td>

                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                              item.cash_difference === 0
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {item.cash_difference > 0 ? "+" : ""}
                            {formatCurrency(item.cash_difference)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void loadClosingDetail(item.id)}
                              disabled={
                                loadingClosingDetail &&
                                selectedClosingId === item.id
                              }
                              className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {loadingClosingDetail &&
                              selectedClosingId === item.id
                                ? "Consultando..."
                                : selectedClosingId === item.id && closingDetail
                                  ? "Seleccionado"
                                  : "Ver detalle"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {selectedClosingId !== null && (
              <section className="rounded-xl border border-violet-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                      Detalle de auditoría
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-neutral-950">
                      Cierre de sesión #{selectedClosingId}
                    </h2>

                    <p className="mt-1 text-sm text-neutral-600">
                      Revisa el resumen financiero y los movimientos asociados a
                      esta sesión.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeClosingDetail}
                    className="cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Cerrar detalle
                  </button>
                </div>

                {loadingClosingDetail ? (
                  <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-sm text-neutral-600">
                      Consultando detalle del cierre...
                    </p>
                  </div>
                ) : closingDetailError ? (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-semibold text-red-800">
                      No fue posible cargar el detalle
                    </p>

                    <p className="mt-1 text-sm text-red-700">
                      {closingDetailError}
                    </p>

                    <button
                      type="button"
                      onClick={() => void loadClosingDetail(selectedClosingId)}
                      className="mt-4 cursor-pointer rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : closingDetail ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Fondo inicial
                        </p>

                        <p className="mt-2 text-lg font-bold text-neutral-950">
                          {formatCurrency(closingDetail.summary.openingAmount)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-neutral-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Ventas en efectivo
                        </p>

                        <p className="mt-2 text-lg font-bold text-neutral-950">
                          {formatCurrency(
                            closingDetail.summary.cashSalesAmount,
                          )}
                        </p>

                        <p className="mt-0.5 text-[10px] text-neutral-500">
                          {closingDetail.summary.cashSalesCount} venta
                          {closingDetail.summary.cashSalesCount === 1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Otros ingresos
                        </p>

                        <p className="mt-2 text-lg font-bold text-emerald-900">
                          +{formatCurrency(closingDetail.summary.cashInAmount)}
                        </p>

                        <p className="mt-1 text-xs text-emerald-700">
                          {closingDetail.summary.cashInCount} movimiento
                          {closingDetail.summary.cashInCount === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                          Salidas
                        </p>

                        <p className="mt-2 text-lg font-bold text-red-900">
                          −{formatCurrency(closingDetail.summary.cashOutAmount)}
                        </p>

                        <p className="mt-1 text-xs text-red-700">
                          {closingDetail.summary.cashOutCount} movimiento
                          {closingDetail.summary.cashOutCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                          Efectivo esperado
                        </p>

                        <p className="mt-2 text-2xl font-bold text-violet-950">
                          {formatCurrency(
                            closingDetail.summary.expectedCashAmount,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                          Efectivo contado
                        </p>

                        <p className="mt-2 text-2xl font-bold text-neutral-950">
                          {formatCurrency(
                            closingDetail.summary.countedCashAmount,
                          )}
                        </p>
                      </div>

                      <div
                        className={`rounded-2xl border p-5 ${
                          closingDetail.summary.cashDifference === 0
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                            closingDetail.summary.cashDifference === 0
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          Diferencia
                        </p>

                        <p
                          className={`mt-2 text-2xl font-bold ${
                            closingDetail.summary.cashDifference === 0
                              ? "text-emerald-900"
                              : "text-red-900"
                          }`}
                        >
                          {closingDetail.summary.cashDifference > 0 ? "+" : ""}
                          {formatCurrency(closingDetail.summary.cashDifference)}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            closingDetail.summary.cashDifference === 0
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {closingDetail.summary.cashDifference === 0
                            ? "Cierre sin diferencias."
                            : closingDetail.summary.cashDifference > 0
                              ? "Cierre con sobrante."
                              : "Cierre con faltante."}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Apertura
                        </p>

                        <p className="mt-2 text-sm font-semibold text-neutral-900">
                          {formatDateTime(closingDetail.session.opened_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Responsable apertura
                        </p>

                        <p className="mt-2 text-sm font-semibold capitalize text-neutral-900">
                          {closingDetail.session.opened_by_role}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Cierre
                        </p>

                        <p className="mt-2 text-sm font-semibold text-neutral-900">
                          {formatDateTime(closingDetail.session.closed_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Responsable cierre
                        </p>

                        <p className="mt-2 text-sm font-semibold capitalize text-neutral-900">
                          {closingDetail.session.closed_by_role}
                        </p>
                      </div>
                    </div>

                    {(closingDetail.session.opening_notes ||
                      closingDetail.session.closing_notes) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Observaciones de apertura
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
                            {closingDetail.session.opening_notes ||
                              "Sin observaciones."}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Observaciones de cierre
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">
                            {closingDetail.session.closing_notes ||
                              "Sin observaciones."}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                            Trazabilidad
                          </p>

                          <h3 className="mt-1 text-lg font-bold text-neutral-950">
                            Ventas en efectivo
                          </h3>

                          <p className="mt-1 text-sm text-neutral-600">
                            Ventas pagadas en efectivo y asociadas directamente
                            a esta sesión de caja.
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-2 sm:items-end">
                          <span className="text-xs font-medium text-neutral-500">
                            {closingDetail.cashSales.length} venta
                            {closingDetail.cashSales.length === 1 ? "" : "s"}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              closingDetailCashSalesMatch
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {closingDetailCashSalesMatch
                              ? "Total validado"
                              : "Inconsistencia detectada"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Total listado
                          </p>

                          <p className="mt-2 text-xl font-bold text-neutral-950">
                            {formatCurrency(closingDetailCashSalesTotal)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                            Total del cierre
                          </p>

                          <p className="mt-2 text-xl font-bold text-violet-950">
                            {formatCurrency(
                              closingDetail.summary.cashSalesAmount,
                            )}
                          </p>
                        </div>
                      </div>

                      {closingDetail.cashSales.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
                          <p className="text-[11px] font-bold text-neutral-700">
                            No existen ventas en efectivo asociadas.
                          </p>

                          <p className="mt-0.5 text-[10px] text-neutral-500">
                            Esta sesión no registró ventas confirmadas y pagadas
                            mediante efectivo.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200">
                          <table className="min-w-full text-sm">
                            <thead className="bg-neutral-50">
                              <tr>
                                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                                  Pedido
                                </th>

                                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                                  Fecha
                                </th>

                                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                                  Responsable
                                </th>

                                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-neutral-600">
                                  Estado
                                </th>

                                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                                  Monto
                                </th>

                                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-600">
                                  Acción
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {closingDetail.cashSales.map((sale) => (
                                <tr
                                  key={sale.id}
                                  className="border-t border-neutral-200 bg-white"
                                >
                                  <td className="whitespace-nowrap px-4 py-3">
                                    <p className="text-[11px] font-black text-neutral-900">
                                      {sale.order?.displayOrderCode ||
                                        `Venta #${sale.id}`}
                                    </p>

                                    <p className="mt-1 max-w-[220px] truncate text-xs text-neutral-500">
                                      {sale.saleNumber}
                                    </p>
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 text-neutral-700">
                                    {formatDateTime(sale.confirmedAt)}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 capitalize text-neutral-700">
                                    {sale.actorRole || "Sin registro"}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3">
                                    <span
                                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                        sale.order?.status === "delivered"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : sale.order?.status === "cancelled"
                                            ? "bg-red-100 text-red-800"
                                            : sale.order?.status === "ready"
                                              ? "bg-blue-100 text-blue-800"
                                              : sale.order?.status ===
                                                  "preparing"
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-neutral-100 text-neutral-700"
                                      }`}
                                    >
                                      {sale.order
                                        ? ORDER_STATUS_LABELS[
                                            sale.order.status
                                          ] || sale.order.status
                                        : "Sin pedido"}
                                    </span>
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold text-neutral-950">
                                    {formatCurrency(sale.total)}
                                  </td>

                                  <td className="whitespace-nowrap px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void loadSaleDetail(
                                          sale.id,
                                          closingDetail.session.id,
                                        )
                                      }
                                      disabled={loadingSaleDetail}
                                      className="cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {loadingSaleDetail
                                        ? "Consultando..."
                                        : "Ver venta"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                            Trazabilidad
                          </p>

                          <h3 className="mt-1 text-lg font-bold text-neutral-950">
                            Movimientos manuales
                          </h3>
                        </div>

                        <span className="text-xs font-medium text-neutral-500">
                          {closingDetail.movements.length} movimiento
                          {closingDetail.movements.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {closingDetail.movements.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
                          <p className="text-[11px] font-bold text-neutral-700">
                            No existen movimientos manuales asociados.
                          </p>

                          <p className="mt-0.5 text-[10px] text-neutral-500">
                            El cierre solo considera el fondo inicial y las
                            ventas registradas en efectivo.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
                          <div className="divide-y divide-neutral-200">
                            {closingDetail.movements.map((movement) => {
                              const isCashIn =
                                movement.movement_type === "CASH_IN";

                              return (
                                <article
                                  key={movement.id}
                                  className="flex flex-col gap-2 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex min-w-0 gap-3">
                                    <span
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-black ${
                                        isCashIn
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {isCashIn ? "+" : "−"}
                                    </span>

                                    <div className="min-w-0">
                                      <p className="text-[11px] font-black text-neutral-900">
                                        {REASON_LABELS[movement.reason]}
                                      </p>

                                      <p className="mt-0.5 text-[10px] text-neutral-500">
                                        {formatDateTime(movement.created_at)}
                                        {" · "}
                                        <span className="capitalize">
                                          {movement.created_by_role}
                                        </span>
                                      </p>

                                      {movement.notes && (
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
                                          {movement.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <p
                                    className={`shrink-0 text-[12px] font-black ${
                                      isCashIn
                                        ? "text-emerald-700"
                                        : "text-red-700"
                                    }`}
                                  >
                                    {isCashIn ? "+" : "−"}
                                    {formatCurrency(movement.amount)}
                                  </p>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            )}
          </>
        )}
      </div>
      {(selectedSaleDetail || loadingSaleDetail || saleDetailError) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
          <button
            type="button"
            aria-label="Cerrar detalle de venta"
            onClick={() => {
              setSelectedSaleDetail(null);
              setSaleDetailError("");
              setLoadingSaleDetail(false);
            }}
            className="absolute inset-0 cursor-default"
          />

          <aside className="relative z-10 flex h-full w-full max-w-[460px] flex-col border-l border-neutral-200 bg-white shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-violet-600">
                  Trazabilidad de caja
                </p>

                <h2 className="mt-0.5 text-lg font-black leading-tight text-neutral-900">
                  {selectedSaleDetail?.orders?.[0]?.display_order_code ||
                    selectedSaleDetail?.sale_number ||
                    (selectedSaleDetail
                      ? `Venta #${selectedSaleDetail.id}`
                      : "Detalle de venta")}
                </h2>

                {selectedSaleDetail && (
                  <p className="mt-1 text-[10px] font-semibold text-neutral-500">
                    Venta #{selectedSaleDetail.id}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedSaleDetail(null);
                  setSaleDetailError("");
                  setLoadingSaleDetail(false);
                }}
                className="shrink-0 cursor-pointer rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-neutral-600 transition hover:bg-neutral-50"
              >
                Cerrar
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loadingSaleDetail ? (
                <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
                  Consultando venta...
                </div>
              ) : saleDetailError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">
                    No fue posible cargar la venta
                  </p>

                  <p className="mt-1 text-sm text-red-700">{saleDetailError}</p>
                </div>
              ) : selectedSaleDetail ? (
                <>
                  <section className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-neutral-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Fecha y hora
                      </p>

                      <p className="mt-0.5 text-[11px] font-bold text-neutral-800">
                        {formatDateTime(
                          selectedSaleDetail.confirmed_at ||
                            selectedSaleDetail.created_at,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg bg-neutral-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Canal
                      </p>

                      <p className="mt-0.5 text-[11px] font-bold text-neutral-800">
                        {getChannelLabel(selectedSaleDetail.channel)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-neutral-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Medio de pago
                      </p>

                      <p className="mt-0.5 text-[11px] font-bold text-neutral-800">
                        {getPaymentMethodLabel(
                          selectedSaleDetail.payment_method,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg bg-neutral-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                        Operador
                      </p>

                      <p className="mt-0.5 capitalize text-[11px] font-bold text-neutral-800">
                        {selectedSaleDetail.actor_role || "—"}
                      </p>
                    </div>
                  </section>

                  <section className="mt-3 rounded-lg border border-neutral-200 px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                      Cliente
                    </p>

                    <p className="mt-0.5 text-[12px] font-black text-neutral-900">
                      {selectedSaleDetail.clientes?.nombre || "Mostrador"}
                    </p>

                    {selectedSaleDetail.clientes?.telefono && (
                      <p className="mt-1 text-[10px] text-neutral-500">
                        {selectedSaleDetail.clientes.telefono}
                      </p>
                    )}

                    {selectedSaleDetail.clientes?.correo && (
                      <p className="mt-0.5 break-all text-[10px] text-neutral-500">
                        {selectedSaleDetail.clientes.correo}
                      </p>
                    )}
                  </section>

                  <section className="mt-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-neutral-500">
                        Productos
                      </p>

                      <span className="text-[10px] text-neutral-400">
                        {selectedSaleDetail.sale_items.reduce(
                          (total, item) => total + item.quantity,
                          0,
                        )}{" "}
                        ítems
                      </span>
                    </div>

                    <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-neutral-50">
                      {selectedSaleDetail.sale_items.map((item) => {
                        const { flavors, toppings, otherOptions } =
                          getSaleItemOptions(item);

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
                                {formatCurrency(item.total_price)}
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

                              {otherOptions.length > 0 && (
                                <p>
                                  <span className="font-bold">Opciones:</span>{" "}
                                  {formatRepeatedNames(otherOptions)}
                                </p>
                              )}

                              {item.is_gift && (
                                <p className="font-semibold text-amber-700">
                                  Regalo
                                  {item.gift_reason
                                    ? `: ${item.gift_reason}`
                                    : ""}
                                </p>
                              )}

                              {item.notes && (
                                <p>
                                  <span className="font-bold">Detalle:</span>{" "}
                                  {item.notes}
                                </p>
                              )}

                              <p className="text-neutral-400">
                                Unitario: {formatCurrency(item.unit_price)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {selectedSaleDetail.orders?.[0]?.notes && (
                    <section className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[10px] font-semibold leading-snug text-amber-800">
                      <span className="font-black">Nota del pedido:</span>{" "}
                      {selectedSaleDetail.orders[0].notes}
                    </section>
                  )}

                  {Number(selectedSaleDetail.manual_discount_amount || 0) >
                    0 && (
                    <section className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                          Descuento manual
                        </p>

                        <span className="text-[12px] font-black text-amber-800">
                          -
                          {formatCurrency(
                            Number(selectedSaleDetail.manual_discount_amount),
                          )}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <p className="font-bold uppercase tracking-wide text-amber-600">
                            Tipo
                          </p>

                          <p className="mt-0.5 font-bold text-amber-900">
                            {getManualDiscountTypeLabel(
                              selectedSaleDetail.manual_discount_type,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="font-bold uppercase tracking-wide text-amber-600">
                            Motivo
                          </p>

                          <p className="mt-0.5 font-bold text-amber-900">
                            {getManualDiscountReasonLabel(
                              selectedSaleDetail.manual_discount_reason,
                            )}
                          </p>
                        </div>
                      </div>

                      {selectedSaleDetail.manual_discount_notes && (
                        <p className="mt-2 whitespace-pre-wrap text-[10px] font-semibold text-amber-900">
                          {selectedSaleDetail.manual_discount_notes}
                        </p>
                      )}
                    </section>
                  )}

                  <section className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between gap-3 text-neutral-600">
                        <span>Subtotal</span>

                        <span className="font-bold">
                          {formatCurrency(selectedSaleDetail.subtotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-neutral-600">
                        <span>Descuentos</span>

                        <span className="font-bold">
                          -{formatCurrency(selectedSaleDetail.discount_total)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-2">
                        <span className="text-[12px] font-black text-neutral-900">
                          Total
                        </span>

                        <span className="text-base font-black text-violet-700">
                          {formatCurrency(selectedSaleDetail.total)}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
