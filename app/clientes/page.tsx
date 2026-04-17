import Link from "next/link";

export default function ClientesPage() {
  return (
    <main className="min-h-screen bg-[#F7F7F7] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-[#454545] transition hover:opacity-70"
          >
            ← Volver al inicio
          </Link>

          <span className="mt-5 inline-flex rounded-full bg-[#E1B4D0] px-3 py-1 text-sm font-medium text-[#454545]">
            Clientes
          </span>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#111111]">
            Clientes
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-[#454545]">
            Aquí quedará el registro y la gestión administrativa de clientes del
            programa.
          </p>
        </div>

        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <p className="text-base leading-7 text-[#454545]">
            Próximo paso: mover aquí el registro manual y la gestión de clientes.
          </p>
        </section>
      </div>
    </main>
  );
}