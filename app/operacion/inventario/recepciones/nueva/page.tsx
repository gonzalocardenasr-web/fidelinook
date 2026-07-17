import Link from "next/link";

export default function NewInventoryReceiptPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <header>
        <Link
          href="/operacion/inventario/recepciones"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Volver a Recepciones
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-neutral-950">
          Nueva recepción
        </h1>

        <p className="mt-1 text-sm text-neutral-600">
          La creación de recepciones se implementará en el siguiente desarrollo.
        </p>
      </header>
    </main>
  );
}
