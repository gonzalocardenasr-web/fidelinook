export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  subcategory?: string | null;
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

export type CoffeeOption = OptionValue & {
  price: number;
  inventoryQuantity: number;
  stockQuantity: number;
  isAvailable: boolean;
};

export type ProductCartItem = {
  itemType: "product";

  localId: string;
  product: Product;
  quantity: number;

  flavorSelections: number[];
  toppingIds: number[];

  brownieVarietyId?: number | null;
  mineralWaterTypeId?: number | null;
  coffeeTypeId?: number | null;

  notes: string;

  extraUnitPrice: number;
  extraLabels: string[];

  serviceFormat?: "vaso" | "barquillo" | "ambos";
  includesCookie?: boolean;
  chocolateDip?: boolean;
  extraToppingSelections?: number[];

  isGift: boolean;
  giftReason: string | null;
};

export type CustomCartItem = {
  itemType: "custom";

  localId: string;

  customName: string;
  customUnitPrice: number;
  quantity: number;

  loyaltyEligible: boolean;

  notes: string;
};

export type CartItem = ProductCartItem | CustomCartItem;
