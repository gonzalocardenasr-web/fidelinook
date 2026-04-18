type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  created_At?: string | null;
  fecha_activacion?: string | null;
  email_verificado?: boolean;
  tarjeta_activa?: boolean;
};

type Movimiento = {
  id: string;
  nombre: string;
  tipo: "registro" | "activacion";
  estado: "Validado" | "Por validar";
  fecha: string;
};

type Props = {
  clientes: Cliente[];
};

function formatearFecha(fecha: string) {
  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function UltimosMovimientosCard({ clientes }: Props) {
  const movimientos: Movimiento[] = clientes
    .flatMap((cliente) => {
      const eventos: Movimiento[] = [];

      if (cliente.created_At) {
        eventos.push({
          id: `registro-${cliente.id}`,
          nombre: cliente.nombre || "Cliente sin nombre",
          tipo: "registro",
          estado:
            cliente.email_verificado && cliente.tarjeta_activa
              ? "Validado"
              : "Por validar",
          fecha: cliente.created_At,
        });
      }

      if (cliente.fecha_activacion) {
        eventos.push({
          id: `activacion-${cliente.id}`,
          nombre: cliente.nombre || "Cliente sin nombre",
          tipo: "activacion",
          estado: "Validado",
          fecha: cliente.fecha_activacion,
        });
      }

      return eventos;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5);

  return (
    <section className="rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-violet-800">
              Últimos movimientos
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Últimos registros y activaciones de clientes
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {movimientos.length === 0 ? (
          <p className="text-sm text-neutral-600">
            No hay movimientos recientes para mostrar.
          </p>
        ) : (
          <div className="space-y-3">
            {movimientos.map((movimiento) => (
              <div
                key={movimiento.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[#111111]">
                      {movimiento.nombre}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {movimiento.tipo === "registro"
                        ? "Registro de cliente"
                        : "Activación de tarjeta"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        movimiento.estado === "Validado"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {movimiento.estado}
                    </span>

                    <p className="text-sm text-neutral-500">
                      {formatearFecha(movimiento.fecha)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}