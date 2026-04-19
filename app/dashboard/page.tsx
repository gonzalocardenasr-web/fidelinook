"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type KPIData = {
  clientesTotales: number;
  clientesConTarjetaActiva: number;
  clientesConEmailVerificado: number;
  premiosActivos: number;
  premiosUsados: number;
  suscripcionesActivas: number;
  clientesConSuscripcionActiva: number;
  clientesConMasDeUnaSuscripcionActiva: number;
  suscripcionesPorVencer7Dias: number;
  suscripcionesPorVencer30Dias: number;
  consumosDelMes: number;
};

type ClientesPorMesRow = {
  mes: string;
  nuevosUsuarios: number;
  acumulado: number;
};

type SuscripcionesPorMesRow = {
  mes: string;
  nuevasSuscripciones: number;
};

type ConsumosPorDiaRow = {
  fecha: string;
  movimientos: number;
  potes: number;
  toppings: number;
  barquillos: number;
  galletas: number;
};

type SuscripcionActivaRow = {
  id: number;
  cliente: string;
  suscripcion: string;
  inicio: string | null;
  fin: string | null;
  estado: string;
  proximoCiclo: string | null;
  diasParaVencer: number | null;
};

type ConsumoRecienteRow = {
  id: number;
  fecha: string;
  cliente: string;
  suscripcion: string;
  ciclo: number;
  potes: number;
  toppings: number;
  barquillos: number;
  galletas: number;
};

type DashboardResponse = {
  ok: boolean;
  kpis: KPIData;
  clientesPorMes: ClientesPorMesRow[];
  suscripcionesPorMes: SuscripcionesPorMesRow[];
  consumosPorDia: ConsumosPorDiaRow[];
  tablaSuscripcionesActivas: SuscripcionActivaRow[];
  tablaConsumoReciente: ConsumoRecienteRow[];
};

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL");
}

function formatearFechaHora(fecha?: string | null) {
  if (!fecha) return "-";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-CL");
}

function formatearMes(mes: string) {
  const [year, month] = mes.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("es-CL", {
    month: "short",
    year: "numeric",
  });
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
      {text}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function LineChart({
  title,
  labels,
  values,
}: {
  title: string;
  labels: string[];
  values: number[];
}) {
  const { points, maxValue } = useMemo(() => {
    const width = 680;
    const height = 220;
    const padding = 28;
    const max = Math.max(...values, 1);

    const pts = values.map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding +
            ((width - padding * 2) * index) / Math.max(values.length - 1, 1);

      const y =
        height - padding - ((height - padding * 2) * value) / Math.max(max, 1);

      return `${x},${y}`;
    });

    return {
      points: pts.join(" "),
      maxValue: max,
    };
  }, [values]);

  if (values.length === 0) {
    return <EmptyState text={`No hay datos para ${title.toLowerCase()}.`} />;
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4">
      <p className="mb-4 text-sm font-semibold text-violet-700">{title}</p>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <svg viewBox="0 0 680 220" className="h-[220px] w-full">
            <line
              x1="28"
              y1="192"
              x2="652"
              y2="192"
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            <line
              x1="28"
              y1="28"
              x2="28"
              y2="192"
              stroke="#E5E7EB"
              strokeWidth="1"
            />

            <polyline
              fill="none"
              stroke="#7C3AED"
              strokeWidth="3"
              points={points}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {values.map((value, index) => {
              const x =
                values.length === 1
                  ? 680 / 2
                  : 28 + ((680 - 56) * index) / Math.max(values.length - 1, 1);

              const y = 220 - 28 - ((220 - 56) * value) / Math.max(maxValue, 1);

              return (
                <g key={`${labels[index]}-${value}`}>
                  <circle cx={x} cy={y} r="4" fill="#7C3AED" />
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#525252"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-3 grid gap-2 text-xs text-neutral-600">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
              {labels.map((label) => (
                <div key={label} className="rounded-lg bg-neutral-50 px-2 py-2">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyText,
  maxHeight = "max-h-80",
  minTableWidth = "min-w-full",
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: Record<string, React.ReactNode>[];
  emptyText: string;
  maxHeight?: string;
  minTableWidth?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-2xl border border-neutral-200">
        <div className={`w-full max-w-full overflow-auto ${maxHeight}`}>
            <table className={`border-collapse text-sm ${minTableWidth}`}>
          <thead className="sticky top-0 bg-violet-50">
            <tr className="text-left text-violet-700">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 font-semibold ${column.className || ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-t border-neutral-200 text-neutral-700"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-top ${column.className || ""}`}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDashboard();
  }, []);

  async function cargarDashboard() {
    try {
      setCargando(true);
      setMensaje("");

      const res = await fetch("/api/dashboard/overview");
      const json = await res.json();

      if (!res.ok) {
        setMensaje(json?.message || "No se pudo cargar el dashboard.");
        setData(null);
        return;
      }

      setData(json);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
      setMensaje("Ocurrió un error inesperado al cargar el dashboard.");
      setData(null);
    } finally {
      setCargando(false);
    }
  }

  const clientesPorMesRows =
    data?.clientesPorMes.map((item) => ({
      mes: formatearMes(item.mes),
      nuevosUsuarios: item.nuevosUsuarios,
      acumulado: item.acumulado,
    })) || [];

  const suscripcionesActivasRows =
    data?.tablaSuscripcionesActivas.map((item) => ({
      cliente: item.cliente,
      suscripcion: item.suscripcion,
      inicio: formatearFecha(item.inicio),
      fin: formatearFecha(item.fin),
      estado: item.estado,
      proximoCiclo: formatearFecha(item.proximoCiclo),
      diasParaVencer: item.diasParaVencer ?? "-",
    })) || [];

  const consumoRecienteRows =
    data?.tablaConsumoReciente.map((item) => ({
      fecha: formatearFechaHora(item.fecha),
      cliente: item.cliente,
      suscripcion: item.suscripcion,
      ciclo: item.ciclo,
      potes: item.potes,
      toppings: item.toppings,
      barquillos: item.barquillos,
      galletas: item.galletas,
    })) || [];

  return (
    <main className="min-h-screen bg-[#F7F7F7] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-[#454545] transition hover:opacity-70"
          >
            ← Volver al inicio
          </Link>

          <span className="mt-5 inline-flex rounded-full bg-[#E1B4D0] px-3 py-1 text-sm font-medium text-[#454545]">
            Dashboard
          </span>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#111111]">
            Dashboard
          </h1>

          <p className="mt-3 max-w-3xl text-lg text-[#454545]">
            Vista analítica del sistema de fidelización y suscripciones.
          </p>
        </div>

        {cargando ? (
          <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-base leading-7 text-[#454545]">
              Cargando dashboard...
            </p>
          </section>
        ) : mensaje || !data ? (
          <section className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
            <p className="text-base leading-7 text-red-600">
              {mensaje || "No se pudo cargar el dashboard."}
            </p>
          </section>
        ) : (
          <div className="space-y-8">
            <SectionCard
              title="Resumen general"
              subtitle="Indicadores ejecutivos del sistema."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Clientes totales"
                  value={data.kpis.clientesTotales}
                />
                <KpiCard
                  label="Tarjetas activas"
                  value={data.kpis.clientesConTarjetaActiva}
                />
                <KpiCard
                  label="Emails verificados"
                  value={data.kpis.clientesConEmailVerificado}
                />
                <KpiCard
                  label="Premios activos"
                  value={data.kpis.premiosActivos}
                />
                <KpiCard
                  label="Premios usados"
                  value={data.kpis.premiosUsados}
                />
                <KpiCard
                  label="Suscripciones activas"
                  value={data.kpis.suscripcionesActivas}
                />
                <KpiCard
                  label="Clientes con suscripción activa"
                  value={data.kpis.clientesConSuscripcionActiva}
                />
                <KpiCard
                  label="Consumos del mes"
                  value={data.kpis.consumosDelMes}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Evolución de clientes"
              subtitle="Crecimiento mensual de usuarios registrados."
            >
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="min-w-0">
                    <LineChart
                        title="Nuevos usuarios por mes"
                        labels={data.clientesPorMes.map((item) => formatearMes(item.mes))}
                        values={data.clientesPorMes.map((item) => item.nuevosUsuarios)}
                    />
                </div>

              <div className="min-w-0">
                  <p className="mb-4 text-sm font-semibold text-violet-700">
                    Detalle mensual
                  </p>
                  <DataTable
                    columns={[
                        { key: "mes", label: "Mes", className: "whitespace-nowrap" },
                        { key: "nuevosUsuarios", label: "Nuevos usuarios" },
                        { key: "acumulado", label: "Acumulado" },
                    ]}
                    rows={clientesPorMesRows}
                    emptyText="No hay datos de crecimiento de clientes."
                    maxHeight="max-h-72"
                    minTableWidth="min-w-full"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Suscripciones"
              subtitle="Base activa, vencimientos y evolución mensual."
            >
              <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Activas"
                  value={data.kpis.suscripcionesActivas}
                />
                <KpiCard
                  label="Vencen en 7 días"
                  value={data.kpis.suscripcionesPorVencer7Dias}
                />
                <KpiCard
                  label="Vencen en 30 días"
                  value={data.kpis.suscripcionesPorVencer30Dias}
                />
                <KpiCard
                  label="Clientes con más de una activa"
                  value={data.kpis.clientesConMasDeUnaSuscripcionActiva}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="min-w-0">
                    <LineChart
                        title="Nuevas suscripciones por mes"
                        labels={data.suscripcionesPorMes.map((item) =>
                        formatearMes(item.mes)
                        )}
                        values={data.suscripcionesPorMes.map(
                        (item) => item.nuevasSuscripciones
                        )}
                    />
                </div>

              <div className="min-w-0">
                  <p className="mb-4 text-sm font-semibold text-violet-700">
                    Suscripciones activas
                  </p>
                  <DataTable
                    columns={[
                        { key: "cliente", label: "Cliente", className: "whitespace-nowrap" },
                        { key: "suscripcion", label: "Suscripción", className: "min-w-[220px]" },
                        {
                        key: "inicio",
                        label: "Inicio",
                        className: "whitespace-nowrap",
                        },
                        {
                        key: "fin",
                        label: "Fin",
                        className: "whitespace-nowrap",
                        },
                        {
                        key: "estado",
                        label: "Estado",
                        className: "whitespace-nowrap",
                        },
                        {
                        key: "proximoCiclo",
                        label: "Próximo ciclo",
                        className: "whitespace-nowrap",
                        },
                        {
                        key: "diasParaVencer",
                        label: "Días para vencer",
                        className: "whitespace-nowrap",
                        },
                    ]}
                    rows={suscripcionesActivasRows}
                    emptyText="No hay suscripciones activas."
                    maxHeight="max-h-96"
                    minTableWidth="min-w-[720px]"
                    />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Uso de suscripciones"
              subtitle="Actividad reciente de consumos registrados."
            >
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="min-w-0">
                    <LineChart
                        title="Movimientos de consumo por día"
                        labels={data.consumosPorDia.map((item) =>
                        formatearFecha(item.fecha)
                        )}
                        values={data.consumosPorDia.map((item) => item.movimientos)}
                    />
                    </div>

                    <div className="min-w-0">
                    <LineChart
                        title="Potes consumidos por día"
                        labels={data.consumosPorDia.map((item) =>
                        formatearFecha(item.fecha)
                        )}
                        values={data.consumosPorDia.map((item) => item.potes)}
                    />
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-4 text-sm font-semibold text-violet-700">
                  Consumo reciente de suscripciones
                </p>
                <DataTable
                    columns={[
                        { key: "fecha", label: "Fecha", className: "whitespace-nowrap" },
                        { key: "cliente", label: "Cliente", className: "whitespace-nowrap" },
                        { key: "suscripcion", label: "Suscripción", className: "min-w-[220px]" },
                        { key: "ciclo", label: "Ciclo", className: "whitespace-nowrap" },
                        { key: "potes", label: "Potes", className: "whitespace-nowrap" },
                        { key: "toppings", label: "Toppings", className: "whitespace-nowrap" },
                        { key: "barquillos", label: "Barquillos", className: "whitespace-nowrap" },
                        { key: "galletas", label: "Galletas", className: "whitespace-nowrap" },
                    ]}
                    rows={consumoRecienteRows}
                    emptyText="No hay consumos recientes."
                    maxHeight="max-h-96"
                    minTableWidth="min-w-[860px]"
                  />
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </main>
  );
}