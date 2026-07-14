export type SalesHistoryOption = {
  id: number;
  option_group_code: string;
  option_value_name: string;
  quantity: number;
};

export type SalesHistoryItem = {
  id: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  sale_item_options?: SalesHistoryOption[];
};

export type SalesHistoryOrder = {
  id: number;
  business_date: string;
  daily_order_number: number;
  display_order_code: string;
  status: string;
  notes?: string | null;
  created_at: string;
};

export type SalesHistoryCustomer = {
  id: number;
  nombre: string;
  correo?: string | null;
  telefono?: string | null;
};

export type SalesHistorySale = {
  id: number;
  sale_number?: string | null;
  channel: string;
  external_order_id?: string | null;
  integration_source?: string | null;
  received_at?: string | null;
  customer_id?: number | null;
  status: string;
  subtotal: number;
  discount_total: number;
  total: number;
  payment_status: string;
  payment_method: string;
  actor_role?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  clientes?: SalesHistoryCustomer | null;
  orders?: SalesHistoryOrder[] | null;
  sale_items?: SalesHistoryItem[] | null;
};
