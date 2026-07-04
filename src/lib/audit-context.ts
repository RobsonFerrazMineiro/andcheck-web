import "server-only";

import { createHash } from "crypto";
import { cookies, headers } from "next/headers";

function anonymizeSessionToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function resolveAuditSessionId() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value ??
    cookieStore.get("next-auth.session-token")?.value;

  return token ? anonymizeSessionToken(token) : null;
}

export function parseTechnicalContext(userAgent: string | null) {
  const value = userAgent ?? "";
  const browserName = /Edg\//.test(value)
    ? "Edge"
    : /Chrome\//.test(value) || /CriOS\//.test(value)
      ? "Chrome"
      : /Firefox\//.test(value) || /FxiOS\//.test(value)
        ? "Firefox"
        : /Safari\//.test(value)
          ? "Safari"
          : value
            ? "Outro"
            : null;
  const osName = /Windows NT/.test(value)
    ? "Windows"
    : /Android/.test(value)
      ? "Android"
      : /iPhone|iPad|iPod/.test(value)
        ? "iOS"
        : /Mac OS X/.test(value)
          ? "macOS"
          : /Linux/.test(value)
            ? "Linux"
            : value
              ? "Outro"
              : null;
  const deviceType = /Mobile|Android|iPhone|iPod/.test(value)
    ? "Mobile"
    : /iPad|Tablet/.test(value)
      ? "Tablet"
      : value
        ? "Desktop"
        : null;

  return { browserName, osName, deviceType };
}

export async function resolveAuditRequestContext() {
  const [hdrs, sessionId] = await Promise.all([headers(), resolveAuditSessionId()]);
  const ipAddress =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;
  const userAgent = hdrs.get("user-agent");

  return {
    sessionId,
    ipAddress,
    userAgent,
    ...parseTechnicalContext(userAgent),
  };
}
