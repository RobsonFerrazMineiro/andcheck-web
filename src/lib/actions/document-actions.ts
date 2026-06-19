"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission, requirePermission, requireRole } from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { assertStoredFileReference } from "@/lib/file-storage-reference";
import {
  DocumentCategory,
  DocumentStatus,
  DocumentType,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  assertRecordInDataScope,
  dataScopeWhere,
  getDataScope,
} from "@/lib/data-scope";
import { getCurrentUserAccess } from "@/lib/authz";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

const DOCUMENT_VIEW_PERMISSIONS: PermissionCode[] = [
  "documents.view",
  "documents.create",
  "documents.update",
  "documents.archive",
  "read.all",
  "read.own_company",
];

const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  ART: "ART",
  RRT: "RRT",
  PROJETO_ESTRUTURAL: "Projeto Estrutural",
  MEMORIAL_CALCULO: "Memorial de Calculo",
  CROQUI: "Croqui",
  PLANO_MONTAGEM: "Plano de Montagem",
  CERTIFICADO_TECNICO: "Certificado Tecnico",
  OUTRO: "Outros",
};

function hasAccessPermission(
  access: Awaited<ReturnType<typeof getCurrentUserAccess>>,
  permission: PermissionCode,
) {
  return Boolean(
    access?.roleCodes.some((roleCode) => roleHasPermission(roleCode, permission)),
  );
}

function hasAnyAccessPermission(
  access: Awaited<ReturnType<typeof getCurrentUserAccess>>,
  permissions: PermissionCode[],
) {
  return Boolean(
    access?.roleCodes.some((roleCode) =>
      permissions.some((permission) => roleHasPermission(roleCode, permission)),
    ),
  );
}

function isSuperAdmin(access: Awaited<ReturnType<typeof getCurrentUserAccess>>) {
  return Boolean(access?.roleCodes.includes("SUPER_ADMIN"));
}

async function documentDataScopeWhere() {
  const [scope, access] = await Promise.all([getDataScope(), getCurrentUserAccess()]);
  return isSuperAdmin(access) ? {} : dataScopeWhere(scope);
}

function idsFromDocumentScopeFilter(
  value: Prisma.DocumentWhereInput["companyId"],
) {
  if (!value) return undefined;
  if (typeof value === "string") return [value];
  if (typeof value === "object" && "in" in value && Array.isArray(value.in)) {
    return value.in.filter((id): id is string => typeof id === "string");
  }
  return undefined;
}

function calculateDocumentStatus(
  expiryDate: Date | string | null | undefined,
  currentStatus?: DocumentStatus | null,
) {
  if (currentStatus === "ARCHIVED") return DocumentStatus.ARCHIVED;
  if (!expiryDate) return DocumentStatus.ACTIVE;

  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return expiry < today ? DocumentStatus.EXPIRED : DocumentStatus.ACTIVE;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(`${raw}T00:00:00`) : null;
}

function parseDocumentForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() as DocumentCategory;
  const description = String(formData.get("description") ?? "").trim() || null;
  const companyId = String(formData.get("companyId") ?? "").trim();
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const issueDate = parseOptionalDate(formData.get("issueDate"));
  const expiryDate = parseOptionalDate(formData.get("expiryDate"));
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "").trim();
  const mimeType = String(formData.get("mimeType") ?? "").trim() || null;
  const fileSizeRaw = String(formData.get("fileSize") ?? "").trim();
  const fileSize = fileSizeRaw ? Number(fileSizeRaw) : null;

  if (!title || !category || !companyId || !workspaceId) {
    throw new Error("Titulo, categoria, empresa e workspace sao obrigatorios.");
  }
  if (!Object.values(DocumentCategory).includes(category)) {
    throw new Error("Categoria tecnica invalida.");
  }
  if (!fileUrl || !fileName) {
    throw new Error("Arquivo tecnico obrigatorio.");
  }
  if (fileSize !== null && (!Number.isFinite(fileSize) || fileSize < 0)) {
    throw new Error("Tamanho do arquivo invalido.");
  }

  return {
    title,
    category,
    description,
    companyId,
    workspaceId,
    issueDate,
    expiryDate,
    fileUrl,
    fileName,
    fileSize,
    mimeType,
  };
}

async function assertDocumentContext(companyId: string, workspaceId: string) {
  const [scope, access, company, workspaceLink] = await Promise.all([
    getDataScope(),
    getCurrentUserAccess(),
    prisma.company.findFirst({
      where: { id: companyId, active: true },
      select: { id: true },
    }),
    prisma.companyWorkspace.findFirst({
      where: {
        companyId,
        workspaceId,
        active: true,
        workspace: { active: true },
      },
      select: { id: true },
    }),
  ]);

  if (!company || !workspaceLink) {
    throw new Error("Empresa e workspace devem estar ativos e vinculados.");
  }
  if (!isSuperAdmin(access)) {
    assertRecordInDataScope(scope, { companyId, workspaceId });
  }
}

async function syncExpiredDocuments(where: Prisma.DocumentWhereInput) {
  await prisma.document.updateMany({
    where: {
      ...where,
      status: { not: DocumentStatus.ARCHIVED },
      expiryDate: { lt: new Date() },
    },
    data: { status: DocumentStatus.EXPIRED },
  });
}

function documentFileRoutes(id: string) {
  return {
    fileUrl: `/api/documents/${id}/file`,
    downloadUrl: `/api/documents/${id}/file?disposition=attachment`,
  };
}

function serializeDocument(document: {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  category: DocumentCategory;
  status: DocumentStatus;
  issueDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  company: { id: string; name: string } | null;
  workspace: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
}) {
  const routes = documentFileRoutes(document.id);
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    fileName: document.fileName,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    category: document.category,
    categoryLabel: DOCUMENT_CATEGORY_LABELS[document.category],
    status: calculateDocumentStatus(document.expiryDate, document.status),
    issueDate: document.issueDate?.toISOString() ?? null,
    expiryDate: document.expiryDate?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    company: document.company,
    workspace: document.workspace,
    createdBy: document.createdBy,
    ...routes,
  };
}

export async function getDocumentManagementData() {
  await requireAnyPermission(DOCUMENT_VIEW_PERMISSIONS);
  const access = await getCurrentUserAccess();
  const where = await documentDataScopeWhere();
  await syncExpiredDocuments(where);

  const [documents, companies, workspaces] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.company.findMany({
      where: {
        active: true,
        ...(!isSuperAdmin(access)
          ? {
              id: {
                in: idsFromDocumentScopeFilter(
                  (where as Prisma.DocumentWhereInput).companyId,
                ),
              },
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.workspace.findMany({
      where: {
        active: true,
        ...(!isSuperAdmin(access)
          ? {
              id: {
                in: idsFromDocumentScopeFilter(
                  (where as Prisma.DocumentWhereInput).workspaceId,
                ),
              },
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    documents: documents.map(serializeDocument),
    companies,
    workspaces,
    canCreate: hasAccessPermission(access, "documents.create"),
    canUpdate: hasAccessPermission(access, "documents.update"),
    canArchive: hasAccessPermission(access, "documents.archive"),
  };
}

export async function getDocumentFormOptions() {
  await requirePermission("documents.create");
  const access = await getCurrentUserAccess();
  const where = await documentDataScopeWhere();

  const companyIds = idsFromDocumentScopeFilter(
    (where as Prisma.DocumentWhereInput).companyId,
  );
  const workspaceIds = idsFromDocumentScopeFilter(
    (where as Prisma.DocumentWhereInput).workspaceId,
  );
  const companyWhere =
    !isSuperAdmin(access) && companyIds ? { id: { in: companyIds } } : {};
  const workspaceWhere =
    !isSuperAdmin(access) && workspaceIds ? { id: { in: workspaceIds } } : {};

  const [companies, workspaces] = await Promise.all([
    prisma.company.findMany({
      where: { active: true, ...companyWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.workspace.findMany({
      where: { active: true, ...workspaceWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    categories: Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => ({
      value: value as DocumentCategory,
      label,
    })),
    companies,
    workspaces,
  };
}

export async function createDocument(formData: FormData) {
  await requirePermission("documents.create");
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");
  const input = parseDocumentForm(formData);
  assertStoredFileReference(input.fileUrl, "Documento");
  await assertDocumentContext(input.companyId, input.workspaceId);

  const document = await prisma.document.create({
    data: {
      ...input,
      status: calculateDocumentStatus(input.expiryDate),
      createdById: access.userId,
    },
  });

  await createAuditLog({
    entityType: AuditEntityType.DOCUMENT,
    entityId: document.id,
    entityLabel: document.title,
    action: AuditAction.DOCUMENT_CREATED,
    description: `Documento ${document.title} criado`,
    newValue: {
      title: document.title,
      category: document.category,
      status: document.status,
      fileName: document.fileName,
      fileSize: document.fileSize,
      issueDate: document.issueDate?.toISOString() ?? null,
      expiryDate: document.expiryDate?.toISOString() ?? null,
    },
    companyId: document.companyId,
    workspaceId: document.workspaceId,
  });

  revalidatePath("/documentos");
  return { id: document.id };
}

export async function getDocumentDetail(id: string) {
  await requireAnyPermission(DOCUMENT_VIEW_PERMISSIONS);
  const where = await documentDataScopeWhere();

  const document = await prisma.document.findFirst({
    where: { id, ...where },
    include: {
      company: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!document) return null;

  const calculatedStatus = calculateDocumentStatus(
    document.expiryDate,
    document.status,
  );
  if (calculatedStatus !== document.status) {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: calculatedStatus },
    });
    document.status = calculatedStatus;
  }

  await createAuditLog({
    entityType: AuditEntityType.DOCUMENT,
    entityId: document.id,
    entityLabel: document.title,
    action: AuditAction.DOCUMENT_VIEWED,
    description: `Documento ${document.title} visualizado`,
    companyId: document.companyId,
    workspaceId: document.workspaceId,
  });

  const access = await getCurrentUserAccess();
  return {
    document: serializeDocument(document),
    canUpdate: hasAccessPermission(access, "documents.update"),
    canArchive: hasAccessPermission(access, "documents.archive"),
  };
}

export async function archiveDocument(id: string) {
  await requirePermission("documents.archive");
  const where = await documentDataScopeWhere();
  const current = await prisma.document.findFirst({ where: { id, ...where } });
  if (!current) throw new Error("Documento nao encontrado.");
  if (current.status === DocumentStatus.ARCHIVED) return;

  const document = await prisma.document.update({
    where: { id },
    data: { status: DocumentStatus.ARCHIVED },
  });

  await createAuditLog({
    entityType: AuditEntityType.DOCUMENT,
    entityId: document.id,
    entityLabel: document.title,
    action: AuditAction.DOCUMENT_ARCHIVED,
    description: `Documento ${document.title} arquivado`,
    oldValue: { status: current.status },
    newValue: { status: document.status },
    companyId: document.companyId,
    workspaceId: document.workspaceId,
  });

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${id}`);
}

export async function assertCanReadDocumentFile(id: string) {
  const access = await getCurrentUserAccess();
  if (!hasAnyAccessPermission(access, DOCUMENT_VIEW_PERMISSIONS)) {
    return null;
  }
  const where = await documentDataScopeWhere();
  return prisma.document.findFirst({
    where: { id, ...where },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      fileName: true,
      mimeType: true,
      companyId: true,
      workspaceId: true,
    },
  });
}

export async function logDocumentFileAccess(
  document: {
    id: string;
    title: string;
    fileName: string;
    companyId: string | null;
    workspaceId: string | null;
  },
  action: "view" | "download",
) {
  await createAuditLog({
    entityType: AuditEntityType.DOCUMENT,
    entityId: document.id,
    entityLabel: document.title,
    action:
      action === "download"
        ? AuditAction.DOCUMENT_DOWNLOADED
        : AuditAction.DOCUMENT_VIEWED,
    description:
      action === "download"
        ? `Documento ${document.title} baixado`
        : `Arquivo tecnico do documento ${document.title} visualizado`,
    newValue: { fileName: document.fileName },
    companyId: document.companyId,
    workspaceId: document.workspaceId,
  });
}

// ── Listar documentos de um andaime ──────────────────────────────────────────
export async function getScaffoldDocuments(scaffold_id: string) {
  await requireAnyPermission([
    "documents.view",
    "documents.create",
    "read.all",
    "read.own_company",
  ]);
  const scope = await getDataScope();

  const documents = await prisma.scaffoldDocument.findMany({
    where: { scaffold_id, ...dataScopeWhere(scope) },
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
  const scope = await getDataScope();
  assertStoredFileReference(data.file_url, "Documento");

  const scaffold = await prisma.scaffold.findUnique({
    where: { id: data.scaffold_id },
  });
  if (!scaffold) throw new Error("Andaime nao encontrado.");
  assertRecordInDataScope(scope, scaffold);

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
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
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
      companyId: true,
      workspaceId: true,
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
    companyId: oldDocument?.companyId,
    workspaceId: oldDocument?.workspaceId,
  });
  revalidatePath(`/andaimes/${scaffold_id}`);
}
