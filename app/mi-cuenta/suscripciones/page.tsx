"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabase";
import ClienteLogoutButton from "../components/ClienteLogoutButton";


type TemplateInfo = {
  id: number;
  name: string;
  billing_period: string | null;
  pots_per_month: number | null;
  toppings_per_month: number | null;
  wafer_packs_per_month: number | null;
  cookie_packs_per_month: number | null;
  pots_per_cycle: number | null;
  toppings_per_cycle: number | null;
  wafer_packs_per_cycle: number | null;
  cookie_packs_per_cycle: number | null;
  duration_months: number | null;
};

type PendingClaimRaw = {
  id: number;
  source: string;
  status: string;
  claim_code: string | null;
  assigned_cliente_id: number | null;
  template_id: number | null;
};

type SubscriptionRaw = {
  id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  next_cycle_date: string | null;
  created_at: string | null;
  activated_at: string | null;
  template_id: number | null;
};

type SubscriptionConsumptionRaw = {
  id: number;
  subscription_id: number;
  cycle_number: number;
  cycle_start_date: string | null;
  cycle_end_date: string | null;
  potes: number | null;
  toppings: number | null;
  barquillos: number | null;
  galletas: number | null;
  created_at: string | null;
};

type PendingClaim = PendingClaimRaw & {
  template: TemplateInfo | null;
};

type Subscription = SubscriptionRaw & {
  template: TemplateInfo | null;
};

type SubscriptionCardData = {
  id: number;
  name: string;
  billingPeriodLabel: string;
  startDate: string | null;
  endDate: string | null;
  nextCycleDate: string | null;
  currentCycleNumber: number;
  currentCycleStart: string | null;
  currentCycleEnd: string | null;
  included: {
    potes: number;
    toppings: number;
    barquillos: number;
    galletas: number;
  };
  consumed: {
    potes: number;
    toppings: number;
    barquillos: number;
    galletas: number;
  };
  available: {
    potes: number;
    toppings: number;
    barquillos: number;
    galletas: number;
  };
  isActive: boolean;
};

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "-";
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CL");
}

function formatearPeriodicidad(periodo?: string | null) {
  if (!periodo) return "-";

  const map: Record<string, string> = {
    mensual: "Mensual",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
  };

  return map[periodo] || periodo;
}

function leerClienteSesionDesdeStorage(): { id: number } | null {
  const candidates = ["clienteActual", "cliente", "clienteId", "cliente_id"];

  for (const key of candidates) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    if (!Number.isNaN(Number(raw))) {
      return { id: Number(raw) };
    }

    try {
      const parsed = JSON.parse(raw);

      if (parsed?.id && !Number.isNaN(Number(parsed.id))) {
        return { id: Number(parsed.id) };
      }

      if (parsed?.clienteId && !Number.isNaN(Number(parsed.clienteId))) {
        return { id: Number(parsed.clienteId) };
      }

      if (parsed?.cliente?.id && !Number.isNaN(Number(parsed.cliente.id))) {
        return { id: Number(parsed.cliente.id) };
      }
    } catch {
      // sigue buscando
    }
  }

  return null;
}

function toDate(fecha?: string | null) {
  if (!fecha) return null;
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(fecha: Date | null) {
  if (!fecha) return null;
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clampNonNegative(value: number) {
  return Math.max(0, value);
}

function calcularCicloActual(
  subscription: Subscription,
  consumptions: SubscriptionConsumptionRaw[],
  today: Date
) {
  const consumoDelCicloActual = consumptions.find((item) => {
    const start = toDate(item.cycle_start_date);
    const end = toDate(item.cycle_end_date);

    if (!start || !end) return false;

    const todayNoTime = new Date(today);
    todayNoTime.setHours(0, 0, 0, 0);

    const startNoTime = new Date(start);
    startNoTime.setHours(0, 0, 0, 0);

    const endNoTime = new Date(end);
    endNoTime.setHours(0, 0, 0, 0);

    return todayNoTime >= startNoTime && todayNoTime <= endNoTime;
  });

  if (consumoDelCicloActual) {
    return {
      cycleNumber: consumoDelCicloActual.cycle_number || 1,
      cycleStart: consumoDelCicloActual.cycle_start_date,
      cycleEnd: consumoDelCicloActual.cycle_end_date,
    };
  }

  const startDate = toDate(subscription.start_date);
  if (!startDate) {
    return {
      cycleNumber: 1,
      cycleStart: subscription.start_date,
      cycleEnd: subscription.next_cycle_date
        ? toIsoDate(addDays(toDate(subscription.next_cycle_date)!, -1))
        : null,
    };
  }

  const nextCycleDate = toDate(subscription.next_cycle_date);

  if (nextCycleDate) {
    let cycleStart = new Date(startDate);
    let cycleNumber = 1;
    let guard = 0;

    while (guard < 120) {
      const nextStart = addMonths(cycleStart, 1);

      if (today < nextStart) {
        return {
          cycleNumber,
          cycleStart: toIsoDate(cycleStart),
          cycleEnd: toIsoDate(addDays(nextStart, -1)),
        };
      }

      cycleStart = nextStart;
      cycleNumber += 1;
      guard += 1;
    }
  }

  let cycleStart = new Date(startDate);
  let cycleNumber = 1;
  let guard = 0;

  while (guard < 120) {
    const nextStart = addMonths(cycleStart, 1);

    if (today < nextStart) {
      return {
        cycleNumber,
        cycleStart: toIsoDate(cycleStart),
        cycleEnd: toIsoDate(addDays(nextStart, -1)),
      };
    }

    cycleStart = nextStart;
    cycleNumber += 1;
    guard += 1;
  }

  return {
    cycleNumber: 1,
    cycleStart: subscription.start_date,
    cycleEnd: subscription.next_cycle_date
      ? toIsoDate(addDays(toDate(subscription.next_cycle_date)!, -1))
      : null,
  };
}

function TarjetaDisponibilidad({
  label,
  available,
  consumed,
  included,
}: {
  label: string;
  available: number;
  consumed: number;
  included: number;
}) {
  return (
    <div className="rounded-[18px] border border-[#E7C8F2] bg-white p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7A58A6]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[#111111]">{available}</p>
      <p className="mt-1 text-sm text-neutral-600">
        Disponible
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        Consumido: {consumed} · Incluye: {included}
      </p>
    </div>
  );
}

function TarjetaSuscripcionCompacta({
  subscription,
}: {
  subscription: SubscriptionCardData;
}) {
  return (
    <div className="rounded-[24px] border border-[#E7C8F2] bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xl font-bold text-[#4C00F7]">{subscription.name}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-[#D9B1F0] bg-[#FCF8FF] px-3 py-1 text-xs font-semibold text-[#4C00F7]">
              {subscription.billingPeriodLabel}
            </span>

            {subscription.isActive && (
              <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                Vigente
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-[#E7C8F2] bg-[#FCF8FF] px-4 py-3 text-sm text-neutral-700">
          <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
            Ciclo actual
          </p>
          <p className="mt-1 font-semibold text-[#111111]">
            {subscription.currentCycleNumber}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-[#E7C8F2] bg-[#FCF8FF] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
            Vigencia
          </p>
          <p className="mt-2 text-sm font-semibold text-[#111111]">
            {formatearFecha(subscription.startDate)} al {formatearFecha(subscription.endDate)}
          </p>
        </div>

        <div className="rounded-[18px] border border-[#E7C8F2] bg-[#FCF8FF] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
            Período del ciclo
          </p>
          <p className="mt-2 text-sm font-semibold text-[#111111]">
            {formatearFecha(subscription.currentCycleStart)} al {formatearFecha(subscription.currentCycleEnd)}
          </p>
        </div>

        <div className="rounded-[18px] border border-[#E7C8F2] bg-[#FCF8FF] p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
            Próximo ciclo
          </p>
          <p className="mt-2 text-sm font-semibold text-[#111111]">
            {formatearFecha(subscription.nextCycleDate)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-[#4C00F7]">Disponible este ciclo</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaDisponibilidad
            label="Potes"
            available={subscription.available.potes}
            consumed={subscription.consumed.potes}
            included={subscription.included.potes}
          />

          {subscription.included.toppings > 0 && (
            <TarjetaDisponibilidad
              label="Toppings"
              available={subscription.available.toppings}
              consumed={subscription.consumed.toppings}
              included={subscription.included.toppings}
            />
          )}

          {subscription.included.barquillos > 0 && (
            <TarjetaDisponibilidad
              label="Pack Barquillos"
              available={subscription.available.barquillos}
              consumed={subscription.consumed.barquillos}
              included={subscription.included.barquillos}
            />
          )}

          {subscription.included.galletas > 0 && (
            <TarjetaDisponibilidad
              label="Pack Galletas"
              available={subscription.available.galletas}
              consumed={subscription.consumed.galletas}
              included={subscription.included.galletas}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function obtenerCantidadIncluida(
  porCiclo?: number | null,
  porMes?: number | null
) {
  if (typeof porCiclo === "number" && porCiclo > 0) return porCiclo;
  if (typeof porMes === "number" && porMes > 0) return porMes;
  return 0;
}

export default function MisSuscripcionesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [consumptions, setConsumptions] = useState<SubscriptionConsumptionRaw[]>([]);

  const [codigo, setCodigo] = useState("");
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [activandoId, setActivandoId] = useState<number | null>(null);
  const [canjeandoCodigo, setCanjeandoCodigo] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const obtenerClienteId = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    if (user?.id) {
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!clienteError && clienteData?.id) {
        return Number(clienteData.id);
      }
    }

    const clienteStorage = leerClienteSesionDesdeStorage();
    if (clienteStorage?.id) {
      return clienteStorage.id;
    }

    throw new Error("No encontramos la sesión del cliente.");
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError("");
      setMensajeCodigo("");

      const clienteId = await obtenerClienteId();

      const { data: claimsRaw, error: claimsError } = await supabase
        .from("subscription_claims")
        .select("id, source, status, claim_code, assigned_cliente_id, template_id")
        .eq("assigned_cliente_id", clienteId)
        .eq("status", "pending")
        .eq("source", "admin_assigned")
        .order("id", { ascending: false });

      if (claimsError) throw new Error(claimsError.message);

      const { data: subscriptionsRaw, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select("id, status, start_date, end_date, next_cycle_date, created_at, activated_at, template_id")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

      if (subscriptionsError) throw new Error(subscriptionsError.message);

      const { data: consumptionsRaw, error: consumptionsError } = await supabase
        .from("subscription_consumptions")
        .select("id, subscription_id, cycle_number, cycle_start_date, cycle_end_date, potes, toppings, barquillos, galletas, created_at")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

      if (consumptionsError) throw new Error(consumptionsError.message);

      const templateIds = Array.from(
        new Set(
          [
            ...((claimsRaw || []) as PendingClaimRaw[]).map((item) => item.template_id),
            ...((subscriptionsRaw || []) as SubscriptionRaw[]).map((item) => item.template_id),
          ].filter((id): id is number => typeof id === "number")
        )
      );

      let templatesMap = new Map<number, TemplateInfo>();

      if (templateIds.length > 0) {
        const { data: templatesData, error: templatesError } = await supabase
          .from("subscription_templates")
          .select(
            "id, name, billing_period, pots_per_month, toppings_per_month, wafer_packs_per_month, cookie_packs_per_month, pots_per_cycle, toppings_per_cycle, wafer_packs_per_cycle, cookie_packs_per_cycle, duration_months"
          )
          .in("id", templateIds);

        if (templatesError) throw new Error(templatesError.message);

        templatesMap = new Map(
          ((templatesData || []) as TemplateInfo[]).map((template) => [template.id, template])
        );
      }

      const claimsEnriquecidos: PendingClaim[] = ((claimsRaw || []) as PendingClaimRaw[]).map(
        (claim) => ({
          ...claim,
          template: claim.template_id ? templatesMap.get(claim.template_id) || null : null,
        })
      );

      const subscriptionsEnriquecidas: Subscription[] = (
        (subscriptionsRaw || []) as SubscriptionRaw[]
      ).map((subscription) => ({
        ...subscription,
        template: subscription.template_id
          ? templatesMap.get(subscription.template_id) || null
          : null,
      }));

      setPendingClaims(claimsEnriquecidos);
      setSubscriptions(subscriptionsEnriquecidas);
      setConsumptions((consumptionsRaw || []) as SubscriptionConsumptionRaw[]);
    } catch (err) {
      console.error("Error cargando suscripciones:", err);

      const detalle =
        err instanceof Error ? err.message : "No fue posible cargar tus suscripciones.";

      setError(detalle);
      setPendingClaims([]);
      setSubscriptions([]);
      setConsumptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarDatos();
  }, []);

  const hoy = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const suscripcionesVigentes = useMemo(() => {
    return subscriptions.filter((subscription) => {
      if (subscription.status !== "active") return false;
      if (!subscription.end_date) return true;

      const endDate = new Date(subscription.end_date);
      endDate.setHours(0, 0, 0, 0);

      return endDate >= hoy;
    });
  }, [subscriptions, hoy]);

  const historialSuscripciones = useMemo(() => {
    return subscriptions.filter((subscription) => {
      if (subscription.status !== "active") return true;
      if (!subscription.end_date) return false;

      const endDate = new Date(subscription.end_date);
      endDate.setHours(0, 0, 0, 0);

      return endDate < hoy;
    });
  }, [subscriptions, hoy]);

  const consumptionsBySubscription = useMemo(() => {
    return consumptions.reduce<Record<number, SubscriptionConsumptionRaw[]>>((acc, item) => {
      if (!acc[item.subscription_id]) {
        acc[item.subscription_id] = [];
      }

      acc[item.subscription_id].push(item);
      return acc;
    }, {});
  }, [consumptions]);

  const tarjetasVigentes = useMemo<SubscriptionCardData[]>(() => {
    return suscripcionesVigentes.map((subscription) => {
      const template = subscription.template;
      const subscriptionConsumptions = consumptionsBySubscription[subscription.id] || [];
      const currentCycle = calcularCicloActual(subscription, subscriptionConsumptions, hoy);

      const cycleConsumptions = subscriptionConsumptions.filter((item) => {
        if (
          currentCycle.cycleStart &&
          currentCycle.cycleEnd &&
          item.cycle_start_date === currentCycle.cycleStart &&
          item.cycle_end_date === currentCycle.cycleEnd
        ) {
          return true;
        }

        return item.cycle_number === currentCycle.cycleNumber;
      });

      const consumed = cycleConsumptions.reduce(
        (acc, item) => {
          acc.potes += item.potes || 0;
          acc.toppings += item.toppings || 0;
          acc.barquillos += item.barquillos || 0;
          acc.galletas += item.galletas || 0;
          return acc;
        },
        {
          potes: 0,
          toppings: 0,
          barquillos: 0,
          galletas: 0,
        }
      );

      const included = {
        potes: obtenerCantidadIncluida(
            template?.pots_per_cycle,
            template?.pots_per_month
        ),
        toppings: obtenerCantidadIncluida(
            template?.toppings_per_cycle,
            template?.toppings_per_month
        ),
        barquillos: obtenerCantidadIncluida(
            template?.wafer_packs_per_cycle,
            template?.wafer_packs_per_month
        ),
        galletas: obtenerCantidadIncluida(
            template?.cookie_packs_per_cycle,
            template?.cookie_packs_per_month
        ),
      };

      return {
        id: subscription.id,
        name: template?.name || "Suscripción",
        billingPeriodLabel: formatearPeriodicidad(template?.billing_period),
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        nextCycleDate: subscription.next_cycle_date,
        currentCycleNumber: currentCycle.cycleNumber,
        currentCycleStart: currentCycle.cycleStart,
        currentCycleEnd: currentCycle.cycleEnd,
        included,
        consumed,
        available: {
          potes: clampNonNegative(included.potes - consumed.potes),
          toppings: clampNonNegative(included.toppings - consumed.toppings),
          barquillos: clampNonNegative(included.barquillos - consumed.barquillos),
          galletas: clampNonNegative(included.galletas - consumed.galletas),
        },
        isActive: true,
      };
    });
  }, [suscripcionesVigentes, consumptionsBySubscription, hoy]);

  const tarjetasHistorial = useMemo<SubscriptionCardData[]>(() => {
    return historialSuscripciones.map((subscription) => {
      const template = subscription.template;

      return {
        id: subscription.id,
        name: template?.name || "Suscripción",
        billingPeriodLabel: formatearPeriodicidad(template?.billing_period),
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        nextCycleDate: subscription.next_cycle_date,
        currentCycleNumber: 0,
        currentCycleStart: null,
        currentCycleEnd: null,
        included: {
            potes: obtenerCantidadIncluida(
                template?.pots_per_cycle,
                template?.pots_per_month
            ),
            toppings: obtenerCantidadIncluida(
                template?.toppings_per_cycle,
                template?.toppings_per_month
            ),
            barquillos: obtenerCantidadIncluida(
                template?.wafer_packs_per_cycle,
                template?.wafer_packs_per_month
            ),
            galletas: obtenerCantidadIncluida(
                template?.cookie_packs_per_cycle,
                template?.cookie_packs_per_month
            ),
        },
        
        consumed: {
          potes: 0,
          toppings: 0,
          barquillos: 0,
          galletas: 0,
        },
        available: {
          potes: 0,
          toppings: 0,
          barquillos: 0,
          galletas: 0,
        },
        isActive: false,
      };
    });
  }, [historialSuscripciones]);

  const handleActivarAsignada = async (claimId: number) => {
    try {
      setActivandoId(claimId);
      setMensajeCodigo("");

      const clienteId = await obtenerClienteId();

      const res = await fetch("/api/subscriptions/activate-assigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          claimId,
          clienteId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensajeCodigo(data.message || "No se pudo activar la suscripción.");
        return;
      }

      setMensajeCodigo("Suscripción activada correctamente.");
      await cargarDatos();
    } catch (error) {
      console.error("Error activando suscripción asignada:", error);
      setMensajeCodigo(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al activar la suscripción."
      );
    } finally {
      setActivandoId(null);
    }
  };

  const handleCanjearCodigo = async (e: FormEvent) => {
    e.preventDefault();

    if (!codigo.trim()) {
      setMensajeCodigo("Ingresa un código para canjear.");
      return;
    }

    try {
      setCanjeandoCodigo(true);
      setMensajeCodigo("");

      const clienteId = await obtenerClienteId();

      const res = await fetch("/api/subscriptions/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codigo.trim(),
          clienteId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensajeCodigo(data.message || "No se pudo canjear el código.");
        return;
      }

      setMensajeCodigo("Código activado correctamente.");
      setCodigo("");
      await cargarDatos();
    } catch (error) {
      console.error("Error canjeando código:", error);
      setMensajeCodigo(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al canjear el código."
      );
    } finally {
      setCanjeandoCodigo(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2C7E0] px-6 py-10">
        <div className="mx-auto max-w-[760px]">
          <div className="overflow-hidden rounded-[36px] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
            <div className="bg-gradient-to-r from-[#4C00F7] to-[#6A1BFF] px-8 py-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] uppercase tracking-[0.3em] text-white/90">NOOK</p>
                  <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                    Mis suscripciones
                  </h1>
                </div>

                <ClienteLogoutButton />
              </div>
            </div>

            <div className="px-8 py-8">
              <div className="rounded-[24px] border border-[#E7C8F2] bg-[#FCF8FF] p-5">
                <p className="text-base text-neutral-700">Cargando suscripciones...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#F2C7E0] px-6 py-10">
        <div className="mx-auto max-w-[760px]">
          <div className="overflow-hidden rounded-[36px] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
            <div className="bg-gradient-to-r from-[#4C00F7] to-[#6A1BFF] px-8 py-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] uppercase tracking-[0.3em] text-white/90">NOOK</p>
                  <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                    Mis suscripciones
                  </h1>
                </div>

                <ClienteLogoutButton />
              </div>
            </div>

            <div className="px-8 py-8">
              <div className="rounded-[24px] border border-[#E7C8F2] bg-[#FCF8FF] p-5">
                <p className="text-base text-neutral-700">{error}</p>
              </div>

              <Link
                href="/mi-cuenta"
                className="mt-6 inline-flex rounded-2xl border border-[#4C00F7] px-5 py-3 font-semibold text-[#4C00F7] transition duration-200 hover:bg-[#F7F4FF] active:scale-[0.98]"
              >
                ← Mi cuenta
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2C7E0] px-6 py-10">
      <div className="mx-auto max-w-[760px]">
        <div className="overflow-hidden rounded-[36px] bg-white shadow-[0_16px_40px_rgba(17,17,17,0.08)]">
          <div className="bg-gradient-to-r from-[#4C00F7] to-[#6A1BFF] px-8 py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] uppercase tracking-[0.3em] text-white/90">NOOK</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                  Mis suscripciones
                </h1>
              </div>

              <ClienteLogoutButton />
            </div>
          </div>

          <div className="px-8 pt-6">
            <Link
              href="/mi-cuenta"
              className="inline-flex rounded-2xl border border-[#4C00F7] px-5 py-3 font-semibold text-[#4C00F7] transition duration-200 hover:bg-[#F7F4FF] active:scale-[0.98]"
            >
              ← Mi cuenta
            </Link>
          </div>

          <div className="space-y-8 px-8 py-8">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-[#4C00F7]">Canjear código</h2>
              <p className="text-base leading-7 text-neutral-700">
                Ingresa un código entregado por Nook para activar una suscripción en tu cuenta.
              </p>

              <form onSubmit={handleCanjearCodigo} className="space-y-4">
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ejemplo: NOOK-ABC123"
                  className="w-full rounded-[20px] border border-[#E7C8F2] bg-white px-5 py-4 text-base text-[#111111] outline-none transition placeholder:text-neutral-400 focus:border-[#4C00F7] focus:ring-4 focus:ring-[#4C00F7]/10"
                />

                <button
                  type="submit"
                  disabled={canjeandoCodigo}
                  className="cursor-pointer w-full rounded-[20px] bg-gradient-to-r from-[#4C00F7] to-[#6A1BFF] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_24px_rgba(76,0,247,0.20)] transition duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
                >
                  {canjeandoCodigo ? "Canjeando..." : "Canjear código"}
                </button>
              </form>

              {mensajeCodigo && (
                <div className="rounded-[20px] border border-[#E7C8F2] bg-[#FCF8FF] px-4 py-3 text-sm text-neutral-700">
                  {mensajeCodigo}
                </div>
              )}
            </div>

            {pendingClaims.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-[#4C00F7]">Suscripciones por activar</h2>
                <p className="text-base leading-7 text-neutral-700">
                  Estas suscripciones ya fueron asignadas a tu cuenta. Solo falta activarlas.
                </p>

                <div className="space-y-4">
                  {pendingClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="rounded-[24px] border border-[#E7C8F2] bg-[#FCF8FF] p-5"
                    >
                      <p className="text-xl font-bold text-[#4C00F7]">
                        {claim.template?.name || "Suscripción"}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[18px] border border-[#E7C8F2] bg-white p-4 xl:col-span-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
                            Periodicidad
                          </p>
                          <p className="mt-2 text-base font-semibold text-[#111111]">
                            {formatearPeriodicidad(claim.template?.billing_period)}
                          </p>
                        </div>

                        <div className="rounded-[18px] border border-[#E7C8F2] bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
                            Potes
                          </p>
                          <p className="mt-2 text-base font-semibold text-[#111111]">
                            {obtenerCantidadIncluida(
                              claim.template?.pots_per_cycle,
                              claim.template?.pots_per_month
                            )}
                          </p>
                        </div>

                        {obtenerCantidadIncluida(
                          claim.template?.toppings_per_cycle,
                          claim.template?.toppings_per_month
                        ) > 0 && (
                          <div className="rounded-[18px] border border-[#E7C8F2] bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
                              Toppings
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#111111]">
                              {obtenerCantidadIncluida(
                                claim.template?.toppings_per_cycle,
                                claim.template?.toppings_per_month
                              )}
                            </p>
                          </div>
                        )}

                        {obtenerCantidadIncluida(
                          claim.template?.wafer_packs_per_cycle,
                          claim.template?.wafer_packs_per_month
                        ) > 0 && (
                          <div className="rounded-[18px] border border-[#E7C8F2] bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
                              Pack Barquillos
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#111111]">
                              {obtenerCantidadIncluida(
                                claim.template?.wafer_packs_per_cycle,
                                claim.template?.wafer_packs_per_month
                              )}
                            </p>
                          </div>
                        )}

                        {obtenerCantidadIncluida(
                          claim.template?.cookie_packs_per_cycle,
                          claim.template?.cookie_packs_per_month
                        ) > 0 && (
                          <div className="rounded-[18px] border border-[#E7C8F2] bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
                              Pack Galletas
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#111111]">
                              {obtenerCantidadIncluida(
                                claim.template?.cookie_packs_per_cycle,
                                claim.template?.cookie_packs_per_month
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleActivarAsignada(claim.id)}
                        disabled={activandoId === claim.id}
                        className="cursor-pointer mt-5 rounded-[18px] bg-black px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
                      >
                        {activandoId === claim.id ? "Activando..." : "Activar suscripción"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-[#4C00F7]">Ver mis suscripciones</h2>
              <p className="text-base leading-7 text-neutral-700">
                Aquí verás tus suscripciones vigentes y lo que tienes disponible en el ciclo actual.
              </p>

              <div className="space-y-4">
                {tarjetasVigentes.length === 0 ? (
                  <div className="rounded-[24px] border border-[#E7C8F2] bg-[#FCF8FF] p-5">
                    <p className="text-lg font-semibold text-[#4C00F7]">
                      Aún no tienes suscripciones vigentes
                    </p>
                    <p className="mt-3 text-sm leading-6 text-neutral-700">
                      Cuando actives una suscripción vigente, aquí podrás revisar su detalle,
                      el ciclo actual y lo que tienes disponible.
                    </p>
                  </div>
                ) : (
                  tarjetasVigentes.map((subscription) => (
                    <TarjetaSuscripcionCompacta
                      key={subscription.id}
                      subscription={subscription}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-[#E7C8F2] bg-[#FCF8FF]">
              <button
                type="button"
                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                className="cursor-pointer flex w-full items-center justify-between px-6 py-6 text-left transition duration-200 hover:bg-[#F9F1FD]"
              >
                <div>
                  <h2 className="text-2xl font-bold text-[#4C00F7]">
                    Historial de suscripciones
                  </h2>
                  <p className="mt-2 text-base leading-7 text-neutral-700">
                    Revisa tus suscripciones anteriores o vencidas.
                  </p>
                </div>

                <span className="text-3xl leading-none text-[#4C00F7]">
                  {mostrarHistorial ? "−" : "+"}
                </span>
              </button>

              {mostrarHistorial && (
                <div className="border-t border-[#E7C8F2] px-6 py-6">
                  <div className="space-y-4">
                    {tarjetasHistorial.length === 0 ? (
                      <div className="rounded-[24px] border border-[#E7C8F2] bg-white p-5">
                        <p className="text-lg font-semibold text-[#4C00F7]">
                          No tienes historial de suscripciones
                        </p>
                        <p className="mt-3 text-sm leading-6 text-neutral-700">
                          Cuando una suscripción termine o deje de estar vigente, aparecerá aquí.
                        </p>
                      </div>
                    ) : (
                      tarjetasHistorial.map((subscription) => (
                        <div
                          key={subscription.id}
                          className="rounded-[24px] border border-[#E7C8F2] bg-white p-5"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xl font-bold text-[#4C00F7]">
                                {subscription.name}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="inline-flex rounded-full border border-[#D9B1F0] bg-[#FCF8FF] px-3 py-1 text-xs font-semibold text-[#4C00F7]">
                                  {subscription.billingPeriodLabel}
                                </span>

                                <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-600">
                                  Histórica
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[18px] border border-[#E7C8F2] bg-[#FCF8FF] p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
                                Vigencia
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#111111]">
                                {formatearFecha(subscription.startDate)} al {formatearFecha(subscription.endDate)}
                              </p>
                            </div>

                            <div className="rounded-[18px] border border-[#E7C8F2] bg-[#FCF8FF] p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-[#7A58A6]">
                                Próximo ciclo registrado
                              </p>
                              <p className="mt-2 text-sm font-semibold text-[#111111]">
                                {formatearFecha(subscription.nextCycleDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}