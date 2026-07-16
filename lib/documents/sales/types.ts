export type SaleDocumentKind = "sale_receipt" | "customer_order_ticket";

export type SaleDocumentCustomer = {
  id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
};

export type SaleDocumentOption = {
  groupCode: string;
  name: string;
  quantity: number;
};

export type SaleDocumentItem = {
  id: number;
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  options: SaleDocumentOption[];
};

export type SaleDocumentOrder = {
  id: number;
  businessDate: string | null;
  dailyOrderNumber: number | null;
  displayOrderCode: string;
  status: string;
  notes: string | null;
  createdAt: string | null;
  deliveredAt: string | null;
};

export type SaleDocumentLoyalty = {
  stampsEarned: number;
  rewardsIssued: number;
  stampBalanceAfter: number | null;
};

export type SaleDocument = {
  version: 1;

  saleId: number;
  saleNumber: string | null;

  channel: string;
  channelLabel: string;

  externalOrderId: string | null;
  integrationSource: string | null;

  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentMethodLabel: string;

  subtotal: number;
  discountTotal: number;
  total: number;

  actorRole: string | null;

  confirmedAt: string;
  confirmedAtChile: string;

  customer: SaleDocumentCustomer;
  order: SaleDocumentOrder;
  items: SaleDocumentItem[];

  loyalty: SaleDocumentLoyalty;

  metadata: {
    timezone: "America/Santiago";
    paperWidthMm: 80;
    generatedAt: string;
  };
};
