import type { Product } from "../../types/sales";

const CATEGORY_ORDER = [
  "HELADOS",
  "POTES",
  "COMPLEMENTOS",
  "PREPARADOS",
  "TOPPINGS",
] as const;

const PRODUCT_ORDER: Record<string, string[]> = {
  HELADOS: ["Helado Simple", "Helado Doble", "Paleta"],

  POTES: ["Pote 16 oz listo", "Pote 16 oz armado"],

  COMPLEMENTOS: [
    "Pack barquillos",
    "Pack galletas",
    "Brownie",
    "Baño de chocolate",
    "Topping",
    "Agua mineral 500 cc",
    "Unidad barquillo",
    "Waffle",
  ],

  PREPARADOS: ["Cafe", "Brownie con helado", "Waffle con helado"],

  TOPPINGS: [],
};

function normalize(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getCategoryRank(category: string): number {
  const index = CATEGORY_ORDER.findIndex(
    (item) => normalize(item) === normalize(category),
  );

  return index === -1 ? CATEGORY_ORDER.length : index;
}

function getProductRank(product: Product): number {
  const category = CATEGORY_ORDER.find(
    (item) => normalize(item) === normalize(product.category),
  );

  if (!category) return Number.MAX_SAFE_INTEGER;

  const priorities = PRODUCT_ORDER[category] || [];
  const productName = normalize(product.name);

  const index = priorities.findIndex((name) => {
    const expectedName = normalize(name);

    return (
      productName === expectedName || productName.startsWith(`${expectedName} `)
    );
  });

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortPosProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const categoryDifference =
      getCategoryRank(a.category) - getCategoryRank(b.category);

    if (categoryDifference !== 0) {
      return categoryDifference;
    }

    const productDifference = getProductRank(a) - getProductRank(b);

    if (productDifference !== 0) {
      return productDifference;
    }

    return a.name.localeCompare(b.name, "es");
  });
}
