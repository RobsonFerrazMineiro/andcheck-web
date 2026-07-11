import {
  fileToDataUrl,
  MAX_OFFLINE_FILE_BYTES,
} from "@/lib/offline/offline-file-client";
import { describe, expect, it } from "vitest";

describe("fileToDataUrl", () => {
  it("rejects empty offline files", async () => {
    await expect(fileToDataUrl(new Blob([]))).rejects.toThrow(
      "Arquivo offline vazio.",
    );
  });

  it("rejects offline files larger than the local limit", async () => {
    await expect(
      fileToDataUrl(new Blob([new Uint8Array(MAX_OFFLINE_FILE_BYTES + 1)])),
    ).rejects.toThrow("Arquivo offline excede o limite de 8 MB.");
  });
});
