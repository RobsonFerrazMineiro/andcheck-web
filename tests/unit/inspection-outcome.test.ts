import { describe, expect, it } from "vitest";

import {
  calculateInspectionResult,
  calculateScaffoldStatus,
  hasCriticalChecklistFailure,
} from "@/lib/inspection-outcome";

describe("hasCriticalChecklistFailure", () => {
  it("returns false when no items fail", () => {
    expect(
      hasCriticalChecklistFailure([
        { critical: true, value: "CL_OK" },
        { critical: false, value: "CL_OK" },
      ]),
    ).toBe(false);
  });

  it("returns false when only non-critical items fail", () => {
    expect(
      hasCriticalChecklistFailure([
        { critical: false, value: "CL_FAIL" },
        { critical: true, value: "CL_OK" },
      ]),
    ).toBe(false);
  });

  it("returns true when a critical item fails", () => {
    expect(
      hasCriticalChecklistFailure([
        { critical: true, value: "CL_OK" },
        { critical: true, value: "CL_FAIL" },
      ]),
    ).toBe(true);
  });

  it("returns false for an empty checklist", () => {
    expect(hasCriticalChecklistFailure([])).toBe(false);
  });

  it("returns false when all values are CL_NA", () => {
    expect(
      hasCriticalChecklistFailure([
        { critical: true, value: "CL_NA" },
        { critical: false, value: "CL_NA" },
      ]),
    ).toBe(false);
  });

  it("returns false when a critical item has CL_WARN but not CL_FAIL", () => {
    expect(
      hasCriticalChecklistFailure([{ critical: true, value: "CL_WARN" }]),
    ).toBe(false);
  });
});

describe("calculateInspectionResult", () => {
  it("returns aprovado when all items are OK", () => {
    expect(
      calculateInspectionResult([
        { critical: false, value: "CL_OK" },
        { critical: true, value: "CL_OK" },
      ]),
    ).toBe("aprovado");
  });

  it("returns aprovado when all items are CL_NA", () => {
    expect(
      calculateInspectionResult([
        { critical: true, value: "CL_NA" },
        { critical: false, value: "CL_NA" },
      ]),
    ).toBe("aprovado");
  });

  it("returns aprovado_com_ressalvas when a non-critical item fails", () => {
    expect(
      calculateInspectionResult([
        { critical: false, value: "CL_FAIL" },
        { critical: true, value: "CL_OK" },
      ]),
    ).toBe("aprovado_com_ressalvas");
  });

  it("returns aprovado_com_ressalvas when any item has CL_WARN", () => {
    expect(
      calculateInspectionResult([
        { critical: false, value: "CL_WARN" },
        { critical: true, value: "CL_OK" },
      ]),
    ).toBe("aprovado_com_ressalvas");
  });

  it("returns aprovado_com_ressalvas when a critical item has CL_WARN", () => {
    expect(
      calculateInspectionResult([{ critical: true, value: "CL_WARN" }]),
    ).toBe("aprovado_com_ressalvas");
  });

  it("returns reprovado when a critical item fails", () => {
    expect(
      calculateInspectionResult([
        { critical: true, value: "CL_FAIL" },
        { critical: false, value: "CL_OK" },
      ]),
    ).toBe("reprovado");
  });

  it("returns reprovado even if some critical items pass when one fails", () => {
    expect(
      calculateInspectionResult([
        { critical: true, value: "CL_OK" },
        { critical: true, value: "CL_FAIL" },
        { critical: false, value: "CL_OK" },
      ]),
    ).toBe("reprovado");
  });

  it("returns aprovado for empty checklist", () => {
    expect(calculateInspectionResult([])).toBe("aprovado");
  });
});

describe("calculateScaffoldStatus", () => {
  it("returns liberado when result is aprovado", () => {
    expect(
      calculateScaffoldStatus("aprovado", [{ critical: true, value: "CL_OK" }]),
    ).toBe("liberado");
  });

  it("returns liberado when result is aprovado_com_ressalvas", () => {
    expect(
      calculateScaffoldStatus("aprovado_com_ressalvas", [
        { critical: false, value: "CL_WARN" },
      ]),
    ).toBe("liberado");
  });

  it("returns interditado when reprovado with critical failure", () => {
    expect(
      calculateScaffoldStatus("reprovado", [
        { critical: true, value: "CL_FAIL" },
      ]),
    ).toBe("interditado");
  });

  it("returns reprovado when reprovado without critical failure", () => {
    expect(
      calculateScaffoldStatus("reprovado", [
        { critical: false, value: "CL_FAIL" },
        { critical: true, value: "CL_OK" },
      ]),
    ).toBe("reprovado");
  });

  it("returns interditado when reprovado and multiple critical failures exist", () => {
    expect(
      calculateScaffoldStatus("reprovado", [
        { critical: true, value: "CL_FAIL" },
        { critical: true, value: "CL_FAIL" },
      ]),
    ).toBe("interditado");
  });
});
