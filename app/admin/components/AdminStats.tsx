type Premio = {
  id: number;
  nombre: string;
  estado: "activo" | "usado";
  vencimiento?: string;
};

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  sellos: number;
  premios: Premio[] | number | null;
  public_token: string;
  tarjeta_activa?: boolean;
  email_verificado?: boolean;
};

type Props = {
  clientes: Cliente[];
};

export default function AdminStats({ clientes }: Props) {
  const totalClientes = clientes.length;

  const tarjetasActivas = clientes.filter((c) => c.tarjeta_activa).length;

  const correosVerificados = clientes.filter((c) => c.email_verificado).length;

  const premiosActivos = clientes.reduce((acc, cliente) => {
    const premios = Array.isArray(cliente.premios) ? cliente.premios : [];
    const activos = premios.filter((premio) => premio.estado === "activo").length;
    return acc + activos;
  }, 0);

  const ahora = new Date();

  const premiosPorVencer = clientes.reduce((acc, cliente) => {
    const premios = Array.isArray(cliente.premios) ? cliente.premios : [];

    const porVencer = premios.filter((premio) => {
      if (premio.estado !== "activo" || !premio.vencimiento) return false;

      const fechaVencimiento = new Date(premio.vencimiento);
      const diffMs = fechaVencimiento.getTime() - ahora.getTime();
      const diffDias = diffMs / (1000 * 60 * 60 * 24);

      return diffDias >= 0 && diffDias <= 3;
    }).length;

    return acc + porVencer;
  }, 0);

  const stats = [
    {
      label: "Clientes registrados",
      value: totalClientes,
      bg: "bg-violet-50",
      text: "text-violet-700",
    },
    {
      label: "Tarjetas activas",
      value: tarjetasActivas,
      bg: "bg-green-50",
      text: "text-green-700",
    },
    {
      label: "Correos verificados",
      value: correosVerificados,
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
    {
      label: "Premios activos",
      value: premiosActivos,
      bg: "bg-pink-50",
      text: "text-pink-700",
    },
    {
      label: "Premios por vencer",
      value: premiosPorVencer,
      bg: "bg-amber-50",
      text: "text-amber-700",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-2xl border border-neutral-200 p-4 shadow-sm ${stat.bg}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {stat.label}
          </p>
          <p className={`mt-2 text-2xl font-bold ${stat.text}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}