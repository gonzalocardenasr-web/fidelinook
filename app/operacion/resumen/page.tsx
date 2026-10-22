"use client";

import { useEffect, useMemo, useState } from "react";
import AdminClienteDetalle from "../components/AdminClienteDetalle";
import OperacionSuscripcionActiva from "../components/OperacionSuscripcionActiva";
import UltimosMovimientos from "../components/UltimosMovimientos";
import OperationSummary from "../../../components/operations/OperationSummary";
import type {
  CustomerLoyaltySummary,
  CustomerRewardSummary,
} from "../../../lib/loyalty/customer-loyalty.types";

type Cliente = {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  public_token: string;
  tarjeta_activa?: boolean;
  email_verificado?: boolean;
  created_At?: string | null;
  fecha_activacion?: string | null;
};

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const META_SELLOS = 7;

export default function ResumenOperativoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] =
    useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [letraActiva, setLetraActiva] = useState<string>("TODOS");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "info">(
    "info",
  );
  const [cargando, setCargando] = useState(true);
  const [customerLoyalty, setCustomerLoyalty] =
    useState<CustomerLoyaltySummary | null>(null);
  const [cargandoFidelizacion, setCargandoFidelizacion] = useState(false);
  const [rol, setRol] = useState<"admin" | "superadmin" | null>(null);
  const [cargandoRol, setCargandoRol] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionSeleccionada, setSubscriptionSeleccionada] =
    useState<any>(null);
  const [cargandoSuscripcion, setCargandoSuscripcion] = useState(false);
  const [mensajeSuscripcion, setMensajeSuscripcion] = useState("");
  const [consultaAbierta, setConsultaAbierta] = useState(false);
  useEffect(() => {
    cargarSesion();
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!clienteSeleccionadoId) {
      setSubscriptions([]);
      setSubscriptionSeleccionada(null);
      setMensajeSuscripcion("");
      setCustomerLoyalty(null);
      return;
    }

    const customerId = Number(clienteSeleccionadoId);

    void cargarSuscripcionActiva(customerId);
    void cargarFidelizacionCliente(customerId);
  }, [clienteSeleccionadoId]);

  async function cargarSuscripcionActiva(clienteId: number) {
    try {
      setCargandoSuscripcion(true);
      setMensajeSuscripcion("");

      const res = await fetch(
        `/api/subscriptions/active-by-client?clienteId=${clienteId}`,
      );

      const data = await res.json();

      if (!res.ok) {
        setSubscriptions([]);
        setSubscriptionSeleccionada(null);
        return;
      }

      setSubscriptions(data.subscriptions || []);

      if (data.subscriptions?.length > 0) {
        setSubscriptionSeleccionada(data.subscriptions[0]);
      } else {
        setSubscriptionSeleccionada(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoSuscripcion(false);
    }
  }

  async function cargarFidelizacionCliente(clienteId: number) {
    try {
      setCargandoFidelizacion(true);
      setCustomerLoyalty(null);

      const res = await fetch(`/api/operacion/customers/${clienteId}/loyalty`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(
          data.message || "No se pudo cargar la fidelización del cliente.",
        );
        return;
      }

      setCustomerLoyalty(data.loyalty as CustomerLoyaltySummary);
    } catch (error) {
      console.error("Error cargando fidelización del cliente:", error);

      setTipoMensaje("error");
      setMensaje("Ocurrió un error al cargar la fidelización del cliente.");
    } finally {
      setCargandoFidelizacion(false);
    }
  }

  const cargarSesion = async () => {
    try {
      setCargandoRol(true);

      const res = await fetch("/api/session", {
        method: "GET",
      });

      if (res.status === 401) {
        setRol(null);
        return;
      }

      if (!res.ok) {
        console.error(
          "No se pudo validar temporalmente la sesión operacional:",
          {
            status: res.status,
          },
        );
        return;
      }

      const data = await res.json();
      setRol(data.role || null);
    } catch (error) {
      console.error("Error cargando sesión:", error);
    } finally {
      setCargandoRol(false);
    }
  };

  const cargarDatos = async (mantenerSeleccion = true) => {
    try {
      setCargando(true);

      const res = await fetch("/api/operacion/clientes", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error("Error cargando clientes:", data);
        setMensaje(data.message || "Error cargando clientes.");
        setClientes([]);
        return;
      }

      const listaClientes = (data.clientes || []) as Cliente[];
      setClientes(listaClientes);

      if (listaClientes.length === 0) {
        setClienteSeleccionadoId("");
        localStorage.removeItem("operacionClienteSeleccionadoId");
        return;
      }

      const seleccionadoGuardado = localStorage.getItem(
        "operacionClienteSeleccionadoId",
      );

      if (mantenerSeleccion && seleccionadoGuardado) {
        const existeSeleccionado = listaClientes.some(
          (c) => String(c.id) === String(seleccionadoGuardado),
        );

        if (existeSeleccionado) {
          setClienteSeleccionadoId(String(seleccionadoGuardado));
          return;
        }
      }

      const primerId = String(listaClientes[0].id);
      setClienteSeleccionadoId(primerId);
      localStorage.setItem("operacionClienteSeleccionadoId", primerId);
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
    localStorage.setItem("operacionClienteSeleccionadoId", id);
    setMensaje("Cliente seleccionado correctamente.");
  };

  const seleccionarLetra = (letra: string) => {
    setLetraActiva(letra);
    setMensaje("");
    setTipoMensaje("info");

    const listaFiltrada =
      letra === "TODOS"
        ? clientes
        : clientes.filter((cliente) =>
            (cliente.nombre || "")
              .trim()
              .toLowerCase()
              .startsWith(letra.toLowerCase()),
          );

    if (listaFiltrada.length > 0) {
      const primerId = String(listaFiltrada[0].id);
      setClienteSeleccionadoId(primerId);
      localStorage.setItem("operacionClienteSeleccionadoId", primerId);
    }
  };

  const cliente =
    clientes.find((c) => String(c.id) === String(clienteSeleccionadoId)) ||
    null;

  const premiosActivos = customerLoyalty?.activeRewards ?? [];

  return (
    <main className="w-full min-w-0 px-3 py-3 sm:px-4">
      <div className="mx-auto w-full max-w-[1500px] space-y-3">
        <OperationSummary />
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Consulta rápida de cliente</h2>
              <p className="text-[11px] text-neutral-500">Buscar y consultar fidelización, premios y suscripciones</p>
            </div>
            <button type="button" onClick={() => setConsultaAbierta((actual) => !actual)}
              aria-expanded={consultaAbierta}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              {consultaAbierta ? "Ocultar consulta" : "Consultar cliente"}
            </button>
          </div>
          {consultaAbierta && (
            <div className="border-t border-neutral-100 p-3 sm:p-4">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-4">
            <span className="text-lg font-semibold text-violet-800">
              Atención en local
            </span>
          </div>

          <div className="p-4 pt-4">
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
                              ? "cursor-pointer border-transparent bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                              : "cursor-pointer border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
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
                                ? "cursor-pointer border-transparent bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                                : "cursor-pointer border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
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
                  loyalty={customerLoyalty}
                  premiosActivos={premiosActivos}
                  cargandoFidelizacion={cargandoFidelizacion}
                  mensaje={mensaje}
                  tipoMensaje={tipoMensaje}
                  setMensaje={setMensaje}
                  reiniciando={false}
                  rol={rol}
                  exportarCSV={undefined}
                  mostrarAccionesAdministrativas={false}
                />

                {cliente && subscriptions.length > 0 && (
                  <OperacionSuscripcionActiva
                    clienteId={cliente.id}
                    subscriptions={subscriptions}
                    subscriptionSeleccionada={subscriptionSeleccionada}
                    cargando={cargandoSuscripcion}
                    onRefresh={() => cargarSuscripcionActiva(cliente.id)}
                    onMensaje={setMensajeSuscripcion}
                    onSelectSubscription={setSubscriptionSeleccionada}
                  />
                )}

                {cliente && subscriptions.length > 0 && (
                  <UltimosMovimientos clienteId={cliente.id} />
                )}

                {mensajeSuscripcion && (
                  <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700">
                    {mensajeSuscripcion}
                  </div>
                )}
              </>
            )}
          </div>
          </div>
          </div>
          )}
        </section>
      </div>
    </main>
  );
}
