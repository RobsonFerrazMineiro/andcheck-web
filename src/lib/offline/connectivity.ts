"use client";

export type ConnectivityCheckResult = "online" | "offline";

export function browserIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function canNavigateAfterOfflineWrite() {
  return browserIsOnline();
}

async function pingConnectivityEndpoint(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`/api/connectivity?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkServerConnectivity({
  timeoutMs = 4_000,
}: {
  timeoutMs?: number;
} = {}): Promise<ConnectivityCheckResult> {
  if (!browserIsOnline()) return "offline";
  if (typeof window === "undefined") return "online";

  if (await pingConnectivityEndpoint(timeoutMs)) return "online";
  if (!browserIsOnline()) return "offline";

  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return (await pingConnectivityEndpoint(Math.min(timeoutMs, 1_500)))
    ? "online"
    : "offline";
}
