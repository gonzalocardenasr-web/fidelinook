"use client";

import { useEffect, useMemo, useState } from "react";

export type ClienteSelectorValue = {
  id: number;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
  sellos?: number | null;
  premios?: any;
  tarjeta_activa?: boolean | null;
  email_verificado?: boolean | null;
};

type Props = {
  value: ClienteSelectorValue | null;
  onChange: (cliente: ClienteSelectorValue | null) => void;
};

export default function ClienteSelector({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [clientes, setClientes] = useState<ClienteSelectorValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const premiosActivos = useMemo(() => {
    if (!value || !Array.isArray(value.premios)) return 0;
    return value.premios.filter((premio: any) => premio.estado === "activo")
      .length;
  }, [value]);

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

  async function buscarClientes(texto: string) {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(
        `/api/operacion/clientes/search?q=${encodeURIComponent(texto)}`,
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
      <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              Cliente seleccionado
            </p>

            <p className="mt-1 text-lg font-bold text-neutral-900">
              {value.nombre}
            </p>

            <div className="mt-1 space-y-0.5 text-sm text-neutral-600">
              {value.telefono && <p>{value.telefono}</p>}
              {value.correo && <p>{value.correo}</p>}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  value.tarjeta_activa
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {value.tarjeta_activa ? "Tarjeta activa" : "Sin activar"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  value.email_verificado
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {value.email_verificado ? "Correo verificado" : "No verificado"}
              </span>

              {premiosActivos > 0 && (
                <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                  {premiosActivos} premio{premiosActivos === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
              setClientes([]);
            }}
            className="cursor-pointer rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-95"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <label className="text-sm font-semibold text-neutral-700">Cliente</label>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre, teléfono o correo"
        className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />

      <p className="mt-2 text-xs text-neutral-500">
        Opcional. Puedes continuar la venta sin seleccionar cliente.
      </p>

      {loading && <p className="mt-3 text-sm text-neutral-500">Buscando...</p>}

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

      {!loading && query.trim().length >= 2 && clientes.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">
          No se encontraron clientes.
        </p>
      )}

      {clientes.length > 0 && (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {clientes.map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              onClick={() => onChange(cliente)}
              className="cursor-pointer w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50 active:scale-[0.98]"
            >
              <p className="font-semibold text-neutral-900">{cliente.nombre}</p>

              <div className="mt-1 space-y-0.5 text-xs text-neutral-600">
                {cliente.telefono && <p>{cliente.telefono}</p>}
                {cliente.correo && <p>{cliente.correo}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
