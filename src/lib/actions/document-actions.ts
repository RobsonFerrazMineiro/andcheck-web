"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission, requireRole } from "@/lib/authz";
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

  const doc = await prisma.scaffoldDocument.create({ data });
  revalidatePath(`/andaimes/${data.scaffold_id}`);
  return doc;
}

// ── Deletar documento ─────────────────────────────────────────────────────────
export async function deleteScaffoldDocument(id: string, scaffold_id: string) {
  await requireRole("SUPER_ADMIN");
  await prisma.scaffoldDocument.delete({ where: { id } });
  revalidatePath(`/andaimes/${scaffold_id}`);
}
