export function getInventoryReferenceTypeLabel(referenceType: string): string {
  switch (referenceType) {
    case "PURCHASE":
      return "Compra";

    case "INITIAL_STOCK":
      return "Stock inicial";

    default:
      return referenceType;
  }
}

export function getInventoryReferenceTypeBadgeClasses(
  referenceType: string,
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
