import {
  getSyncSummaryFromItems,
  type SyncQueueItem,
} from "@/lib/offline/types";
import { describe, expect, it } from "vitest";

function queueItem(status: SyncQueueItem["status"]): SyncQueueItem {
  return {
    id: `item-${status}`,
    action: "test",
    entityType: "scaffold",
    entityId: "scaffold-1",
    payload: {},
    status,
    attempts: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("getSyncSummaryFromItems", () => {
  it("counts every queue status and total", () => {
    const summary = getSyncSummaryFromItems([
      queueItem("pending"),
      queueItem("pending"),
      queueItem("syncing"),
      queueItem("synced"),
      queueItem("failed"),
      queueItem("conflict"),
    ]);

    expect(summary).toEqual({
      pending: 2,
      syncing: 1,
      synced: 1,
      failed: 1,
      conflict: 1,
      total: 6,
    });
  });
});
