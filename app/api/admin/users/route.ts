import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { sendOperatorInvitation } from "@/lib/operator-invitation";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_ROLES = new Set(["cashier", "admin", "superadmin"]);

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

export async function GET() {
  const auth = await requireUserManager();

  if (auth.error) {
    return auth.error;
  }

  const { data: operationalUsers, error } = await supabaseAdmin
    .from("operational_users")
    .select(
      "id, display_name, role, is_active, auth_user_id, created_at, updated_at",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error listing operational users:", error);

    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar los usuarios." },
      { status: 500 },
    );
  }

  const users = await Promise.all(
    (operationalUsers ?? []).map(async (user) => {
      if (!user.auth_user_id) {
        return {
          ...user,
          email: null,
          last_sign_in_at: null,
          auth_status: "pending",
        };
      }

      const { data } = await supabaseAdmin.auth.admin.getUserById(
        user.auth_user_id,
      );

      return {
        ...user,
        email: data.user?.email ?? null,
        last_sign_in_at: data.user?.last_sign_in_at ?? null,
        auth_status: data.user ? "linked" : "missing",
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    users,
  });
}

export async function POST(request: Request) {
  const auth = await requireUserManager();

  if (auth.error) {
    return auth.error;
  }

  let createdAuthUserId: string | null = null;
  let affectedOperationalUserId: string | null = null;
  let linkedExistingOperationalUser = false;

  try {
    const body = await request.json();

    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const role =
      typeof body.role === "string" ? body.role.trim().toLowerCase() : "";

    const operationalUserId =
      typeof body.operationalUserId === "string"
        ? body.operationalUserId.trim()
        : "";

    if (!displayName || !email || !VALID_ROLES.has(role)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nombre, correo y rol válido son obligatorios.",
        },
        { status: 400 },
      );
    }

    let existingOperationalUser:
      | {
          id: string;
          auth_user_id: string | null;
          role: string;
        }
      | null = null;

    if (operationalUserId) {
      const { data, error } = await supabaseAdmin
        .from("operational_users")
        .select("id, auth_user_id, role")
        .eq("id", operationalUserId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return NextResponse.json(
          { ok: false, message: "El usuario operacional no existe." },
          { status: 404 },
        );
      }

      if (data.auth_user_id) {
        return NextResponse.json(
          {
            ok: false,
            message: "El usuario operacional ya tiene acceso Auth vinculado.",
          },
          { status: 409 },
        );
      }

      existingOperationalUser = data;
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          operational_user: true,
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          ok: false,
          message:
            authError?.message || "No se pudo crear la identidad del usuario.",
        },
        { status: 400 },
      );
    }

    createdAuthUserId = authData.user.id;

    let operationalUser;

    if (existingOperationalUser) {
      const { data, error } = await supabaseAdmin
        .from("operational_users")
        .update({
          display_name: displayName,
          role,
          is_active: true,
          auth_user_id: createdAuthUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOperationalUser.id)
        .select(
          "id, display_name, role, is_active, auth_user_id, created_at, updated_at",
        )
        .single();

      if (error) {
        throw error;
      }

      operationalUser = data;
      affectedOperationalUserId = data.id;
      linkedExistingOperationalUser = true;
    } else {
      const { data, error } = await supabaseAdmin
        .from("operational_users")
        .insert({
          display_name: displayName,
          role,
          is_active: true,
          auth_user_id: createdAuthUserId,
        })
        .select(
          "id, display_name, role, is_active, auth_user_id, created_at, updated_at",
        )
        .single();

      if (error) {
        throw error;
      }

      operationalUser = data;
      affectedOperationalUserId = data.id;
    }

    await sendOperatorInvitation({
      authUserId: createdAuthUserId,
      email,
      displayName,
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          ...operationalUser,
          email,
          auth_status: "linked",
        },
        message: existingOperationalUser
          ? "Acceso activado e invitación enviada."
          : "Usuario creado e invitación enviada.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating operational user:", error);

    if (affectedOperationalUserId) {
      try {
        if (linkedExistingOperationalUser) {
          await supabaseAdmin
            .from("operational_users")
            .update({
              auth_user_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", affectedOperationalUserId);
        } else {
          await supabaseAdmin
            .from("operational_users")
            .delete()
            .eq("id", affectedOperationalUserId);
        }
      } catch (operationalRollbackError) {
        console.error(
          "Could not rollback operational user:",
          operationalRollbackError,
        );
      }
    }

    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (authRollbackError) {
        console.error("Could not rollback Auth user:", authRollbackError);
      }
    }

    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo completar la creación del usuario.",
      },
      { status: 500 },
    );
  }
}
