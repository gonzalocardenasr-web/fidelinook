export type SalesChannel =
  | "local"
  | "shopify"
  | "uber_eats"
  | "rappi"
  | "pedidosya";

type Props = {
  channel: SalesChannel;
  externalOrderId: string;
  onChannelChange: (channel: SalesChannel) => void;
  onExternalOrderIdChange: (value: string) => void;
};

const digitalChannels: {
  value: Exclude<SalesChannel, "local">;
  label: string;
}[] = [
  { value: "shopify", label: "Shopify" },
  { value: "uber_eats", label: "Uber Eats" },
  { value: "rappi", label: "Rappi" },
  { value: "pedidosya", label: "PedidosYa" },
];

export default function SalesChannelSelector({
  channel,
  externalOrderId,
  onChannelChange,
  onExternalOrderIdChange,
}: Props) {
  const isDigital = channel !== "local";

  function selectMode(mode: "local" | "digital") {
    if (mode === "local") {
      onChannelChange("local");
      onExternalOrderIdChange("");
      return;
    }

    if (channel === "local") {
      onChannelChange("shopify");
    }
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        Origen de la venta
      </p>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => selectMode("local")}
          className={`cursor-pointer rounded-md border px-2 py-1.5 text-[10px] font-bold transition active:scale-[0.99] ${
            !isDigital
              ? "border-violet-300 bg-violet-600 text-white"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-violet-300 hover:bg-violet-50"
          }`}
        >
          Local
        </button>

        <button
          type="button"
          onClick={() => selectMode("digital")}
          className={`cursor-pointer rounded-md border px-2 py-1.5 text-[10px] font-bold transition active:scale-[0.99] ${
            isDigital
              ? "border-violet-300 bg-violet-600 text-white"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-violet-300 hover:bg-violet-50"
          }`}
        >
          Digital
        </button>
      </div>

      {isDigital && (
        <div className="mt-2 space-y-1.5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              Plataforma
            </label>

            <select
              value={channel}
              onChange={(event) =>
                onChannelChange(event.target.value as SalesChannel)
              }
              className="mt-1 h-8 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 text-[12px] font-bold outline-none transition hover:border-violet-300 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              {digitalChannels.map((digitalChannel) => (
                <option key={digitalChannel.value} value={digitalChannel.value}>
                  {digitalChannel.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              Número externo
            </label>

            <input
              value={externalOrderId}
              onChange={(event) => onExternalOrderIdChange(event.target.value)}
              placeholder="Ej: #1042"
              className="mt-1 h-8 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[12px] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>
      )}
    </section>
  );
}
