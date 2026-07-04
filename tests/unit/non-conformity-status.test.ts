import { describe, expect, it } from "vitest";

import {
  ACTIVE_NON_CONFORMITY_STATUSES,
  isActiveNonConformityStatus,
} from "@/lib/non-conformity-status";

describe("ACTIVE_NON_CONFORMITY_STATUSES", () => {
  it("contains the expected active statuses", () => {
    expect(ACTIVE_NON_CONFORMITY_STATUSES).toContain("OPEN");
    expect(ACTIVE_NON_CONFORMITY_STATUSES).toContain("ASSIGNED");
    expect(ACTIVE_NON_CONFORMITY_STATUSES).toContain("IN_PROGRESS");
    expect(ACTIVE_NON_CONFORMITY_STATUSES).toContain("PENDING_VERIFICATION");
    expect(ACTIVE_NON_CONFORMITY_STATUSES).toContain("REJECTED");
  });

  it("does not contain CLOSED", () => {
    expect(ACTIVE_NON_CONFORMITY_STATUSES).not.toContain("CLOSED");
  });
});

describe("isActiveNonConformityStatus", () => {
  it("returns true for all known active statuses", () => {
    for (const status of ACTIVE_NON_CONFORMITY_STATUSES) {
      expect(isActiveNonConformityStatus(status)).toBe(true);
    }
  });

  it("returns false for CLOSED status", () => {
    expect(isActiveNonConformityStatus("CLOSED")).toBe(false);
  });

  it("returns false for CANCELLED status", () => {
    expect(isActiveNonConformityStatus("CANCELLED")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isActiveNonConformityStatus("")).toBe(false);
  });

  it("returns false for unknown status", () => {
    expect(isActiveNonConformityStatus("DONE")).toBe(false);
  });

  it("returns true for OPEN individually", () => {
    expect(isActiveNonConformityStatus("OPEN")).toBe(true);
  });

  it("returns true for ASSIGNED individually", () => {
    expect(isActiveNonConformityStatus("ASSIGNED")).toBe(true);
  });

  it("returns true for IN_PROGRESS individually", () => {
    expect(isActiveNonConformityStatus("IN_PROGRESS")).toBe(true);
  });

  it("returns true for PENDING_VERIFICATION individually", () => {
    expect(isActiveNonConformityStatus("PENDING_VERIFICATION")).toBe(true);
  });

  it("returns true for REJECTED individually", () => {
    expect(isActiveNonConformityStatus("REJECTED")).toBe(true);
  });
});
