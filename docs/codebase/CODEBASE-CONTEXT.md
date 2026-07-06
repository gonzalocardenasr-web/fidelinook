## CODEBASE_CONTEXT.md

## Árbol de carpetas:

1.1.1. app*activar-cuenta_ActivarCuentaForm
1.1.2. app_activar-cuenta_page
1.2.1. app_admin_page
1.2.1.1. app_admin_components_AdminExport
1.2.2.1. app_admin_login_page
1.3.1.1. app_api_activar-cuenta_route
1.3.2.1.1.1. app_api_admin_campanas_cancelar_route
1.3.2.1.2.1. app_api_admin_campanas_ejecutar_route
1.3.2.1.3.1. app_api_admin_campanas_expirar_route
1.3.2.1.4.1. app_api_admin_campanas_lanzar_route
1.3.2.1.5.1. app_api_admin_campanas_programar-lanzamiento_route
1.3.3.1.1. app_api_cron_campanas_route
1.3.4.1. app_api_daily-crm_route
1.3.5.1.1. app_api_dashboard_campanas_route
1.3.5.2.1. app_api_dashboard_overview_route
1.3.6.1. app_api_login_route
1.3.7.1. app_api_logout_route
1.3.8.1.1. app_api_password_recovery_route
1.3.9.1. app_api_recover-card_route
1.3.10.1.1. app_api_register_verify_route
1.3.10.2. app_api_register_route
1.3.11.1. app_api_reminder-expiring-rewards_route
1.3.12.1. app_api_resend-verification_route
1.3.13.1. app_api_send-campana-email_route
1.3.14.1. app_api_send-prize_route
1.3.15.1. app_api_send-reward-redeemed_route
1.3.16.1. app_api_send-stamp_route
1.3.17.1. app_api_send-verification_route
1.3.18.1. app_api_send-welcome_route
1.3.19.1. app_api_session_route
1.3.20.1.1. app_api_subscriptions_activate-assigned_route
1.3.20.2.1. app_api_subscriptions_active-by-client_route
1.3.20.3.1. app_api_subscriptions_consumptions-by-client_route
1.3.20.4.1. app_api_subscriptions_create-assigned_route
1.3.20.5.1. app_api_subscriptions_create-code_route
1.3.20.6.1. app_api_subscriptions_create-template_route
1.3.20.7.1. app_api_subscriptions_delete_route
1.3.20.8.1. app_api_subscriptions_delete-claim_route
1.3.20.9.1. app_api_subscriptions_redeem-code_route
1.3.20.10.1. app_api_subscriptions_register-consumption_route
1.3.21.1. app_api_verify-email_route
1.4.1.1. app_campanas*[id]_page
1.4.2. app_campanas_page
1.5.1. app_clientes_page
1.6.1. app_dashboard_page
1.7.1. app_login_LoginForm
1.7.2. app_login_page
1.8.1.1. app_mi-cuenta_components_ClienteLogoutButton
1.8.2.1. app_mi-cuenta_perfil_page
1.8.3.1. app_mi-cuenta_suscripciones_page
1.8.4.1. app_mi-cuenta_tarjeta_page
1.8.5. app_mi-cuenta_page
1.8.6.1. app_operacion_components_AdminClienteDetalle
1.8.6.2. app_operacion_components_AdminRegistroCard
1.8.6.3. app_operacion_components_AdminStats
1.8.6.4. app_operacion_components_OperacionSuscripcionActiva
1.8.6.5. app_operacion_components_UltimosMovimientos
1.8.6.6. app_operacion_components_UltimosMovimientosCard
1.8.7. app_operacion_page
1.9.1. app_recuperar-contrasena_page
1.10.1. app_register_page
1.11.1. app_registro_page
1.12.1. app_restablecer-contrasena_page
1.13.1. app_suscripciones_page
1.14.1.1. app_t_[id]\_page
1.15.1. app_tarjeta_page
1.16.1. app_terminos_page
1.17.1. app_verificar_page
1.18.1. app_verificar-registro_page
1.19.1. app_globals
1.20.1. app_layout
1.21.1. app_page
3.1.1. lib_email_baseTemplate
3.1.2. lib_email_resend
3.1.3. lib_email_sendCardActivateEmail
3.1.4. lib_email_sendPrizeEmail
3.1.5. lib_email_sendPrizeExpiringReminderEmail
3.1.6. lib_email_sendReactivationEmail
3.1.7. lib_email_sendRegisterVerificationEmail
3.1.8. lib_email_sendResetPasswordEmail
3.1.9. lib_email_sendRewardRedeemedEmail
3.1.10. lib_email_sendStampEmail
3.1.11. lib_email_sendVerificationEmail
3.1.12. lib_email_sendWelcome
3.2.1. lib_utils_generateVerificationToken
3.3. lib_subscriptionCycle
3.4. lib_supabase-admin
3.5. lib_supabase-server
3.6. lib_supabase

## 3.6. lib_supabase.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

## 3.5. lib_supabase-server.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
const cookieStore = await cookies();

return createServerClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
{
cookies: {
get(name: string) {
return cookieStore.get(name)?.value;
},
},
}
);
}

## 3.4. lib_supabase-admin.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

## 1.8.7. app_operacion_page.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import AdminClienteDetalle from "./components/AdminClienteDetalle";
import UltimosMovimientosCard from "./components/UltimosMovimientosCard";
import OperacionSuscripcionActiva from "./components/OperacionSuscripcionActiva";
import UltimosMovimientos from "./components/UltimosMovimientos";

type Premio = {
id: number | string;
nombre: string;
descripcion?: string;
estado: "activo" | "usado" | "caducado";
vencimiento?: string;
tipo?: string;
campana_id?: number;
fecha_canje?: string;
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
fecha_ultimo_sello?: string | null;
fecha_ultimo_canje?: string | null;
created_At?: string | null;
fecha_activacion?: string | null;
};

type Campana = {
id: number;
nombre_interno: string;
premio_nombre: string;
duracion_horas: number;
fecha_lanzamiento: string;
recurrencia: string;
estado: "borrador" | "programada" | "lanzando" | "lanzada" | "fallida" | "cancelada";
total_objetivo?: number | null;
total_enviados?: number | null;
created_at?: string | null;
};

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const META_SELLOS = 7;

export default function OperacionPage() {
const [clientes, setClientes] = useState<Cliente[]>([]);
const [clienteSeleccionadoId, setClienteSeleccionadoId] =
useState<string>("");
const [busqueda, setBusqueda] = useState("");
const [letraActiva, setLetraActiva] = useState<string>("TODOS");
const [mensaje, setMensaje] = useState("");
const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "info">("info");
const [cargando, setCargando] = useState(true);
const [procesandoCompra, setProcesandoCompra] = useState(false);
const [procesandoCanje, setProcesandoCanje] = useState(false);
const [rol, setRol] = useState<"admin" | "superadmin" | null>(null);
const [cargandoRol, setCargandoRol] = useState(true);
const [subscriptions, setSubscriptions] = useState<any[]>([]);
const [subscriptionSeleccionada, setSubscriptionSeleccionada] = useState<any>(null);
const [cargandoSuscripcion, setCargandoSuscripcion] = useState(false);
const [mensajeSuscripcion, setMensajeSuscripcion] = useState("");
const [campanas, setCampanas] = useState<Campana[]>([]);
const [cargandoCampanas, setCargandoCampanas] = useState(false);
const [procesandoCampanaId, setProcesandoCampanaId] = useState<number | null>(null);

useEffect(() => {
cargarSesion();
cargarDatos();
cargarCampanas();
}, []);

useEffect(() => {
if (!clienteSeleccionadoId) {
setSubscriptions([]);
setSubscriptionSeleccionada(null);
setMensajeSuscripcion("");
return;
}

cargarSuscripcionActiva(Number(clienteSeleccionadoId));
}, [clienteSeleccionadoId]);

async function cargarSuscripcionActiva(clienteId: number) {
try {
setCargandoSuscripcion(true);
setMensajeSuscripcion("");

        const res = await fetch(
        `/api/subscriptions/active-by-client?clienteId=${clienteId}`
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
        localStorage.removeItem("operacionClienteSeleccionadoId");
        return;
      }

      const seleccionadoGuardado = localStorage.getItem(
        "operacionClienteSeleccionadoId"
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
      localStorage.setItem("operacionClienteSeleccionadoId", primerId);
    } catch (err) {
      console.error("Error inesperado cargando clientes:", err);
      setMensaje("Ocurrió un error inesperado al cargar clientes.");
      setClientes([]);
    } finally {
      setCargando(false);
    }

};

const cargarCampanas = async () => {
try {
setCargandoCampanas(true);

      const { data, error } = await supabase
        .from("campanas")
        .select(
          "id, nombre_interno, premio_nombre, duracion_horas, fecha_lanzamiento, recurrencia, estado, total_objetivo, total_enviados, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error cargando campañas:", error);
        return;
      }

      setCampanas((data || []) as Campana[]);
    } catch (error) {
      console.error("Error inesperado cargando campañas:", error);
    } finally {
      setCargandoCampanas(false);
    }

};

const programarLanzamientoCampana = async (campanaId: number) => {
try {
setProcesandoCampanaId(campanaId);
setMensaje("");
setTipoMensaje("info");

      const res = await fetch("/api/admin/campanas/programar-lanzamiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campanaId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.message || "No se pudo programar la campaña.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.message || "Campaña programada correctamente.");

      await cargarCampanas();
    } catch (error) {
      console.error("Error programando campaña:", error);
      setTipoMensaje("error");
      setMensaje("Ocurrió un error al programar la campaña.");
    } finally {
      setProcesandoCampanaId(null);
    }

};

const cancelarCampana = async (campanaId: number) => {
const confirmar = window.confirm("¿Seguro que quieres cancelar esta campaña?");

    if (!confirmar) return;

    try {
      setProcesandoCampanaId(campanaId);
      setMensaje("");
      setTipoMensaje("info");

      const res = await fetch("/api/admin/campanas/cancelar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campanaId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.message || "No se pudo cancelar la campaña.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.message || "Campaña cancelada correctamente.");

      await cargarCampanas();
    } catch (error) {
      console.error("Error cancelando campaña:", error);
      setTipoMensaje("error");
      setMensaje("Ocurrió un error al cancelar la campaña.");
    } finally {
      setProcesandoCampanaId(null);
    }

};

const ejecutarCampanaAhora = async (campanaId: number) => {
const confirmar = window.confirm(
"¿Seguro que quieres ejecutar esta campaña ahora? Se asignará el premio a los clientes objetivo."
);

    if (!confirmar) return;

    try {
      setProcesandoCampanaId(campanaId);
      setMensaje("");
      setTipoMensaje("info");

      const res = await fetch("/api/admin/campanas/ejecutar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campanaId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.message || "No se pudo ejecutar la campaña.");
        return;
      }

      setTipoMensaje("success");
      setMensaje(data.message || "Campaña ejecutada correctamente.");

      await cargarCampanas();
      await cargarDatos(true);
    } catch (error) {
      console.error("Error ejecutando campaña:", error);
      setTipoMensaje("error");
      setMensaje("Ocurrió un error al ejecutar la campaña.");
    } finally {
      setProcesandoCampanaId(null);
    }

};

const ejecutarCampanaPrueba = async (campanaId: number) => {
const correo = window.prompt(
"Ingresa el correo del cliente de prueba que recibirá el premio:"
);

    if (!correo) return;

    try {
      setProcesandoCampanaId(campanaId);
      setMensaje("");
      setTipoMensaje("info");

      const res = await fetch("/api/admin/campanas/ejecutar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campanaId,
          clienteCorreoPrueba: correo.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTipoMensaje("error");
        setMensaje(data.message || "No se pudo ejecutar la prueba.");
        return;
      }

      setTipoMensaje("success");
      setMensaje("Prueba ejecutada correctamente para el cliente indicado.");

      await cargarCampanas();
      await cargarDatos(true);
    } catch (error) {
      console.error("Error ejecutando prueba de campaña:", error);
      setTipoMensaje("error");
      setMensaje("Ocurrió un error al ejecutar la prueba.");
    } finally {
      setProcesandoCampanaId(null);
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
              .startsWith(letra.toLowerCase())
          );

    if (listaFiltrada.length > 0) {
      const primerId = String(listaFiltrada[0].id);
      setClienteSeleccionadoId(primerId);
      localStorage.setItem("operacionClienteSeleccionadoId", primerId);
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
setTipoMensaje("error");
setMensaje("Debes seleccionar un cliente.");
return;
}

    if (!cliente.tarjeta_activa || !cliente.email_verificado) {
      setTipoMensaje("error");
      setMensaje(
        "El cliente aún no ha activado su tarjeta. Debe verificar su correo primero."
      );
      return;
    }

    try {
      setProcesandoCompra(true);
      setMensaje("");
      setTipoMensaje("info");

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
        setTipoMensaje("error");
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
      setTipoMensaje("success");
      setMensaje(mensajeFinal);
    } catch (err) {
      console.error("Error inesperado al validar compra:", err);
      setTipoMensaje("error");
      setMensaje("Ocurrió un error inesperado al validar la compra.");
    } finally {
      setProcesandoCompra(false);
    }

};

const canjearPremioPorId = async (premioId: number | string) => {
if (!cliente) {
setTipoMensaje("error");
setMensaje("Debes seleccionar un cliente.");
return;
}

    if (!cliente.tarjeta_activa || !cliente.email_verificado) {
      setTipoMensaje("error");
      setMensaje(
        "El cliente aún no ha activado su tarjeta. No es posible canjear premios."
      );
      return;
    }

    try {
      setProcesandoCanje(true);
      setMensaje("");
      setTipoMensaje("info");

      const premiosActuales = Array.isArray(cliente.premios)
        ? [...cliente.premios]
        : [];

      const indexPremioActivo = premiosActuales.findIndex(
        (premio: Premio) =>
          String(premio.id) === String(premioId) && premio.estado === "activo"
      );

      if (indexPremioActivo === -1) {
        setTipoMensaje("error");
        setMensaje("No se encontró un premio activo para canjear.");
        return;
      }

      const premioActivo = premiosActuales[indexPremioActivo];

      premiosActuales[indexPremioActivo] = {
        ...premiosActuales[indexPremioActivo],
        estado: "usado",
        fecha_canje: new Date().toISOString(),
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
        setTipoMensaje("error");
        setMensaje("Hubo un error al canjear el premio.");
        return;
      }

      if (premioActivo?.tipo === "campana" && premioActivo?.campana_id) {
        const { error: trackingError } = await supabase
          .from("campana_clientes")
          .update({
            estado: "canjeado",
            canjeado_at: new Date().toISOString(),
          })
          .eq("campana_id", premioActivo.campana_id)
          .eq("cliente_id", cliente.id)
          .eq("premio_id", String(premioActivo.id));

        if (trackingError) {
          console.error("Error actualizando trazabilidad de campaña:", trackingError);
        }
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
      setTipoMensaje("success");
      setMensaje(`Premio canjeado correctamente: ${premioActivo.nombre}.`);
    } catch (err) {
      console.error("Error inesperado al canjear premio:", err);
      setTipoMensaje("error");
      setMensaje("Ocurrió un error inesperado al canjear el premio.");
    } finally {
      setProcesandoCanje(false);
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
setTipoMensaje("error");
setMensaje("No se pudo cerrar sesión.");
}
};

return (
<main className="min-h-screen bg-[#F6F3FF] p-6">
<div className="mx-auto max-w-5xl space-y-6">

        <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
                <Link
                    href="/"
                    className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
                >
                    ← Volver al inicio
                </Link>

                <h1 className="mt-3 text-2xl font-bold">Operación</h1>

                <p className="text-sm opacity-90">
                    Gestión operativa de clientes, fidelización y suscripciones
                </p>

                <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                    {cargandoRol ? "Cargando rol..." : `ROL: ${rol ?? "sin sesión"}`}
                </p>
                </div>

                <button
                onClick={cerrarSesion}
                className="cursor-pointer rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25"
                >
                Cerrar sesión
                </button>

            </div>
            </div>



        <UltimosMovimientosCard clientes={clientes} />

        {rol === "superadmin" && (
                  <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7A57F6]">
                          Campañas
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-[#222]">
                          Gestión de campañas
                        </h2>
                        <p className="mt-1 text-sm text-[#666]">
                          Revisa, lanza o cancela campañas antes de publicarlas.
                        </p>
                      </div>

                      <button
                        onClick={async () => {
                          const confirmar = confirm("¿Expirar premios vencidos?");
                          if (!confirmar) return;

                          const res = await fetch("/api/admin/campanas/expirar", {
                            method: "POST",
                          });

                          const data = await res.json();

                          alert(`Clientes actualizados: ${data.totalActualizados}`);

                          await cargarDatos(true);
                        }}
                        className="cursor-pointer mb-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                      >
                        Expirar premios
                      </button>

                      <a
                        href="/campanas"
                        className="inline-flex rounded-2xl border border-[#D9C8FF] bg-white px-5 py-3 text-sm font-semibold text-[#4c00f7] transition hover:bg-[#F7F2FF]"
                      >
                        Crear campaña
                      </a>
                    </div>

                    {cargandoCampanas ? (
                      <div className="rounded-2xl border border-[#E7C8F2] bg-[#FCF8FF] px-4 py-3 text-sm text-[#555]">
                        Cargando campañas...
                      </div>
                    ) : campanas.length === 0 ? (
                      <div className="rounded-2xl border border-[#E7C8F2] bg-[#FCF8FF] px-4 py-3 text-sm text-[#555]">
                        No hay campañas creadas.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
                          <thead>
                            <tr className="text-xs uppercase tracking-[0.18em] text-[#777]">
                              <th className="px-3 py-2">Campaña</th>
                              <th className="px-3 py-2">Premio</th>
                              <th className="px-3 py-2">Estado</th>
                              <th className="px-3 py-2">Lanzamiento</th>
                              <th className="px-3 py-2">Vigencia</th>
                              <th className="px-3 py-2">Alcance</th>
                              <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                          </thead>

                          <tbody>
                            {campanas.map((campana) => {
                              const puedeLanzar =
                                campana.estado === "borrador" || campana.estado === "fallida";

                              const puedeCancelar =
                                campana.estado === "borrador" ||
                                campana.estado === "programada" ||
                                campana.estado === "fallida";

                              return (
                                <tr key={campana.id}>
                                  <td className="rounded-l-2xl bg-[#FCF8FF] px-3 py-3">
                                    <p className="font-semibold text-[#222]">
                                      {campana.nombre_interno}
                                    </p>
                                    <p className="mt-1 text-xs text-[#777]">
                                      #{campana.id}
                                    </p>
                                  </td>

                                  <td className="bg-[#FCF8FF] px-3 py-3 text-[#555]">
                                    {campana.premio_nombre}
                                  </td>

                                  <td className="bg-[#FCF8FF] px-3 py-3">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4c00f7]">
                                      {campana.estado}
                                    </span>
                                  </td>

                                  <td className="bg-[#FCF8FF] px-3 py-3 text-[#555]">
                                    {new Date(campana.fecha_lanzamiento).toLocaleString("es-CL", {
                                      timeZone: "America/Santiago",
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>

                                  <td className="bg-[#FCF8FF] px-3 py-3 text-[#555]">
                                    {campana.duracion_horas} h
                                  </td>

                                  <td className="bg-[#FCF8FF] px-3 py-3 text-[#555]">
                                    {campana.total_enviados || 0}/{campana.total_objetivo || 0}
                                  </td>

                                  <td className="rounded-r-2xl bg-[#FCF8FF] px-3 py-3">
                                    <div className="flex justify-end gap-2">
                                      <a
                                        href={`/campanas/${campana.id}`}
                                        className="rounded-xl border border-[#D9C8FF] bg-white px-3 py-2 text-xs font-semibold text-[#4c00f7] transition hover:bg-[#F7F2FF]"
                                      >
                                        Ver
                                      </a>

                                      {puedeLanzar && (
                                        <button
                                          type="button"
                                          onClick={() => programarLanzamientoCampana(campana.id)}
                                          disabled={procesandoCampanaId === campana.id}
                                          className="rounded-xl bg-[#4c00f7] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
                                        >
                                          {procesandoCampanaId === campana.id
                                            ? "Procesando..."
                                            : "Lanzar"}
                                        </button>
                                      )}

                                      {campana.estado === "programada" && (
                                        <button
                                          type="button"
                                          onClick={() => ejecutarCampanaAhora(campana.id)}
                                          disabled={procesandoCampanaId === campana.id}
                                          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                        >
                                          {procesandoCampanaId === campana.id
                                            ? "Ejecutando..."
                                            : "Ejecutar ahora"}
                                        </button>
                                      )}

                                      {["borrador", "programada", "fallida"].includes(campana.estado) && (
                                        <button
                                          type="button"
                                          onClick={() => ejecutarCampanaPrueba(campana.id)}
                                          disabled={procesandoCampanaId === campana.id}
                                          className="rounded-xl border border-[#D9C8FF] bg-white px-3 py-2 text-xs font-semibold text-[#4c00f7] transition hover:bg-[#F7F2FF] disabled:opacity-60"
                                        >
                                          Probar
                                        </button>
                                      )}

                                      {puedeCancelar && (
                                        <button
                                          type="button"
                                          onClick={() => cancelarCampana(campana.id)}
                                          disabled={procesandoCampanaId === campana.id}
                                          className="rounded-xl border border-[#E7C9D1] bg-white px-3 py-2 text-xs font-semibold text-[#8A3550] transition hover:bg-[#FFF1F4] disabled:opacity-60"
                                        >
                                          Cancelar
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
          )}

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
                    premiosActivos={premiosActivos}
                    mensaje={mensaje}
                    tipoMensaje={tipoMensaje}
                    setMensaje={setMensaje}
                    procesandoCompra={procesandoCompra}
                    procesandoCanje={procesandoCanje}
                    reiniciando={false}
                    rol={rol}
                    validarCompra={validarCompra}
                    canjearPremioPorId={canjearPremioPorId}
                    eliminarClienteSeleccionado={undefined}
                    reiniciarDatos={undefined}
                    exportarCSV={undefined}
                    mostrarAccionesAdministrativas={false}


                />

                {subscriptions.length > 0 && (
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

                    {subscriptions.length > 0 && (
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
    </main>

);
}

## 1.8.6.1. app_operacion_components_AdminClienteDetalle.tsx

import QRCode from "react-qr-code";

type Premio = {
id: number | string;
nombre: string;
descripcion?: string;
estado: "activo" | "usado" | "caducado";
vencimiento?: string;
tipo?: string;
campana_id?: number;
fecha_canje?: string;
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
fecha_ultimo_sello?: string | null;
fecha_ultimo_canje?: string | null;
};

type Props = {
cliente: Cliente | null;
premiosActivos: Premio[];
mensaje: string;
tipoMensaje: "success" | "error" | "info";
setMensaje: (value: string) => void;
procesandoCompra: boolean;
procesandoCanje: boolean;
reiniciando: boolean;
rol: "admin" | "superadmin" | null;
validarCompra: () => Promise<void>;
canjearPremioPorId: (premioId: number | string) => Promise<void>;
eliminarClienteSeleccionado?: () => void;
reiniciarDatos?: () => void;
exportarCSV?: () => void;
mostrarAccionesAdministrativas: boolean;
};

const META_SELLOS = 7;

export default function AdminClienteDetalle({
cliente,
premiosActivos,
mensaje,
tipoMensaje,
setMensaje,
procesandoCompra,
procesandoCanje,
reiniciando,
rol,
validarCompra,
canjearPremioPorId,
eliminarClienteSeleccionado,
reiniciarDatos,
exportarCSV,
mostrarAccionesAdministrativas,
}: Props) {
if (!cliente) return null;

const premiosArray = Array.isArray(cliente.premios) ? cliente.premios : [];

const premiosUsados = premiosArray.filter(
(premio) => premio.estado === "usado"
).length;

const formatearFecha = (fecha?: string | null) => {
if (!fecha) return "Sin registro";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "Sin registro";

    return date.toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });

};

return (
<>
<div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-sm font-semibold text-violet-600">
Cliente seleccionado
</p>

            <h2 className="mt-1 text-2xl font-bold text-neutral-900">
              {cliente.nombre}
            </h2>

            <div className="mt-2 space-y-1 text-sm text-neutral-600">
              <p>{cliente.correo}</p>
              <p>{cliente.telefono}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  cliente.tarjeta_activa
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {cliente.tarjeta_activa
                  ? "Tarjeta activa"
                  : "Pendiente de activación"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  cliente.email_verificado
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {cliente.email_verificado
                  ? "Correo verificado"
                  : "Correo no verificado"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:min-w-[220px]">
            <div className="rounded-xl bg-violet-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Sellos
              </p>
              <p className="mt-1 text-xl font-bold text-violet-700">
                {cliente.sellos ?? 0} / {META_SELLOS}
              </p>
            </div>

            <div className="rounded-xl bg-pink-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                Premios
              </p>
              <p className="mt-1 text-xl font-bold text-pink-700">
                {premiosActivos.length}
              </p>

            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-medium text-neutral-700">
            Premios activos
          </p>

          {premiosActivos.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No hay premios activos para este cliente.
            </p>
          ) : (
            <div className="space-y-3">
              {premiosActivos.map((premio) => (
                <div
                  key={premio.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {premio.nombre}
                    </p>

                    {premio.vencimiento && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Vence: {formatearFecha(premio.vencimiento)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => canjearPremioPorId(premio.id)}
                    disabled={procesandoCanje}
                    className="rounded-xl bg-[#4c00f7] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {procesandoCanje ? "Canjeando..." : "Canjear"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={`/t/${cliente.public_token}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Abrir tarjeta
          </a>

          <button
            onClick={() => {
              const url = `${window.location.origin}/t/${cliente.public_token}`;
              navigator.clipboard.writeText(url);
              setMensaje("Link copiado al portapapeles");
            }}
            className="cursor-pointer rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-200"
          >
            Copiar link
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-medium text-neutral-700">QR tarjeta</p>

          <div className="inline-block rounded-lg bg-white p-3 shadow-sm">
            <QRCode
              value={`${window.location.origin}/t/${cliente.public_token}`}
              size={120}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-4 text-sm font-medium text-neutral-700">
            Historial cliente
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Último sello
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {formatearFecha(cliente.fecha_ultimo_sello)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Último canje
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {formatearFecha(cliente.fecha_ultimo_canje)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Sellos actuales
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {cliente.sellos ?? 0} / {META_SELLOS}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Premios usados
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-800">
                {premiosUsados}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          onClick={validarCompra}
          disabled={
            procesandoCompra || procesandoCanje || reiniciando || !cliente
          }
          className="cursor-pointer rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-white shadow hover:opacity-90 disabled:opacity-60"
        >
          {procesandoCompra ? "Validando..." : "Validar compra"}
        </button>

        {mostrarAccionesAdministrativas && rol === "superadmin" && (
          <>
            <button
              onClick={eliminarClienteSeleccionado}
              disabled={
                reiniciando || procesandoCompra || procesandoCanje || !cliente
              }
              className="cursor-pointer rounded-lg bg-red-500 px-4 py-3 text-white hover:opacity-90 disabled:opacity-60"
            >
              {reiniciando ? "Procesando..." : "Eliminar cliente"}
            </button>

            <button
              onClick={reiniciarDatos}
              disabled={reiniciando || procesandoCompra || procesandoCanje}
              className="cursor-pointer rounded-lg border border-red-300 bg-white px-4 py-3 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {reiniciando ? "Procesando..." : "Eliminar todos"}
            </button>

            <button
              onClick={exportarCSV}
              disabled={reiniciando || procesandoCompra || procesandoCanje}
              className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              Exportar clientes CSV
            </button>
          </>
        )}
      </div>

      {mensaje && (
        <div
          className={`mt-6 rounded-lg p-4 text-sm ${
            tipoMensaje === "success"
              ? "border border-[#D8E7C9] bg-[#F3FAEC] text-[#42622B]"
              : tipoMensaje === "error"
              ? "border border-[#E7C9D1] bg-[#FFF1F4] text-[#8A3550]"
              : "border border-[#E7C8F2] bg-[#FCF8FF] text-neutral-700"
          }`}
        >
          {mensaje}
        </div>
      )}

    </>

);
}

## 1.8.6.2. app_operacion_components_AdminRegistroCard.tsx

import QRCode from "react-qr-code";

type Props = {
mostrarRegistro: boolean;
setMostrarRegistro: (value: boolean) => void;
setMensaje: (value: string) => void;
};

export default function AdminRegistroCard({
mostrarRegistro,
setMostrarRegistro,
setMensaje,
}: Props) {
return (
<div className="mt-6 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
<button
type="button"
onClick={() => setMostrarRegistro(!mostrarRegistro)}
className="cursor-pointer flex w-full items-center justify-between p-4 text-left" >
<span className="text-lg font-semibold">Registro nuevo cliente</span>
<span className="text-2xl leading-none">
{mostrarRegistro ? "−" : "+"}
</span>
</button>

      {mostrarRegistro && (
        <div className="border-t border-neutral-200 p-4 pt-4">
          <p className="mt-1 text-sm text-neutral-600">
            Escanea para registrar cliente
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="w-fit rounded border bg-white p-4">
              <QRCode
                value="https://fidelidad.nookheladeria.cl/registro"
                size={160}
              />
            </div>

            <div className="space-y-2">
              <a
                href="/registro"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit rounded bg-black px-4 py-3 text-white"
              >
                Abrir formulario
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    "https://fidelidad.nookheladeria.cl/registro"
                  );
                  setMensaje("Link de registro copiado");
                }}
                className="cursor-pointer block w-fit rounded bg-neutral-200 px-4 py-3"
              >
                Copiar link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

);
}

## 1.8.6.3. app_operacion_components_AdminStats.tsx

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

type Props = {
clientes: Cliente[];
};

export default function AdminStats({ clientes }: Props) {
const totalClientes = clientes.length;

const tarjetasActivas = clientes.filter((c) => c.tarjeta_activa).length;

const correosVerificados = clientes.filter((c) => c.email_verificado).length;

const premiosActivos = clientes.reduce((acc, cliente) => {
const premios = Array.isArray(cliente.premios) ? cliente.premios : [];
const activos = premios.filter((premio) => premio.estado === "activo").length;
return acc + activos;
}, 0);

const ahora = new Date();

const premiosPorVencer = clientes.reduce((acc, cliente) => {
const premios = Array.isArray(cliente.premios) ? cliente.premios : [];

    const porVencer = premios.filter((premio) => {
      if (premio.estado !== "activo" || !premio.vencimiento) return false;

      const fechaVencimiento = new Date(premio.vencimiento);
      const diffMs = fechaVencimiento.getTime() - ahora.getTime();
      const diffDias = diffMs / (1000 * 60 * 60 * 24);

      return diffDias >= 0 && diffDias <= 3;
    }).length;

    return acc + porVencer;

}, 0);

const stats = [
{
label: "Clientes registrados",
value: totalClientes,
bg: "bg-violet-50",
text: "text-violet-700",
},
{
label: "Tarjetas activas",
value: tarjetasActivas,
bg: "bg-green-50",
text: "text-green-700",
},
{
label: "Correos verificados",
value: correosVerificados,
bg: "bg-blue-50",
text: "text-blue-700",
},
{
label: "Premios activos",
value: premiosActivos,
bg: "bg-pink-50",
text: "text-pink-700",
},
{
label: "Premios por vencer",
value: premiosPorVencer,
bg: "bg-amber-50",
text: "text-amber-700",
},
];

return (
<div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
{stats.map((stat) => (
<div
key={stat.label}
className={`rounded-2xl border border-neutral-200 p-3 shadow-sm ${stat.bg}`} >
<p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 sm:text-xs">
{stat.label}
</p>
<p className={`mt-1 text-xl font-bold sm:text-2xl ${stat.text}`}>{stat.value}</p>
</div>
))}
</div>
);
}

## 1.8.6.4. app_operacion_components_OperacionSuscripcionActiva.tsx

"use client";

import { useMemo, useState } from "react";

type SubscriptionActiva = {
id: number;
name: string;
status?: string;
startDate?: string;
endDate?: string;
durationMonths: number;
cycleNumber: number;
cycleStartDate: string;
cycleEndDate: string;
incluido: {
potes: number;
toppings: number;
barquillos: number;
galletas: number;
};
consumido: {
potes: number;
toppings: number;
barquillos: number;
galletas: number;
};
disponible: {
potes: number;
toppings: number;
barquillos: number;
galletas: number;
};
};

type Props = {
clienteId: number;
subscriptions: SubscriptionActiva[];
subscriptionSeleccionada: SubscriptionActiva | null;
cargando: boolean;
onRefresh: () => Promise<void>;
onMensaje: (value: string) => void;
onSelectSubscription: (sub: SubscriptionActiva | null) => void;
};

export default function OperacionSuscripcionActiva({
clienteId,
subscriptions,
subscriptionSeleccionada,
cargando,
onRefresh,
onMensaje,
onSelectSubscription,
}: Props) {
const [potes, setPotes] = useState(0);
const [toppings, setToppings] = useState(0);
const [barquillos, setBarquillos] = useState(0);
const [galletas, setGalletas] = useState(0);
const [registrando, setRegistrando] = useState(false);
const [abierto, setAbierto] = useState(true);

const hayConsumoParaRegistrar = useMemo(() => {
return potes > 0 || toppings > 0 || barquillos > 0 || galletas > 0;
}, [potes, toppings, barquillos, galletas]);

const erroresValidacion = useMemo(() => {
if (!subscriptionSeleccionada) return [];

    const errores: string[] = [];

    if (
        potes > 0 &&
        subscriptionSeleccionada.incluido.potes === 0
    ) {
        errores.push("Esta suscripción no incluye potes.");
    }

    if (
        toppings > 0 &&
        subscriptionSeleccionada.incluido.toppings === 0
    ) {
        errores.push("Esta suscripción no incluye toppings.");
    }

    if (
        barquillos > 0 &&
        subscriptionSeleccionada.incluido.barquillos === 0
    ) {
        errores.push("Esta suscripción no incluye barquillos.");
    }

    if (
        galletas > 0 &&
        subscriptionSeleccionada.incluido.galletas === 0
    ) {
        errores.push("Esta suscripción no incluye galletas.");
    }

    if (
        potes > subscriptionSeleccionada.disponible.potes
    ) {
        errores.push("La cantidad de potes supera lo disponible.");
    }

    if (
        toppings > subscriptionSeleccionada.disponible.toppings
    ) {
        errores.push("La cantidad de toppings supera lo disponible.");
    }

    if (
        barquillos > subscriptionSeleccionada.disponible.barquillos
    ) {
        errores.push("La cantidad de barquillos supera lo disponible.");
    }

    if (
        galletas > subscriptionSeleccionada.disponible.galletas
    ) {
        errores.push("La cantidad de galletas supera lo disponible.");
    }

    return errores;
    }, [
    subscriptionSeleccionada,
    potes,
    toppings,
    barquillos,
    galletas,

]);

const formatearFecha = (fecha?: string | null) => {
if (!fecha) return "Sin registro";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) return "Sin registro";

    return date.toLocaleDateString("es-CL");

};

const resetForm = () => {
setPotes(0);
setToppings(0);
setBarquillos(0);
setGalletas(0);
};

const registrarConsumo = async () => {
if (!subscriptionSeleccionada) {
onMensaje("Debes seleccionar una suscripción.");
return;
}

    if (!hayConsumoParaRegistrar) {
      onMensaje("Debes ingresar al menos un producto para registrar consumo.");
      return;
    }

    if (erroresValidacion.length > 0) {
        onMensaje("Corrige los errores antes de registrar el consumo.");
        return;
    }

    try {
      setRegistrando(true);
      onMensaje("");

      const res = await fetch("/api/subscriptions/register-consumption", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscriptionSeleccionada.id,
          clienteId,
          potes,
          toppings,
          barquillos,
          galletas,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onMensaje(data?.message || "No se pudo registrar el consumo.");
        return;
      }

      resetForm();
      await onRefresh();
      onMensaje("Consumo registrado correctamente.");
    } catch (error) {
      console.error("Error registrando consumo:", error);
      onMensaje("Ocurrió un error inesperado al registrar el consumo.");
    } finally {
      setRegistrando(false);
    }

};

if (cargando) {
return (
<div className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
<p className="text-sm text-neutral-600">
Cargando suscripciones activas...
</p>
</div>
);
}

return (
<div className="mt-6 rounded-2xl border border-violet-100 bg-white shadow-sm">
<button
type="button"
onClick={() => setAbierto(!abierto)}
className="cursor-pointer flex w-full items-center justify-between px-5 py-4 text-left" >
<span className="text-sm font-semibold text-violet-700">
Suscripciones activas
</span>
<span className="text-sm text-violet-700">{abierto ? "▲" : "▼"}</span>
</button>

      {abierto && (
        <div className="border-t border-violet-100 p-5">
          {subscriptions.length === 0 ? (
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Suscripción activa
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Este cliente no tiene una suscripción activa.
              </p>
            </div>
          ) : (
            <>
              {subscriptions.length > 1 && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-violet-700">
                    Seleccionar suscripción
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    value={subscriptionSeleccionada?.id || ""}
                    onChange={(e) => {
                      const sub =
                        subscriptions.find(
                          (s) => s.id === Number(e.target.value)
                        ) || null;
                      onSelectSubscription(sub);
                      onMensaje("");
                      resetForm();
                    }}
                  >
                    {subscriptions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                            {sub.name} | Vigencia: {formatearFecha(sub.startDate || null)} al{" "}
                            {formatearFecha(sub.endDate || null)} | Ciclo {sub.cycleNumber} de{" "}
                            {sub.durationMonths}
                        </option>
                    ))}
                  </select>
                </div>
              )}

              {subscriptionSeleccionada && (
                <>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-violet-700">
                        Suscripción activa
                      </p>

                      <h3 className="mt-1 text-xl font-bold text-neutral-900">
                        {subscriptionSeleccionada.name}
                      </h3>

                      <div className="mt-2 space-y-1 text-sm text-neutral-600">
                        <p>
                          Vigencia:{" "}
                          {formatearFecha(subscriptionSeleccionada.startDate)} al{" "}
                          {formatearFecha(subscriptionSeleccionada.endDate)}
                        </p>
                        <p>
                          Ciclo actual: {subscriptionSeleccionada.cycleNumber} de{" "}
                          {subscriptionSeleccionada.durationMonths}
                        </p>
                        <p>
                          Periodo del ciclo:{" "}
                          {formatearFecha(
                            subscriptionSeleccionada.cycleStartDate
                          )}{" "}
                          al{" "}
                          {formatearFecha(
                            subscriptionSeleccionada.cycleEndDate
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-violet-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                        Estado
                      </p>
                      <p className="mt-1 text-sm font-bold text-violet-700">
                        Activa
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-4 text-sm font-medium text-neutral-700">
                      Disponibilidad del ciclo actual
                    </p>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Potes
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.potes} /{" "}
                          {subscriptionSeleccionada.incluido.potes}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.potes}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Toppings
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.toppings} /{" "}
                          {subscriptionSeleccionada.incluido.toppings}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.toppings}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Barquillos
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.barquillos} /{" "}
                          {subscriptionSeleccionada.incluido.barquillos}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.barquillos}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Galletas
                        </p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">
                          {subscriptionSeleccionada.consumido.galletas} /{" "}
                          {subscriptionSeleccionada.incluido.galletas}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Disponible:{" "}
                          {subscriptionSeleccionada.disponible.galletas}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-4 text-sm font-medium text-neutral-700">
                      Registrar consumo
                    </p>

                    {erroresValidacion.length > 0 && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-sm font-semibold text-red-700">
                            Revisa lo siguiente antes de registrar:
                            </p>
                            <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                            {erroresValidacion.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                            </ul>
                        </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Potes
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={potes}
                          onChange={(e) => setPotes(Number(e.target.value) || 0)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Toppings
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={toppings}
                          onChange={(e) =>
                            setToppings(Number(e.target.value) || 0)
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Barquillos
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={barquillos}
                          onChange={(e) =>
                            setBarquillos(Number(e.target.value) || 0)
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-violet-700">
                          Galletas
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={galletas}
                          onChange={(e) =>
                            setGalletas(Number(e.target.value) || 0)
                          }
                          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={registrarConsumo}
                        disabled={
                            registrando ||
                            erroresValidacion.length > 0 ||
                            !hayConsumoParaRegistrar
                        }
                        className="cursor-pointer rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {registrando ? "Registrando..." : "Registrar consumo"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>

);
}

## 1.8.6.5. app_operacion_components_UltimosMovimientos.tsx

"use client";

import { useEffect, useState } from "react";

type Consumo = {
id: number;
potes: number;
toppings: number;
barquillos: number;
galletas: number;
created_at: string;
subscriptions?: {
subscription_templates?: {
name?: string;
};
};
};

export default function UltimosMovimientos({
clienteId,
}: {
clienteId: number;
}) {
const [data, setData] = useState<Consumo[]>([]);
const [cargando, setCargando] = useState(false);
const [abierto, setAbierto] = useState(true);

useEffect(() => {
cargar();
}, [clienteId]);

async function cargar() {
try {
setCargando(true);

      const res = await fetch(
        `/api/subscriptions/consumptions-by-client?clienteId=${clienteId}`
      );

      const json = await res.json();

      if (!res.ok) return;

      setData(json.consumptions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }

}

const formatearFecha = (fecha: string) => {
const d = new Date(fecha);
return d.toLocaleString("es-CL");
};

if (!cargando && data.length === 0) {
return null;
}

return (
<div className="mt-6 rounded-2xl border border-violet-100 bg-white shadow-sm">
<button
type="button"
onClick={() => setAbierto(!abierto)}
className="flex w-full items-center justify-between px-6 py-4 text-left" >
<span className="text-sm font-semibold text-violet-700">
Últimos movimientos
</span>
<span className="text-sm font-semibold text-violet-700">
{abierto ? "▲" : "▼"}
</span>
</button>

      {abierto && (
        <div className="border-t border-violet-100 px-6 pb-6 pt-4">
          {cargando ? (
            <p className="text-sm text-neutral-600">Cargando...</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <div className="max-h-72 overflow-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-violet-50">
                    <tr className="text-left text-violet-700">
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      <th className="px-4 py-3 font-semibold">Suscripción</th>
                      <th className="px-4 py-3 font-semibold">Potes</th>
                      <th className="px-4 py-3 font-semibold">Toppings</th>
                      <th className="px-4 py-3 font-semibold">Barquillos</th>
                      <th className="px-4 py-3 font-semibold">Galletas</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.map((item) => (
                        <tr
                        key={item.id}
                        className="border-t border-neutral-200 text-neutral-700"
                        >
                        {/* Fecha */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            {formatearFecha(item.created_at)}
                        </td>

                        {/* Tipo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            Consumo suscripción
                        </td>

                        {/* 👇 NUEVA COLUMNA */}
                        <td className="px-4 py-3 whitespace-nowrap">
                            {item.subscriptions?.subscription_templates?.name || "-"}
                        </td>

                        {/* Potes */}
                        <td className="px-4 py-3">{item.potes}</td>

                        {/* Toppings */}
                        <td className="px-4 py-3">{item.toppings}</td>

                        {/* Barquillos */}
                        <td className="px-4 py-3">{item.barquillos}</td>

                        {/* Galletas */}
                        <td className="px-4 py-3">{item.galletas}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

);
}

## 1.8.6.6. app_operacion_components_UltimosMovimientosCard.tsx

type Cliente = {
id: number;
nombre: string;
correo: string;
telefono: string;
created_At?: string | null;
fecha_activacion?: string | null;
email_verificado?: boolean;
tarjeta_activa?: boolean;
};

type Movimiento = {
id: string;
nombre: string;
tipo: "registro" | "activacion";
estado: "Validado" | "Por validar";
fecha: string;
};

type Props = {
clientes: Cliente[];
};

function formatearFecha(fecha: string) {
const date = new Date(fecha);

if (Number.isNaN(date.getTime())) {
return "Fecha no disponible";
}

return date.toLocaleString("es-CL", {
dateStyle: "short",
timeStyle: "short",
});
}

export default function UltimosMovimientosCard({ clientes }: Props) {
const movimientos: Movimiento[] = clientes
.flatMap((cliente) => {
const eventos: Movimiento[] = [];

      if (cliente.created_At) {
        eventos.push({
          id: `registro-${cliente.id}`,
          nombre: cliente.nombre || "Cliente sin nombre",
          tipo: "registro",
          estado:
            cliente.email_verificado && cliente.tarjeta_activa
              ? "Validado"
              : "Por validar",
          fecha: cliente.created_At,
        });
      }

      if (cliente.fecha_activacion) {
        eventos.push({
          id: `activacion-${cliente.id}`,
          nombre: cliente.nombre || "Cliente sin nombre",
          tipo: "activacion",
          estado: "Validado",
          fecha: cliente.fecha_activacion,
        });
      }

      return eventos;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

return (
<section className="rounded-2xl border border-violet-100 bg-white shadow-sm">
<div className="border-b border-neutral-200 p-4">
<h2 className="text-lg font-semibold text-violet-800">
Últimos movimientos
</h2>
<p className="mt-1 text-sm text-neutral-500">
Últimos registros y activaciones de clientes
</p>
</div>

      <div className="p-4">
        {movimientos.length === 0 ? (
          <p className="text-sm text-neutral-600">
            No hay movimientos recientes para mostrar.
          </p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="border-b border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Cliente
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Movimiento
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Estado
                  </th>
                  <th className="border-b border-neutral-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Fecha
                  </th>
                </tr>
              </thead>

              <tbody>
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="align-middle">
                    <td className="border-b border-neutral-100 px-4 py-4 text-sm font-semibold text-[#111111]">
                      {movimiento.nombre}
                    </td>

                    <td className="border-b border-neutral-100 px-4 py-4 text-sm text-neutral-600">
                      {movimiento.tipo === "registro"
                        ? "Registro de cliente"
                        : "Activación de tarjeta"}
                    </td>

                    <td className="border-b border-neutral-100 px-4 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          movimiento.estado === "Validado"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {movimiento.estado}
                      </span>
                    </td>

                    <td className="border-b border-neutral-100 px-4 py-4 text-sm text-neutral-500 whitespace-nowrap">
                      {formatearFecha(movimiento.fecha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>

);
}

## 1.3.6.1. app_api_login_route.ts

import { NextResponse } from "next/server";

export async function POST(req: Request) {
try {
const body = await req.json();
const usuario = String(body.usuario || "").trim();
const password = String(body.password || "").trim();

    if (!usuario || !password) {
      return NextResponse.json(
        { ok: false, message: "Debes ingresar usuario y contraseña." },
        { status: 400 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const superadminUsername = process.env.SUPERADMIN_USERNAME;
    const superadminPassword = process.env.SUPERADMIN_PASSWORD;

    if (
      !adminUsername ||
      !adminPassword ||
      !superadminUsername ||
      !superadminPassword
    ) {
      return NextResponse.json(
        { ok: false, message: "Faltan variables de entorno del login." },
        { status: 500 }
      );
    }

    let role: "admin" | "superadmin" | null = null;

    if (usuario === superadminUsername && password === superadminPassword) {
      role = "superadmin";
    } else if (usuario === adminUsername && password === adminPassword) {
      role = "admin";
    }

    if (!role) {
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      role,
    });

    response.cookies.set("fidelinook_role", role, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    response.cookies.set("fidelinook_auth", "ok", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;

} catch (error) {
console.error("Error en login:", error);

    return NextResponse.json(
      { ok: false, message: "Error inesperado al validar credenciales." },
      { status: 500 }
    );

}
}

## 1.3.7.1. app_api_logout_route.ts

import { NextResponse } from "next/server";

export async function POST() {
const response = NextResponse.json({ ok: true });

response.cookies.set("fidelinook_role", "", {
httpOnly: true,
secure: true,
sameSite: "lax",
path: "/",
maxAge: 0,
});

response.cookies.set("fidelinook_auth", "", {
httpOnly: true,
secure: true,
sameSite: "lax",
path: "/",
maxAge: 0,
});

return response;
}

## 1.3.19.1. app_api_session_route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
const auth = req.cookies.get("fidelinook_auth")?.value;
const role = req.cookies.get("fidelinook_role")?.value;

if (auth !== "ok" || !role) {
return NextResponse.json(
{ ok: false, message: "No autenticado." },
{ status: 401 }
);
}

return NextResponse.json({
ok: true,
role,
});
}
