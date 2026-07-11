import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OfflineProvider,
  useOfflineStatus,
} from "@/components/offline/offline-provider";
import { checkServerConnectivity } from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import { processSyncQueue } from "@/lib/offline/sync-engine";
import type { SyncSummary } from "@/lib/offline/types";

const EMPTY_SUMMARY: SyncSummary = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflict: 0,
  total: 0,
};

const state = vi.hoisted(() => ({
  summary: {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    conflict: 0,
    total: 0,
  } satisfies SyncSummary,
}));

vi.mock("@/lib/offline/connectivity", () => ({
  browserIsOnline: vi.fn(() => true),
  checkServerConnectivity: vi.fn(async () => "online"),
}));

vi.mock("@/lib/offline/local-db", () => ({
  localDb: {
    syncQueue: {
      summary: vi.fn(async () => state.summary),
    },
    metadata: {
      get: vi.fn(async () => undefined),
    },
  },
}));

vi.mock("@/lib/offline/sync-engine", () => ({
  processSyncQueue: vi.fn(async () => EMPTY_SUMMARY),
}));

function StatusProbe() {
  const { status } = useOfflineStatus();
  return <div data-testid="status">{status}</div>;
}

describe("OfflineProvider", () => {
  beforeEach(() => {
    state.summary = { ...EMPTY_SUMMARY };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("syncs automatically when the queue changes and connectivity is available", async () => {
    render(
      <OfflineProvider>
        <StatusProbe />
      </OfflineProvider>,
    );

    await waitFor(() => {
      expect(localDb.syncQueue.summary).toHaveBeenCalled();
    });

    expect(processSyncQueue).not.toHaveBeenCalled();

    state.summary = { ...EMPTY_SUMMARY, pending: 1, total: 1 };
    window.dispatchEvent(new Event("andcheck:sync-queue-updated"));

    await waitFor(() => {
      expect(checkServerConnectivity).toHaveBeenCalled();
      expect(processSyncQueue).toHaveBeenCalledTimes(1);
    });
  });
});
