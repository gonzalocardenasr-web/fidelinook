export function getInventoryReferenceTypeLabel(
  referenceType: string | null | undefined,
): string {
  switch (referenceType) {
    case "PURCHASE":
      return "Compra";

    case "INITIAL_STOCK":
      return "Stock inicial";

    default:
      return "Tipo no informado";
  }
}

export function getInventoryReferenceTypeBadgeClasses(
  referenceType: string | null | undefined,
): string {
  switch (referenceType) {
    case "PURCHASE":
      return "bg-emerald-100 text-emerald-800";

    case "INITIAL_STOCK":
      return "bg-sky-100 text-sky-800";

    default:
      return "bg-neutral-100 text-neutral-700";
  }
}
