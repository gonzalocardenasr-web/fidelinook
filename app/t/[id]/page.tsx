import { supabase } from "../../../lib/supabase";

type Premio = {
  id: number;
  nombre: string;
  estado: "activo" | "usado";
  vencimiento?: string;
};

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  sellos: number;
  premios: Premio[] | null;
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TarjetaPublicaPage({ params }: Props) {
  const { id } = await params;

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !cliente) {
    return (
      <main className="min-h-screen bg-neutral-100 p-8">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-neutral-900">Tarjeta Fideli-NooK</h1>
          <p className="mt-4 text-neutral-600">
            No se encontró esta tarjeta.
          </p>
        </div>
      </main>
    );
  }

  const clienteTyped = cliente as Cliente;
  const premiosArray = Array.isArray(clienteTyped.premios)
    ? clienteTyped.premios
    : [];

  const premiosActivos = premiosArray.filter(
    (premio: Premio) => premio.estado === "activo"
  );

  const premiosUsados = premiosArray.filter(
    (premio: Premio) => premio.estado === "usado"
  );

  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-neutral-900">
            Tarjeta Fideli-NooK
          </h1>

          <div className="mt-4">
            <p className="text-lg font-semibold">{clienteTyped.nombre}</p>
            <p className="text-sm text-neutral-500">{clienteTyped.correo}</p>
            <p className="text-sm text-neutral-500">{clienteTyped.telefono}</p>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium">Progreso actual</p>

            <div className="mt-2 flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                    i < (clienteTyped.sellos ?? 0)
                      ? "bg-black text-white"
                      : "bg-white text-neutral-700"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-neutral-600">
              {clienteTyped.sellos ?? 0} de 6 sellos
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-neutral-900">
            Premios activos
          </h2>

          {premiosActivos.length === 0 ? (
            <p className="mt-4 text-neutral-600">No tienes premios activos.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {premiosActivos.map((premio: Premio) => (
                <div
                  key={premio.id}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <p className="font-semibold">{premio.nombre}</p>
                  <p className="text-sm text-neutral-600">
                    Estado: {premio.estado}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Vence: {premio.vencimiento || "Sin definir"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-neutral-900">
            Historial de premios usados
          </h2>

          {premiosUsados.length === 0 ? (
            <p className="mt-4 text-neutral-600">
              Todavía no has canjeado premios.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {premiosUsados.map((premio: Premio) => (
                <div
                  key={premio.id}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <p className="font-semibold">{premio.nombre}</p>
                  <p className="text-sm text-neutral-600">
                    Estado: {premio.estado}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Vencía: {premio.vencimiento || "Sin definir"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}