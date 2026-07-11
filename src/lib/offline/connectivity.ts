"use client";

export type ConnectivityCheckResult = "online" | "offline";

export function browserIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function canNavigateAfterOfflineWrite() {
  return browserIsOnline();
}

export async function checkServerConnectivity({
  timeoutMs = 4_000,
}: {
  timeoutMs?: number;
} = {}): Promise<ConnectivityCheckResult> {
  if (!browserIsOnline()) return "offline";
  if (typeof window === "undefined") return "online";

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`/api/connectivity?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });

    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  } finally {
    window.clearTimeout(timeout);
  }
}
