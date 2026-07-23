export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  operational_type: string;
  has_flavors: boolean;
  max_flavors: number;
  allows_toppings: boolean;
  max_toppings: number;
  product_prices?: {
    price: number;
    channel: string;
    price_list: string;
    is_active: boolean;
  }[];
};

export type OptionValue = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type OptionGroup = {
  id: number;
  code: string;
  name: string;
  catalog_option_values: OptionValue[];
};

export type CartItem = {
  localId: string;
  product: Product;
  quantity: number;
  flavorSelections: number[];
  toppingIds: number[];
  brownieVarietyId?: number | null;
  notes: string;
  extraUnitPrice: number;
  extraLabels: string[];
  serviceFormat?: "vaso" | "barquillo" | "ambos";
  includesCookie?: boolean;
  chocolateDip?: boolean;
  extraToppingSelections?: number[];
};
