export const SYNC_QUEUE_STATUSES = [
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
] as const;

export type SyncQueueStatus = (typeof SYNC_QUEUE_STATUSES)[number];

export type ConnectivityStatus =
  | "online"
  | "offline"
  | "syncing"
  | "sync-error";

export type SyncQueueEntityType =
  | "scaffold"
  | "inspection"
  | "nonConformity"
  | "document"
  | "notification"
  | "profile"
  | "unknown";

export type SyncQueueItem = {
  id: string;
  action: string;
  entityType: SyncQueueEntityType | string;
  entityId: string;
  payload: unknown;
  status: SyncQueueStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
};

export type OfflineInspectionChecklistItem = {
  item_id: string;
  item_label: string;
  category: string;
  value: "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA";
  critical: boolean;
  observation?: string;
  photo?: string;
};

export type OfflineInspectionSignature = {
  role_code: string;
  signer_name: string;
  signer_company?: string;
  signer_position?: string;
  signature_data?: string;
};

export type OfflineCreateInspectionPayload = {
  scaffold_id: string;
  scaffold_code: string;
  inspector_name: string;
  result: "aprovado" | "aprovado_com_ressalvas" | "reprovado";
  validity_days: number;
  notes?: string;
  photos?: string[];
  signature?: string;
  signatures?: OfflineInspectionSignature[];
  checklist: OfflineInspectionChecklistItem[];
};

export type OfflineCreateScaffoldPayload = {
  type: "tubular" | "fachadeiro" | "multidirecional" | "suspenso" | "torre";
  location: string;
  area: string;
  height: number;
  width?: number;
  length?: number;
  max_load?: number;
  responsible: string;
  company?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  location_description?: string;
};

export type OfflineAddNonConformityItemEvidencePayload = {
  id: string;
  nonConformityItemId: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  evidenceType: "PHOTO" | "PDF" | "DOCUMENT" | "OTHER";
  observation?: string;
};

export type NewSyncQueueItem = Omit<
  SyncQueueItem,
  "id" | "status" | "attempts" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: SyncQueueStatus;
};

export type SyncSummary = Record<SyncQueueStatus, number> & {
  total: number;
};

export const EMPTY_SYNC_SUMMARY: SyncSummary = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflict: 0,
  total: 0,
};

export type OfflineMetadata = {
  id: string;
  value: unknown;
  updatedAt: string;
};

export function createOfflineId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `offline_${prefix}_${Date.now()}_${randomId}`;
}

export function getSyncSummaryFromItems(items: SyncQueueItem[]): SyncSummary {
  const summary: SyncSummary = { ...EMPTY_SYNC_SUMMARY };

  for (const item of items) {
    summary[item.status] += 1;
    summary.total += 1;
  }

  return summary;
}

export function isSyncQueueStatus(value: unknown): value is SyncQueueStatus {
  return (
    typeof value === "string" &&
    SYNC_QUEUE_STATUSES.includes(value as SyncQueueStatus)
  );
}
