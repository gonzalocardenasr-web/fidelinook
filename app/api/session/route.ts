import { NextResponse } from "next/server";

import { getOperationSession } from "@/lib/operation-auth";

export async function GET() {
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
}
