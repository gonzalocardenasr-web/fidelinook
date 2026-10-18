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
};

const estados: Record<string, string> = {
  borrador: "Borrador",
  programada: "Programada",
  lanzando: "Lanzando",
  lanzada: "Lanzada",
  fallida: "Fallida",
  cancelada: "Cancelada",
};

function fecha(value: string | null | undefined) {
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
    hour12: false,
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
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No fue posible cargar las campañas.");
      }

      setCampanas(Array.isArray(data.campanas) ? data.campanas : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar las campañas.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm xl:h-[calc(100dvh-115px)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">
            Campañas existentes
          </h2>
          <p className="text-[11px] text-neutral-500">
            Últimas 20 campañas registradas
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargar()}
          disabled={cargando}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {cargando && campanas.length === 0 ? (
          <p className="p-4 text-xs text-neutral-500">Cargando campañas...</p>
        ) : campanas.length === 0 && !error ? (
          <p className="p-4 text-xs text-neutral-500">
            No hay campañas registradas.
          </p>
        ) : (
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[23%]" />
              <col className="w-[25%]" />
              <col className="w-[13%]" />
              <col className="w-[17%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[6%]" />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-neutral-50 text-[11px] text-neutral-600">
              <tr>
                <th className="px-2.5 py-2 font-semibold">Campaña</th>
                <th className="px-2.5 py-2 font-semibold">Premio</th>
                <th className="px-2.5 py-2 font-semibold">Estado</th>
                <th className="px-2.5 py-2 font-semibold">Lanzamiento</th>
                <th className="px-2 py-2 font-semibold">Vig.</th>
                <th className="px-2 py-2 font-semibold">Alc.</th>
                <th className="px-2 py-2 text-right font-semibold"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {campanas.map((campana) => (
                <tr key={campana.id} className="h-11 hover:bg-neutral-50">
                  <td className="px-2.5 py-2">
                    <Link
                      href={`/campanas/${campana.id}`}
                      title={campana.nombre_interno}
                      className="block truncate font-semibold text-neutral-900 hover:text-violet-700"
                    >
                      {campana.nombre_interno}
                    </Link>
                  </td>

                  <td
                    className="truncate px-2.5 py-2 text-neutral-700"
                    title={campana.premio_nombre}
                  >
                    {campana.premio_nombre}
                  </td>

                  <td className="px-2.5 py-2">
                    <span className="inline-block max-w-full truncate rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700">
                      {estados[campana.estado] || campana.estado}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-2.5 py-2 text-[11px] text-neutral-600">
                    {fecha(campana.fecha_lanzamiento)}
                  </td>

                  <td className="whitespace-nowrap px-2 py-2 text-neutral-600">
                    {campana.duracion_horas}h
                  </td>

                  <td className="whitespace-nowrap px-2 py-2 text-neutral-600">
                    {campana.total_enviados ?? 0}/{campana.total_objetivo ?? 0}
                  </td>

                  <td className="px-2 py-2 text-right">
                    <Link
                      href={`/campanas/${campana.id}`}
                      title="Ver detalle"
                      aria-label={`Ver campaña ${campana.nombre_interno}`}
                      className="font-semibold text-violet-700 hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
