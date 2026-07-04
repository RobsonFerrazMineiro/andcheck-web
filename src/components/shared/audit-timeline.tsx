import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  History,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { typography } from "@/lib/design-system";
import {
  type SemanticTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";

type AuditTimelineItem = {
  id: string;
  action: string;
  description: string;
  userName: string | null;
  userRole: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
  companyName: string;
  workspaceName: string;
  createdAt: Date;
};

type AuditTimelineProps = {
  title?: string;
  items: AuditTimelineItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function changedFields(oldValue: unknown, newValue: unknown) {
  if (!isRecord(oldValue) || !isRecord(newValue)) return [];

  return Array.from(
    new Set([...Object.keys(oldValue), ...Object.keys(newValue)]),
  )
    .filter((key) => key !== "id")
    .filter((key) => JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key]))
    .slice(0, 4)
    .map((key) => key.replaceAll("_", " "));
}

function actionMeta(action: string): {
  icon: LucideIcon;
  label: string;
  tone: SemanticTone;
} {
  if (action === "CREATE" || action.endsWith("_CREATED")) {
    return { icon: PlusCircle, label: "Criação", tone: "success" };
  }
  if (action === "UPDATE" || action.endsWith("_UPDATED")) {
    return { icon: Edit3, label: "Atualização", tone: "warning" };
  }
  if (action === "STATUS_CHANGE") {
    return { icon: AlertTriangle, label: "Mudança de status", tone: "warning" };
  }
  if (action === "COMPLETE") {
    return { icon: CheckCircle2, label: "Conclusão", tone: "success" };
  }
  if (action === "DELETE") {
    return { icon: Trash2, label: "Remoção", tone: "critical" };
  }
  if (action === "UPLOAD") {
    return { icon: Upload, label: "Upload", tone: "neutral" };
  }
  if (action.includes("DOCUMENT")) {
    return { icon: FileText, label: action.replaceAll("_", " "), tone: "neutral" };
  }

  return { icon: ShieldCheck, label: action.replaceAll("_", " "), tone: "disabled" };
}

export function AuditTimeline({
  title = "Timeline de Auditoria",
  items,
}: AuditTimelineProps) {
  return (
    <section className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted-foreground/60" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            {title}
          </p>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground">
          {items.length} evento(s)
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhum evento de auditoria"
          description="Os eventos relevantes desta entidade aparecerão aqui."
          className="border-0 border-b border-dashed py-8"
        />
      ) : (
        <ol className="divide-y divide-border">
          {items.map((item) => {
            const meta = actionMeta(item.action);
            const Icon = meta.icon;
            const fields = changedFields(item.oldValue, item.newValue);

            return (
              <li key={item.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[82px_1fr]">
                <div className="flex items-start gap-2 font-mono text-[10px] font-bold text-muted-foreground">
                  <Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/50" />
                  <span>{format(item.createdAt, "HH:mm")}</span>
                </div>
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`rounded-md px-2 py-0.5 ${typography.badge} ${SEMANTIC_TONE_CLASSES[meta.tone].badge}`}
                    >
                      <Icon className="mr-1 h-3 w-3" />
                      {meta.label}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {format(item.createdAt, "dd/MM/yyyy")}
                    </span>
                  </div>
                  <p className="text-[12px] font-semibold leading-relaxed text-foreground">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {item.userName ?? "Sistema"}
                    {item.userRole ? ` - ${item.userRole}` : ""} ·{" "}
                    {item.companyName} / {item.workspaceName}
                  </p>
                  {fields.length > 0 && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Campos alterados: {fields.join(", ")}
                    </p>
                  )}
                  {(item.ipAddress || item.browserName || item.osName || item.deviceType) && (
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {[item.ipAddress, item.deviceType, item.osName, item.browserName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
