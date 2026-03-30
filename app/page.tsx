import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F7F7] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <span className="inline-flex rounded-full bg-[#E1B4D0] px-3 py-1 text-sm font-medium text-[#454545]">
            Operación local
          </span>

          <h1 className="mt-4 text-5xl font-bold tracking-tight text-[#111111]">
            Fideli-NooK
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-[#454545]">
            Sistema de fidelización para registrar clientes, validar compras y
            gestionar premios en el local.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4C00F7] text-xl text-white">
              +
            </div>

            <h2 className="text-2xl font-semibold text-[#111111]">
              Registrar cliente
            </h2>

            <p className="mt-3 text-base leading-7 text-[#454545]">
              Crea una nueva tarjeta digital para clientes presenciales y deja
              listo su acceso a la fidelización.
            </p>

            <div className="mt-6">
              <Link
                href="/registro"
                className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Ir a registro
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E1B4D0] text-xl text-[#111111]">
              ✓
            </div>

            <h2 className="text-2xl font-semibold text-[#111111]">
              Panel local
            </h2>

            <p className="mt-3 text-base leading-7 text-[#454545]">
              Busca clientes, valida compras, canjea premios y administra la
              operación diaria del programa.
            </p>

            <div className="mt-6">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Abrir panel
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#4C00F7]/10 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#454545]">
            <span className="font-semibold text-[#111111]">URL activa:</span>{" "}
            fidelidad.nookheladeria.cl
          </p>
          <p className="mt-2 text-sm text-[#454545]">
            Usa esta pantalla como acceso rápido desde caja, computador o tablet
            del local.
          </p>
        </section>
      </div>
    </main>
  );
}