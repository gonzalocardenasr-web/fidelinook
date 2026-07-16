import { SaleDocument } from "../../lib/documents/sales/types";
import Image from "next/image";
import { SaleDocument } from "../../lib/documents/sales/types";

type Props = {
  document: SaleDocument;
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString("es-CL")}`;
}

function formatOptionNames(
  options: SaleDocument["items"][number]["options"],
  groupCodes: string[],
) {
  const normalizedCodes = groupCodes.map((code) => code.toLowerCase());

  const names = options
    .filter((option) =>
      normalizedCodes.includes(String(option.groupCode || "").toLowerCase()),
    )
    .flatMap((option) =>
      Array.from(
        {
          length: Math.max(Number(option.quantity || 1), 1),
        },
        () => option.name,
      ),
    );

  const counts = names.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => (count > 1 ? `${name} x${count}` : name))
    .join(" + ");
}

export default function SaleReceipt80mm({ document }: Props) {
  return (
    <article className="sale-receipt mx-auto w-[72mm] bg-white px-[2mm] py-[3mm] font-sans text-black">
      <header className="text-center">
        <div className="flex h-[17mm] items-center justify-center overflow-hidden">
          <Image
            src="/nook-logo-negro.png"
            alt="Nook"
            width={190}
            height={80}
            priority
            className="block h-auto w-[42mm] object-contain"
          />
        </div>

        <div className="mb-[3mm] mt-[1mm] border-t border-dashed border-black" />

        <p className="text-[13px] font-black uppercase">Comprobante de venta</p>

        <p className="mt-1 text-[10px] leading-tight">
          {document.confirmedAtChile}
        </p>
      </header>

      <section className="mt-[3mm] space-y-[1mm] text-[10px] leading-tight">
        <div className="flex justify-between gap-3">
          <span className="font-bold">Pedido</span>
          <span className="text-right font-black">
            {document.order.displayOrderCode}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="font-bold">Canal</span>
          <span className="text-right">{document.channelLabel}</span>
        </div>

        {document.externalOrderId && (
          <div className="flex justify-between gap-3">
            <span className="font-bold">Referencia</span>
            <span className="max-w-[44mm] break-words text-right">
              {document.externalOrderId}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <span className="font-bold">Pago</span>
          <span className="text-right">{document.paymentMethodLabel}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="font-bold">Cliente</span>
          <span className="max-w-[44mm] break-words text-right">
            {document.customer.name}
          </span>
        </div>
      </section>

      <div className="my-[3mm] border-t border-dashed border-black" />

      <section>
        <div className="mb-[2mm] grid grid-cols-[1fr_18mm] gap-2 text-[9px] font-black uppercase">
          <span>Detalle</span>
          <span className="text-right">Total</span>
        </div>

        <div className="space-y-[3mm]">
          {document.items.map((item) => {
            const flavors = formatOptionNames(item.options, [
              "flavor",
              "sabor",
            ]);

            const toppings = formatOptionNames(item.options, [
              "topping",
              "toppings",
            ]);

            return (
              <div key={item.id} className="text-[10px] leading-tight">
                <div className="grid grid-cols-[1fr_18mm] gap-2">
                  <p className="font-bold">
                    {item.quantity}x {item.name}
                  </p>

                  <p className="text-right font-bold">
                    {formatMoney(item.totalPrice)}
                  </p>
                </div>

                {flavors && (
                  <p className="mt-[0.8mm] pl-[3mm] text-[9px]">
                    Sabores: {flavors}
                  </p>
                )}

                {toppings && (
                  <p className="mt-[0.8mm] pl-[3mm] text-[9px]">
                    Toppings: {toppings}
                  </p>
                )}

                {item.notes && (
                  <p className="mt-[0.8mm] pl-[3mm] text-[9px]">{item.notes}</p>
                )}

                {item.quantity > 1 && (
                  <p className="mt-[0.8mm] pl-[3mm] text-[8px]">
                    Unitario: {formatMoney(item.unitPrice)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="my-[3mm] border-t border-dashed border-black" />

      <section className="space-y-[1mm] text-[10px]">
        {document.discountTotal > 0 && (
          <>
            <div className="flex justify-between gap-3">
              <span>Subtotal</span>

              <span className="font-bold">
                {formatMoney(document.subtotal)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span>Descuentos</span>

              <span className="font-bold">
                -{formatMoney(document.discountTotal)}
              </span>
            </div>
          </>
        )}

        <div
          className={`flex items-end justify-between gap-3 pt-[2mm] ${
            document.discountTotal > 0 ? "mt-[2mm] border-t border-black" : ""
          }`}
        >
          <span className="text-[12px] font-black uppercase">Total</span>

          <span className="text-[17px] font-black">
            {formatMoney(document.total)}
          </span>
        </div>
      </section>

      {document.order.notes && (
        <>
          <div className="my-[3mm] border-t border-dashed border-black" />

          <section className="text-[9px] leading-tight">
            <p className="font-black uppercase">Observación</p>

            <p className="mt-1">{document.order.notes}</p>
          </section>
        </>
      )}

      <div className="my-[3mm] border-t border-dashed border-black" />

      <footer className="text-center text-[9px] leading-tight">
        <p className="font-bold">
          Gracias por preferir Nook. Esperamos verte pronto! =)
        </p>

        <p className="mt-1">
          Comprobante interno de venta. Conservalo para cualquier consulta.
        </p>
      </footer>
    </article>
  );
}
