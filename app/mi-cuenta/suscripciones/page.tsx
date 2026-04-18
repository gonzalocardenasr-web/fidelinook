"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type TemplateInfo = {
  name: string;
  billing_period: string;
  pots_per_month: number;
  toppings_per_month: number;
  wafer_packs_per_month: number;
  cookie_packs_per_month: number;
  duration_months: number;
};

type PendingClaim = {
  id: number;
  source: string;
  status: string;
  claim_code: string | null;
  assigned_cliente_id: number | null;
  template: TemplateInfo | null;
};

type Subscription = {
  id: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  next_cycle_date: string | null;
  created_at: string | null;
  activated_at: string | null;
  template: TemplateInfo | null;
};

type ClienteSesion = {
  id: number;
};

function leerClienteSesion(): ClienteSesion | null {
  try {
    const rawClienteActual = localStorage.getItem("clienteActual");
    if (rawClienteActual) {
      const parsed = JSON.parse(rawClienteActual);
      if (parsed?.id) return { id: Number(parsed.id) };
    }

    const rawCliente = localStorage.getItem("cliente");
    if (rawCliente) {
      const parsed = JSON.parse(rawCliente);
      if (parsed?.id) return { id: Number(parsed.id) };
    }

    const rawClienteId = localStorage.getItem("clienteId");
    if (rawClienteId && !Number.isNaN(Number(rawClienteId))) {
      return { id: Number(rawClienteId) };
    }

    return null;
  } catch {
    return null;
  }
}

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

export default function MisSuscripcionesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [codigo, setCodigo] = useState("");
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [activandoId, setActivandoId] = useState<number | null>(null);
  const [canjeandoCodigo, setCanjeandoCodigo] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError("");
      setMensajeCodigo("");

      const cliente = leerClienteSesion();

      if (!cliente?.id) {
        throw new Error("No encontramos la sesión del cliente.");
      }

      const { data: claimsData, error: claimsError } = await supabase
        .from("subscription_claims")
        .select(`
          id,
          source,
          status,
          claim_code,
          assigned_cliente_id,
          template:subscription_templates (
            name,
            billing_period,
            pots_per_month,
            toppings_per_month,
            wafer_packs_per_month,
            cookie_packs_per_month,
            duration_months
          )
        `)
        .eq("assigned_cliente_id", cliente.id)
        .eq("status", "pending")
        .eq("source", "admin_assigned")
        .order("id", { ascending: false });

      if (claimsError) {
        throw claimsError;
      }

      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          start_date,
          end_date,
          next_cycle_date,
          created_at,
          activated_at,
          template:subscription_templates (
            name,
            billing_period,
            pots_per_month,
            toppings_per_month,
            wafer_packs_per_month,
            cookie_packs_per_month,
            duration_months
          )
        `)
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false });

      if (subscriptionsError) {
        throw subscriptionsError;
      }

      setPendingClaims((claimsData as PendingClaim[]) || []);
      setSubscriptions((subscriptionsData as Subscription[]) || []);
    } catch (err) {
      console.error("Error cargando suscripciones:", err);
      setError("No fue posible cargar tus suscripciones.");
      setPendingClaims([]);
      setSubscriptions([]);
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

  const handleActivarAsignada = async (claimId: number) => {
    const cliente = leerClienteSesion();

    if (!cliente?.id) {
      setMensajeCodigo("No encontramos tu sesión para activar la suscripción.");
      return;
    }

    try {
      setActivandoId(claimId);
      setMensajeCodigo("");

      const res = await fetch("/api/subscriptions/activate-assigned", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          claimId,
          clienteId: cliente.id,
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
      setMensajeCodigo("Ocurrió un error inesperado al activar la suscripción.");
    } finally {
      setActivandoId(null);
    }
  };

  const handleCanjearCodigo = async (e: React.FormEvent) => {
    e.preventDefault();

    const cliente = leerClienteSesion();

    if (!cliente?.id) {
      setMensajeCodigo("No encontramos tu sesión para canjear el código.");
      return;
    }

    if (!codigo.trim()) {
      setMensajeCodigo("Ingresa un código para canjear.");
      return;
    }

    try {
      setCanjeandoCodigo(true);
      setMensajeCodigo("");

      const res = await fetch("/api/subscriptions/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: codigo.trim(),
          clienteId: cliente.id,
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
      setMensajeCodigo("Ocurrió un error inesperado al canjear el código.");
    } finally {
      setCanjeandoCodigo(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2C7E0] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto w-full max-w-xl rounded-[28px] bg-white px-8 py-8 shadow-[0_10px_30px_rgba(17,17,17,0.08)]">
            <p className="text-lg text-neutral-700">Cargando suscripciones...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#F2C7E0] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto w-full max-w-xl rounded-[28px] bg-white px-8 py-8 shadow-[0_10px_30px_rgba(17,17,17,0.08)]">
            <h1 className="text-2xl font-bold text-[#4C00F7]">Mis suscripciones</h1>
            <p className="mt-4 text-neutral-700">{error}</p>

            <Link
              href="/mi-cuenta"
              className="mt-6 inline-flex rounded-2xl border border-[#4C00F7] px-4 py-2 font-medium text-[#4C00F7] transition duration-200 hover:bg-[#F7F4FF] active:scale-[0.98]"
            >
              ← Mi cuenta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2C7E0] px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[28px] bg-white px-8 py-8 shadow-[0_10px_30px_rgba(17,17,17,0.08)]">
          <Link
            href="/mi-cuenta"
            className="text-sm font-medium text-neutral-600 transition duration-200 hover:opacity-70"
          >
            ← Volver a mi cuenta
          </Link>

          <h1 className="mt-5 text-5xl font-bold tracking-tight text-[#111111]">
            Mis suscripciones
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            Revisa tus suscripciones vigentes y el historial de suscripciones anteriores.
          </p>
        </div>

        <div className="rounded-[28px] bg-white px-8 py-8 shadow-[0_10px_30px_rgba(17,17,17,0.08)]">
          <h2 className="text-2xl font-bold text-[#4C00F7]">Canjear código</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            Ingresa un código entregado por Nook para activar una suscripción en tu cuenta.
          </p>

          <form onSubmit={handleCanjearCodigo} className="mt-5 space-y-4">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ejemplo: NOOK-ABC123"
              className="w-full rounded-2xl border border-neutral-200 px-4 py-4 text-base text-[#111111] outline-none transition placeholder:text-neutral-400 focus:border-[#4C00F7] focus:ring-4 focus:ring-[#4C00F7]/10"
            />

            <button
              type="submit"
              disabled={canjeandoCodigo}
              className="w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.18)] transition duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
            >
              {canjeandoCodigo ? "Canjeando..." : "Canjear código"}
            </button>
          </form>

          {mensajeCodigo && (
            <div className="mt-4 rounded-2xl bg-neutral-100 px-4 py-3 text-sm text-neutral-700">
              {mensajeCodigo}
            </div>
          )}
        </div>

        {pendingClaims.length > 0 && (
          <div className="rounded-[28px] bg-white px-8 py-8 shadow-[0_10px_30px_rgba(17,17,17,0.08)]">
            <h2 className="text-2xl font-bold text-[#4C00F7]">Suscripciones por activar</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Estas suscripciones ya fueron asignadas a tu cuenta. Solo falta activarlas.
            </p>

            <div className="mt-5 space-y-4">
              {pendingClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                >
                  <p className="text-lg font-semibold text-[#4C00F7]">
                    {claim.template?.name || "Suscripción"}
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-neutral-700">
                    <p>Periodicidad: {formatearPeriodicidad(claim.template?.billing_period)}</p>
                    <p>Potes por mes: {claim.template?.pots_per_month ?? 0}</p>
                    {(claim.template?.toppings_per_month ?? 0) > 0 && (
                      <p>Toppings por mes: {claim.template?.toppings_per_month ?? 0}</p>
                    )}
                    {(claim.template?.wafer_packs_per_month ?? 0) > 0 && (
                      <p>Pack barquillos por mes: {claim.template?.wafer_packs_per_month ?? 0}</p>
                    )}
                    {(claim.template?.cookie_packs_per_month ?? 0) > 0 && (
                      <p>Pack galletas por mes: {claim.template?.cookie_packs_per_month ?? 0}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleActivarAsignada(claim.id)}
                    disabled={activandoId === claim.id}
                    className="mt-4 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
                  >
                    {activandoId === claim.id ? "Activando..." : "Activar suscripción"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[28px] bg-white px-8 py-8 shadow-[0_10px_30px_rgba(17,17,17,0.08)]">
          <h2 className="text-2xl font-bold text-[#4C00F7]">Ver mis suscripciones</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            Aquí verás solo tus suscripciones vigentes. El historial queda disponible más abajo.
          </p>

          <div className="mt-5 space-y-4">
            {suscripcionesVigentes.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <p className="text-lg font-semibold text-[#4C00F7]">
                  Aún no tienes suscripciones vigentes
                </p>
                <p className="mt-3 text-sm leading-6 text-neutral-700">
                  Cuando actives una suscripción vigente, aquí podrás revisar su detalle,
                  la fecha de renovación del ciclo y tus beneficios mensuales.
                </p>
              </div>
            ) : (
              suscripcionesVigentes.map((subscription) => (
                <div
                  key={subscription.id}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                >
                  <p className="text-lg font-semibold text-[#4C00F7]">
                    {subscription.template?.name || "Suscripción"}
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-neutral-700">
                    <p>Periodicidad: {formatearPeriodicidad(subscription.template?.billing_period)}</p>
                    <p>Potes por mes: {subscription.template?.pots_per_month ?? 0}</p>
                    {(subscription.template?.toppings_per_month ?? 0) > 0 && (
                      <p>Toppings por mes: {subscription.template?.toppings_per_month ?? 0}</p>
                    )}
                    {(subscription.template?.wafer_packs_per_month ?? 0) > 0 && (
                      <p>Pack barquillos por mes: {subscription.template?.wafer_packs_per_month ?? 0}</p>
                    )}
                    {(subscription.template?.cookie_packs_per_month ?? 0) > 0 && (
                      <p>Pack galletas por mes: {subscription.template?.cookie_packs_per_month ?? 0}</p>
                    )}
                    <p>Inicio: {formatearFecha(subscription.start_date)}</p>
                    {subscription.end_date && <p>Término: {formatearFecha(subscription.end_date)}</p>}
                    {subscription.next_cycle_date && (
                      <p>Próximo ciclo: {formatearFecha(subscription.next_cycle_date)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(17,17,17,0.08)]">
          <button
            type="button"
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="flex w-full items-center justify-between px-8 py-8 text-left transition duration-200 hover:bg-neutral-50"
          >
            <div>
              <h2 className="text-2xl font-bold text-[#4C00F7]">
                Historial de suscripciones
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                Revisa tus suscripciones anteriores o vencidas.
              </p>
            </div>

            <span className="text-3xl leading-none text-[#4C00F7]">
              {mostrarHistorial ? "−" : "+"}
            </span>
          </button>

          {mostrarHistorial && (
            <div className="border-t border-neutral-200 px-8 py-8">
              <div className="space-y-4">
                {historialSuscripciones.length === 0 ? (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-lg font-semibold text-[#4C00F7]">
                      No tienes historial de suscripciones
                    </p>
                    <p className="mt-3 text-sm leading-6 text-neutral-700">
                      Cuando una suscripción termine o deje de estar vigente, aparecerá aquí.
                    </p>
                  </div>
                ) : (
                  historialSuscripciones.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                    >
                      <p className="text-lg font-semibold text-[#4C00F7]">
                        {subscription.template?.name || "Suscripción"}
                      </p>

                      <div className="mt-3 space-y-1 text-sm text-neutral-700">
                        <p>Periodicidad: {formatearPeriodicidad(subscription.template?.billing_period)}</p>
                        <p>Potes por mes: {subscription.template?.pots_per_month ?? 0}</p>
                        {(subscription.template?.toppings_per_month ?? 0) > 0 && (
                          <p>Toppings por mes: {subscription.template?.toppings_per_month ?? 0}</p>
                        )}
                        {(subscription.template?.wafer_packs_per_month ?? 0) > 0 && (
                          <p>Pack barquillos por mes: {subscription.template?.wafer_packs_per_month ?? 0}</p>
                        )}
                        {(subscription.template?.cookie_packs_per_month ?? 0) > 0 && (
                          <p>Pack galletas por mes: {subscription.template?.cookie_packs_per_month ?? 0}</p>
                        )}
                        <p>Inicio: {formatearFecha(subscription.start_date)}</p>
                        {subscription.end_date && <p>Término: {formatearFecha(subscription.end_date)}</p>}
                        {subscription.next_cycle_date && (
                          <p>Próximo ciclo: {formatearFecha(subscription.next_cycle_date)}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}