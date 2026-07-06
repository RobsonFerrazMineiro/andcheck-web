import { getCurrentUserAccess } from "@/lib/authz";
import { isSyncQueueStatus, type SyncQueueItem } from "@/lib/offline/types";

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
