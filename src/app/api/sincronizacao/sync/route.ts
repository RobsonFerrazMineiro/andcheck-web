import { getCurrentUserAccess } from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { addScaffoldDocument } from "@/lib/actions/document-actions";
import { createInspection } from "@/lib/actions/inspection-actions";
import {
  addNonConformityComment,
  addNonConformityItemEvidence,
  updateNonConformityDueDate,
  updateNonConformityResponsible,
  updateNonConformityStatus,
} from "@/lib/actions/non-conformity-actions";
import {
  completeAssembly,
  createScaffold,
  dismantleScaffold,
  updateScaffold,
} from "@/lib/actions/scaffold-actions";
import {
  storeUploadedFile,
  type UploadCategory,
} from "@/lib/file-storage";
import {
  dataUrlToFile,
  isOfflineFileReference,
} from "@/lib/offline/offline-file-server";
import { prisma } from "@/lib/prisma";
import {
  isSyncQueueStatus,
  type OfflineAddNonConformityCommentPayload,
  type OfflineAddNonConformityItemEvidencePayload,
  type OfflineAddScaffoldDocumentPayload,
  type OfflineCompleteScaffoldAssemblyPayload,
  type OfflineCreateScaffoldPayload,
  type OfflineCreateInspectionPayload,
  type OfflineDismantleScaffoldPayload,
  type OfflineUpdateScaffoldPayload,
  type OfflineUpdateNonConformityDueDatePayload,
  type OfflineUpdateNonConformityResponsiblePayload,
  type OfflineUpdateNonConformityStatusPayload,
  type SyncQueueItem,
} from "@/lib/offline/types";
import { validateUploadedFile } from "@/lib/upload-security";
import type { Prisma } from "@prisma/client";

type SyncResultStatus = "synced" | "failed" | "conflict";
type SyncAccess = NonNullable<Awaited<ReturnType<typeof getCurrentUserAccess>>>;

function isSyncQueueItemPayload(value: unknown): value is SyncQueueItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<SyncQueueItem>;
  return (
    typeof item.id === "string" &&
    typeof item.action === "string" &&
    typeof item.entityType === "string" &&
    typeof item.entityId === "string" &&
    isSyncQueueStatus(item.status) &&
    typeof item.attempts === "number" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

function isOfflineCreateInspectionPayload(
  value: unknown,
): value is OfflineCreateInspectionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineCreateInspectionPayload>;
  return (
    typeof payload.scaffold_id === "string" &&
    typeof payload.scaffold_code === "string" &&
    typeof payload.inspector_name === "string" &&
    typeof payload.result === "string" &&
    typeof payload.validity_days === "number" &&
    Array.isArray(payload.checklist)
  );
}

function isOfflineCreateScaffoldPayload(
  value: unknown,
): value is OfflineCreateScaffoldPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineCreateScaffoldPayload>;
  return (
    typeof payload.type === "string" &&
    typeof payload.location === "string" &&
    typeof payload.area === "string" &&
    typeof payload.height === "number" &&
    typeof payload.responsible === "string"
  );
}

function isOfflineUpdateScaffoldPayload(
  value: unknown,
): value is OfflineUpdateScaffoldPayload {
  return (
    isOfflineCreateScaffoldPayload(value) &&
    typeof (value as Partial<OfflineUpdateScaffoldPayload>).id === "string"
  );
}

function isOfflineCompleteScaffoldAssemblyPayload(
  value: unknown,
): value is OfflineCompleteScaffoldAssemblyPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineCompleteScaffoldAssemblyPayload>;
  return typeof payload.id === "string";
}

function isOfflineDismantleScaffoldPayload(
  value: unknown,
): value is OfflineDismantleScaffoldPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineDismantleScaffoldPayload>;
  return typeof payload.id === "string" && typeof payload.reason === "string";
}

function isOfflineAddNonConformityItemEvidencePayload(
  value: unknown,
): value is OfflineAddNonConformityItemEvidencePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineAddNonConformityItemEvidencePayload>;
  return (
    typeof payload.id === "string" &&
    typeof payload.nonConformityItemId === "string" &&
    typeof payload.fileUrl === "string" &&
    typeof payload.fileName === "string" &&
    typeof payload.evidenceType === "string"
  );
}

function isOfflineAddNonConformityCommentPayload(
  value: unknown,
): value is OfflineAddNonConformityCommentPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineAddNonConformityCommentPayload>;
  return typeof payload.id === "string" && typeof payload.comment === "string";
}

function isOfflineUpdateNonConformityStatusPayload(
  value: unknown,
): value is OfflineUpdateNonConformityStatusPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineUpdateNonConformityStatusPayload>;
  return typeof payload.id === "string" && typeof payload.status === "string";
}

function isOfflineUpdateNonConformityResponsiblePayload(
  value: unknown,
): value is OfflineUpdateNonConformityResponsiblePayload {
  if (!value || typeof value !== "object") return false;
  const payload =
    value as Partial<OfflineUpdateNonConformityResponsiblePayload>;
  return (
    typeof payload.id === "string" &&
    typeof payload.responsibleUserId === "string"
  );
}

function isOfflineUpdateNonConformityDueDatePayload(
  value: unknown,
): value is OfflineUpdateNonConformityDueDatePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineUpdateNonConformityDueDatePayload>;
  return (
    typeof payload.id === "string" &&
    typeof payload.dueDate === "string" &&
    typeof payload.reason === "string"
  );
}

function isOfflineAddScaffoldDocumentPayload(
  value: unknown,
): value is OfflineAddScaffoldDocumentPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<OfflineAddScaffoldDocumentPayload>;
  return (
    typeof payload.scaffold_id === "string" &&
    typeof payload.type === "string" &&
    typeof payload.title === "string" &&
    typeof payload.file_url === "string" &&
    typeof payload.file_name === "string" &&
    typeof payload.uploaded_by === "string"
  );
}

async function storeOfflineDataUrl(
  value: string | undefined,
  category: UploadCategory,
  fileName: string,
) {
  if (!value || !isOfflineFileReference(value)) return value;

  const file = dataUrlToFile(value, fileName);
  const validation = await validateUploadedFile(file, category);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const stored = await storeUploadedFile(file, category);
  return stored.reference;
}

async function resolveInspectionOfflineFiles(
  payload: OfflineCreateInspectionPayload,
) {
  return {
    ...payload,
    photos: payload.photos,
    signature: payload.signature,
    signatures: payload.signatures
      ? payload.signatures.map((signature) => ({
          ...signature,
          signature_data: signature.signature_data,
        }))
      : undefined,
    checklist: payload.checklist.map((item) => ({
      ...item,
      photo: item.photo,
    })),
  };
}

async function syncNonConformityItemEvidence(
  payload: OfflineAddNonConformityItemEvidencePayload,
) {
  const fileUrl = await storeOfflineDataUrl(
    payload.fileUrl,
    "non-conformity-evidence",
    payload.fileName,
  );

  const formData = new FormData();
  formData.set("id", payload.id);
  formData.set("nonConformityItemId", payload.nonConformityItemId);
  formData.set("fileUrl", fileUrl ?? payload.fileUrl);
  formData.set("fileName", payload.fileName);
  formData.set("evidenceType", payload.evidenceType);

  if (typeof payload.fileSize === "number") {
    formData.set("fileSize", String(payload.fileSize));
  }
  if (payload.mimeType) {
    formData.set("mimeType", payload.mimeType);
  }
  if (payload.observation) {
    formData.set("observation", payload.observation);
  }

  await addNonConformityItemEvidence(formData);
}

async function syncNonConformityComment(
  payload: OfflineAddNonConformityCommentPayload,
) {
  const formData = new FormData();
  formData.set("id", payload.id);
  formData.set("comment", payload.comment);

  await addNonConformityComment(formData);
}

async function syncNonConformityStatus(
  payload: OfflineUpdateNonConformityStatusPayload,
) {
  const formData = new FormData();
  formData.set("id", payload.id);
  formData.set("status", payload.status);
  if (payload.comment) {
    formData.set("comment", payload.comment);
  }

  return updateNonConformityStatus(formData);
}

async function syncNonConformityResponsible(
  payload: OfflineUpdateNonConformityResponsiblePayload,
) {
  const formData = new FormData();
  formData.set("id", payload.id);
  formData.set("responsibleUserId", payload.responsibleUserId);

  return updateNonConformityResponsible(formData);
}

async function syncNonConformityDueDate(
  payload: OfflineUpdateNonConformityDueDatePayload,
) {
  const formData = new FormData();
  formData.set("id", payload.id);
  formData.set("dueDate", payload.dueDate);
  formData.set("reason", payload.reason);

  return updateNonConformityDueDate(formData);
}

class OfflineSyncConflictError extends Error {
  details: Prisma.InputJsonObject;

  constructor(message: string, details: Prisma.InputJsonObject = {}) {
    super(message);
    this.name = "OfflineSyncConflictError";
    this.details = details;
  }
}

async function assertNoNonConformityStatusConflict(item: SyncQueueItem) {
  if (!isOfflineUpdateNonConformityStatusPayload(item.payload)) return;

  const nc = await prisma.nonConformity.findUnique({
    where: { id: item.payload.id },
    select: { code: true, status: true, updatedAt: true },
  });

  if (!nc) return;

  const localCreatedAt = new Date(item.createdAt);
  if (Number.isNaN(localCreatedAt.getTime())) return;

  if (nc.updatedAt.getTime() > localCreatedAt.getTime()) {
    throw new OfflineSyncConflictError(
      `NC ${nc.code} foi alterada no servidor antes da sincronizacao.`,
      {
        serverStatus: nc.status,
        serverUpdatedAt: nc.updatedAt.toISOString(),
      },
    );
  }
}

async function assertNoScaffoldUpdateConflict(item: SyncQueueItem) {
  if (!isOfflineUpdateScaffoldPayload(item.payload)) return;

  const scaffold = await prisma.scaffold.findUnique({
    where: { id: item.payload.id },
    select: { code: true, updated_at: true },
  });

  if (!scaffold) return;

  const localCreatedAt = new Date(item.createdAt);
  if (Number.isNaN(localCreatedAt.getTime())) return;

  if (scaffold.updated_at.getTime() > localCreatedAt.getTime()) {
    throw new OfflineSyncConflictError(
      `Andaime ${scaffold.code} foi alterado no servidor antes da sincronizacao.`,
      {
        serverUpdatedAt: scaffold.updated_at.toISOString(),
      },
    );
  }
}

async function syncScaffoldDocument(payload: OfflineAddScaffoldDocumentPayload) {
  const fileUrl = await storeOfflineDataUrl(
    payload.file_url,
    "scaffold-documents",
    payload.file_name,
  );

  return addScaffoldDocument({
    scaffold_id: payload.scaffold_id,
    type: payload.type as Parameters<typeof addScaffoldDocument>[0]["type"],
    title: payload.title,
    file_url: fileUrl ?? payload.file_url,
    file_name: payload.file_name,
    file_size: payload.file_size,
    mime_type: payload.mime_type,
    uploaded_by: payload.uploaded_by,
    expires_at: payload.expires_at ? new Date(payload.expires_at) : undefined,
    observation: payload.observation,
  });
}

async function logOfflineSyncEvent({
  item,
  status,
  access,
  serverId,
  error,
  details,
}: {
  item: SyncQueueItem;
  status: SyncResultStatus;
  access: SyncAccess;
  serverId?: string;
  error?: string;
  details?: Prisma.InputJsonObject;
}) {
  await createAuditLog({
    entityType: AuditEntityType.SETTINGS,
    entityId: item.id,
    entityLabel: item.action,
    action: AuditAction.UPDATE,
    description: `Sincronizacao offline ${status}: ${item.action}`,
    newValue: {
      queueId: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      status,
      serverId: serverId ?? null,
      error: error ?? null,
      details: details ?? null,
      localCreatedAt: item.createdAt,
      localUpdatedAt: item.updatedAt,
      syncedAt: new Date().toISOString(),
      attempts: item.attempts,
      deviceInfo: item.deviceInfo ?? null,
    },
    companyId: access.companyId,
    workspaceId: access.workspaceId,
  });
}

async function syncedResponse(
  item: SyncQueueItem,
  access: SyncAccess,
  serverId?: string,
) {
  await logOfflineSyncEvent({ item, status: "synced", access, serverId });
  return Response.json({ id: item.id, status: "synced", serverId });
}

async function conflictResponse(
  item: SyncQueueItem,
  access: SyncAccess,
  error: string,
  details?: Prisma.InputJsonObject,
) {
  await logOfflineSyncEvent({
    item,
    status: "conflict",
    access,
    error,
    details,
  });
  return Response.json(
    { id: item.id, status: "conflict", error },
    { status: 409 },
  );
}

async function failedResponse(
  item: SyncQueueItem,
  access: SyncAccess,
  error: string,
  status = 422,
  details?: Prisma.InputJsonObject,
) {
  await logOfflineSyncEvent({
    item,
    status: "failed",
    access,
    error,
    details,
  });
  return Response.json({ id: item.id, status: "failed", error }, { status });
}

export async function POST(request: Request) {
  const access = await getCurrentUserAccess();
  if (!access) {
    return Response.json(
      { error: "Usuario nao autenticado." },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as unknown;

  if (!isSyncQueueItemPayload(payload)) {
    return Response.json(
      { error: "Item de sincronizacao invalido." },
      { status: 400 },
    );
  }

  if (payload.action === "inspection.create") {
    if (!isOfflineCreateInspectionPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de inspeção offline invalido.",
      );
    }

    try {
      const inspectionPayload = await resolveInspectionOfflineFiles(
        payload.payload,
      );
      const created = await createInspection(inspectionPayload);
      return syncedResponse(payload, access, created.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar a inspeção.",
      );
    }
  }

  if (payload.action === "scaffold.create") {
    if (!isOfflineCreateScaffoldPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de andaime offline invalido.",
      );
    }

    try {
      const created = await createScaffold(payload.payload);
      return syncedResponse(payload, access, created.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar o andaime.",
      );
    }
  }

  if (payload.action === "scaffold.update") {
    if (!isOfflineUpdateScaffoldPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de edicao de andaime offline invalido.",
      );
    }

    try {
      await assertNoScaffoldUpdateConflict(payload);
      const updated = await updateScaffold(payload.payload.id, payload.payload);
      return syncedResponse(payload, access, updated.id);
    } catch (error) {
      if (error instanceof OfflineSyncConflictError) {
        return conflictResponse(payload, access, error.message, error.details);
      }

      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar a edicao do andaime.",
      );
    }
  }

  if (payload.action === "scaffold.assembly.complete") {
    if (!isOfflineCompleteScaffoldAssemblyPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de conclusao de montagem offline invalido.",
      );
    }

    try {
      const scaffold = await completeAssembly(payload.payload.id);
      return syncedResponse(payload, access, scaffold.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar a conclusao de montagem.",
      );
    }
  }

  if (payload.action === "scaffold.dismantle") {
    if (!isOfflineDismantleScaffoldPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de desmontagem offline invalido.",
      );
    }

    try {
      const scaffold = await dismantleScaffold(payload.payload.id, {
        reason: payload.payload.reason,
        reasonDescription: payload.payload.reasonDescription,
      });
      return syncedResponse(payload, access, scaffold.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar a desmontagem.",
      );
    }
  }

  if (payload.action === "nonConformity.itemEvidence.add") {
    if (!isOfflineAddNonConformityItemEvidencePayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de evidencia de NC offline invalido.",
      );
    }

    try {
      await syncNonConformityItemEvidence(payload.payload);
      return syncedResponse(
        payload,
        access,
        payload.payload.nonConformityItemId,
      );
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar a evidencia da NC.",
      );
    }
  }

  if (payload.action === "nonConformity.comment.add") {
    if (!isOfflineAddNonConformityCommentPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de comentario de NC offline invalido.",
      );
    }

    try {
      await syncNonConformityComment(payload.payload);
      return syncedResponse(payload, access, payload.payload.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar o comentario da NC.",
      );
    }
  }

  if (payload.action === "nonConformity.status.update") {
    if (!isOfflineUpdateNonConformityStatusPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de status de NC offline invalido.",
      );
    }

    try {
      await assertNoNonConformityStatusConflict(payload);
      await syncNonConformityStatus(payload.payload);
      return syncedResponse(payload, access, payload.payload.id);
    } catch (error) {
      if (error instanceof OfflineSyncConflictError) {
        return conflictResponse(payload, access, error.message, error.details);
      }

      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar o status da NC.",
      );
    }
  }

  if (payload.action === "nonConformity.responsible.update") {
    if (!isOfflineUpdateNonConformityResponsiblePayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de responsavel de NC offline invalido.",
      );
    }

    try {
      await syncNonConformityResponsible(payload.payload);
      return syncedResponse(payload, access, payload.payload.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar o responsavel da NC.",
      );
    }
  }

  if (payload.action === "nonConformity.dueDate.update") {
    if (!isOfflineUpdateNonConformityDueDatePayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de prazo de NC offline invalido.",
      );
    }

    try {
      await syncNonConformityDueDate(payload.payload);
      return syncedResponse(payload, access, payload.payload.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar o prazo da NC.",
      );
    }
  }

  if (payload.action === "scaffold.document.add") {
    if (!isOfflineAddScaffoldDocumentPayload(payload.payload)) {
      return failedResponse(
        payload,
        access,
        "Payload de documento de andaime offline invalido.",
      );
    }

    try {
      const created = await syncScaffoldDocument(payload.payload);
      return syncedResponse(payload, access, created.id);
    } catch (error) {
      return failedResponse(
        payload,
        access,
        error instanceof Error
          ? error.message
          : "Nao foi possivel sincronizar o documento do andaime.",
      );
    }
  }

  return failedResponse(
    payload,
    access,
    "Processador servidor ainda nao conectado para esta acao offline.",
    202,
  );
}
