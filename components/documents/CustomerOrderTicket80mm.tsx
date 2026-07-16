import Image from "next/image";

import { SaleDocument } from "../../lib/documents/sales/types";

type Props = {
  document: SaleDocument;
};

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

function getDisplayOrderNumber(document: SaleDocument) {
  if (
    document.order.dailyOrderNumber !== null &&
    document.order.dailyOrderNumber !== undefined
  ) {
    return `#${String(document.order.dailyOrderNumber).padStart(3, "0")}`;
  }

  const match = document.order.displayOrderCode.match(/#\s*(\d+)/);

  if (match?.[1]) {
    return `#${match[1].padStart(3, "0")}`;
  }

  return document.order.displayOrderCode;
}

export default function CustomerOrderTicket80mm({ document }: Props) {
  const displayOrderNumber = getDisplayOrderNumber(document);

  return (
    <article className="customer-order-ticket mx-auto w-[72mm] bg-white px-[2mm] py-[3mm] font-sans text-black">
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

        <p className="text-[11px] font-black uppercase tracking-wide">
          Tu número de pedido
        </p>

        <p className="mt-[1mm] text-[38px] font-black leading-none tracking-tight">
          {displayOrderNumber}
        </p>

        <p className="mt-[2mm] text-[9px] leading-tight">
          {document.confirmedAtChile}
        </p>
      </header>

      <div className="my-[3mm] border-t border-dashed border-black" />

      <section className="space-y-[1mm] text-[10px] leading-tight">
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
          <span className="font-bold">Cliente</span>

          <span className="max-w-[44mm] break-words text-right">
            {document.customer.name}
          </span>
        </div>
      </section>

      <div className="my-[3mm] border-t border-dashed border-black" />

      <section>
        <p className="mb-[2mm] text-[9px] font-black uppercase">Tu pedido</p>

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
                <p className="font-black">
                  {item.quantity}x {item.name}
                </p>

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
              </div>
            );
          })}
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
        <p className="font-black">Conserva este ticket</p>

        <p className="mt-1">
          Te llamaremos por tu número cuando el pedido esté listo.
        </p>

        <p className="mt-[2mm] font-bold">Gracias por preferir Nook. =)</p>
      </footer>
    </article>
  );
}
