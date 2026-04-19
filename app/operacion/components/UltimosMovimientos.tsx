"use client";

import { useEffect, useState } from "react";

type Consumo = {
  id: number;
  potes: number;
  toppings: number;
  barquillos: number;
  galletas: number;
  created_at: string;
  subscriptions?: {
    subscription_templates?: {
      name?: string;
    };
  };
};

export default function UltimosMovimientos({
  clienteId,
}: {
  clienteId: number;
}) {
  const [data, setData] = useState<Consumo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(true);

  useEffect(() => {
    cargar();
  }, [clienteId]);

  async function cargar() {
    try {
      setCargando(true);

      const res = await fetch(
        `/api/subscriptions/consumptions-by-client?clienteId=${clienteId}`
      );

      const json = await res.json();

      if (!res.ok) return;

      setData(json.consumptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  }

  const formatearFecha = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleString("es-CL");
  };

  if (!cargando && data.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-violet-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-sm font-semibold text-violet-700">
          Últimos movimientos
        </span>
        <span className="text-sm font-semibold text-violet-700">
          {abierto ? "▲" : "▼"}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-violet-100 px-6 pb-6 pt-4">
          {cargando ? (
            <p className="text-sm text-neutral-600">Cargando...</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <div className="max-h-72 overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-violet-50">
                    <tr className="text-left text-violet-700">
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      <th className="px-4 py-3 font-semibold">Potes</th>
                      <th className="px-4 py-3 font-semibold">Toppings</th>
                      <th className="px-4 py-3 font-semibold">Barquillos</th>
                      <th className="px-4 py-3 font-semibold">Galletas</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-neutral-200 text-neutral-700"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatearFecha(item.created_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          Consumo suscripción
                        </td>
                        <td className="px-4 py-3">{item.potes}</td>
                        <td className="px-4 py-3">{item.toppings}</td>
                        <td className="px-4 py-3">{item.barquillos}</td>
                        <td className="px-4 py-3">{item.galletas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}