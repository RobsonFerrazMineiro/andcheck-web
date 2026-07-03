import "server-only";

import path from "node:path";

import type { UploadCategory } from "@/lib/file-storage";

type UploadPolicy = {
  mimeTypes: readonly string[];
  extensions: readonly string[];
};

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"] as const;
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ...IMAGE_MIME_TYPES,
] as const;
const DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ...IMAGE_EXTENSIONS,
] as const;

const UPLOAD_POLICIES: Record<UploadCategory, UploadPolicy> = {
  "company-logo": {
    mimeTypes: IMAGE_MIME_TYPES,
    extensions: IMAGE_EXTENSIONS,
  },
  documents: {
    mimeTypes: DOCUMENT_MIME_TYPES,
    extensions: DOCUMENT_EXTENSIONS,
  },
  "scaffold-documents": {
    mimeTypes: DOCUMENT_MIME_TYPES,
    extensions: DOCUMENT_EXTENSIONS,
  },
  "inspection-photos": {
    mimeTypes: IMAGE_MIME_TYPES,
    extensions: IMAGE_EXTENSIONS,
  },
  "checklist-photos": {
    mimeTypes: IMAGE_MIME_TYPES,
    extensions: IMAGE_EXTENSIONS,
  },
  "inspection-signatures": {
    mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    extensions: IMAGE_EXTENSIONS,
  },
  "non-conformity-evidence": {
    mimeTypes: DOCUMENT_MIME_TYPES,
    extensions: DOCUMENT_EXTENSIONS,
  },
};

function fileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function bytesStartWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

async function detectMimeType(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (bytesStartWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "application/zip";

  return file.type || "application/octet-stream";
}

function expectedMimeForOfficeExtension(extension: string) {
  if (extension === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === ".xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return null;
}

export async function validateUploadedFile(
  file: File,
  category: UploadCategory,
) {
  const policy = UPLOAD_POLICIES[category];
  const extension = fileExtension(file.name);
  const declaredMimeType = file.type || "application/octet-stream";

  if (!policy.extensions.includes(extension)) {
    return {
      ok: false as const,
      message: "Extensao de arquivo nao permitida para esta categoria.",
    };
  }

  if (!policy.mimeTypes.includes(declaredMimeType)) {
    return {
      ok: false as const,
      message: "Tipo de arquivo nao permitido para esta categoria.",
    };
  }

  const detectedMimeType = await detectMimeType(file);
  const officeMimeType = expectedMimeForOfficeExtension(extension);
  const detectedMatchesDeclared =
    detectedMimeType === declaredMimeType ||
    (detectedMimeType === "application/zip" && declaredMimeType === officeMimeType);

  if (!detectedMatchesDeclared) {
    return {
      ok: false as const,
      message: "Conteudo do arquivo nao corresponde ao tipo informado.",
    };
  }

  return { ok: true as const };
}
