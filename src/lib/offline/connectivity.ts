"use client";

export type ConnectivityCheckResult = "online" | "offline";

const DEFAULT_CONNECTIVITY_TIMEOUT_MS = 3_000;
const RECENT_CHECK_MAX_AGE_MS = 15_000;

let inFlightConnectivityCheck:
  | Promise<ConnectivityCheckResult>
  | null = null;
let lastResult: {
  status: ConnectivityCheckResult;
  checkedAt: number;
  latency: number;
} | null = null;
let requestCountWindowStartedAt = 0;
let requestCountInWindow = 0;

export function resetConnectivityStateForTests() {
  if (process.env.NODE_ENV !== "test") return;
  inFlightConnectivityCheck = null;
  lastResult = null;
  requestCountWindowStartedAt = 0;
  requestCountInWindow = 0;
}

export function browserIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function canNavigateAfterOfflineWrite() {
  return browserIsOnline();
}

function logConnectivity(message: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.info(`[connectivity] ${message}`);
}

function countConnectivityRequest() {
  const now = Date.now();
  if (now - requestCountWindowStartedAt > 60_000) {
    requestCountWindowStartedAt = now;
    requestCountInWindow = 0;
  }
  requestCountInWindow += 1;
  logConnectivity(`requests in current minute: ${requestCountInWindow}`);
}

async function pingConnectivityEndpoint(timeoutMs: number) {
  const controller = new AbortController();
  const startedAt = performance.now();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    countConnectivityRequest();
    logConnectivity("request started");
    const response = await fetch(`/api/connectivity?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });

    logConnectivity(
      `request finished: ${Math.round(performance.now() - startedAt)}ms`,
    );
    return response.ok;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      logConnectivity(`aborted after ${timeoutMs}ms`);
    }
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkServerConnectivity({
  timeoutMs = DEFAULT_CONNECTIVITY_TIMEOUT_MS,
  force = false,
}: {
  timeoutMs?: number;
  force?: boolean;
} = {}): Promise<ConnectivityCheckResult> {
  if (!browserIsOnline()) return "offline";
  if (typeof window === "undefined") return "online";

  const now = Date.now();
  if (
    !force &&
    lastResult &&
    now - lastResult.checkedAt <= RECENT_CHECK_MAX_AGE_MS
  ) {
    return lastResult.status;
  }

  if (inFlightConnectivityCheck) {
    logConnectivity("skipped: request already running");
    return inFlightConnectivityCheck;
  }

  inFlightConnectivityCheck = (async () => {
    const startedAt = performance.now();
    const status = (await pingConnectivityEndpoint(timeoutMs))
      ? "online"
      : "offline";
    lastResult = {
      status,
      checkedAt: Date.now(),
      latency: Math.round(performance.now() - startedAt),
    };
    return status;
  })().finally(() => {
    inFlightConnectivityCheck = null;
  });

  return inFlightConnectivityCheck;
}
