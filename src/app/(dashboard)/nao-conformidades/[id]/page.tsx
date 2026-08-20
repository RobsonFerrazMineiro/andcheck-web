import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardCheck,
  Clock,
  Construction,
  FileText,
  Paperclip,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import type {
  AuditTimelineItem,
  HistoryEvent,
  HistoryEventDetail,
  HistoryEventType,
} from "@/components/shared/audit-timeline";
import { EmptyState } from "@/components/shared/empty-state";
import { NonConformityBadge } from "@/components/shared/non-conformity-badge";
import { Button } from "@/components/ui/button";
import {
  getNonConformityById,
  getNonConformityResponsibleOptions,
} from "@/lib/actions/non-conformity-actions";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { roleHasPermission } from "@/lib/rbac";
import {
  NonConformityItemEvidenceButton,
  NonConformityOperations,
} from "./non-conformity-operations";
import { NonConformityHistoryButton } from "./non-conformity-history-button";
import { LazyNonConformityEvidencePreview } from "./lazy-non-conformity-panels";
import { AuditEntityType, getEntityAuditTimeline } from "@/lib/audit";
import { sanitizeForLog } from "@/lib/safe-log";
import { surface, typography } from "@/lib/design-system";
import {
  humanizeCode,
  humanizeChecklistCategory,
  humanizeChecklistValue,
} from "@/lib/human-readable";
import { canRequestNonConformityVerification } from "@/lib/non-conformity-evidence-policy";

type Props = {
  params: Promise<{ id: string }>;
};

type NonConformityDetail = {
  id: string;
  code: string;
  title: string;
  description: string;
  classification: string;
  status: string;
  responsibleUserId: string | null;
  dueDate: Date | null;
  tenantCompany: { name: string | null };
  scaffold: {
    id: string;
    code: string;
    area: string;
    location: string;
    company: string | null;
    responsible: string;
    status: string;
  };
  originInspection: {
    id: string;
    date: Date;
    result: string;
    inspector_name: string;
    scaffold_code: string;
  };
  responsibleUser: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    department: string | null;
    position: string | null;
  } | null;
  checklistItems: Array<{
    id: string;
    checklistEntry: {
      id: string;
      item_label: string;
      category: string;
      value: string;
      critical: boolean;
      observation: string | null;
    };
    evidences: Array<{
      id: string;
      type: string;
      title: string;
      fileName: string;
      fileSize: number | null;
      mimeType: string | null;
      observation: string | null;
      createdAt: Date;
      fileUrl: string;
    }>;
  }>;
  evidences: Array<{
    id: string;
    type: string;
    title: string;
    fileName: string;
    fileSize: number | null;
    mimeType: string | null;
    observation: string | null;
    createdAt: Date;
    fileUrl: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    description: string;
    oldValue: unknown;
    newValue: unknown;
    createdAt: Date;
    user: { id: string; name: string; email: string } | null;
  }>;
};

const EVIDENCE_LABELS: Record<string, string> = {
  PHOTO: "Foto",
  PDF: "PDF",
  ART: "ART",
  MEMORIAL_CALCULO: "Memorial de cálculo",
  CROQUI: "Croqui",
  DOCUMENT: "Documento",
  OTHER: "Outro",
};

const RESPONSIBLE_ROLE_CODES = [
  "PLANEJAMENTO",
  "SUPERVISOR",
  "ENCARREGADO",
  "SUPERVISOR_ENCARREGADO",
];
const HSE_ROLE_CODES = ["HSE_HYDRO", "HSE_GERENCIADORA", "HSE_EMPRESA"];
const FINAL_STATUSES = ["CLOSED", "CANCELLED"];

function hasAnyRole(roleCodes: string[], allowed: string[]) {
  return roleCodes.some(
    (roleCode: string) =>
      roleCode === "SUPER_ADMIN" || allowed.includes(roleCode),
  );
}

function isCorrectionStatus(status: string) {
  return ["ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(status);
}

function valueRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatHistoryDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd/MM/yyyy HH:mm");
}

function stripHistoryInternalIds(value: string) {
  return value
    .replace(/\bcm[a-z0-9]{18,}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ncHistorySummary(entry: NonConformityDetail["history"][number]) {
  const description = entry.description.toLocaleLowerCase("pt-BR");
  const after = valueRecord(entry.newValue);
  const status = stringValue(after.status);

  if (entry.action === "CREATE") return "Criou a NC";
  if (entry.action === "UPLOAD") return "Anexou evidência";
  if (description.includes("coment")) return "Comentou na NC";
  if (description.includes("prazo")) return "Alterou prazo";
  if (description.includes("responsável")) return "Responsável definido";
  if (status === "PENDING_VERIFICATION") return "Solicitou verificação";
  if (status === "CLOSED") return "Verificação aprovada";
  if (status === "REJECTED") return "Verificação rejeitada";
  if (status === "ASSIGNED") return "Reabriu a NC";
  if (entry.action === "COMPLETE") return "Encerrada";
  if (entry.action === "UPDATE") return "Atualizou a NC";
  if (entry.action === "STATUS_CHANGE") return "Alterou status";
  return humanizeCode(entry.action) || "Atualizou a NC";
}

function ncHistoryEventType(
  entry: NonConformityDetail["history"][number],
): HistoryEventType {
  const description = entry.description.toLocaleLowerCase("pt-BR");
  const status = stringValue(valueRecord(entry.newValue).status);

  if (entry.action === "CREATE") return "create";
  if (entry.action === "UPLOAD") return "photo";
  if (description.includes("coment")) return "comment";
  if (description.includes("prazo")) return "deadline";
  if (description.includes("responsável")) return "responsible";
  if (status === "PENDING_VERIFICATION") return "status";
  if (status === "CLOSED") return "inspection";
  if (status === "REJECTED") return "failure";
  if (status === "ASSIGNED") return "status";
  if (entry.action === "COMPLETE") return "inspection";
  return "update";
}

function ncHistoryTone(entry: NonConformityDetail["history"][number]) {
  const description = entry.description.toLocaleLowerCase("pt-BR");
  const status = stringValue(valueRecord(entry.newValue).status);

  if (status === "REJECTED") return "critical" as const;
  if (status === "CLOSED") return "success" as const;
  if (entry.action === "CREATE") return "success" as const;
  if (entry.action === "UPLOAD") return "neutral" as const;
  if (description.includes("responsável")) return "neutral" as const;
  if (description.includes("prazo")) return "warning" as const;
  if (status === "PENDING_VERIFICATION") return "warning" as const;
  if (status === "ASSIGNED") return "warning" as const;
  return "neutral" as const;
}

function ncHistoryDetails(
  entry: NonConformityDetail["history"][number],
): HistoryEventDetail[] {
  const before = valueRecord(entry.oldValue);
  const after = valueRecord(entry.newValue);
  const details: HistoryEventDetail[] = [];
  const beforeStatus = stringValue(before.status);
  const afterStatus = stringValue(after.status);
  const comment = stringValue(after.comment);
  const reason = stringValue(after.reason);
  const fileName = stringValue(after.fileName);
  const title = stringValue(after.title);
  const dueBefore = stringValue(before.dueDate);
  const dueAfter = stringValue(after.dueDate);
  const responsibleBefore = stringValue(before.responsibleName);
  const responsibleAfter = stringValue(after.responsibleName);

  if (beforeStatus || afterStatus) {
    details.push({
      label: "Status",
      before: beforeStatus ? humanizeCode(beforeStatus) : null,
      after: afterStatus ? humanizeCode(afterStatus) : null,
    });
  }
  if (responsibleBefore || responsibleAfter) {
    details.push({
      label: "Responsável",
      before: responsibleBefore,
      after: responsibleAfter,
    });
  }
  if (dueBefore || dueAfter) {
    details.push({
      label: "Prazo",
      before: formatHistoryDate(dueBefore),
      after: formatHistoryDate(dueAfter),
    });
  }
  if (comment) details.push({ label: "Observação", value: comment });
  if (reason) details.push({ label: "Motivo", value: reason });
  if (fileName || title) {
    details.push({ label: "Evidência", value: title ?? fileName });
  }
  if (entry.description) {
    details.push({
      label: "Resumo",
      value: stripHistoryInternalIds(entry.description),
    });
  }

  return details.slice(0, 6);
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 ${surface.detailRow}`}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      <p className={`${typography.sectionLabel} w-36 shrink-0 text-muted-foreground`}>
        {label}
      </p>
      <div className={`min-w-0 flex-1 break-words text-right ${typography.bodyStrong} text-foreground`}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className={surface.panel}>
      <div className={`flex items-center gap-2 ${surface.panelHeaderMuted}`}>
        <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
        <p className={`${typography.panelTitle} text-foreground`}>
          {title}
        </p>
      </div>
      {children}
    </section>
  );
}

export default async function NonConformityDetailPage({ params }: Props) {
  const { id } = await params;
  const ncResult = await getNonConformityById(id);
  if (!ncResult) notFound();
  const nc = ncResult as NonConformityDetail;
  let auditTimeline: AuditTimelineItem[] = [];

  try {
    auditTimeline = await getEntityAuditTimeline({
      entityType: AuditEntityType.NON_CONFORMITY,
      entityId: nc.id,
    });
  } catch (error) {
    console.error(
      "Failed to load non conformity audit timeline:",
      sanitizeForLog(error),
    );
  }

  const auditTimelineForClient = auditTimeline.map((item) => ({
    ...item,
    createdAt:
      item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  }));

  const company = nc.tenantCompany?.name ?? nc.scaffold.company ?? "-";
  const responsible = nc.responsibleUser?.name ?? "-";
  const ncHistoryEvents: HistoryEvent[] = nc.history.map((entry) => ({
    id: `nc-history-${entry.id}`,
    type: ncHistoryEventType(entry),
    actorName: entry.user?.name ?? "Sistema",
    summary: ncHistorySummary(entry),
    createdAt:
      entry.createdAt instanceof Date
        ? entry.createdAt.toISOString()
        : entry.createdAt,
    tone: ncHistoryTone(entry),
    details: ncHistoryDetails(entry),
  }));
  const [canUpdate, access] = await Promise.all([
    canCurrentUser("non_conformities.update"),
    getCurrentUserAccess(),
  ]);
  const roleCodes = (access?.roleCodes ?? []) as string[];
  const canStartInspection = roleCodes.some(
    (roleCode: string) =>
      roleHasPermission(roleCode, "inspections.create") ||
      roleHasPermission(roleCode, "inspections.finalize"),
  );
  const isHse = hasAnyRole(roleCodes, HSE_ROLE_CODES);
  const isResponsibleProfile = hasAnyRole(roleCodes, RESPONSIBLE_ROLE_CODES);
  const isFinal = FINAL_STATUSES.includes(nc.status);
  const hasTreatmentEvidence = canRequestNonConformityVerification(nc);
  const canAssign =
    canUpdate &&
    !isFinal &&
    ["OPEN", "ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(nc.status);
  const canRequestVerification =
    isResponsibleProfile && isCorrectionStatus(nc.status) && hasTreatmentEvidence;
  const canReview = isHse && nc.status === "PENDING_VERIFICATION";
  const canChangeDueDate = isHse && !isFinal;
  const canAddEvidence = isResponsibleProfile && isCorrectionStatus(nc.status);
  const canDeleteEvidence = canAddEvidence;
  const canComment =
    !isFinal && (isResponsibleProfile || isHse);
  const canCancel =
    isHse && ["OPEN", "ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(nc.status);
  let responsibleOptions: Awaited<
    ReturnType<typeof getNonConformityResponsibleOptions>
  > = [];

  if (canAssign) {
    try {
      responsibleOptions = await getNonConformityResponsibleOptions();
    } catch (error) {
      console.error(
        "Failed to load non conformity responsible options:",
        sanitizeForLog(error),
      );
    }
  }

  return (
    <div className={`max-w-5xl pb-10 ${surface.pageStackContained}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon-sm">
            <Link
              href="/nao-conformidades"
              aria-label="Voltar para não conformidades"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
          </Button>
          <div className={`${typography.sectionLabel} text-muted-foreground`}>
            <Link href="/nao-conformidades" className="hover:text-foreground">
              Não Conformidades
            </Link>
            <span className="mx-1.5">/</span>
            <span className={`${typography.code} text-foreground`}>
              {nc.code}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <NonConformityHistoryButton
            auditTimeline={auditTimelineForClient}
            historyEvents={ncHistoryEvents}
          />
          <NonConformityOperations
            id={nc.id}
            responsibleUserId={nc.responsibleUserId}
            dueDate={nc.dueDate?.toISOString() ?? null}
            responsibleOptions={responsibleOptions}
            canAssign={canAssign}
            canRequestVerification={canRequestVerification}
            canReview={canReview}
            canChangeDueDate={canChangeDueDate}
            canComment={canComment}
            canCancel={canCancel}
            hasTreatmentEvidence={hasTreatmentEvidence}
          />
        </div>
      </div>

      <div className={`overflow-hidden ${surface.operationalHero}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4">
          <div>
            <div
              className={`mb-1 flex items-center gap-2 ${typography.pageEyebrow} ${surface.onDarkSubtleText}`}
            >
              <AlertTriangle className="size-4" />
              AndCheck ⬢ Não Conformidades
            </div>
            <h1 className={`${typography.pageCodeTitle} text-primary-foreground`}>
              {nc.code}
            </h1>
            <p className={`mt-1 max-w-2xl ${typography.sectionDescription} ${surface.onDarkMutedText}`}>
              {nc.title}
            </p>
          </div>
          <div className="flex flex-wrap lg:justify-end gap-2 shrink-0">
            <NonConformityBadge
              value={nc.classification}
              kind="classification"
            />
            <NonConformityBadge value={nc.status} />
          </div>
        </div>
      </div>

      {nc.status === "CLOSED" && nc.scaffold.status === "pendente_liberacao" && (
        <div className={`flex items-center gap-2 px-4 py-3 ${surface.warningAlert}`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className={typography.bodyStrong}>
            {canStartInspection
              ? "A tratativa foi concluída. Inicie uma nova inspeção para liberar o andaime."
              : "A tratativa foi concluída. O andaime aguarda nova inspeção por um perfil habilitado."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Origem" icon={ClipboardCheck}>
          <DetailRow
            icon={Construction}
            label="Andaime"
            value={
              <Link
                href={"/andaimes/" + nc.scaffold.id}
                className={`${typography.code} hover:text-sidebar-primary`}
              >
                {nc.scaffold.code}
              </Link>
            }
          />
          <DetailRow
            icon={ClipboardCheck}
            label="Inspeção origem"
            value={
              <Link
                href={"/inspecoes/" + nc.originInspection.id}
                className={`${typography.code} hover:text-sidebar-primary`}
              >
                {nc.originInspection.scaffold_code} ·{" "}
                {format(nc.originInspection.date, "dd/MM/yyyy")}
              </Link>
            }
          />
          <DetailRow icon={Building2} label="Empresa" value={company} />
          <DetailRow
            icon={Calendar}
            label="Ocorrência"
            value={format(nc.originInspection.date, "dd/MM/yyyy HH:mm")}
          />
          <DetailRow
            icon={User}
            label="Inspetor"
            value={nc.originInspection.inspector_name}
          />
        </Section>

        <Section title="Operacional" icon={AlertTriangle}>
          <DetailRow icon={User} label="Responsável" value={responsible} />
          <DetailRow
            icon={Clock}
            label="Prazo"
            value={nc.dueDate ? format(nc.dueDate, "dd/MM/yyyy") : "-"}
          />
          <DetailRow icon={FileText} label="Título" value={nc.title} />
        </Section>
      </div>

      <Section title="Descrição" icon={FileText}>
        <div className="px-4 py-4">
          <p className={`${typography.sectionDescription} whitespace-pre-wrap leading-relaxed text-foreground`}>
            {nc.description}
          </p>
        </div>
      </Section>

      <Section title="Itens de Checklist Vinculados" icon={ClipboardCheck}>
        {nc.checklistItems.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nenhum item de checklist vinculado"
            description="Itens que originarem esta não conformidade aparecerão aqui."
            className={surface.panelEmptyStatePadded}
          />
        ) : (
          <div className={surface.listDivider}>
            {nc.checklistItems.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 pt-1">
                    <p className={`${typography.bodyStrong} text-foreground`}>
                      {item.checklistEntry.item_label}
                    </p>
                    <p className={`mt-0.5 ${typography.sectionLabel} text-muted-foreground`}>
                      {humanizeChecklistCategory(item.checklistEntry.category)}{" "}
                      - {humanizeChecklistValue(item.checklistEntry.value)}
                      {item.checklistEntry.critical ? " - Crítico" : ""}
                    </p>
                    {item.checklistEntry.observation && (
                      <p className={`mt-2 ${typography.sectionDescription} text-muted-foreground`}>
                        {item.checklistEntry.observation}
                      </p>
                    )}
                  </div>
                  {(canAddEvidence || item.evidences.length > 0) && (
                  <div className="flex flex-wrap items-start gap-2">
                    {canAddEvidence && (
                      <NonConformityItemEvidenceButton
                        id={nc.id}
                        itemId={item.id}
                      />
                    )}
                    {item.evidences.map((evidence) => (
                      <LazyNonConformityEvidencePreview
                        key={evidence.id}
                        id={evidence.id}
                        fileUrl={evidence.fileUrl}
                        fileName={evidence.fileName}
                        mimeType={evidence.mimeType}
                        observation={evidence.observation}
                        canDelete={canDeleteEvidence}
                        evidenceKind="item"
                        galleryItems={item.evidences.map((galleryEvidence) => ({
                          id: galleryEvidence.id,
                          fileUrl: galleryEvidence.fileUrl,
                          fileName: galleryEvidence.fileName,
                          mimeType: galleryEvidence.mimeType,
                          observation: galleryEvidence.observation,
                        }))}
                      />
                    ))}
                  </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {nc.evidences.length > 0 && (
        <Section title="Evidências Gerais Legadas" icon={Paperclip}>
          <div className={surface.listDivider}>
            {nc.evidences.map((evidence) => (
              <div
                key={evidence.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 space-y-2">
                  <p className={`mt-0.5 ${typography.sectionLabel} text-muted-foreground`}>
                    {EVIDENCE_LABELS[evidence.type] ?? humanizeCode(evidence.type)} - {evidence.fileName}
                  </p>
                  <LazyNonConformityEvidencePreview
                    id={evidence.id}
                    fileUrl={evidence.fileUrl}
                    fileName={evidence.fileName}
                    mimeType={evidence.mimeType}
                    observation={evidence.observation}
                    canDelete={canDeleteEvidence}
                    evidenceKind="general"
                  />
                </div>
                <p className={`${typography.codeMuted} shrink-0 text-muted-foreground`}>
                  {format(evidence.createdAt, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}


      <div className="flex gap-3">
        <Button
          asChild
          variant="outline"
          className={typography.panelTitle}
        >
          <Link href="/nao-conformidades">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </Link>
        </Button>
      </div>
    </div>
  );
}
