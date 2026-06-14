"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission, requireRole } from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { assertStoredFileReference } from "@/lib/file-storage-reference";
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

  const documents = await prisma.scaffoldDocument.findMany({
    where: { scaffold_id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      scaffold_id: true,
      type: true,
      title: true,
      file_name: true,
      file_size: true,
      mime_type: true,
      uploaded_by: true,
      expires_at: true,
      observation: true,
      created_at: true,
      updated_at: true,
    },
  });

  return documents.map((document) => ({
    ...document,
    file_url: `/api/scaffold-documents/${document.id}`,
  }));
}

// ── Adicionar documento ───────────────────────────────────────────────────────
export async function addScaffoldDocument(data: {
  scaffold_id: string;
  type: DocumentType;
  title: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  expires_at?: Date;
  observation?: string;
}) {
  await requirePermission("documents.create");
  assertStoredFileReference(data.file_url, "Documento");

  const scaffold = await prisma.scaffold.findUnique({
    where: { id: data.scaffold_id },
  });
  if (!scaffold) throw new Error("Andaime nao encontrado.");

  const doc = await prisma.scaffoldDocument.create({
    data: {
      ...data,
      companyId: scaffold.companyId,
      workspaceId: scaffold.workspaceId,
    },
  });
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
  return { id: doc.id };
}

// ── Deletar documento ─────────────────────────────────────────────────────────
export async function deleteScaffoldDocument(id: string, scaffold_id: string) {
  await requireRole("SUPER_ADMIN");
  const oldDocument = await prisma.scaffoldDocument.findUnique({
    where: { id },
    select: {
      id: true,
      scaffold_id: true,
      type: true,
      title: true,
      file_name: true,
      file_size: true,
      mime_type: true,
      uploaded_by: true,
      scaffold: {
        select: { code: true, company: true },
      },
    },
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
