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
  fecha_ultimo_sello?: string | null;
  fecha_ultimo_canje?: string | null;
};

type Props = {
  clientes: Cliente[];
  setMensaje: (value: string) => void;
};

export default function AdminExport({ clientes, setMensaje }: Props) {
  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) return "";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const escaparCSV = (valor: string | number | boolean | null | undefined) => {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
  };

  const exportarCSV = () => {
    try {
      if (!clientes.length) {
        setMensaje("No hay clientes para exportar.");
        return;
      }

      const headers = [
        "ID",
        "Nombre",
        "Correo",
        "Teléfono",
        "Sellos actuales",
        "Premios activos",
        "Premios usados",
        "Último sello",
        "Último canje",
        "Tarjeta activa",
        "Correo verificado",
        "Public token",
      ];

      const rows = clientes.map((cliente) => {
        const premiosArray = Array.isArray(cliente.premios) ? cliente.premios : [];

        const premiosActivos = premiosArray.filter(
          (premio) => premio.estado === "activo"
        ).length;

        const premiosUsados = premiosArray.filter(
          (premio) => premio.estado === "usado"
        ).length;

        return [
          cliente.id,
          cliente.nombre,
          cliente.correo,
          cliente.telefono,
          cliente.sellos ?? 0,
          premiosActivos,
          premiosUsados,
          formatearFecha(cliente.fecha_ultimo_sello),
          formatearFecha(cliente.fecha_ultimo_canje),
          cliente.tarjeta_activa ? "Sí" : "No",
          cliente.email_verificado ? "Sí" : "No",
          cliente.public_token,
        ]
          .map(escaparCSV)
          .join(",");
      });

      const csvContent = [headers.map(escaparCSV).join(","), ...rows].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const fecha = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.setAttribute("download", `clientes-fidelinook-${fecha}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      setMensaje("Clientes exportados correctamente.");
    } catch (error) {
      console.error("Error exportando CSV:", error);
      setMensaje("Ocurrió un error al exportar los clientes.");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={exportarCSV}
        className="w-full px-4 py-4 text-left text-lg font-semibold hover:bg-neutral-50"
      >
        Exportar clientes CSV
      </button>
    </div>
  );
}