import Image from "next/image";

import { SaleDocument } from "../../lib/documents/sales/types";

type Props = {
  document: SaleDocument;
};

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

function getOrderTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function getRepeatedOptionNames(
  options: SaleDocument["items"][number]["options"],
) {
  const expandedNames = options.flatMap((option) => {
    const name = normalizeText(option.name);

    if (!name) return [];

    return Array.from(
      {
        length: Math.max(Number(option.quantity || 1), 1),
      },
      () => name,
    );
  });

  const counts = expandedNames.reduce<Record<string, number>>(
    (accumulator, name) => {
      accumulator[name] = (accumulator[name] || 0) + 1;
      return accumulator;
    },
    {},
  );

  return Object.entries(counts).map(([name, count]) =>
    count > 1 ? `${name} x${count}` : name,
  );
}

function getNoteParts(notes?: string | null) {
  const normalized = normalizeText(notes);

  if (!normalized) return [];

  return normalized
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
}

function removeRepeatedValues(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const comparisonKey = value.toLocaleLowerCase("es-CL");

    if (seen.has(comparisonKey)) {
      return false;
    }

    seen.add(comparisonKey);
    return true;
  });
}

function getItemAdditions(item: SaleDocument["items"][number]) {
  /*
   * El ticket no distingue visualmente entre sabores,
   * toppings, baños, formatos u otros extras.
   *
   * Todo se presenta como configuración del producto principal.
   *
   * Los helados simple y doble no mostrarán sabores porque
   * el POS no registra esa selección.
   *
   * El pote mixto sí mostrará los sabores realmente guardados
   * en sale_item_options.
   *
   * Los potes armados normalmente no requieren configuraciones:
   * su composición ya está expresada en el nombre del producto.
   */
  const optionNames = getRepeatedOptionNames(item.options);
  const noteParts = getNoteParts(item.notes);

  return removeRepeatedValues([...optionNames, ...noteParts]);
}

function formatItemLine(item: SaleDocument["items"][number]) {
  const additions = getItemAdditions(item);
  const baseLabel = `${item.quantity}x ${item.name}`;

  if (additions.length === 0) {
    return baseLabel;
  }

  return `${baseLabel} (${additions.join(", ")})`;
}

export default function CustomerOrderTicket80mm({ document }: Props) {
  const displayOrderNumber = getDisplayOrderNumber(document);
  const orderTime = getOrderTime(document.confirmedAt);

  return (
    <article className="customer-order-ticket mx-auto w-[72mm] bg-white px-[2mm] pb-[1.5mm] pt-0 font-sans text-black">
      <header>
        <div className="flex h-[8mm] items-start justify-center overflow-hidden">
          <Image
            src="/nook-logo-negro.png"
            alt="Nook"
            width={150}
            height={60}
            priority
            className="block h-auto w-[27mm] object-contain"
          />
        </div>

        <div className="mt-[0.5mm] border-t border-dashed border-black" />

        <div className="relative py-[1.5mm]">
          <p className="text-center text-[30px] font-black leading-none tracking-tight">
            {displayOrderNumber}
          </p>

          {orderTime && (
            <p className="absolute right-0 bottom-[2mm] text-[10px] font-bold leading-none">
              {orderTime}
            </p>
          )}
        </div>

        <div className="border-t border-dashed border-black" />
      </header>

      <section className="py-[1.5mm]">
        <div className="space-y-[1.3mm]">
          {document.items.map((item) => (
            <p key={item.id} className="text-[10px] font-bold leading-[1.2]">
              {formatItemLine(item)}
            </p>
          ))}
        </div>

        {document.order.notes && (
          <p className="mt-[1.5mm] text-[9px] leading-[1.2]">
            <span className="font-black">Nota:</span> {document.order.notes}
          </p>
        )}
      </section>

      <div className="border-t border-dashed border-black" />

      <footer className="py-[1.5mm] text-center">
        <p className="text-[9px] font-black leading-tight">
          Te llamaremos por este número cuando esté listo.
        </p>
      </footer>
    </article>
  );
}
