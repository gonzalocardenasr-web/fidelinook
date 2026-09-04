import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "LEGACY_EMAIL_ROUTE_DISABLED",
      message:
        "Esta ruta legacy está deshabilitada. Los correos de premios de campaña utilizan el flujo gobernado de email_queue.",
    },
    { status: 410 },
  );
}
