"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Role = "cashier" | "admin" | "superadmin" | "preparation";

type OperationalUser = {
  id: string;
  display_name: string;
  role: Role;
  is_active: boolean;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  last_sign_in_at: string | null;
  auth_status: "linked" | "pending" | "missing";
};

type UsersResponse = {
  ok: boolean;
  users?: OperationalUser[];
  message?: string;
};

type Props = {
  currentUserId: string;
  currentDisplayName: string | null;
};

const ROLE_LABELS: Record<Role, string> = {
  cashier: "Cashier",
  admin: "Administrador",
  superadmin: "Superadmin",
  preparation: "Preparación",
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

export default function UsersManagementClient({
  currentUserId,
  currentDisplayName,
}: Props) {
  const [users, setUsers] = useState<OperationalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [legacyUserId, setLegacyUserId] = useState("");

  const pendingUsers = useMemo(
    () => users.filter((user) => !user.auth_user_id),
    [users],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as UsersResponse;

      if (!response.ok || !data.ok || !data.users) {
        throw new Error(data.message || "No se pudieron cargar los usuarios.");
      }

      setUsers(data.users);
    } catch (loadError) {
      console.error("Error loading users:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los usuarios.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function resetCreateForm() {
    setDisplayName("");
    setEmail("");
    setRole("cashier");
    setLegacyUserId("");
  }

  function handleLegacySelection(id: string) {
    setLegacyUserId(id);

    const selected = users.find((user) => user.id === id);

    if (!selected) {
      return;
    }

    setDisplayName(selected.display_name);
    setRole(selected.role);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    setProcessingId("create");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          email,
          role,
          operationalUserId: legacyUserId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "No se pudo crear o activar el usuario.",
        );
      }

      setMessage(data.message || "Usuario procesado correctamente.");
      resetCreateForm();
      await loadUsers();
    } catch (createError) {
      console.error("Error creating user:", createError);

      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear o activar el usuario.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function updateUser(
    user: OperationalUser,
    patch: {
      displayName?: string;
      role?: Role;
      isActive?: boolean;
    },
  ) {
    clearFeedback();
    setProcessingId(user.id);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: patch.displayName ?? user.display_name,
          role: patch.role ?? user.role,
          isActive: patch.isActive ?? user.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo actualizar el usuario.");
      }

      setMessage("Usuario actualizado correctamente.");
      await loadUsers();
    } catch (updateError) {
      console.error("Error updating user:", updateError);

      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el usuario.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function editName(user: OperationalUser) {
    const nextName = window.prompt(
      "Nombre visible del usuario:",
      user.display_name,
    );

    if (nextName === null) {
      return;
    }

    const normalized = nextName.trim();

    if (!normalized || normalized === user.display_name) {
      return;
    }

    await updateUser(user, {
      displayName: normalized,
    });
  }

  async function resendInvitation(user: OperationalUser) {
    clearFeedback();
    setProcessingId(user.id);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/invite`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "No se pudo enviar la invitación.");
      }

      setMessage(data.message || "Invitación enviada.");
    } catch (inviteError) {
      console.error("Error sending invitation:", inviteError);

      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "No se pudo enviar la invitación.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-6 text-white md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/80">
                  Superadmin
                </p>

                <h1 className="mt-2 text-3xl font-bold">Gestión de usuarios</h1>

                <p className="mt-2 text-sm text-white/85">
                  Crea, activa y administra los accesos operacionales de
                  Plataforma Nook.
                </p>
              </div>

              <div className="text-sm text-white/85">
                Sesión:{" "}
                <strong>{currentDisplayName || "Super Administrador"}</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-6 py-4 md:px-8">
            <Link
              href="/operacion"
              className="rounded-xl border border-[#DDD1E7] px-4 py-2 text-sm font-semibold text-[#4C00F7]"
            >
              Volver a Operación
            </Link>

            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading}
              className="rounded-xl border border-[#DDD1E7] px-4 py-2 text-sm font-semibold text-[#333] disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-[#E7C9D1] bg-[#FFF1F4] px-4 py-3 text-sm text-[#8A3550]">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-[#D8E7C9] bg-[#F3FAEC] px-4 py-3 text-sm text-[#42622B]">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-[28px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] md:p-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#222]">
              Crear o activar usuario
            </h2>

            <p className="mt-1 text-sm text-[#666]">
              Para un usuario nuevo deja “Nuevo usuario” seleccionado. Si existe
              un registro legacy pendiente, selecciónalo para vincular su
              identidad Auth sin duplicarlo.
            </p>
          </div>

          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#444]">
                Tipo de alta
              </label>

              <select
                value={legacyUserId}
                onChange={(event) => handleLegacySelection(event.target.value)}
                className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-3 text-[#222]"
              >
                <option value="">Nuevo usuario</option>

                {pendingUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    Activar registro existente: {user.display_name} (
                    {ROLE_LABELS[user.role]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#444]">
                Nombre
              </label>

              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                placeholder="Nombre del usuario"
                className="w-full rounded-2xl border border-[#E3D2EA] px-4 py-3 text-[#222]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#444]">
                Correo
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="usuario@nook.cl"
                className="w-full rounded-2xl border border-[#E3D2EA] px-4 py-3 text-[#222]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#444]">
                Rol
              </label>

              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
                className="w-full rounded-2xl border border-[#E3D2EA] bg-white px-4 py-3 text-[#222]"
              >
                <option value="cashier">Cajer@</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
                <option value="preparation">Preparación</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={processingId === "create"}
                className="rounded-2xl bg-gradient-to-r from-[#4c00f7] to-[#6a1bff] px-6 py-3 font-semibold text-white disabled:opacity-60"
              >
                {processingId === "create"
                  ? "Procesando..."
                  : legacyUserId
                    ? "Activar acceso y enviar invitación"
                    : "Crear usuario y enviar invitación"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="border-b border-[#EEE7F2] px-6 py-5 md:px-8">
            <h2 className="text-xl font-bold text-[#222]">
              Usuarios operacionales
            </h2>

            <p className="mt-1 text-sm text-[#666]">
              {loading
                ? "Cargando usuarios..."
                : `${users.length} usuario${users.length === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="divide-y divide-[#EEE7F2]">
            {!loading && users.length === 0 && (
              <div className="px-6 py-8 text-sm text-[#666] md:px-8">
                No hay usuarios operacionales.
              </div>
            )}

            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const processing = processingId === user.id;

              return (
                <article key={user.id} className="px-6 py-6 md:px-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[#222]">
                          {user.display_name}
                        </h3>

                        {isSelf && (
                          <span className="rounded-full bg-[#EEE8FF] px-2.5 py-1 text-xs font-semibold text-[#4C00F7]">
                            Tú
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.is_active
                              ? "bg-[#EDF8E8] text-[#42622B]"
                              : "bg-[#F3F3F3] text-[#666]"
                          }`}
                        >
                          {user.is_active ? "Activo" : "Desactivado"}
                        </span>

                        <span className="rounded-full bg-[#F4EEF8] px-2.5 py-1 text-xs font-semibold text-[#65416F]">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-[#666]">
                        <p>
                          <strong>Correo:</strong>{" "}
                          {user.email || "Sin identidad Auth vinculada"}
                        </p>

                        <p>
                          <strong>Acceso:</strong>{" "}
                          {user.auth_status === "linked"
                            ? "Auth vinculado"
                            : user.auth_status === "pending"
                              ? "Pendiente de activación"
                              : "Identidad Auth no encontrada"}
                        </p>

                        <p>
                          <strong>Último ingreso:</strong>{" "}
                          {formatDate(user.last_sign_in_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[310px]">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          value={user.role}
                          disabled={processing || isSelf}
                          onChange={(event) =>
                            void updateUser(user, {
                              role: event.target.value as Role,
                            })
                          }
                          className="rounded-xl border border-[#DDD1E7] bg-white px-3 py-2 text-sm text-[#222] disabled:bg-[#F5F5F5]"
                        >
                          <option value="cashier">Cajer@</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Superadmin</option>
                          <option value="preparation">Preparación</option>
                        </select>

                        <button
                          type="button"
                          disabled={processing}
                          onClick={() => void editName(user)}
                          className="rounded-xl border border-[#DDD1E7] px-3 py-2 text-sm font-semibold text-[#333] disabled:opacity-50"
                        >
                          Editar nombre
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        {user.auth_user_id && user.is_active && (
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() => void resendInvitation(user)}
                            className="rounded-xl border border-[#DDD1E7] px-3 py-2 text-sm font-semibold text-[#4C00F7] disabled:opacity-50"
                          >
                            Enviar acceso
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={processing || isSelf}
                          onClick={() =>
                            void updateUser(user, {
                              isActive: !user.is_active,
                            })
                          }
                          className={`rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                            user.is_active
                              ? "border border-[#E7C9D1] text-[#8A3550]"
                              : "bg-[#4C00F7] text-white"
                          }`}
                        >
                          {user.is_active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

