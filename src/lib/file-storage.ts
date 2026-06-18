import "server-only";

import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_CATEGORIES = [
  "company-logo",
  "scaffold-documents",
  "inspection-photos",
  "checklist-photos",
  "inspection-signatures",
  "non-conformity-evidence",
] as const;

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

function safeExtension(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
}

function storagePath(file: File, category: UploadCategory) {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${category}/${now.getUTCFullYear()}/${month}/${crypto.randomUUID()}${safeExtension(file)}`;
}

export async function storeUploadedFile(file: File, category: UploadCategory) {
  const pathname = storagePath(file, category);

  if (
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  ) {
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    });
    return {
      reference: `vercel-blob:${blob.pathname}`,
      size: file.size,
      contentType: blob.contentType,
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Storage de arquivos nao configurado no ambiente.");
  }

  const destination = path.join(process.cwd(), "public", "uploads", pathname);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, new Uint8Array(await file.arrayBuffer()));

  return {
    reference: `/uploads/${pathname}`,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  };
}
