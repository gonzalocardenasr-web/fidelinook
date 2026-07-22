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
  onOpenCustomMessage: () => void;
  promotionalStamps: number;
  onPromotionalStampsChange: (value: number) => void;
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
  onOpenCustomMessage,
  promotionalStamps,
  onPromotionalStampsChange,
}: Props) {
  const premiosActivos = selectedCliente?.loyalty?.activeRewardsCount ?? 0;

  const sellosDisponibles = selectedCliente?.loyalty?.currentStampBalance ?? 0;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const isSuccessMessage =
    Boolean(message) &&
    message?.toLowerCase().includes("venta creada correctamente");

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <h2 className="shrink-0 text-[13px] font-black uppercase tracking-wide text-neutral-500">
        Contexto
      </h2>

      <div className="mt-2 shrink-0">
        <SalesChannelSelector
          channel={channel}
          externalOrderId={externalOrderId}
          onChannelChange={onChannelChange}
          onExternalOrderIdChange={onExternalOrderIdChange}
        />
      </div>

      <section className="mt-2 shrink-0 rounded-lg border border-neutral-200 bg-white p-2.5">
        <ClienteSelector
          value={selectedCliente}
          onChange={onClienteChange}
          resetKey={clienteSelectorResetKey}
        />

        {selectedCliente && (
          <div className="mt-2">
            <div className="min-w-0 text-[10px] leading-tight text-neutral-500">
              {selectedCliente.telefono && (
                <p className="truncate">{selectedCliente.telefono}</p>
              )}

              {selectedCliente.correo && (
                <p className="mt-0.5 truncate">{selectedCliente.correo}</p>
              )}

              {!selectedCliente.telefono && !selectedCliente.correo && (
                <p>Sin datos de contacto</p>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="flex items-center justify-between rounded-md bg-neutral-50 px-2 py-1.5">
                <span className="text-[10px] font-semibold text-neutral-500">
                  Sellos
                </span>

                <span className="text-[13px] font-black text-violet-700">
                  {sellosDisponibles}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-md bg-neutral-50 px-2 py-1.5">
                <span className="text-[10px] font-semibold text-neutral-500">
                  Premios
                </span>

                <span className="text-[13px] font-black text-pink-700">
                  {premiosActivos}
                </span>
              </div>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1">
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
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
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
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
        )}
      </section>

      <section className="mt-2 shrink-0 rounded-lg border border-violet-100 bg-violet-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">
              Sellos promocionales
            </p>

            <p className="mt-0.5 text-[9px] leading-tight text-neutral-500">
              Promoción RRSS
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!selectedCliente || promotionalStamps <= 0}
              onClick={() =>
                onPromotionalStampsChange(Math.max(0, promotionalStamps - 1))
              }
              className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-200 bg-white text-sm font-black text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>

            <span className="flex h-7 min-w-8 items-center justify-center rounded-md bg-white px-2 text-sm font-black text-violet-700">
              {promotionalStamps}
            </span>

            <button
              type="button"
              disabled={!selectedCliente || promotionalStamps >= 5}
              onClick={() =>
                onPromotionalStampsChange(Math.min(5, promotionalStamps + 1))
              }
              className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-200 bg-white text-sm font-black text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {!selectedCliente && (
          <p className="mt-1.5 text-[9px] font-semibold text-amber-700">
            Selecciona un cliente para asignar sellos.
          </p>
        )}
      </section>

      <section className="mt-2 shrink-0 rounded-lg bg-neutral-50 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            Pedido actual
          </span>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-neutral-500">
              <strong className="font-black text-neutral-900">
                {totalItems}
              </strong>{" "}
              ítem{totalItems === 1 ? "" : "s"}
            </span>

            <span className="text-[13px] font-black text-violet-700">
              ${total.toLocaleString("es-CL")}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-2 shrink-0">
        <button
          type="button"
          onClick={onOpenCustomMessage}
          className="w-full cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 active:scale-[0.98]"
        >
          Mensaje personalizado
        </button>
      </section>

      <div className="mt-2 min-h-0 flex-1">
        {message ? (
          <section
            className={`rounded-lg border px-2.5 py-2 text-[11px] font-semibold leading-snug ${
              isSuccessMessage
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-violet-100 bg-white text-neutral-700"
            }`}
          >
            {message}
          </section>
        ) : (
          <section className="rounded-lg border border-dashed border-neutral-200 bg-white px-2.5 py-2 text-[10px] leading-snug text-neutral-400">
            {channel === "local"
              ? "Venta local lista para construir."
              : externalOrderId.trim()
                ? "Pedido digital listo para construir."
                : "Falta ingresar el número externo del pedido."}
          </section>
        )}
      </div>
    </aside>
  );
}
