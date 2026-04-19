"use client";

import { useEffect, useState } from "react";

type Consumo = {
  id: number;
  potes: number;
  toppings: number;
  barquillos: number;
  galletas: number;
  created_at: string;
};

export default function UltimosMovimientos({
  clienteId,
}: {
  clienteId: number;
}) {
  const [data, setData] = useState<Consumo[]>([]);
  const [cargando, setCargando] = useState(false);

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

  return (
    <div className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-violet-700">
        Últimos movimientos
      </p>

      {cargando ? (
        <p className="mt-3 text-sm text-neutral-600">Cargando...</p>
      ) : data.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">
          No hay movimientos registrados.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-neutral-200 p-3 text-sm"
            >
              <p className="font-medium text-neutral-800">
                Consumo de suscripción
              </p>

              <p className="text-neutral-600">
                {formatearFecha(item.created_at)}
              </p>

              <div className="mt-1 text-neutral-700">
                {item.potes > 0 && <span>Potes: {item.potes} </span>}
                {item.toppings > 0 && <span>Toppings: {item.toppings} </span>}
                {item.barquillos > 0 && (
                  <span>Barquillos: {item.barquillos} </span>
                )}
                {item.galletas > 0 && <span>Galletas: {item.galletas}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}