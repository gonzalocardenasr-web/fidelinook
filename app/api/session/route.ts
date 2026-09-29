import { NextResponse } from "next/server";

import {
  getOperationSession,
  OperationAuthUnavailableError,
} from "@/lib/operation-auth";

export async function GET() {
  try {
    const session = await getOperationSession();

    if (!session.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "No autenticado.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      role: session.role,
      userId: session.userId,
      authUserId: session.authUserId,
      displayName: session.displayName,
      authSource: session.source,
    });
  } catch (error) {
    if (error instanceof OperationAuthUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo validar la sesión temporalmente.",
        },
        { status: 503 },
      );
    }

    console.error("Unexpected operational session error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo validar la sesión.",
      },
      { status: 500 },
    );
  }
}
