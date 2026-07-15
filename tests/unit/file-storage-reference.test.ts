import { describe, expect, it } from "vitest";

import {
  assertStoredFileReference,
  isStoredFileReference,
} from "@/lib/file-storage-reference";

describe("stored file references", () => {
  it("accepts controlled storage references", () => {
    expect(isStoredFileReference("/uploads/documents/file.pdf")).toBe(true);
    expect(isStoredFileReference("vercel-blob:documents/file.pdf")).toBe(true);
  });

  it("rejects external URLs for new stored file references", () => {
    expect(isStoredFileReference("https://example.com/file.pdf")).toBe(false);
    expect(() =>
      assertStoredFileReference("https://example.com/file.pdf", "Documento"),
    ).toThrow("Documento deve usar uma referencia de storage");
  });

  it("rejects base64 payloads", () => {
    expect(() =>
      assertStoredFileReference(
        "data:image/png;base64,abc123",
        "Evidencia",
      ),
    ).toThrow("dados Base64 nao sao aceitos");
  });
});
