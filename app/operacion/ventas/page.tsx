"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SaleItemOption = {
  id: number;
  option_group_code: string;
  option_value_name: string;
  quantity: number;
};

type SaleItem = {
  id: number;
  product_sku?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  sale_item_options?: SaleItemOption[];
};

type SaleOrder = {
  id: number;
  business_date?: string | null;
  daily_order_number?: number | null;
  display_order_code: string;
  status: string;
  notes?: string | null;
  created_at?: string | null;
};

type SaleCustomer = {
  id: number;
  nombre?: string | null;
  correo?: string | null;
  telefono?: string | null;
};

type Sale = {
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
  clientes?: SaleCustomer | null;
  orders?: SaleOrder[];
  sale_items?: SaleItem[];
};

export default function HistorialVentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    cargarVentas();
  }, []);

  async function cargarVentas() {
    try {
      const res = await fetch("/api/operacion/sales");
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "No se pudo cargar historial.");
        return;
      }

      setSales(data.sales || []);
    } catch (error) {
      console.error(error);
      setMessage("Error cargando historial.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F3FF] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <Link href="/operacion" className="text-sm font-medium text-white/90">
            ← Volver a operación
          </Link>
          <h1 className="mt-3 text-2xl font-bold">Historial de ventas</h1>
          <p className="text-sm opacity-90">
            Últimas ventas locales y pedidos generados.
          </p>
        </div>

        {message && (
          <div className="rounded-xl bg-white px-4 py-3 text-sm text-neutral-700">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-neutral-600">Cargando ventas...</p>
        ) : (
          <section className="space-y-4">
            {sales.map((sale) => (
              <article
                key={sale.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-bold text-neutral-900">
                      Venta #{sale.id}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {new Date(sale.created_at).toLocaleString("es-CL")}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Cliente: {sale.clientes?.nombre || "Mostrador"}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xl font-black text-violet-700">
                      ${sale.total.toLocaleString("es-CL")}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Pago: {sale.payment_method}
                    </p>
                    <p className="text-sm text-neutral-500">
                      Pedido:{" "}
                      {sale.orders?.[0]?.display_order_code || "Sin pedido"} ·{" "}
                      {sale.orders?.[0]?.status || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {sale.sale_items?.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-neutral-50 px-4 py-3"
                    >
                      <p className="font-semibold text-neutral-800">
                        {item.quantity}x {item.product_name}
                      </p>

                      {item.sale_item_options &&
                        item.sale_item_options.length > 0 && (
                          <p className="mt-1 text-sm text-neutral-600">
                            {item.sale_item_options
                              .map(
                                (option) =>
                                  `${option.option_group_code}: ${option.option_value_name}`,
                              )
                              .join(" · ")}
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
