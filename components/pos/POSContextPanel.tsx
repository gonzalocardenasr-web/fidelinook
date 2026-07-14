import { CartItem } from "../../types/sales";
import ClienteSelector, {
  ClienteSelectorValue,
} from "../client/ClienteSelector";
import SalesChannelSelector, { SalesChannel } from "./SalesChannelSelector";

type Props = {
  selectedCliente: ClienteSelectorValue | null;
  cart: CartItem[];
  total: number;
  message?: string;
  onClienteChange: (cliente: ClienteSelectorValue | null) => void;
  clienteSelectorResetKey: number;
  channel: SalesChannel;
  externalOrderId: string;
  onChannelChange: (channel: SalesChannel) => void;
  onExternalOrderIdChange: (value: string) => void;
};

export default function POSContextPanel({
  selectedCliente,
  cart,
  total,
  message,
  onClienteChange,
  clienteSelectorResetKey,
  channel,
  externalOrderId,
  onChannelChange,
  onExternalOrderIdChange,
}: Props) {
  const premiosActivos = Array.isArray(selectedCliente?.premios)
    ? selectedCliente.premios.filter(
        (premio: any) => premio.estado === "activo",
      ).length
    : 0;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="space-y-3">
      <section>
        <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
          Contexto
        </h2>
        <SalesChannelSelector
          channel={channel}
          externalOrderId={externalOrderId}
          onChannelChange={onChannelChange}
          onExternalOrderIdChange={onExternalOrderIdChange}
        />

        <div className="mt-3">
          <ClienteSelector
            value={selectedCliente}
            onChange={onClienteChange}
            resetKey={clienteSelectorResetKey}
          />
        </div>

        {selectedCliente ? (
          <div className="mt-3 rounded-2xl bg-violet-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              Cliente
            </p>

            <p className="mt-1 font-black text-neutral-900">
              {selectedCliente.nombre}
            </p>

            <div className="mt-1 space-y-0.5 text-xs text-neutral-600">
              {selectedCliente.telefono && <p>{selectedCliente.telefono}</p>}
              {selectedCliente.correo && <p>{selectedCliente.correo}</p>}
              {!selectedCliente.telefono && !selectedCliente.correo && (
                <p>Sin contacto</p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-semibold text-neutral-500">Sellos</p>
                <p className="mt-1 text-lg font-black text-violet-700">
                  {selectedCliente.sellos ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-semibold text-neutral-500">
                  Premios
                </p>
                <p className="mt-1 text-lg font-black text-pink-700">
                  {premiosActivos}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  selectedCliente.tarjeta_activa
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {selectedCliente.tarjeta_activa
                  ? "Tarjeta activa"
                  : "Sin activar"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  selectedCliente.email_verificado
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {selectedCliente.email_verificado
                  ? "Correo verificado"
                  : "No verificado"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
            Venta sin cliente. No se asociará historial ni beneficios.
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Pedido actual
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white p-3">
            <p className="text-xs font-semibold text-neutral-500">Ítems</p>
            <p className="mt-1 text-lg font-black text-neutral-900">
              {totalItems}
            </p>
          </div>

          <div className="rounded-xl bg-white p-3">
            <p className="text-xs font-semibold text-neutral-500">Total</p>
            <p className="mt-1 text-lg font-black text-violet-700">
              ${total.toLocaleString("es-CL")}
            </p>
          </div>
        </div>
      </section>

      {message && (
        <section className="rounded-2xl border border-violet-100 bg-white p-4 text-sm text-neutral-700">
          {message}
        </section>
      )}
    </div>
  );
}
