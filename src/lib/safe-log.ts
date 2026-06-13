const HIDDEN_KEYS: Record<string, string> = {
  arraybuffer: "[array-buffer-hidden]",
  base64: "[base64-hidden]",
  blob: "[blob-hidden]",
  buffer: "[buffer-hidden]",
  file: "[file-hidden]",
  filecontent: "[file-content-hidden]",
  filedata: "[file-content-hidden]",
  fileurl: "[file-url-hidden]",
  file_url: "[file-url-hidden]",
  image: "[image-data-hidden]",
  imagedata: "[image-data-hidden]",
  photo: "[image-data-hidden]",
  photos: "[image-data-hidden]",
  signature: "[signature-hidden]",
  signaturedata: "[signature-hidden]",
  signature_data: "[signature-hidden]",
};

function hiddenMarker(key: string) {
  return HIDDEN_KEYS[key.toLowerCase().replace(/[^a-z0-9_]/g, "")];
}

function sanitizeString(value: string) {
  if (/^data:image\//i.test(value)) return "[image-data-hidden]";
  if (/^data:[^;,]+;base64,/i.test(value)) return "[base64-hidden]";
  if (value.length > 2_000) return `[long-string-hidden:${value.length}]`;
  return value;
}

export function sanitizeForLog(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value !== "object") return value;

  if (value instanceof Error) {
    return { name: value.name, message: sanitizeString(value.message) };
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return "[buffer-hidden]";
  }
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return "[array-buffer-hidden]";
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return "[blob-hidden]";
  }

  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      hiddenMarker(key) ?? sanitizeForLog(nestedValue, seen),
    ]),
  );
}

export function safeLogFileMetadata(value: {
  id?: string | null;
  fileName?: string | null;
  file_name?: string | null;
  name?: string | null;
  mimeType?: string | null;
  mime_type?: string | null;
  type?: string | null;
  size?: number | null;
  fileSize?: number | null;
  file_size?: number | null;
  createdAt?: Date | string | null;
  created_at?: Date | string | null;
  uploadedAt?: Date | string | null;
}) {
  return {
    id: value.id ?? null,
    fileName: value.fileName ?? value.file_name ?? value.name ?? null,
    mimeType: value.mimeType ?? value.mime_type ?? value.type ?? null,
    size: value.size ?? value.fileSize ?? value.file_size ?? null,
    uploadedAt:
      value.uploadedAt ?? value.createdAt ?? value.created_at ?? null,
  };
}
