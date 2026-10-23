import Link from "next/link";

export default function ManagementInventoryPage() {
  return (
    <main className="h-full">
      <div className="mx-auto w-full max-w-6xl">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/gestion/inventario/recepciones" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow">
            <h2 className="font-semibold text-neutral-950">Recepciones de inventario</h2>
            <p className="mt-2 text-sm text-neutral-600">Consultar, registrar y administrar recepciones de mercadería.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
