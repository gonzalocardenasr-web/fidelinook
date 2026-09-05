import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "This legacy email endpoint is disabled.",
      code: "LEGACY_EMAIL_ENDPOINT_DISABLED",
    },
    { status: 410 },
  );
}
