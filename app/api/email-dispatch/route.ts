import { NextResponse } from "next/server";

import { dispatchQueuedEmails } from "../../../lib/email/emailDispatcher";

async function handleDispatch(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("Missing CRON_SECRET environment variable");

      return NextResponse.json(
        {
          ok: false,
          error: "Dispatcher configuration error",
        },
        { status: 500 },
      );
    }

    const authorization = req.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const url = new URL(req.url);

    const requestedLimit = Number(url.searchParams.get("limit") || "10");

    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 50)
        : 10;

    const result = await dispatchQueuedEmails(limit);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in /api/email-dispatch:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Email dispatcher failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handleDispatch(req);
}

export async function POST(req: Request) {
  return handleDispatch(req);
}
