"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type PendingClaim = {
  id: number;
  template: {
    name: string;
    billing_period: string;
    pots_per_month: number;
    toppings_per_month: number;
    wafer_packs_per_month: number;
    cookie_packs_per_month: number;
  } | null;
};

type Subscription = {
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
  } | null;
};

export default function MisSuscripcionesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [activandoId, setActivandoId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState("");
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [canjeandoCodigo, setCanjeandoCodigo] = useState(false);

  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(false);

        const raw = localStorage.getItem("cliente");
        if (!raw) throw new Error("No hay cliente en sesión");

        const cliente = JSON.parse(raw);
        if (!cliente?.id) throw new Error("Cliente inválido");

        // Claims pendientes
        const { data: claimsData, error: claimsError } = await supabase
          .from("subscription_claims")
          .select(`
            id,
            template:subscription_templates (
              name,
              billing_period,
              pots_per_month,
              toppings_per_month,
              wafer_packs_per_month,
              cookie_packs_per_month
            )
          `)
          .eq("assigned_cliente_id", cliente.id)
          .eq("status", "pending");

        if (claimsError) throw claimsError;

        // Suscripciones
        const { data: subsData, error: subsError } = await supabase
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
              cookie_packs_per_month
            )
          `)
          .eq("cliente_id", cliente.id)
          .order("created_at", { ascending: false });

        if (subsError) throw subsError;

        setPendingClaims(claimsData || []);
        setSubscriptions(subsData || []);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // 🔵 Separación lógica correcta
  const hoy = new Date();

  const vigentes = subscriptions.filter((s) => {
    if (s.status !== "active") return false;
    if (!s.end_date) return true;
    return new Date(s.end_date) >= hoy;
  });

  const historial = subscriptions.filter((s) => {
    if (s.status !== "active") return true;
    if (!s.end_date) return false;
    return new Date(s.end_date) < hoy;
  });

  // 🔵 Activar asignación
  const activarAsignacion = async (id: number) => {
    try {
      setActivandoId(id);

      const raw = localStorage.getItem("cliente");
      const cliente = JSON.parse(raw || "{}");

      await fetch("/api/subscriptions/activate-assigned", {
        method: "POST",
        body: JSON.stringify({
          claimId: id,
          clienteId: cliente.id,
        }),
      });

      location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setActivandoId(null);
    }
  };

  // 🔵 Canjear código
  const canjearCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeCodigo("");
    setCanjeandoCodigo(true);

    try {
      const raw = localStorage.getItem("cliente");
      const cliente = JSON.parse(raw || "{}");

      const res = await fetch("/api/subscriptions/redeem-code", {
        method: "POST",
        body: JSON.stringify({
          code: codigo,
          clienteId: cliente.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensajeCodigo(data.message || "Error al canjear código");
        return;
      }

      setMensajeCodigo("Código activado correctamente");
      setCodigo("");
      location.reload();
    } catch (error) {
      setMensajeCodigo("Error inesperado");
    } finally {
      setCanjeandoCodigo(false);
    }
  };

  // 🔴 Loading
  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2C7E0] px-6 py-10 flex justify-center items-start">
        <div className="rounded-2xl bg-white px-6 py-4 shadow">
          Cargando suscripciones...
        </div>
      </main>
    );
  }

  // 🔴 Error
  if (error) {
    return (
      <main className="min-h-screen bg-[#F2C7E0] px-6 py-10 flex justify-center">
        <div className="rounded-2xl bg-white p-8 shadow max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#4C00F7]">
            Mis suscripciones
          </h1>
          <p className="mt-3 text-neutral-700">
            No fue posible cargar tus suscripciones.
          </p>

          <Link
            href="/mi-cuenta"
            className="mt-5 inline-block rounded-xl border border-[#4C00F7] px-4 py-2 text-[#4C00F7]"
          >
            ← Mi cuenta
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2C7E0] px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* 🔵 Canjear código */}
        <form
          onSubmit={canjearCodigo}
          className="rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-bold text-[#4C00F7]">
            Canjear código
          </h2>

          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ingresa tu código"
            className="mt-4 w-full rounded-xl border p-3"
          />

          <button
            type="submit"
            disabled={canjeandoCodigo}
            className="mt-4 w-full rounded-xl bg-[#4C00F7] py-3 text-white transition active:scale-95"
          >
            {canjeandoCodigo ? "Canjeando..." : "Canjear código"}
          </button>

          {mensajeCodigo && (
            <p className="mt-3 text-sm text-neutral-700">{mensajeCodigo}</p>
          )}
        </form>

        {/* 🔵 Asignaciones */}
        {pendingClaims.map((claim) => (
          <div key={claim.id} className="rounded-2xl bg-white p-6 shadow">
            <p className="font-semibold text-[#4C00F7]">
              {claim.template?.name || "Suscripción"}
            </p>

            <button
              onClick={() => activarAsignacion(claim.id)}
              className="mt-3 rounded-xl bg-black px-4 py-2 text-white"
            >
              {activandoId === claim.id
                ? "Activando..."
                : "Activar suscripción"}
            </button>
          </div>
        ))}

        {/* 🔵 Vigentes */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-[#4C00F7]">
            Suscripciones vigentes
          </h2>

          {vigentes.length === 0 && (
            <p className="mt-3 text-neutral-700">
              No tienes suscripciones vigentes.
            </p>
          )}

          {vigentes.map((s) => (
            <div key={s.id} className="mt-4 border-t pt-4">
              <p className="font-semibold">
                {s.template?.name || "Suscripción"}
              </p>
              <p className="text-sm text-neutral-600">
                Próximo ciclo: {s.next_cycle_date || "-"}
              </p>
            </div>
          ))}
        </div>

        {/* 🔵 Historial */}
        <div className="rounded-2xl bg-white shadow">
          <button
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="flex w-full justify-between p-6"
          >
            <span className="font-bold text-[#4C00F7]">
              Historial de suscripciones
            </span>
            <span>{mostrarHistorial ? "−" : "+"}</span>
          </button>

          {mostrarHistorial && (
            <div className="px-6 pb-6">
              {historial.length === 0 && (
                <p className="text-neutral-700">
                  No tienes historial.
                </p>
              )}

              {historial.map((s) => (
                <div key={s.id} className="mt-3 border-t pt-3">
                  <p className="font-semibold">
                    {s.template?.name || "Suscripción"}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Finalizó: {s.end_date || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}