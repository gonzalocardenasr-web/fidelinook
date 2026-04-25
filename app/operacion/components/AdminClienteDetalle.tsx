import QRCode from "react-qr-code";

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
  cliente: Cliente | null;
  premiosActivos: Premio[];
  mensaje: string;
  tipoMensaje: "success" | "error" | "info";
  setMensaje: (value: string) => void;
  procesandoCompra: boolean;
  procesandoCanje: boolean;
  reiniciando: boolean;
  rol: "admin" | "superadmin" | null;
  validarCompra: () => Promise<void>;
  canjearPrimerPremio: () => Promise<void>;
  canjearPremioPorId: (premioId: number) => Promise<void>;
  eliminarClienteSeleccionado?: () => void;
  reiniciarDatos?: () => void;
  exportarCSV?: () => void;
  mostrarAccionesAdministrativas: boolean;
};

const META_SELLOS = 7;

export default function AdminClienteDetalle({
  cliente,
  premiosActivos,
  mensaje,
  tipoMensaje,
  setMensaje,
  procesandoCompra,
  procesandoCanje,
  reiniciando,
  rol,
  validarCompra,
  canjearPrimerPremio,
  canjearPremioPorId,
  eliminarClienteSeleccionado,
  reiniciarDatos,
  exportarCSV,
  mostrarAccionesAdministrativas,
}: Props) {
  if (!cliente) return null;

  const premiosArray = Array.isArray(cliente.premios) ? cliente.premios : [];

  const premiosUsados = premiosArray.filter(
    (premio) => premio.estado === "usado"
  ).length;

  const formatearFecha = (fecha?: string | null) => {
    if (!fecha) return "Sin registro";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "Sin registro";

    return date.toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <>
      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-600">
              Cliente seleccionado
            </p>

            <h2 className="mt-1 text-2xl font-bold text-neutral-900">
              {cliente.nombre}
            </h2>

            <div className="mt-2 space-y-1 text-sm text-neutral-600">
              <p>{cliente.correo}</p>
              <p>{cliente.telefono}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  cliente.tarjeta_activa
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {cliente.tarjeta_activa
                  ? "Tarjeta activa"
                  : "Pendiente de activación"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  cliente.email_verificado
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {cliente.email_verificado
                  ? "Correo verificado"
                  : "Correo no verificado"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[220px]">
            <div className="rounded-xl bg-violet-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Sellos
              </p>
              <p className="mt-1 text-xl font-bold text-violet-700">
                {cliente.sellos ?? 0} / {META_SELLOS}
              </p>
            </div>

            <div className="rounded-xl bg-pink-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                Premios
              </p>
              <p className="mt-1 text-xl font-bold text-pink-700">
                {premiosActivos.length}
              </p>

              <div className="mt-4 space-y-3">
                {premiosActivos.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No hay premios activos
                  </p>
                ) : (
                  premiosActivos.map((premio) => (
                    <div
                      key={premio.id}
                      className="flex items-center justify-between rounded-2xl border p-3"
                    >
                      <div>
                        <p className="font-semibold text-sm">
                          {premio.nombre}
                        </p>
                        {premio.vencimiento && (
                          <p className="text-xs text-neutral-500">
                            Vence: {premio.vencimiento}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => canjearPremioPorId(premio.id)}
                        disabled={procesandoCanje}
                        className="rounded-xl bg-[#4c00f7] px-3 py-2 text-white text-sm"
                      >
                        Canjear
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={`/t/${cliente.public_token}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Abrir tarjeta
          </a>

          <button
            onClick={() => {
              const url = `${window.location.origin}/t/${cliente.public_token}`;
              navigator.clipboard.writeText(url);
              setMensaje("Link copiado al portapapeles");
            }}
            className="cursor-pointer rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-200"
          >
            Copiar link
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-medium text-neutral-700">QR tarjeta</p>

          <div className="inline-block rounded-lg bg-white p-3 shadow-sm">
            <QRCode
              value={`${window.location.origin}/t/${cliente.public_token}`}
              size={120}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-4 text-sm font-medium text-neutral-700">
            Historial cliente
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Último sello
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {formatearFecha(cliente.fecha_ultimo_sello)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Último canje
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {formatearFecha(cliente.fecha_ultimo_canje)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Sellos actuales
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {cliente.sellos ?? 0} / {META_SELLOS}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Premios usados
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {premiosUsados}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          onClick={validarCompra}
          disabled={
            procesandoCompra || procesandoCanje || reiniciando || !cliente
          }
          className="cursor-pointer rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-white shadow hover:opacity-90 disabled:opacity-60"
        >
          {procesandoCompra ? "Validando..." : "Validar compra"}
        </button>
        
        {mostrarAccionesAdministrativas && rol === "superadmin" && (
          <>
            <button
              onClick={eliminarClienteSeleccionado}
              disabled={
                reiniciando || procesandoCompra || procesandoCanje || !cliente
              }
              className="cursor-pointer rounded-lg bg-red-500 px-4 py-3 text-white hover:opacity-90 disabled:opacity-60"
            >
              {reiniciando ? "Procesando..." : "Eliminar cliente"}
            </button>

            <button
              onClick={reiniciarDatos}
              disabled={reiniciando || procesandoCompra || procesandoCanje}
              className="cursor-pointer rounded-lg border border-red-300 bg-white px-4 py-3 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {reiniciando ? "Procesando..." : "Eliminar todos"}
            </button>

            <button
              onClick={exportarCSV}
              disabled={reiniciando || procesandoCompra || procesandoCanje}
              className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              Exportar clientes CSV
            </button>
          </>
        )}
      </div>

      {mensaje && (
        <div
          className={`mt-6 rounded-lg p-4 text-sm ${
            tipoMensaje === "success"
              ? "border border-[#D8E7C9] bg-[#F3FAEC] text-[#42622B]"
              : tipoMensaje === "error"
              ? "border border-[#E7C9D1] bg-[#FFF1F4] text-[#8A3550]"
              : "border border-[#E7C8F2] bg-[#FCF8FF] text-neutral-700"
          }`}
        >
          {mensaje}
        </div>
      )}

    </>
  );
}