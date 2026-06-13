import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada.");
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN nao configurado.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const migrated = {};

function decodeDataUrl(dataUrl) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Data URL invalida.");
  const mimeType = match[1] || "application/octet-stream";
  const bytes = match[2]
    ? Buffer.from(match[3], "base64")
    : Buffer.from(decodeURIComponent(match[3]), "utf8");
  return { bytes, mimeType };
}

function extensionFor(mimeType, fileName = "") {
  const extension = /\.[a-z0-9]{1,10}$/i.exec(fileName)?.[0];
  if (extension) return extension.toLowerCase();
  return {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
  }[mimeType] || "";
}

async function migrateDataUrl(dataUrl, category, fileName) {
  if (!dataUrl?.startsWith("data:")) return dataUrl;
  const { bytes, mimeType } = decodeDataUrl(dataUrl);
  const pathname = `${category}/legacy/${randomUUID()}${extensionFor(mimeType, fileName)}`;
  const blob = await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    contentType: mimeType,
  });
  migrated[category] = (migrated[category] || 0) + 1;
  return `vercel-blob:${blob.pathname}`;
}

async function run() {
  const documents = await prisma.scaffoldDocument.findMany({
    where: { file_url: { startsWith: "data:" } },
    select: { id: true, file_url: true, file_name: true },
  });
  for (const document of documents) {
    await prisma.scaffoldDocument.update({
      where: { id: document.id },
      data: {
        file_url: await migrateDataUrl(
          document.file_url,
          "scaffold-documents",
          document.file_name,
        ),
      },
    });
  }

  const inspections = await prisma.inspection.findMany({
    select: { id: true, photos: true, signature: true },
  });
  for (const inspection of inspections) {
    const photos = await Promise.all(
      inspection.photos.map((photo) =>
        migrateDataUrl(photo, "inspection-photos", "foto.jpg"),
      ),
    );
    const signature = await migrateDataUrl(
      inspection.signature,
      "inspection-signatures",
      "assinatura.png",
    );
    if (
      signature !== inspection.signature ||
      photos.some((photo, index) => photo !== inspection.photos[index])
    ) {
      await prisma.inspection.update({
        where: { id: inspection.id },
        data: { photos, signature },
      });
    }
  }

  const checklistEntries = await prisma.checklistEntry.findMany({
    where: { photo: { startsWith: "data:" } },
    select: { id: true, photo: true },
  });
  for (const entry of checklistEntries) {
    await prisma.checklistEntry.update({
      where: { id: entry.id },
      data: {
        photo: await migrateDataUrl(
          entry.photo,
          "checklist-photos",
          "foto.jpg",
        ),
      },
    });
  }

  const signatures = await prisma.inspectionSignature.findMany({
    where: { signature_data: { startsWith: "data:" } },
    select: { id: true, signature_data: true },
  });
  for (const signature of signatures) {
    await prisma.inspectionSignature.update({
      where: { id: signature.id },
      data: {
        signature_data: await migrateDataUrl(
          signature.signature_data,
          "inspection-signatures",
          "assinatura.png",
        ),
      },
    });
  }

  const evidenceGroups = [
    {
      records: await prisma.nonConformityEvidence.findMany({
        where: { fileUrl: { startsWith: "data:" } },
        select: { id: true, fileUrl: true, fileName: true },
      }),
      update: (record, fileUrl) =>
        prisma.nonConformityEvidence.update({
          where: { id: record.id },
          data: { fileUrl },
        }),
    },
    {
      records: await prisma.nonConformityItemEvidence.findMany({
        where: { fileUrl: { startsWith: "data:" } },
        select: { id: true, fileUrl: true, fileName: true },
      }),
      update: (record, fileUrl) =>
        prisma.nonConformityItemEvidence.update({
          where: { id: record.id },
          data: { fileUrl },
        }),
    },
  ];
  for (const group of evidenceGroups) {
    for (const record of group.records) {
      const fileUrl = await migrateDataUrl(
        record.fileUrl,
        "non-conformity-evidence",
        record.fileName,
      );
      await group.update(record, fileUrl);
    }
  }

  console.log("Migracao concluida", migrated);
}

try {
  await run();
} finally {
  await prisma.$disconnect();
  await pool.end();
}
