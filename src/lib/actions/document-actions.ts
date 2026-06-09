"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission, requireRole } from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { DocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ── Listar documentos de um andaime ──────────────────────────────────────────
export async function getScaffoldDocuments(scaffold_id: string) {
  await requireAnyPermission([
    "documents.view",
    "documents.create",
    "read.all",
    "read.own_company",
  ]);

  return prisma.scaffoldDocument.findMany({
    where: { scaffold_id },
    orderBy: { created_at: "desc" },
  });
}

// ── Adicionar documento ───────────────────────────────────────────────────────
export async function addScaffoldDocument(data: {
  scaffold_id: string;
  type: DocumentType;
  title: string;
  file_url: string; // base64
  file_name: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  expires_at?: Date;
  observation?: string;
}) {
  await requirePermission("documents.create");

  const [doc, scaffold] = await Promise.all([
    prisma.scaffoldDocument.create({ data }),
    prisma.scaffold.findUnique({ where: { id: data.scaffold_id } }),
  ]);
  await createAuditLog({
    entityType: AuditEntityType.DOCUMENT,
    entityId: doc.id,
    entityLabel: doc.title,
    action: AuditAction.UPLOAD,
    description: `Documento ${doc.type} anexado ao andaime ${scaffold?.code ?? data.scaffold_id}`,
    newValue: {
      scaffold_id: doc.scaffold_id,
      scaffold_code: scaffold?.code ?? null,
      type: doc.type,
      title: doc.title,
      file_name: doc.file_name,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      uploaded_by: doc.uploaded_by,
      expires_at: doc.expires_at?.toISOString() ?? null,
    },
    companyId: scaffold?.company,
  });
  revalidatePath(`/andaimes/${data.scaffold_id}`);
  return doc;
}

// ── Deletar documento ─────────────────────────────────────────────────────────
export async function deleteScaffoldDocument(id: string, scaffold_id: string) {
  await requireRole("SUPER_ADMIN");
  const oldDocument = await prisma.scaffoldDocument.findUnique({
    where: { id },
    include: { scaffold: true },
  });
  await prisma.scaffoldDocument.delete({ where: { id } });
  await createAuditLog({
    entityType: AuditEntityType.DOCUMENT,
    entityId: id,
    entityLabel: oldDocument?.title ?? id,
    action: AuditAction.DELETE,
    description: `Documento ${oldDocument?.type ?? ""} removido do andaime ${oldDocument?.scaffold.code ?? scaffold_id}`,
    oldValue: oldDocument
      ? {
          scaffold_id: oldDocument.scaffold_id,
          scaffold_code: oldDocument.scaffold.code,
          type: oldDocument.type,
          title: oldDocument.title,
          file_name: oldDocument.file_name,
          file_size: oldDocument.file_size,
          mime_type: oldDocument.mime_type,
          uploaded_by: oldDocument.uploaded_by,
        }
      : undefined,
    companyId: oldDocument?.scaffold.company,
  });
  revalidatePath(`/andaimes/${scaffold_id}`);
}
