import { runDailyNotificationChecks } from "@/lib/notifications/scheduled";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyNotificationChecks();
  return Response.json({ ok: true, result });
}
