import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_DEFAULT_SEVERITY,
  NOTIFICATION_ENTITY_GROUPS,
  normalizeChannels,
  notificationEntityPath,
} from "@/lib/notifications/catalog";

describe("notification catalog", () => {
  it("keeps critical operational events mapped to critical severity", () => {
    expect(NOTIFICATION_DEFAULT_SEVERITY.SCAFFOLD_EXPIRED).toBe("CRITICAL");
    expect(NOTIFICATION_DEFAULT_SEVERITY.NONCONFORMITY_EXPIRED).toBe("CRITICAL");
    expect(NOTIFICATION_DEFAULT_SEVERITY.DOCUMENT_EXPIRED).toBe("CRITICAL");
  });

  it("keeps notification types grouped by operational entity", () => {
    expect(NOTIFICATION_ENTITY_GROUPS.SCAFFOLD_RELEASED).toBe("SCAFFOLD");
    expect(NOTIFICATION_ENTITY_GROUPS.INSPECTION_PENDING).toBe("INSPECTION");
    expect(NOTIFICATION_ENTITY_GROUPS.NONCONFORMITY_OPENED).toBe(
      "NONCONFORMITY",
    );
    expect(NOTIFICATION_ENTITY_GROUPS.DOCUMENT_ATTACHED).toBe("DOCUMENT");
  });

  it("always includes internal channel for critical notifications", () => {
    expect(normalizeChannels(["EMAIL"], "CRITICAL")).toEqual([
      "EMAIL",
      "INTERNAL",
    ]);
  });

  it("resolves entity paths with safe fallback", () => {
    expect(notificationEntityPath("SCAFFOLD", "scaffold-1")).toBe(
      "/andaimes/scaffold-1",
    );
    expect(notificationEntityPath("INSPECTION", "inspection-1")).toBe(
      "/inspecoes/inspection-1",
    );
    expect(notificationEntityPath("UNKNOWN", "entity-1")).toBe("/notificacoes");
    expect(notificationEntityPath(null, "entity-1")).toBe("/notificacoes");
  });
});
