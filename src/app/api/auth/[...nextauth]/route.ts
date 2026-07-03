import { handlers } from "@/auth";
import {
  checkRequestRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith("/callback/credentials")) {
    const limit = checkRequestRateLimit(request, {
      key: "auth-credentials",
      limit: 8,
      windowMs: 15 * 60 * 1_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  }

  return handlers.POST(request);
}
