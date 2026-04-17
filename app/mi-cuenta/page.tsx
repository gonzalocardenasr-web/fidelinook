import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";

export default async function MiCuentaPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login?next=/mi-cuenta");
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm border border-neutral-200">
        <h1 className="text-2xl font-semibold text-neutral-900">Mi cuenta</h1>
        <p className="mt-2 text-neutral-600">
          Ya ingresaste a tu cuenta privada. En el siguiente paso conectaremos
          la tarjeta y dejaremos lista la sección de suscripciones.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <a
            href="/mi-cuenta/tarjeta"
            className="rounded-2xl border border-neutral-200 p-5 hover:bg-neutral-50"
          >
            <h2 className="text-lg font-medium text-neutral-900">Mi tarjeta</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Revisa tu estado actual de fidelización.
            </p>
          </a>

          <a
            href="/mi-cuenta/suscripciones"
            className="rounded-2xl border border-neutral-200 p-5 hover:bg-neutral-50"
          >
            <h2 className="text-lg font-medium text-neutral-900">
              Mis suscripciones
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Activa y revisa tus suscripciones.
            </p>
          </a>

          <a
            href="/mi-cuenta/perfil"
            className="rounded-2xl border border-neutral-200 p-5 hover:bg-neutral-50"
          >
            <h2 className="text-lg font-medium text-neutral-900">Mi perfil</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Administra tus datos de cuenta.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}