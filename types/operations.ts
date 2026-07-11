export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type QueueOrder = {
  id: number;
  display_order_code: string;
  status: OrderStatus;
  created_at: string;
  notes?: string | null;
  sales?: {
    channel?: string | null;
    total: number;
    payment_method: string;
    clientes?: {
      nombre?: string;
    } | null;
    sale_items?: {
      id: number;
      product_name: string;
      quantity: number;
      notes?: string | null;
      sale_item_options?: {
        id?: number;
        option_group_code: string;
        option_value_name: string;
        quantity: number;
      }[];
    }[];
  };
};
