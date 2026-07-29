import { describe, expect, it } from "vitest";

import {
  canRequestNonConformityVerification,
  getNonConformityTreatmentEvidenceCount,
  hasEvidenceForEveryCriticalChecklistItem,
  hasNonConformityTreatmentEvidence,
} from "@/lib/non-conformity-evidence-policy";

describe("non conformity treatment evidence policy", () => {
  it("counts general and item evidences", () => {
    expect(
      getNonConformityTreatmentEvidenceCount({
        _count: { evidences: 1 },
        checklistItems: [
          { _count: { evidences: 2 } },
          { _count: { evidences: 3 } },
        ],
      }),
    ).toBe(6);
  });

  it("requires at least one treatment evidence", () => {
    expect(
      hasNonConformityTreatmentEvidence({
        _count: { evidences: 0 },
        checklistItems: [{ _count: { evidences: 0 } }],
      }),
    ).toBe(false);

    expect(
      hasNonConformityTreatmentEvidence({
        _count: { evidences: 0 },
        checklistItems: [{ _count: { evidences: 1 } }],
      }),
    ).toBe(true);
  });

  it("requires evidence for every critical checklist item before verification", () => {
    expect(
      hasEvidenceForEveryCriticalChecklistItem({
        checklistItems: [
          { checklistEntry: { critical: true }, _count: { evidences: 1 } },
          { checklistEntry: { critical: true }, _count: { evidences: 0 } },
        ],
      }),
    ).toBe(false);

    expect(
      canRequestNonConformityVerification({
        _count: { evidences: 0 },
        checklistItems: [
          { checklistEntry: { critical: true }, _count: { evidences: 1 } },
          { checklistEntry: { critical: false }, _count: { evidences: 0 } },
        ],
      }),
    ).toBe(true);
  });
});
