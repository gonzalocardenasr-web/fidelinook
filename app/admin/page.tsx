"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import QRCode from "react-qr-code";
import AdminRegistroCard from "./components/AdminRegistroCard";
import AdminClienteDetalle from "./components/AdminClienteDetalle";
import AdminStats from "./components/AdminStats";

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
  public_token: string;
  tarjeta_activa?: boolean;
  email_verificado?: boolean;
};

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const META_SELLOS = 7;

export default function AdminPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] =
    useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [letraActiva, setLetraActiva] = useState<string>("TODOS");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesandoCompra, setProcesandoCompra] = useState(false);
  const [procesandoCanje, setProcesandoCanje] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const [rol, setRol] = useState<"admin" | "superadmin" | null>(null);
  const [cargandoRol, setCargandoRol] = useState(true);

  const [mostrarRegistro, setMostrarRegistro] = useState(true);
  const [mostrarGestion, setMostrarGestion] = useState(false);

  useEffect(() => {
    cargarDatos();
    cargarSesion();
  }, []);

  const cargarSesion = async () => {
    try {
      setCargandoRol(true);

      const res = await fetch("/api/session", {
        method: "GET",
      });

      if (!res.ok) {
        setRol(null);
        return;
      }

      const data = await res.json();
      setRol(data.role || null);
    } catch (error) {
      console.error("Error cargando sesión:", error);
      setRol(null);
    } finally {
      setCargandoRol(false);
    }
  };

  const cargarDatos = async (mantenerSeleccion = true) => {
    try {
      setCargando(true);

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });

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

      const seleccionadoGuardado = localStorage.getItem(
        "adminClienteSeleccionadoId"
      );

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

  const clientesFiltrados = useMemo(() => {
    let resultado = [...clientes];

    if (letraActiva !== "TODOS") {
      resultado = resultado.filter((cliente) => {
        const nombre = (cliente.nombre || "").trim().toLowerCase();
        return nombre.startsWith(letraActiva.toLowerCase());
      });
    }

    const texto = busqueda.trim().toLowerCase();

    if (!texto) return resultado;

    return resultado.filter((cliente) => {
      const nombre = (cliente.nombre || "").toLowerCase();
      const telefono = (cliente.telefono || "").toLowerCase();
      const correo = (cliente.correo || "").toLowerCase();

      return (
        nombre.includes(texto) ||
        telefono.includes(texto) ||
        correo.includes(texto)
      );
    });
  }, [clientes, busqueda, letraActiva]);

  const cambiarCliente = (id: string) => {
    setClienteSeleccionadoId(id);
    localStorage.setItem("adminClienteSeleccionadoId", id);
    setMensaje("Cliente seleccionado correctamente.");
  };

  const seleccionarLetra = (letra: string) => {
    setLetraActiva(letra);
    setMensaje("");

    const listaFiltrada =
      letra === "TODOS"
        ? clientes
        : clientes.filter((cliente) =>
            (cliente.nombre || "")
              .trim()
              .toLowerCase()
              .startsWith(letra.toLowerCase())
          );

    if (listaFiltrada.length > 0) {
      const primerId = String(listaFiltrada[0].id);
      setClienteSeleccionadoId(primerId);
      localStorage.setItem("adminClienteSeleccionadoId", primerId);
    }
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

    if (!cliente.tarjeta_activa || !cliente.email_verificado) {
      setMensaje(
        "El cliente aún no ha activado su tarjeta. Debe verificar su correo primero."
      );
      return;
    }

    try {
      setProcesandoCompra(true);
      setMensaje("");

      const premiosActuales = Array.isArray(cliente.premios)
        ? cliente.premios
        : [];

      const sellosActuales = cliente.sellos ?? 0;

      const esPrimeraCompraHistorica =
        sellosActuales === 0 && premiosActuales.length === 0;

      const sellosAAgregar = esPrimeraCompraHistorica ? 2 : 1;
      const nuevosSellos = sellosActuales + sellosAAgregar;

      let sellosFinales = nuevosSellos;
      let premiosFinales = [...premiosActuales];

      let mensajeFinal = esPrimeraCompraHistorica
        ? "Primera compra registrada. Se sumaron 2 sellos."
        : "Compra validada correctamente. Se sumó 1 sello.";

      let premioGenerado: Premio | null = null;

      if (nuevosSellos >= META_SELLOS) {
        premioGenerado = {
          id: Date.now(),
          nombre: "Helado simple gratis",
          estado: "activo",
          vencimiento: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };

        premiosFinales.push(premioGenerado);
        sellosFinales = 0;
        mensajeFinal = `¡Cliente completó ${META_SELLOS} sellos! Premio generado automáticamente.`;
      }

      const { error } = await supabase
        .from("clientes")
        .update({
          sellos: sellosFinales,
          premios: premiosFinales,
          fecha_ultimo_sello: new Date().toISOString(),
        })
        .eq("id", cliente.id);

      if (error) {
        console.error("Error al validar compra:", error);
        setMensaje("Hubo un error al validar la compra.");
        return;
      }

      try {
        if (premioGenerado) {
          await fetch("/api/send-prize", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: cliente.correo,
              nombre: cliente.nombre,
              premioNombre: premioGenerado.nombre,
              vencimiento: premioGenerado.vencimiento,
              publicToken: cliente.public_token,
            }),
          });
        } else {
          await fetch("/api/send-stamp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: cliente.correo,
              nombre: cliente.nombre,
              sellosActuales: nuevosSellos,
              metaSellos: META_SELLOS,
              publicToken: cliente.public_token,
            }),
          });
        }
      } catch (emailError) {
        console.error("Error enviando correo:", emailError);
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

    if (!cliente.tarjeta_activa || !cliente.email_verificado) {
      setMensaje(
        "El cliente aún no ha activado su tarjeta. No es posible canjear premios."
      );
      return;
    }

    try {
      setProcesandoCanje(true);
      setMensaje("");

      const premiosActuales = Array.isArray(cliente.premios)
        ? [...cliente.premios]
        : [];

      const indexPremioActivo = premiosActuales.findIndex(
        (premio: Premio) => premio.estado === "activo"
      );

      if (indexPremioActivo === -1) {
        setMensaje("No hay premios activos para canjear.");
        return;
      }

      const premioActivo = premiosActuales[indexPremioActivo];

      premiosActuales[indexPremioActivo] = {
        ...premiosActuales[indexPremioActivo],
        estado: "usado",
      };

      const { error } = await supabase
        .from("clientes")
        .update({
          premios: premiosActuales,
          fecha_ultimo_canje: new Date().toISOString(),
        })
        .eq("id", cliente.id);

      if (error) {
        console.error("Error al canjear premio:", error);
        setMensaje("Hubo un error al canjear el premio.");
        return;
      }

      try {
        await fetch("/api/send-reward-redeemed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cliente.correo,
            nombre: cliente.nombre,
            premioNombre: premioActivo?.nombre || "Premio Fideli-Nook",
            publicToken: cliente.public_token,
          }),
        });
      } catch (emailError) {
        console.error("Error enviando correo de canje:", emailError);
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

  const eliminarClienteSeleccionado = async () => {
    if (!cliente) {
      setMensaje("Debes seleccionar un cliente.");
      return;
    }

    const confirmado = window.confirm(
      `¿Seguro que quieres eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    try {
      setReiniciando(true);
      setMensaje("");

      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", cliente.id);

      if (error) {
        console.error("Error al eliminar cliente:", error);
        setMensaje("Hubo un error al eliminar el cliente.");
        return;
      }

      localStorage.removeItem("clienteId");

      await cargarDatos(false);
      setMensaje("Cliente eliminado correctamente.");
    } catch (err) {
      console.error("Error inesperado al eliminar cliente:", err);
      setMensaje("Ocurrió un error inesperado al eliminar el cliente.");
    } finally {
      setReiniciando(false);
    }
  };

  const reiniciarDatos = async () => {
    const confirmado = window.confirm(
      "¿Seguro que quieres eliminar TODOS los clientes? Esta acción no se puede deshacer."
    );

    if (!confirmado) return;

    try {
      setReiniciando(true);
      setMensaje("");

      const { error } = await supabase.from("clientes").delete().neq("id", 0);

      if (error) {
        console.error("Error al reiniciar datos:", error);
        setMensaje("Hubo un error al reiniciar los datos.");
        return;
      }

      localStorage.removeItem("clienteId");
      localStorage.removeItem("adminClienteSeleccionadoId");

      setClientes([]);
      setClienteSeleccionadoId("");
      setBusqueda("");
      setLetraActiva("TODOS");
      setMensaje("Todos los clientes fueron eliminados correctamente.");
    } catch (err) {
      console.error("Error inesperado al reiniciar los datos:", err);
      setMensaje("Ocurrió un error inesperado al reiniciar los datos.");
    } finally {
      setReiniciando(false);
    }
  };

  const cerrarSesion = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });

      window.location.href = "/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("No se pudo cerrar sesión.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F3FF] p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Panel Local Nook</h1>
              <p className="text-sm opacity-90">
                Gestiona clientes, valida compras y administra premios
              </p>

              <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                {cargandoRol ? "Cargando rol..." : `Rol: ${rol ?? "sin sesión"}`}
              </p>
            </div>

            <div>
              <button
                onClick={cerrarSesion}
                className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <AdminStats clientes={clientes} />

        <AdminRegistroCard
          mostrarRegistro={mostrarRegistro}
          setMostrarRegistro={setMostrarRegistro}
          setMensaje={setMensaje}
        />

        <div className="mt-6 rounded-lg border border-neutral-200">
          <button
            type="button"
            onClick={() => setMostrarGestion(!mostrarGestion)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span className="text-lg font-semibold text-violet-800">
              Gestión de clientes
            </span>
            <span className="text-2xl leading-none">
              {mostrarGestion ? "−" : "+"}
            </span>
          </button>

          {mostrarGestion && (
            <div className="border-t border-neutral-200 p-4 pt-4">
              {cargando ? (
                <div className="mt-2">
                  <p className="text-neutral-600">Cargando clientes...</p>
                </div>
              ) : clientes.length === 0 ? (
                <div className="mt-2">
                  <p className="text-neutral-600">
                    No hay clientes registrados todavía.
                  </p>

                  {mensaje && (
                    <div className="mt-4 rounded-lg bg-neutral-100 p-4 text-sm text-neutral-700">
                      {mensaje}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-2 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                    <div className="grid gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Buscar cliente
                        </label>
                        <input
                          type="text"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          placeholder="Nombre, teléfono o correo"
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-violet-700">
                            Filtrar por letra
                          </p>
                          <p className="text-xs text-neutral-500">
                            {clientesFiltrados.length} resultado
                            {clientesFiltrados.length === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => seleccionarLetra("TODOS")}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                              letraActiva === "TODOS"
                                ? "border-transparent bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                            }`}
                          >
                            Todos
                          </button>

                          {LETRAS.map((letra) => (
                            <button
                              key={letra}
                              type="button"
                              onClick={() => seleccionarLetra(letra)}
                              className={`min-w-[36px] rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                letraActiva === letra
                                  ? "border-transparent bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                              }`}
                            >
                              {letra}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Seleccionar cliente
                        </label>

                        <select
                          value={clienteSeleccionadoId}
                          onChange={(e) => cambiarCliente(e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        >
                          {clientesFiltrados.length === 0 ? (
                            <option value="">No hay resultados</option>
                          ) : (
                            clientesFiltrados.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre} · {c.telefono} · {c.correo}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-neutral-500">
                    Resultados encontrados: {clientesFiltrados.length}
                  </p>

                  <AdminClienteDetalle
                  cliente={cliente}
                  premiosActivos={premiosActivos}
                  mensaje={mensaje}
                  setMensaje={setMensaje}
                  procesandoCompra={procesandoCompra}
                  procesandoCanje={procesandoCanje}
                  reiniciando={reiniciando}
                  rol={rol}
                  validarCompra={validarCompra}
                  canjearPrimerPremio={canjearPrimerPremio}
                  eliminarClienteSeleccionado={eliminarClienteSeleccionado}
                  reiniciarDatos={reiniciarDatos}
                />

                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}