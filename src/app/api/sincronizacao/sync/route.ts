import { getCurrentUserAccess } from "@/lib/authz";
import { createInspection } from "@/lib/actions/inspection-actions";
import {
  storeUploadedFile,
  type UploadCategory,
} from "@/lib/file-storage";
import {
  dataUrlToFile,
  isOfflineFileReference,
} from "@/lib/offline/offline-file-server";
import {
  isSyncQueueStatus,
  type OfflineCreateInspectionPayload,
  type SyncQueueItem,
} from "@/lib/offline/types";
import { validateUploadedFile } from "@/lib/upload-security";

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
    photos: payload.photos
      ? (
          await Promise.all(
            payload.photos.map((photo, index) =>
              storeOfflineDataUrl(
                photo,
                "inspection-photos",
                `inspection-photo-${index + 1}.jpg`,
              ),
            ),
          )
        ).filter((photo): photo is string => Boolean(photo))
      : undefined,
    signature: await storeOfflineDataUrl(
      payload.signature,
      "inspection-signatures",
      "inspection-signature.png",
    ),
    signatures: payload.signatures
      ? await Promise.all(
          payload.signatures.map(async (signature, index) => ({
            ...signature,
            signature_data: await storeOfflineDataUrl(
              signature.signature_data,
              "inspection-signatures",
              `inspection-signature-${index + 1}.png`,
            ),
          })),
        )
      : undefined,
    checklist: await Promise.all(
      payload.checklist.map(async (item, index) => ({
        ...item,
        photo: await storeOfflineDataUrl(
          item.photo,
          "checklist-photos",
          `checklist-photo-${index + 1}.jpg`,
        ),
      })),
    ),
  };
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
      return Response.json(
        {
          id: payload.id,
          status: "failed",
          error: "Payload de inspeção offline invalido.",
        },
        { status: 422 },
      );
    }

    try {
      const inspectionPayload = await resolveInspectionOfflineFiles(
        payload.payload,
      );
      const created = await createInspection(inspectionPayload);
      return Response.json({
        id: payload.id,
        status: "synced",
        serverId: created.id,
      });
    } catch (error) {
      return Response.json(
        {
          id: payload.id,
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Nao foi possivel sincronizar a inspeção.",
        },
        { status: 422 },
      );
    }
  }

  return Response.json(
    {
      id: payload.id,
      status: "failed",
      error:
        "Processador servidor ainda nao conectado para esta acao offline.",
    },
    { status: 202 },
  );
}
