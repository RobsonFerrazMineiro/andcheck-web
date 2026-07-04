import { describe, expect, it } from "vitest";

import {
  enumValue,
  optionalDate,
  optionalId,
  optionalNumber,
  requiredEmail,
  requiredId,
  requiredNumber,
  requiredText,
} from "@/lib/input-validation";

describe("input-validation", () => {
  it("normalizes required text and rejects empty values", () => {
    expect(requiredText("  Andaime  ", "Nome")).toBe("Andaime");
    expect(() => requiredText("", "Nome")).toThrow("Nome e obrigatorio.");
  });

  it("validates ids and emails", () => {
    expect(requiredId("abc_123", "Registro")).toBe("abc_123");
    expect(optionalId("none", "Responsavel")).toBeNull();
    expect(requiredEmail(" ADMIN@ANDCHECK.COM ")).toBe("admin@andcheck.com");
    expect(() => requiredId("abc/123", "Registro")).toThrow(
      "Registro invalido.",
    );
  });

  it("validates numbers, dates and enum values", () => {
    expect(optionalNumber("12,5", "Altura")).toBe(12.5);
    expect(requiredNumber("10", "Carga", { min: 1 })).toBe(10);
    expect(optionalDate("2026-07-03", "Validade")?.toISOString()).toContain(
      "2026-07-03",
    );
    expect(enumValue("liberado", ["liberado", "vencido"], "Status")).toBe(
      "liberado",
    );
    expect(() => enumValue("x", ["a"], "Tipo")).toThrow("Tipo invalido.");
  });
});
