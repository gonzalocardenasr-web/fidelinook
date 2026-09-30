import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_ROLES = new Set(["cashier", "admin", "superadmin", "preparation"]);

async function requireUserManager() {
  const session = await getOperationSession();
  const authorization = authorizeOperationSession(session, "users.manage");

  if (!authorization.ok) {
    return {
      error: NextResponse.json(
        { ok: false, message: authorization.message },
        { status: authorization.status },
      ),
      session: null,
    };
  }

  return {
    error: null,
    session: authorization.session,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUserManager();

  if (auth.error || !auth.session) {
    return auth.error;
  }

  const { id } = await context.params;

  const { data: target, error: targetError } = await supabaseAdmin
    .from("operational_users")
    .select("id, display_name, role, is_active, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    console.error("Error loading operational user:", targetError);

    return NextResponse.json(
      { ok: false, message: "No se pudo cargar el usuario." },
      { status: 500 },
    );
  }

  if (!target) {
    return NextResponse.json(
      { ok: false, message: "Usuario no encontrado." },
      { status: 404 },
    );
  }

  const body = await request.json();

  const displayName =
    typeof body.displayName === "string"
      ? body.displayName.trim()
      : target.display_name;

  const role =
    typeof body.role === "string"
      ? body.role.trim().toLowerCase()
      : target.role;

  const isActive =
    typeof body.isActive === "boolean" ? body.isActive : target.is_active;

  if (!displayName || !VALID_ROLES.has(role)) {
    return NextResponse.json(
      { ok: false, message: "Nombre o rol inválido." },
      { status: 400 },
    );
  }

  const isSelf = target.id === auth.session.userId;

  if (isSelf && role !== "superadmin") {
    return NextResponse.json(
      {
        ok: false,
        message: "No puedes quitarte a ti mismo el rol superadmin.",
      },
      { status: 409 },
    );
  }

  if (isSelf && !isActive) {
    return NextResponse.json(
      {
        ok: false,
        message: "No puedes desactivar tu propio usuario.",
      },
      { status: 409 },
    );
  }

  if (target.role === "superadmin" && (role !== "superadmin" || !isActive)) {
    const { count, error: countError } = await supabaseAdmin
      .from("operational_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "superadmin")
      .eq("is_active", true);

    if (countError) {
      console.error("Error counting superadmins:", countError);

      return NextResponse.json(
        { ok: false, message: "No se pudo validar la regla de superadmin." },
        { status: 500 },
      );
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Debe existir al menos un superadmin activo en la plataforma.",
        },
        { status: 409 },
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from("operational_users")
    .update({
      display_name: displayName,
      role,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, display_name, role, is_active, auth_user_id, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("Error updating operational user:", error);

    return NextResponse.json(
      { ok: false, message: "No se pudo actualizar el usuario." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: data,
  });
}
