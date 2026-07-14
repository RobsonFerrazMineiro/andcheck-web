import {
  browserIsOnline,
  canNavigateAfterOfflineWrite,
  checkServerConnectivity,
} from "@/lib/offline/connectivity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

describe("offline connectivity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setNavigatorOnline(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reads the browser online flag", () => {
    setNavigatorOnline(false);

    expect(browserIsOnline()).toBe(false);
  });

  it("blocks client navigation after offline writes when the browser is disconnected", () => {
    setNavigatorOnline(false);

    expect(canNavigateAfterOfflineWrite()).toBe(false);
  });

  it("returns offline without pinging the server when the browser is offline", async () => {
    setNavigatorOnline(false);

    await expect(checkServerConnectivity()).resolves.toBe("offline");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns online when the connectivity endpoint responds ok", async () => {
    await expect(checkServerConnectivity()).resolves.toBe("online");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/connectivity\?t=\d+$/),
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("retries before returning offline when the connectivity endpoint fails once", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 503 }));

    const result = checkServerConnectivity();
    await vi.advanceTimersByTimeAsync(250);

    await expect(result).resolves.toBe("online");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("returns offline when the connectivity endpoint keeps failing", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));

    const result = checkServerConnectivity();
    await vi.advanceTimersByTimeAsync(250);

    await expect(result).resolves.toBe("offline");
  });

  it("retries when the connectivity request times out once", async () => {
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          window.setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 10);
        }),
    );

    const result = checkServerConnectivity({ timeoutMs: 5 });
    await vi.advanceTimersByTimeAsync(300);

    await expect(result).resolves.toBe("online");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
