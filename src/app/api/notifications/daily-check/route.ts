import { runDailyNotificationChecks } from "@/lib/notifications/scheduled";
import {
  checkRequestRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return Response.json({ error: "Cron secret not configured" }, { status: 503 });
  }
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = checkRequestRateLimit(request, {
    key: "notification-daily-check",
    limit: 12,
    windowMs: 60 * 60 * 1_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const result = await runDailyNotificationChecks();
  return Response.json({ ok: true, result });
}
