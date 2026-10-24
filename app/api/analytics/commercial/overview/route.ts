import type { NextRequest } from "next/server";
import { commercialAnalyticsGet } from "@/lib/analytics/commercial-api";

export async function GET(request: NextRequest) {
  return commercialAnalyticsGet(request, "overview");
}
