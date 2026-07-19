"use client";

import { useEffect, useState } from "react";

type ClienteSelectorReward = {
  id: number;
  customerId: number;
  rewardType: string;
  name: string;
  description: string | null;
  status: "active" | "redeemed" | "expired" | "cancelled";
  issuedAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  cancelledAt: string | null;
  campaignId: number | null;
  source: string;
  sourceReference: string | null;
  legacyRewardId: string | null;
  metadata: Record<string, unknown>;
};

export type ClienteSelectorValue = {
  id: number;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  loyalty?: {
    currentStampBalance: number;
    activeRewards: ClienteSelectorReward[];
    activeRewardsCount: number;
  };
  tarjeta_activa?: boolean | null;
  email_verificado?: boolean | null;
};

type Props = {
  value: ClienteSelectorValue | null;
  onChange: (cliente: ClienteSelectorValue | null) => void;
  resetKey?: number;
};

export default function ClienteSelector({ value, onChange, resetKey }: Props) {
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState<ClienteSelectorValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (value) return;

    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setClientes([]);
      setMessage("");
      return;
    }

    const timeout = window.setTimeout(() => {
      buscarClientes(trimmed);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, value]);

  useEffect(() => {
    if (resetKey === undefined) return;

    setQuery("");
    setClientes([]);
    setMessage("");
    setLoading(false);
  }, [resetKey]);

  async function buscarClientes(texto: string) {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(
        `/api/clientes/search?q=${encodeURIComponent(texto)}`,
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo buscar clientes.");
        setClientes([]);
        return;
      }

      setClientes(data.clientes || []);
    } catch (error) {
      console.error(error);
      setMessage("Error buscando clientes.");
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
            Cliente seleccionado
          </p>

          <p className="truncate text-[13px] font-black leading-tight text-neutral-900">
            {value.nombre}
          </p>

          {value.loyalty && (
            <p className="mt-0.5 text-[10px] font-semibold leading-tight text-violet-700">
              {value.loyalty.currentStampBalance}{" "}
              {value.loyalty.currentStampBalance === 1 ? "sello" : "sellos"}
              {" · "}
              {value.loyalty.activeRewardsCount}{" "}
              {value.loyalty.activeRewardsCount === 1
                ? "premio activo"
                : "premios activos"}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
            setClientes([]);
            setMessage("");
          }}
          className="shrink-0 cursor-pointer rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        Cliente
      </label>

      <input
        key={resetKey}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar nombre, teléfono o correo"
        className="mt-1 h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[12px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />

      <p className="mt-1 text-[10px] leading-tight text-neutral-400">
        Opcional · Sin cliente no acumula beneficios.
      </p>

      {loading && (
        <p className="mt-1 text-[11px] text-neutral-500">Buscando...</p>
      )}

      {message && (
        <p className="mt-1 text-[11px] font-semibold text-red-600">{message}</p>
      )}

      {!loading && query.trim().length >= 2 && clientes.length === 0 && (
        <p className="mt-1 text-[11px] text-neutral-500">
          No se encontraron clientes.
        </p>
      )}

      {clientes.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1.5 shadow-xl">
          {clientes.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => {
                onChange(cliente);
                setQuery("");
                setClientes([]);
                setMessage("");
              }}
              className="w-full cursor-pointer rounded-md border border-transparent px-2.5 py-2 text-left transition hover:border-violet-200 hover:bg-violet-50 active:scale-[0.99]"
            >
              <p className="truncate text-[12px] font-bold leading-tight text-neutral-900">
                {cliente.nombre}
              </p>

              {(cliente.telefono || cliente.correo) && (
                <p className="mt-0.5 truncate text-[10px] leading-tight text-neutral-500">
                  {[cliente.telefono, cliente.correo]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              {cliente.loyalty && (
                <p className="mt-1 text-[10px] font-semibold leading-tight text-violet-700">
                  {cliente.loyalty.currentStampBalance}{" "}
                  {cliente.loyalty.currentStampBalance === 1
                    ? "sello"
                    : "sellos"}
                  {" · "}
                  {cliente.loyalty.activeRewardsCount}{" "}
                  {cliente.loyalty.activeRewardsCount === 1
                    ? "premio activo"
                    : "premios activos"}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
