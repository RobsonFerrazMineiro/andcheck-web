import {
  browserIsOnline,
  canNavigateAfterOfflineWrite,
  checkServerConnectivity,
  resetConnectivityStateForTests,
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
    resetConnectivityStateForTests();
    setNavigatorOnline(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    resetConnectivityStateForTests();
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

  it("deduplicates simultaneous connectivity checks", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = checkServerConnectivity();
    const second = checkServerConnectivity();
    resolveFetch?.(new Response(null, { status: 204 }));

    await expect(first).resolves.toBe("online");
    await expect(second).resolves.toBe("online");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns offline when the connectivity endpoint fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));

    await expect(checkServerConnectivity()).resolves.toBe("offline");
  });

  it("returns offline when the connectivity request times out", async () => {
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal instanceof AbortSignal) {
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }
        }),
    );

    const result = checkServerConnectivity({ timeoutMs: 5 });
    await vi.advanceTimersByTimeAsync(5);

    await expect(result).resolves.toBe("offline");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
