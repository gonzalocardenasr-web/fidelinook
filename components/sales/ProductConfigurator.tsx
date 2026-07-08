import { Product, OptionValue, CartItem } from "../../types/sales";

type Props = {
  product: Product | null;
  flavors: OptionValue[];
  toppings: OptionValue[];
  getPrice: (product: Product) => number;
  onCancel: () => void;
  onAddConfigured: (item: Omit<CartItem, "localId">) => void;
};

export default function ProductConfigurator({
  product,
  flavors,
  toppings,
  getPrice,
  onCancel,
  onAddConfigured,
}: Props) {
  if (!product) {
    return (
      <section className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-400">
        Selecciona un producto para configurarlo.
      </section>
    );
  }

  function addProduct() {
    if (!product) return;

    onAddConfigured({
      product,
      quantity: 1,
      flavorSelections: [],
      toppingIds: [],
      notes: "",
    });
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
          Configurar producto
        </p>

        <h2 className="mt-1 text-xl font-black text-neutral-900">
          {product.name}
        </h2>

        <p className="mt-1 text-sm font-bold text-violet-700">
          ${getPrice(product).toLocaleString("es-CL")}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
        La configuración detallada de sabores, toppings y formato se agregará en
        los siguientes DEVs.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 active:scale-[0.98]"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={addProduct}
          className="cursor-pointer rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 hover:shadow-md active:scale-[0.98]"
        >
          Agregar
        </button>
      </div>
    </section>
  );
}
