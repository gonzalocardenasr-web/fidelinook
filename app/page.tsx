export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-neutral-900">Fideli-NooK</h1>
        <p className="mt-2 text-neutral-600">
          MVP funcional de tarjeta de fidelización para pruebas internas.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <a
            href="/registro"
            className="rounded-xl bg-white p-6 shadow hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-neutral-900">Registro cliente</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Crear una nueva cuenta para un cliente.
            </p>
          </a>

          <a
            href="/tarjeta"
            className="rounded-xl bg-white p-6 shadow hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-neutral-900">Mi tarjeta</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Ver sellos acumulados y premios.
            </p>
          </a>

          <a
            href="/admin"
            className="rounded-xl bg-white p-6 shadow hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-neutral-900">Panel local</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Gestionar sellos, premios y operación interna.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}