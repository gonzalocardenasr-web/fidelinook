import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";
import { authorizeOperationSession } from "@/lib/operation-rbac";
import { sendOperatorInvitation } from "@/lib/operator-invitation";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getOperationSession();
  const authorization = authorizeOperationSession(session, "users.manage");

  if (!authorization.ok) {
    return NextResponse.json(
      { ok: false, message: authorization.message },
      { status: authorization.status },
    );
  }

  const { id } = await context.params;

  const { data: user, error } = await supabaseAdmin
    .from("operational_users")
    .select("id, display_name, is_active, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error loading operational user:", error);

    return NextResponse.json(
      { ok: false, message: "No se pudo cargar el usuario." },
      { status: 500 },
    );
  }

  if (!user?.auth_user_id) {
    return NextResponse.json(
      {
        ok: false,
        message: "El usuario todavía no tiene identidad Auth vinculada.",
      },
      { status: 409 },
    );
  }

  if (!user.is_active) {
    return NextResponse.json(
      {
        ok: false,
        message: "No se puede invitar a un usuario desactivado.",
      },
      { status: 409 },
    );
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.getUserById(user.auth_user_id);

  if (authError || !authData.user?.email) {
    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo resolver el correo del usuario.",
      },
      { status: 409 },
    );
  }

  await sendOperatorInvitation({
    authUserId: user.auth_user_id,
    email: authData.user.email,
    displayName: user.display_name,
  });

  return NextResponse.json({
    ok: true,
    message: "Invitación enviada.",
  });
}
