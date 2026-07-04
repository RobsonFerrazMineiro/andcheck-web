import { describe, expect, it } from "vitest";

import {
  SEMANTIC_TONE_CLASSES,
  SEMANTIC_TONE_HEX,
  documentStatusTone,
  inspectionResultTone,
  legacyColorToneToSemanticTone,
  nonConformityStatusTone,
  notificationSeverityTone,
  scaffoldStatusTone,
} from "@/lib/semantic-tones";

// ── scaffoldStatusTone ────────────────────────────────────────────────────────

describe("scaffoldStatusTone", () => {
  it("returns success for liberado", () => {
    expect(scaffoldStatusTone("liberado")).toBe("success");
  });

  it("returns critical for interditado", () => {
    expect(scaffoldStatusTone("interditado")).toBe("critical");
  });

  it("returns critical for reprovado", () => {
    expect(scaffoldStatusTone("reprovado")).toBe("critical");
  });

  it("returns critical for vencido", () => {
    expect(scaffoldStatusTone("vencido")).toBe("critical");
  });

  it("returns warning for pendente_liberacao", () => {
    expect(scaffoldStatusTone("pendente_liberacao")).toBe("warning");
  });

  it("returns warning for pendente (legacy alias)", () => {
    expect(scaffoldStatusTone("pendente")).toBe("warning");
  });

  it("returns disabled for desmontado", () => {
    expect(scaffoldStatusTone("desmontado")).toBe("disabled");
  });

  it("returns neutral for em_montagem (unknown maps to neutral)", () => {
    expect(scaffoldStatusTone("em_montagem")).toBe("neutral");
  });

  it("returns neutral for unknown status", () => {
    expect(scaffoldStatusTone("unknown_status")).toBe("neutral");
  });
});

// ── inspectionResultTone ──────────────────────────────────────────────────────

describe("inspectionResultTone", () => {
  it("returns success for aprovado", () => {
    expect(inspectionResultTone("aprovado")).toBe("success");
  });

  it("returns success for conforme (legacy alias)", () => {
    expect(inspectionResultTone("conforme")).toBe("success");
  });

  it("returns critical for reprovado", () => {
    expect(inspectionResultTone("reprovado")).toBe("critical");
  });

  it("returns critical for nao_conforme (legacy alias)", () => {
    expect(inspectionResultTone("nao_conforme")).toBe("critical");
  });

  it("returns warning for aprovado_com_ressalvas", () => {
    expect(inspectionResultTone("aprovado_com_ressalvas")).toBe("warning");
  });

  it("returns disabled for unknown result", () => {
    expect(inspectionResultTone("pendente")).toBe("disabled");
    expect(inspectionResultTone("")).toBe("disabled");
  });
});

// ── nonConformityStatusTone ───────────────────────────────────────────────────

describe("nonConformityStatusTone", () => {
  it("returns success for CLOSED", () => {
    expect(nonConformityStatusTone("CLOSED")).toBe("success");
  });

  it("returns critical for REJECTED", () => {
    expect(nonConformityStatusTone("REJECTED")).toBe("critical");
  });

  it("returns warning for ASSIGNED", () => {
    expect(nonConformityStatusTone("ASSIGNED")).toBe("warning");
  });

  it("returns warning for IN_PROGRESS", () => {
    expect(nonConformityStatusTone("IN_PROGRESS")).toBe("warning");
  });

  it("returns warning for PENDING_VERIFICATION", () => {
    expect(nonConformityStatusTone("PENDING_VERIFICATION")).toBe("warning");
  });

  it("returns disabled for CANCELLED", () => {
    expect(nonConformityStatusTone("CANCELLED")).toBe("disabled");
  });

  it("returns neutral for OPEN", () => {
    expect(nonConformityStatusTone("OPEN")).toBe("neutral");
  });

  it("returns neutral for unknown status", () => {
    expect(nonConformityStatusTone("UNKNOWN")).toBe("neutral");
  });
});

// ── documentStatusTone ────────────────────────────────────────────────────────

describe("documentStatusTone", () => {
  it("returns success for ACTIVE", () => {
    expect(documentStatusTone("ACTIVE")).toBe("success");
  });

  it("returns success for anexado (legacy alias)", () => {
    expect(documentStatusTone("anexado")).toBe("success");
  });

  it("returns critical for EXPIRED", () => {
    expect(documentStatusTone("EXPIRED")).toBe("critical");
  });

  it("returns critical for vencido (legacy alias)", () => {
    expect(documentStatusTone("vencido")).toBe("critical");
  });

  it("returns warning for pendente", () => {
    expect(documentStatusTone("pendente")).toBe("warning");
  });

  it("returns disabled for unknown status", () => {
    expect(documentStatusTone("ARCHIVED")).toBe("disabled");
    expect(documentStatusTone("")).toBe("disabled");
  });
});

// ── notificationSeverityTone ──────────────────────────────────────────────────

describe("notificationSeverityTone", () => {
  it("returns success for SUCCESS", () => {
    expect(notificationSeverityTone("SUCCESS")).toBe("success");
  });

  it("returns critical for CRITICAL", () => {
    expect(notificationSeverityTone("CRITICAL")).toBe("critical");
  });

  it("returns warning for WARNING", () => {
    expect(notificationSeverityTone("WARNING")).toBe("warning");
  });

  it("returns neutral for INFO and unknown", () => {
    expect(notificationSeverityTone("INFO")).toBe("neutral");
    expect(notificationSeverityTone("OTHER")).toBe("neutral");
  });
});

// ── legacyColorToneToSemanticTone ─────────────────────────────────────────────

describe("legacyColorToneToSemanticTone", () => {
  it("converts green to success", () => {
    expect(legacyColorToneToSemanticTone("green")).toBe("success");
  });

  it("converts red to critical", () => {
    expect(legacyColorToneToSemanticTone("red")).toBe("critical");
  });

  it("converts amber to warning", () => {
    expect(legacyColorToneToSemanticTone("amber")).toBe("warning");
  });

  it("converts orange to warning", () => {
    expect(legacyColorToneToSemanticTone("orange")).toBe("warning");
  });

  it("converts slate to disabled", () => {
    expect(legacyColorToneToSemanticTone("slate")).toBe("disabled");
  });

  it("converts blue to neutral", () => {
    expect(legacyColorToneToSemanticTone("blue")).toBe("neutral");
  });
});

// ── SEMANTIC_TONE_HEX ─────────────────────────────────────────────────────────

describe("SEMANTIC_TONE_HEX", () => {
  it("has exactly 5 tone entries", () => {
    expect(Object.keys(SEMANTIC_TONE_HEX)).toHaveLength(5);
  });

  it("all values are valid hex colors", () => {
    for (const hex of Object.values(SEMANTIC_TONE_HEX)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("success tone is green-ish", () => {
    expect(SEMANTIC_TONE_HEX.success).toBe("#16a34a");
  });

  it("critical tone is red-ish", () => {
    expect(SEMANTIC_TONE_HEX.critical).toBe("#dc2626");
  });
});

// ── SEMANTIC_TONE_CLASSES ─────────────────────────────────────────────────────

describe("SEMANTIC_TONE_CLASSES", () => {
  it("has entries for all 5 semantic tones", () => {
    const tones = ["success", "critical", "warning", "neutral", "disabled"];
    for (const tone of tones) {
      expect(SEMANTIC_TONE_CLASSES).toHaveProperty(tone);
    }
  });

  it("each entry has the required shape keys", () => {
    const required = [
      "badge",
      "bar",
      "border",
      "borderLeft",
      "dot",
      "icon",
      "subtleBg",
      "text",
    ];
    for (const classes of Object.values(SEMANTIC_TONE_CLASSES)) {
      for (const key of required) {
        expect(classes).toHaveProperty(key);
        expect(typeof (classes as Record<string, string>)[key]).toBe("string");
      }
    }
  });

  it("success badge includes emerald color classes", () => {
    expect(SEMANTIC_TONE_CLASSES.success.badge).toContain("emerald");
  });

  it("critical badge includes red color classes", () => {
    expect(SEMANTIC_TONE_CLASSES.critical.badge).toContain("red");
  });
});
