import Link from "next/link";

const modules = [
  {
    title: "Operación local",
    description:
      "Busca clientes, valida compras y canjea premios en la atención diaria del local.",
    href: "/operacion",
    icon: "✓",
    iconBg: "bg-[#E1B4D0]",
    iconText: "text-[#111111]",
    buttonLabel: "Abrir operación",
  },
  {
    title: "Clientes",
    description:
      "Registra, revisa y administra la base de clientes del programa de fidelización.",
    href: "/clientes",
    icon: "+",
    iconBg: "bg-[#4C00F7]",
    iconText: "text-white",
    buttonLabel: "Abrir clientes",
  },
  {
    title: "Suscripciones",
    description:
      "Crea, asigna y revisa suscripciones y códigos para clientes.",
    href: "/suscripciones",
    icon: "★",
    iconBg: "bg-[#111111]",
    iconText: "text-white",
    buttonLabel: "Abrir suscripciones",
  },
  {
    title: "Dashboard",
    description:
      "Consulta indicadores clave del programa y su evolución en el tiempo.",
    href: "/dashboard",
    icon: "◔",
    iconBg: "bg-[#F3E7A0]",
    iconText: "text-[#111111]",
    buttonLabel: "Abrir dashboard",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F7F7] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <span className="inline-flex rounded-full bg-[#E1B4D0] px-3 py-1 text-sm font-medium text-[#454545]">
            Gestión interna
          </span>

          <h1 className="mt-4 text-5xl font-bold tracking-tight text-[#111111]">
            Fideli-NooK
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-[#454545]">
            Centro interno para operar y gestionar clientes, suscripciones e
            indicadores del programa.
          </p>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          {modules.map((module) => (
            <div
              key={module.title}
              className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm"
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${module.iconBg} ${module.iconText}`}
              >
                {module.icon}
              </div>

              <h2 className="text-2xl font-semibold text-[#111111]">
                {module.title}
              </h2>

              <p className="mt-3 text-base leading-7 text-[#454545]">
                {module.description}
              </p>

              <div className="mt-6">
                <Link
                  href={module.href}
                  className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition duration-150 hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-[0.98]"
                >
                  {module.buttonLabel}
                </Link>
              </div>
            </div>
          ))}
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