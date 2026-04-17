"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  auth_user_id?: string | null;
};

type PendingClaim = {
  id: number;
  template_id: number;
  status: string;
  source: string;
  notes: string | null;
  template: {
    id: number;
    name: string;
    billing_period: string;
    pots_per_month: number;
    toppings_per_month: number;
    wafer_packs_per_month: number;
    cookie_packs_per_month: number;
    duration_months: number;
  };
};

type ActiveSubscription = {
  id: number;
  status: string;
  start_date: string;
  end_date: string | null;
  next_cycle_date: string | null;
  template: {
    name: string;
    billing_period: string;
    pots_per_month: number;
    toppings_per_month: number;
    wafer_packs_per_month: number;
    cookie_packs_per_month: number;
    duration_months: number;
  };
};

export default function MisSuscripcionesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [error, setError] = useState("");

  const [codigo, setCodigo] = useState("");
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [activandoId, setActivandoId] = useState<number | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login?next=/mi-cuenta/suscripciones");
        return;
      }

      const userId = session.user.id;

      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("id, nombre, correo, telefono, auth_user_id")
        .eq("auth_user_id", userId)
        .single();

      if (clienteError || !clienteData) {
        setError("No encontramos una cuenta asociada a esta sesión.");
        setLoading(false);
        return;
      }

      const clienteActual = clienteData as Cliente;
      setCliente(clienteActual);

      const { data: claimsData } = await supabase
        .from("subscription_claims")
        .select(`
          id,
          template_id,
          status,
          source,
          notes,
          template:subscription_templates (
            id,
            name,
            billing_period,
            pots_per_month,
            toppings_per_month,
            wafer_packs_per_month,
            cookie_packs_per_month,
            duration_months
          )
        `)
        .eq("assigned_cliente_id", clienteActual.id)
        .eq("status", "pending")
        .eq("source", "admin_assigned");

      const { data: subscriptionsData } = await supabase
        .from("subscriptions")
        .select(`
          id,
          status,
          start_date,
          end_date,
          next_cycle_date,
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
        .eq("cliente_id", clienteActual.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setPendingClaims((claimsData as PendingClaim[]) || []);
      setActiveSubscriptions((subscriptionsData as ActiveSubscription[]) || []);
      setLoading(false);
    };

    cargarDatos();
  }, [router]);

  const handleCanjearCodigo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!cliente) return;

    if (!codigo.trim()) {
        setMensajeCodigo("Debes ingresar un código.");
        return;
    }

    setMensajeCodigo("");

    try {
        const res = await fetch("/api/subscriptions/redeem-code", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            code: codigo.trim().toUpperCase(),
            clienteId: cliente.id,
        }),
        });

        const data = await res.json();

        if (!res.ok) {
        setMensajeCodigo(data.message || "No se pudo canjear el código.");
        return;
        }

        setMensajeCodigo("Código canjeado correctamente.");
        setCodigo("");

        window.location.reload();
    } catch (error) {
        console.error("Error canjeando código:", error);
        setMensajeCodigo("Ocurrió un error inesperado al canjear el código.");
    }
  };
  

  const handleActivarAsignada = async (claimId: number) => {
    if (!cliente) return;

    setActivandoId(claimId);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const res = await fetch("/api/subscriptions/activate-assigned", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                claimId,
                clienteId: cliente.id,
            }),
            signal: controller.signal,
            });

            clearTimeout(timeout);

            const data = await res.json();

            if (!res.ok) {
            alert(data.message || "No se pudo activar la suscripción.");
            return;
            }

            const claimActivado = pendingClaims.find((claim) => claim.id === claimId);

            setPendingClaims((prev) => prev.filter((claim) => claim.id !== claimId));

            if (claimActivado) {
            setActiveSubscriptions((prev) => [
                {
                id: Date.now(),
                status: "active",
                start_date: new Date().toISOString().slice(0, 10),
                end_date: null,
                next_cycle_date: null,
                template: claimActivado.template,
                },
                ...prev,
            ]);
            }

            alert("Suscripción activada correctamente.");
        } catch (err) {
            console.error("Error activando suscripción:", err);
            alert("La activación no respondió correctamente. Revisemos el backend.");
        } finally {
            setActivandoId(null);
        }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <p className="text-neutral-600">Cargando suscripciones...</p>
        </div>
      </main>
    );
  }

  if (error || !cliente) {
    return (
      <main className="min-h-screen bg-[#FFDBEF] p-6">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-[#4C00F7]">
            Mis suscripciones
          </h1>
          <p className="mt-4 text-neutral-600">
            {error || "No fue posible cargar tus suscripciones."}
          </p>

          <button
            onClick={() => router.push("/mi-cuenta")}
            className="mt-6 rounded-2xl border border-[#4C00F7] bg-white px-5 py-3 text-sm font-semibold text-[#4C00F7] transition hover:bg-[#4C00F7]/5"
          >
            ← Mi cuenta
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFDBEF] p-6">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="overflow-hidden rounded-[28px] bg-white shadow">
          <div className="bg-[#4C00F7] px-6 py-6 text-white">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">
              Nook
            </p>
            <h1 className="text-3xl font-bold">Mis suscripciones</h1>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div>
              <button
                onClick={() => router.push("/mi-cuenta")}
                className="rounded-2xl border border-[#4C00F7] bg-white px-5 py-3 text-sm font-semibold text-[#4C00F7] transition hover:bg-[#4C00F7]/5"
              >
                ← Mi cuenta
              </button>
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#4C00F7]/70">
                Cuenta
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#4C00F7]">
                {cliente.nombre}
              </h2>
              <p className="mt-2 text-sm text-neutral-600">{cliente.correo}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow">
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-[#4C00F7]">
              Activar suscripción
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Aquí aparecen las suscripciones cargadas directamente a tu cuenta.
            </p>

            <div className="mt-5 space-y-3">
              {pendingClaims.length === 0 ? (
                <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5">
                  <p className="text-lg font-semibold text-[#4C00F7]">
                    Aún no tienes suscripciones directas para activar
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-700">
                    Cuando compres una suscripción por caja, WhatsApp, teléfono o
                    cualquier otro canal y esta quede asociada a tu cuenta, la
                    verás aquí para activarla.
                  </p>
                </div>
              ) : (
                pendingClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] p-5"
                  >
                    <p className="text-lg font-semibold text-[#4C00F7]">
                      {claim.template.name}
                    </p>

                    <div className="mt-3 space-y-1 text-sm text-neutral-700">
                      <p>Periodicidad: {claim.template.billing_period}</p>
                      <p>Potes por mes: {claim.template.pots_per_month}</p>
                      {claim.template.toppings_per_month > 0 && (
                        <p>Toppings por mes: {claim.template.toppings_per_month}</p>
                      )}
                      {claim.template.wafer_packs_per_month > 0 && (
                        <p>Pack barquillos por mes: {claim.template.wafer_packs_per_month}</p>
                      )}
                      {claim.template.cookie_packs_per_month > 0 && (
                        <p>Pack galletas por mes: {claim.template.cookie_packs_per_month}</p>
                      )}
                      {claim.notes && <p>Nota: {claim.notes}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleActivarAsignada(claim.id)}
                      disabled={activandoId === claim.id}
                      className="mt-5 w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.18)] transition hover:opacity-95 disabled:opacity-60"
                    >
                      {activandoId === claim.id
                        ? "Activando..."
                        : "Activar suscripción"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow">
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-[#4C00F7]">
              Canjear código
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Si recibiste un código de suscripción por compra web o como
              regalo, podrás canjearlo aquí.
            </p>

            <form onSubmit={handleCanjearCodigo} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#444]">
                  Código
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-4 text-base uppercase text-[#222] outline-none transition placeholder:text-[#999] focus:border-[#7A57F6] focus:ring-4 focus:ring-[#7A57F6]/10"
                  placeholder="Ingresa tu código"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#4C00F7] px-5 py-4 text-base font-semibold text-white shadow-[0_10px_20px_rgba(76,0,247,0.18)] transition hover:opacity-95"
              >
                Canjear código
              </button>

              {mensajeCodigo && (
                <div className="rounded-2xl border border-[#D99BE8] bg-[#F4DCE8] px-4 py-3 text-sm text-neutral-700">
                  {mensajeCodigo}
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow">
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-[#4C00F7]">
              Ver mis suscripciones
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Aquí verás el detalle de tus suscripciones activas, lo consumido,
              la fecha de renovación del ciclo y tus beneficios vigentes.
            </p>

            <div className="mt-5 space-y-3">
              {activeSubscriptions.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-lg font-semibold text-[#4C00F7]">
                    Aún no tienes suscripciones activas
                  </p>
                  <p className="mt-3 text-sm leading-6 text-neutral-700">
                    Cuando actives una suscripción, aquí podrás revisar su detalle,
                    el saldo del ciclo actual, lo que ya consumiste y la fecha en
                    que se renueva.
                  </p>
                </div>
              ) : (
                activeSubscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <p className="text-lg font-semibold text-[#4C00F7]">
                      {subscription.template.name}
                    </p>

                    <div className="mt-3 space-y-1 text-sm text-neutral-700">
                      <p>Periodicidad: {subscription.template.billing_period}</p>
                      <p>Potes por mes: {subscription.template.pots_per_month}</p>
                      {subscription.template.toppings_per_month > 0 && (
                        <p>Toppings por mes: {subscription.template.toppings_per_month}</p>
                      )}
                      {subscription.template.wafer_packs_per_month > 0 && (
                        <p>Pack barquillos por mes: {subscription.template.wafer_packs_per_month}</p>
                      )}
                      {subscription.template.cookie_packs_per_month > 0 && (
                        <p>Pack galletas por mes: {subscription.template.cookie_packs_per_month}</p>
                      )}
                      <p>Inicio: {subscription.start_date}</p>
                      {subscription.end_date && <p>Término: {subscription.end_date}</p>}
                      {subscription.next_cycle_date && (
                        <p>Próximo ciclo: {subscription.next_cycle_date}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}