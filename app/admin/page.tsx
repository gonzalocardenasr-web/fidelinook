"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  premios: Premio[] | number | null;
};

export default function AdminPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesandoCompra, setProcesandoCompra] = useState(false);
  const [procesandoCanje, setProcesandoCanje] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async (mantenerSeleccion = true) => {
    try {
      setCargando(true);

      const { data, error } = await supabase.from("clientes").select("*");

      if (error) {
        console.error("Error cargando clientes:", error);
        setMensaje("Error cargando clientes desde Supabase.");
        setClientes([]);
        return;
      }

      const listaClientes = (data || []) as Cliente[];
      setClientes(listaClientes);

      if (listaClientes.length === 0) {
        setClienteSeleccionadoId("");
        localStorage.removeItem("adminClienteSeleccionadoId");
        return;
      }

      const seleccionadoGuardado = localStorage.getItem("adminClienteSeleccionadoId");

      if (mantenerSeleccion && seleccionadoGuardado) {
        const existeSeleccionado = listaClientes.some(
          (c) => String(c.id) === String(seleccionadoGuardado)
        );

        if (existeSeleccionado) {
          setClienteSeleccionadoId(String(seleccionadoGuardado));
          return;
        }
      }

      const primerId = String(listaClientes[0].id);
      setClienteSeleccionadoId(primerId);
      localStorage.setItem("adminClienteSeleccionadoId", primerId);
    } catch (err) {
      console.error("Error inesperado cargando clientes:", err);
      setMensaje("Ocurrió un error inesperado al cargar clientes.");
      setClientes([]);
    } finally {
      setCargando(false);
    }
  };

  const cambiarCliente = (id: string) => {
    setClienteSeleccionadoId(id);
    localStorage.setItem("adminClienteSeleccionadoId", id);
    setMensaje("Cliente seleccionado correctamente.");
  };

  const cliente =
    clientes.find((c) => String(c.id) === String(clienteSeleccionadoId)) || null;

  const premiosArray = Array.isArray(cliente?.premios) ? cliente.premios : [];

  const premiosActivos = premiosArray.filter(
    (premio: Premio) => premio.estado === "activo"
  );

  const validarCompra = async () => {
    if (!cliente) {
      setMensaje("Debes seleccionar un cliente.");
      return;
    }

    try {
      setProcesandoCompra(true);
      setMensaje("");

      const premiosActuales = Array.isArray(cliente.premios) ? cliente.premios : [];
      const sellosActuales = cliente.sellos ?? 0;
      const nuevosSellos = sellosActuales + 1;

      let sellosFinales = nuevosSellos;
      let premiosFinales = [...premiosActuales];
      let mensajeFinal = "Compra validada correctamente. Se sumó 1 sello.";

      if (nuevosSellos >= 6) {
        const nuevoPremio: Premio = {
          id: Date.now(),
          nombre: "Helado simple gratis",
          estado: "activo",
          vencimiento: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString(),
        };

        premiosFinales.push(nuevoPremio);
        sellosFinales = 0;
        mensajeFinal =
          "¡Cliente completó 6 sellos! Premio generado automáticamente.";
      }

      const { error } = await supabase
        .from("clientes")
        .update({
          sellos: sellosFinales,
          premios: premiosFinales,
        })
        .eq("id", cliente.id);

      if (error) {
        console.error("Error al validar compra:", error);
        setMensaje("Hubo un error al validar la compra.");
        return;
      }

      await cargarDatos(true);
      setMensaje(mensajeFinal);
    } catch (err) {
      console.error("Error inesperado al validar compra:", err);
      setMensaje("Ocurrió un error inesperado al validar la compra.");
    } finally {
      setProcesandoCompra(false);
    }
  };

  const canjearPrimerPremio = async () => {
    if (!cliente) {
      setMensaje("Debes seleccionar un cliente.");
      return;
    }

    try {
      setProcesandoCanje(true);
      setMensaje("");

      const premiosActuales = Array.isArray(cliente.premios) ? [...cliente.premios] : [];

      const indexPremioActivo = premiosActuales.findIndex(
        (premio: Premio) => premio.estado === "activo"
      );

      if (indexPremioActivo === -1) {
        setMensaje("No hay premios activos para canjear.");
        return;
      }

      premiosActuales[indexPremioActivo] = {
        ...premiosActuales[indexPremioActivo],
        estado: "usado",
      };

      const { error } = await supabase
        .from("clientes")
        .update({
          premios: premiosActuales,
        })
        .eq("id", cliente.id);

      if (error) {
        console.error("Error al canjear premio:", error);
        setMensaje("Hubo un error al canjear el premio.");
        return;
      }

      await cargarDatos(true);
      setMensaje("Premio canjeado correctamente.");
    } catch (err) {
      console.error("Error inesperado al canjear premio:", err);
      setMensaje("Ocurrió un error inesperado al canjear el premio.");
    } finally {
      setProcesandoCanje(false);
    }
  };

  const reiniciarDatos = async () => {
    try {
      setReiniciando(true);
      setMensaje("");

      const { error } = await supabase
        .from("clientes")
        .delete()
        .neq("id", 0);

      if (error) {
        console.error("Error al reiniciar datos:", error);
        setMensaje("Hubo un error al reiniciar los datos.");
        return;
      }

      localStorage.removeItem("clienteId");
      localStorage.removeItem("adminClienteSeleccionadoId");

      setClientes([]);
      setClienteSeleccionadoId("");
      setMensaje("Datos reiniciados correctamente.");
    } catch (err) {
      console.error("Error inesperado al reiniciar datos:", err);
      setMensaje("Ocurrió un error inesperado al reiniciar los datos.");
    } finally {
      setReiniciando(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100 p-8">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-neutral-900">Panel local</h1>

        {cargando ? (
          <div className="mt-6">
            <p className="text-neutral-600">Cargando clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="mt-6">
            <p className="text-neutral-600">No hay clientes registrados todavía.</p>

            {mensaje && (
              <div className="mt-4 rounded-lg bg-neutral-100 p-4 text-sm text-neutral-700">
                {mensaje}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6">
              <label className="block text-sm font-medium text-neutral-700">
                Seleccionar cliente
              </label>

              <select
                value={clienteSeleccionadoId}
                onChange={(e) => cambiarCliente(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 p-3"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} - {c.correo}
                  </option>
                ))}
              </select>
            </div>

            {cliente && (
              <div className="mt-6 space-y-2">
                <p>
                  <span className="font-semibold">Cliente:</span> {cliente.nombre}
                </p>
                <p>
                  <span className="font-semibold">Correo:</span> {cliente.correo}
                </p>
                <p>
                  <span className="font-semibold">Teléfono:</span> {cliente.telefono}
                </p>
                <p>
                  <span className="font-semibold">Sellos actuales:</span>{" "}
                  {cliente.sellos ?? 0}
                </p>
                <p>
                  <span className="font-semibold">Premios activos:</span>{" "}
                  {premiosActivos.length}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={validarCompra}
                disabled={procesandoCompra || procesandoCanje || reiniciando}
                className="rounded-lg bg-black px-4 py-3 text-white disabled:opacity-60"
              >
                {procesandoCompra ? "Validando..." : "Validar compra"}
              </button>

              <button
                onClick={canjearPrimerPremio}
                disabled={procesandoCanje || procesandoCompra || reiniciando}
                className="rounded-lg bg-neutral-700 px-4 py-3 text-white disabled:opacity-60"
              >
                {procesandoCanje ? "Canjeando..." : "Canjear premio"}
              </button>

              <button
                onClick={reiniciarDatos}
                disabled={reiniciando || procesandoCompra || procesandoCanje}
                className="rounded-lg bg-red-600 px-4 py-3 text-white disabled:opacity-60"
              >
                {reiniciando ? "Reiniciando..." : "Reiniciar datos"}
              </button>
            </div>

            {mensaje && (
              <div className="mt-6 rounded-lg bg-neutral-100 p-4 text-sm text-neutral-700">
                {mensaje}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}