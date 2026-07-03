import "server-only";

import { headers } from "next/headers";

function parseOrigin(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export async function assertSameOriginRequest() {
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  if (!origin) return;

  const originUrl = parseOrigin(origin);
  const expectedHost = hdrs.get("x-forwarded-host") ?? hdrs.get("host");

  if (!originUrl || !expectedHost || originUrl.host !== expectedHost) {
    throw new Error("Origem da requisicao nao autorizada.");
  }
}
