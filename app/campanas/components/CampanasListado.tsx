"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Campana = {
  id: number;
  nombre_interno: string;
  premio_nombre: string;
  duracion_horas: number;
  fecha_lanzamiento: string;
  recurrencia: string;
  estado: string;
  total_objetivo?: number | null;
  total_enviados?: number | null;
  created_at?: string | null;
};

const estados: Record<string, string> = {
  borrador: "Borrador",
  programada: "Programada",
  lanzando: "En lanzamiento",
  lanzada: "Lanzada",
  fallida: "Fallida",
  cancelada: "Cancelada",
};

function formatearFecha(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampanasListado() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const response = await fetch("/api/operacion/campanas", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No fue posible cargar las campañas.");
      }

      setCampanas(Array.isArray(data.campanas) ? data.campanas : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al cargar campañas.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Campañas existentes
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Últimas 20 campañas registradas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargar()}
          disabled={cargando}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error ? (
        <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : cargando && campanas.length === 0 ? (
        <p className="p-5 text-sm text-neutral-500">Cargando campañas...</p>
      ) : campanas.length === 0 ? (
        <p className="p-5 text-sm text-neutral-500">
          No hay campañas registradas.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Campaña</th>
                <th className="px-4 py-3 font-semibold">Premio</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Lanzamiento</th>
                <th className="px-4 py-3 font-semibold">Vigencia</th>
                <th className="px-4 py-3 font-semibold">Alcance</th>
                <th className="px-4 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {campanas.map((campana) => (
                <tr key={campana.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-neutral-900">
                      {campana.nombre_interno}
                    </p>
                    <p className="mt-1 text-neutral-400">#{campana.id}</p>
                  </td>

                  <td className="px-4 py-3 text-neutral-700">
                    {campana.premio_nombre}
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-violet-50 px-2 py-1 font-medium text-violet-700">
                      {estados[campana.estado] || campana.estado}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-neutral-700">
                    {formatearFecha(campana.fecha_lanzamiento)}
                  </td>

                  <td className="px-4 py-3 text-neutral-700">
                    {campana.duracion_horas} h
                  </td>

                  <td className="px-4 py-3 text-neutral-700">
                    {campana.total_enviados ?? 0} / {campana.total_objetivo ?? 0}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/campanas/${campana.id}`}
                      className="inline-flex rounded-lg border border-violet-200 bg-white px-3 py-2 font-semibold text-violet-700 hover:bg-violet-50"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
