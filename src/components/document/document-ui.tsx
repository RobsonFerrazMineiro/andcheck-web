import {
  Archive,
  CheckCircle2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { typography } from "@/lib/design-system";
import {
  documentStatusTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";

export type CorporateDocumentStatus = "ACTIVE" | "EXPIRED" | "ARCHIVED";

const STATUS_LABELS: Record<CorporateDocumentStatus, string> = {
  ACTIVE: "Ativo",
  EXPIRED: "Vencido",
  ARCHIVED: "Arquivado",
};

const STATUS_STYLES: Record<CorporateDocumentStatus, string> = {
  ACTIVE: `rounded-md ${SEMANTIC_TONE_CLASSES[documentStatusTone("ACTIVE")].badge}`,
  EXPIRED: `rounded-md ${SEMANTIC_TONE_CLASSES[documentStatusTone("EXPIRED")].badge}`,
  ARCHIVED: `rounded-md ${SEMANTIC_TONE_CLASSES[documentStatusTone("ARCHIVED")].badge}`,
};

const STATUS_ICONS = {
  ACTIVE: CheckCircle2,
  EXPIRED: TriangleAlert,
  ARCHIVED: Archive,
} as const;

export function DocumentStatusBadge({
  status,
}: {
  status: CorporateDocumentStatus;
}) {
  const Icon = STATUS_ICONS[status];

  return (
    <Badge
      variant="outline"
      className={`${typography.badge} ${STATUS_STYLES[status]}`}
    >
      <Icon data-icon="inline-start" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function getDocumentExtensionLabel(fileName: string) {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1];
  return extension ? extension.toUpperCase() : "ARQ";
}

export function DocumentFileIcon({
  fileName,
  mimeType,
  className = "size-5 text-muted-foreground",
}: {
  fileName: string;
  mimeType?: string | null;
  className?: string;
}) {
  const extension = getDocumentExtensionLabel(fileName);
  const type = (mimeType ?? "").toLowerCase();

  if (extension === "XLSX") return <FileSpreadsheet className={className} />;
  if (["PNG", "JPG", "JPEG", "WEBP"].includes(extension) || type.startsWith("image/")) {
    return <FileImage className={className} />;
  }
  if (["DOC", "DOCX"].includes(extension)) return <FileType className={className} />;

  return <FileText className={className} />;
}

export function formatDocumentFileSize(bytes: number | null | undefined) {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
