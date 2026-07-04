import { describe, expect, it } from "vitest";

import { sanitizeForLog } from "@/lib/safe-log";

describe("sanitizeForLog – primitives and null", () => {
  it("passes null through unchanged", () => {
    expect(sanitizeForLog(null)).toBeNull();
  });

  it("passes undefined through unchanged", () => {
    expect(sanitizeForLog(undefined)).toBeUndefined();
  });

  it("passes numeric values unchanged", () => {
    expect(sanitizeForLog(42)).toBe(42);
    expect(sanitizeForLog(0)).toBe(0);
    expect(sanitizeForLog(-1.5)).toBe(-1.5);
  });

  it("passes boolean values unchanged", () => {
    expect(sanitizeForLog(true)).toBe(true);
    expect(sanitizeForLog(false)).toBe(false);
  });
});

describe("sanitizeForLog – strings", () => {
  it("passes short non-sensitive strings unchanged", () => {
    expect(sanitizeForLog("hello world")).toBe("hello world");
  });

  it("passes empty string unchanged", () => {
    expect(sanitizeForLog("")).toBe("");
  });

  it("hides image data URIs (data:image/...)", () => {
    expect(sanitizeForLog("data:image/png;base64,abc123")).toBe(
      "[image-data-hidden]",
    );
    expect(sanitizeForLog("data:image/jpeg;base64,AAAA")).toBe(
      "[image-data-hidden]",
    );
  });

  it("hides generic base64 data URIs", () => {
    expect(sanitizeForLog("data:application/pdf;base64,JVBERi0")).toBe(
      "[base64-hidden]",
    );
  });

  it("hides strings longer than 2000 characters", () => {
    const longString = "a".repeat(2_001);
    const result = sanitizeForLog(longString) as string;
    expect(result).toContain("[long-string-hidden:");
    expect(result).toContain("2001");
  });

  it("allows strings of exactly 2000 characters", () => {
    const borderString = "a".repeat(2_000);
    expect(sanitizeForLog(borderString)).toBe(borderString);
  });
});

describe("sanitizeForLog – Error instances", () => {
  it("converts Error to a safe plain object", () => {
    const error = new Error("something went wrong");
    const result = sanitizeForLog(error) as { name: string; message: string };
    expect(result).toMatchObject({
      name: "Error",
      message: "something went wrong",
    });
  });

  it("redacts base64 content inside Error messages", () => {
    const error = new Error("data:image/png;base64,xxx");
    const result = sanitizeForLog(error) as { message: string };
    expect(result.message).toBe("[image-data-hidden]");
  });
});

describe("sanitizeForLog – ArrayBuffer and typed arrays", () => {
  it("hides ArrayBuffer instances", () => {
    expect(sanitizeForLog(new ArrayBuffer(8))).toBe("[array-buffer-hidden]");
  });

  it("hides TypedArray (Uint8Array) instances", () => {
    expect(sanitizeForLog(new Uint8Array([1, 2, 3]))).toBe(
      "[array-buffer-hidden]",
    );
  });
});

describe("sanitizeForLog – objects with sensitive keys", () => {
  it("redacts the photo key", () => {
    const result = sanitizeForLog({
      photo: "data:image/jpg;base64,xxx",
    }) as Record<string, unknown>;
    expect(result.photo).toBe("[image-data-hidden]");
  });

  it("redacts the photos key", () => {
    const result = sanitizeForLog({ photos: ["some-url"] }) as Record<
      string,
      unknown
    >;
    expect(result.photos).toBe("[image-data-hidden]");
  });

  it("redacts the signature key", () => {
    const result = sanitizeForLog({ signature: "sig-data" }) as Record<
      string,
      unknown
    >;
    expect(result.signature).toBe("[signature-hidden]");
  });

  it("redacts the signature_data key", () => {
    const result = sanitizeForLog({ signature_data: "sig-data" }) as Record<
      string,
      unknown
    >;
    expect(result.signature_data).toBe("[signature-hidden]");
  });

  it("redacts the file_url key", () => {
    const result = sanitizeForLog({
      file_url: "https://example.com/file.pdf",
    }) as Record<string, unknown>;
    expect(result.file_url).toBe("[file-url-hidden]");
  });

  it("redacts the fileUrl key", () => {
    const result = sanitizeForLog({
      fileUrl: "https://example.com/file.pdf",
    }) as Record<string, unknown>;
    expect(result.fileUrl).toBe("[file-url-hidden]");
  });

  it("preserves non-sensitive keys", () => {
    const result = sanitizeForLog({ name: "João", age: 30 }) as Record<
      string,
      unknown
    >;
    expect(result.name).toBe("João");
    expect(result.age).toBe(30);
  });

  it("redacts sensitive keys while preserving safe ones in the same object", () => {
    const result = sanitizeForLog({
      id: "abc123",
      name: "Admin",
      photo: "data:image/png;base64,xxx",
      signature: "sig-data",
    }) as Record<string, unknown>;
    expect(result.id).toBe("abc123");
    expect(result.name).toBe("Admin");
    expect(result.photo).toBe("[image-data-hidden]");
    expect(result.signature).toBe("[signature-hidden]");
  });
});

describe("sanitizeForLog – nested objects", () => {
  it("sanitizes sensitive keys inside nested objects", () => {
    const result = sanitizeForLog({
      user: {
        name: "admin",
        photo: "data:image/png;base64,xxx",
      },
    }) as Record<string, Record<string, unknown>>;
    expect(result.user.name).toBe("admin");
    expect(result.user.photo).toBe("[image-data-hidden]");
  });

  it("sanitizes long strings inside nested objects", () => {
    const longVal = "x".repeat(3_000);
    const result = sanitizeForLog({
      metadata: { description: longVal },
    }) as Record<string, Record<string, string>>;
    expect(result.metadata.description).toContain("[long-string-hidden:");
  });
});

describe("sanitizeForLog – arrays", () => {
  it("sanitizes each element of an array", () => {
    const result = sanitizeForLog([
      "hello",
      "data:image/png;base64,xxx",
    ]) as string[];
    expect(result[0]).toBe("hello");
    expect(result[1]).toBe("[image-data-hidden]");
  });

  it("handles arrays of objects with sensitive keys", () => {
    const result = sanitizeForLog([
      { name: "Alice", photo: "data:image/png;base64,xxx" },
    ]) as Array<Record<string, unknown>>;
    expect(result[0].name).toBe("Alice");
    expect(result[0].photo).toBe("[image-data-hidden]");
  });
});

describe("sanitizeForLog – circular references", () => {
  it("handles circular references without crashing", () => {
    const obj: Record<string, unknown> = { name: "test" };
    obj.self = obj;
    const result = sanitizeForLog(obj) as Record<string, unknown>;
    expect(result.name).toBe("test");
    expect(result.self).toBe("[circular]");
  });
});
