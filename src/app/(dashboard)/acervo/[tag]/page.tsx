import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  FileClock,
  FileText,
  MapPin,
  User,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ScaffoldQRCard } from "@/components/scaffold/qr-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { getArchivedScaffoldByTag } from "@/lib/actions/scaffold-actions";

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

const SCAFFOLD_STATUS_LABELS: Record<string, string> = {
  em_montagem: "EM MONTAGEM",
  pendente_liberacao: "PENDENTE LIBERAÇÃO",
  liberado: "LIBERADO",
  reprovado: "REPROVADO",
  interditado: "INTERDITADO",
  vencido: "VENCIDO",
};

const INSPECTION_RESULT_LABELS: Record<string, string> = {
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  reprovado: "Reprovado",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ART: "ART",
  RRT: "RRT",
  PROJETO: "Projeto Estrutural",
  PROJETO_ESTRUTURAL: "Projeto Estrutural",
  MEMORIAL_CALCULO: "Memorial de Cálculo",
  CROQUI: "Croqui",
  CERTIFICADO: "Certificado Técnico",
  PLANO_MONTAGEM: "Plano de Montagem",
  CERTIFICADO_TECNICO: "Certificado Técnico",
  PROCEDIMENTO: "Outros",
  OUTRO: "Outros",
};

const NC_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  ASSIGNED: "Em Correção",
  IN_PROGRESS: "Em Tratamento",
  PENDING_VERIFICATION: "Aguardando Verificação",
  CLOSED: "Encerrada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

type ArchivedAuditLog = {
  id: string;
  entityType: string;
  action: string;
  description: string;
  userName: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
};

type ArchivedInspection = {
  id: string;
  date: Date;
  inspector_name: string;
  result: string;
  validity_days: number | null;
  notes: string | null;
};

type ArchivedDocument = {
  id: string;
  type: string;
  title: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  expires_at: Date | null;
  observation: string | null;
  created_at: Date;
};

type ArchivedNonConformity = {
  id: string;
  code: string;
  title: string;
  status: string;
  dueDate: Date | null;
  responsibleUser: { id: string; name: string | null; company: string | null } | null;
};

type ArchivedScaffold = {
  id: string;
  code: string;
  tag: string;
  type: string;
  status: string;
  location: string;
  area: string;
  company: string | null;
  responsible: string;
  released_at: Date | null;
  assembly_completed_at: Date | null;
  dismantled_at: Date | null;
  tenantCompany: { id: string; name: string } | null;
  workspace: { id: string; name: string } | null;
  documents: ArchivedDocument[];
  inspections: ArchivedInspection[];
  nonConformities: ArchivedNonConformity[];
};

function formatDate(value: Date | null | undefined) {
  return value ? format(value, "dd/MM/yyyy") : "-";
}

function formatDateOr(value: Date | null | undefined, fallback: string) {
  return value ? format(value, "dd/MM/yyyy") : fallback;
}

function formatDateTime(value: Date | null | undefined) {
  return value ? format(value, "dd/MM/yyyy HH:mm") : "-";
}

function formatBytes(value: number | null) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getLifecycleDays({
  firstReleaseDate,
  assemblyDate,
  dismantledDate,
}: {
  firstReleaseDate: Date | null | undefined;
  assemblyDate: Date | null | undefined;
  dismantledDate: Date | null | undefined;
}) {
  const initialDate = firstReleaseDate ?? assemblyDate;
  if (!initialDate || !dismantledDate) return null;
  const start = new Date(initialDate);
  const end = new Date(dismantledDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return days < 0 ? null : days;
}

function formatLifecycleDays(days: number | null) {
  if (days === null) return "Não calculado";
  if (days === 0) return "Menos de 1 dia";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function getDaysInOperation({
  firstReleaseDate,
  dismantledDate,
}: {
  firstReleaseDate: Date | null | undefined;
  dismantledDate: Date | null | undefined;
}) {
  if (!firstReleaseDate || !dismantledDate) {
    return { diasOperacao: null, classificacao: null };
  }

  const start = new Date(firstReleaseDate);
  const end = new Date(dismantledDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diasOperacao = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diasOperacao < 0) {
    return { diasOperacao: null, classificacao: null };
  }

  const classificacao =
    diasOperacao <= 30
      ? "Normal"
      : diasOperacao <= 60
        ? "Atenção"
        : diasOperacao <= 90
          ? "Elevado"
          : "Crítico";

  return { diasOperacao, classificacao };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getStringField(value: unknown, field: string) {
  if (!isRecord(value)) return null;
  const item = value[field];
  return typeof item === "string" && item.trim() ? item : null;
}

function operationalTimelineLabel(log: {
  action: string;
  entityType: string;
  description: string;
  newValue: unknown;
}) {
  const status = getStringField(log.newValue, "status");
  if (log.action === "CREATE" && log.entityType === "SCAFFOLD") {
    return "Andaime criado";
  }
  if (log.action === "COMPLETE" && log.entityType === "SCAFFOLD") {
    return "Montagem concluída";
  }
  if (log.action === "STATUS_CHANGE" && status === "liberado") {
    return "Primeira liberação";
  }
  if (log.action === "STATUS_CHANGE" && status === "desmontado") {
    return "Andaime desmontado";
  }
  if (log.entityType === "INSPECTION" && status === "aprovado") {
    return "Inspeção aprovada";
  }
  if (log.entityType === "INSPECTION" && status === "reprovado") {
    return "Inspeção reprovada";
  }
  if (log.entityType === "NON_CONFORMITY" && log.action === "CREATE") {
    return "NC aberta";
  }
  if (log.entityType === "NON_CONFORMITY" && status === "CLOSED") {
    return "NC encerrada";
  }
  return log.description.endsWith(".") ? log.description.slice(0, -1) : log.description;
}

type Props = { params: Promise<{ tag: string }> };

export default async function AcervoDetalhePage({ params }: Props) {
  const { tag } = await params;
  const data = await getArchivedScaffoldByTag(decodeURIComponent(tag));
  if (!data) notFound();

  const scaffold = data.scaffold as ArchivedScaffold;
  const auditLogs = data.auditLogs as ArchivedAuditLog[];
  if (scaffold.status !== "desmontado") {
    redirect(`/andaimes/${scaffold.id}`);
  }

  const lastInspection = scaffold.inspections[0];
  getDaysInOperation({
    firstReleaseDate: scaffold.released_at,
    dismantledDate: scaffold.dismantled_at,
  });
  const lifecycleDays = getLifecycleDays({
    firstReleaseDate: scaffold.released_at,
    assemblyDate: scaffold.assembly_completed_at,
    dismantledDate: scaffold.dismantled_at,
  });
  const dismantleLog = auditLogs.find(
    (log) =>
      log.action === "STATUS_CHANGE" &&
      getStringField(log.newValue, "status") === "desmontado",
  );
  const previousStatus = getStringField(dismantleLog?.oldValue, "status");
  const lastOperationalStatus =
    previousStatus && previousStatus !== "desmontado"
      ? (SCAFFOLD_STATUS_LABELS[previousStatus] ?? previousStatus.toUpperCase())
      : "-";
  const dismantleReason =
    getStringField(dismantleLog?.newValue, "dismantleReason") ?? "-";
  const dismantleObservation =
    getStringField(dismantleLog?.newValue, "dismantleReasonDescription") ??
    "-";
  const dismantleResponsible = dismantleLog?.userName ?? "-";
  const operationalTimeline = [...auditLogs].reverse();
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          href="/acervo"
          className="flex size-7 items-center justify-center transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          <Link href="/acervo" className="hover:text-foreground">
            Acervo de Andaimes
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">{scaffold.code}</span>
        </p>
      </div>

      <div className="border-l-4 border-l-sidebar-primary bg-primary px-5 py-4 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-primary-foreground/40">
              ACERVO HISTÓRICO DO ANDAIME
            </p>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-primary-foreground">
              {scaffold.code}
            </h1>
            <p className="mt-0.5 text-[11px] text-primary-foreground/60">
              {scaffold.location}
            </p>
          </div>
          <div className="shrink-0 space-y-1 text-left sm:text-right">
            <StatusBadge status={scaffold.status} size="xl" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/45">
              {scaffold.dismantled_at
                ? `Arquivado em ${formatDate(scaffold.dismantled_at)}`
                : "Registro arquivado"}
            </p>
          </div>
        </div>
      </div>

      <LifecycleStrip
        assemblyDate={scaffold.assembly_completed_at}
        releaseDate={scaffold.released_at}
        lastInspectionDate={lastInspection?.date}
        dismantledDate={scaffold.dismantled_at}
      />

      <ArchiveCard
        title="Linha do Tempo Operacional"
        icon={FileClock}
        extra={`${operationalTimeline.length} evento(s)`}
      >
        {operationalTimeline.length === 0 ? (
          <EmptyLine icon={FileClock} text="Nenhum evento operacional registrado." />
        ) : (
          <div className="px-4 py-2">
            {operationalTimeline.map((log, index) => (
              <div key={log.id} className="relative flex gap-3 pb-4 last:pb-2">
                {index < operationalTimeline.length - 1 && (
                  <div className="absolute left-[5px] top-4 h-full w-px bg-border" />
                )}
                <div className="relative z-10 mt-1 size-3 shrink-0 rounded-full border-2 border-sidebar-primary bg-card" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </p>
                  <p className="text-[11px] font-semibold text-foreground">
                    {operationalTimelineLabel(log)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {log.userName ?? "Sistema"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ArchiveCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ArchiveCard title="Dados do Andaime" icon={Construction}>
          <ArchiveRow icon={MapPin} label="Área" value={scaffold.area} />
          <ArchiveRow
            icon={Construction}
            label="Tipo do Andaime"
            value={TYPE_LABELS[scaffold.type] ?? scaffold.type}
          />
          <ArchiveRow
            icon={Building2}
            label="Empresa"
            value={scaffold.tenantCompany?.name ?? scaffold.company ?? "-"}
          />
          <ArchiveRow
            icon={Building2}
            label="Workspace"
            value={scaffold.workspace?.name ?? "-"}
          />
          <ArchiveRow
            icon={FileClock}
            label="Último Status Operacional"
            value={lastOperationalStatus}
          />
          <ArchiveRow
            icon={User}
            label="Responsável"
            value={scaffold.responsible}
          />
        </ArchiveCard>

        <ArchiveCard title="Datas" icon={Calendar}>
          <ArchiveRow
            icon={Calendar}
            label="Montagem"
            value={formatDateOr(scaffold.assembly_completed_at, "Data não registrada")}
          />
          <ArchiveRow
            icon={CheckCircle2}
            label="Primeira Liberação"
            value={formatDateOr(scaffold.released_at, "Sem liberação registrada")}
          />
          <ArchiveRow
            icon={ClipboardCheck}
            label="Última Inspeção"
            value={formatDateOr(lastInspection?.date, "Sem inspeção registrada")}
          />
          <ArchiveRow
            icon={Clock}
            label="Desmontagem"
            value={formatDateOr(scaffold.dismantled_at, "Data não registrada")}
          />
        </ArchiveCard>

        <ArchiveCard title="Desmontagem" icon={Wrench}>
          <ArchiveRow
            icon={Calendar}
            label="Data"
            value={formatDateOr(scaffold.dismantled_at, "Data não registrada")}
          />
          <ArchiveRow
            icon={User}
            label="Responsável"
            value={dismantleResponsible}
          />
          <ArchiveRow icon={Wrench} label="Motivo" value={dismantleReason} />
          <ArchiveRow
            icon={FileText}
            label="Observações"
            value={dismantleObservation}
          />
        </ArchiveCard>

        <ArchiveCard title="Resumo Histórico" icon={FileClock}>
          <ArchiveRow
            icon={ClipboardCheck}
            label="Inspeções"
            value={String(scaffold.inspections.length)}
          />
          <ArchiveRow
            icon={AlertTriangle}
            label="NCs"
            value={String(scaffold.nonConformities.length)}
          />
          <ArchiveRow
            icon={FileText}
            label="Documentos"
            value={String(scaffold.documents.length)}
          />
          <ArchiveRow
            icon={Clock}
            label="Tempo de Vida"
            value={formatLifecycleDays(lifecycleDays)}
          />
        </ArchiveCard>
      </div>

      <ArchiveCard title="Última Inspeção" icon={ClipboardCheck}>
        {!lastInspection ? (
          <EmptyLine icon={ClipboardCheck} text="Nenhuma inspeção registrada." />
        ) : (
          <>
            <ArchiveRow
              icon={Calendar}
              label="Data"
              value={formatDate(lastInspection.date)}
            />
            <ArchiveRow
              icon={CheckCircle2}
              label="Resultado"
              value={
                INSPECTION_RESULT_LABELS[lastInspection.result] ??
                lastInspection.result
              }
            />
            <ArchiveRow
              icon={User}
              label="Inspetor"
              value={lastInspection.inspector_name}
            />
          </>
        )}
      </ArchiveCard>

      <ArchiveCard
        title="Histórico de Inspeções"
        icon={ClipboardCheck}
        extra={`${scaffold.inspections.length} registro(s)`}
      >
        {scaffold.inspections.length === 0 ? (
          <EmptyLine icon={ClipboardCheck} text="Nenhuma inspeção registrada." />
        ) : (
          <div className="divide-y divide-border">
            {scaffold.inspections.map((inspection) => (
              <Link
                key={inspection.id}
                href={`/inspecoes/${inspection.id}`}
                className="grid gap-2 px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-4 md:items-center"
              >
                <p className="text-[11px] font-semibold text-foreground">
                  {inspection.inspector_name}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatDate(inspection.date)}
                </p>
                <div>
                  <StatusBadge status={inspection.result} />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {inspection.notes ?? "-"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </ArchiveCard>

      <ArchiveCard
        title="Não Conformidades"
        icon={AlertTriangle}
        extra={`${scaffold.nonConformities.length} registro(s)`}
      >
        {scaffold.nonConformities.length === 0 ? (
          <EmptyLine icon={AlertTriangle} text="Nenhuma não conformidade vinculada." />
        ) : (
          <div className="divide-y divide-border">
            {scaffold.nonConformities.map((nc) => (
              <Link
                key={nc.id}
                href={`/nao-conformidades/${nc.id}`}
                className="grid gap-2 px-4 py-3 transition-colors hover:bg-muted/30 md:grid-cols-5 md:items-center"
              >
                <p className="font-mono text-[11px] font-bold text-foreground">
                  {nc.code}
                </p>
                <p className="truncate text-[11px] text-foreground">
                  {nc.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {NC_STATUS_LABELS[nc.status] ?? nc.status}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatDate(nc.dueDate)}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {nc.responsibleUser?.name ?? "-"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </ArchiveCard>

      <ArchiveCard
        title="Documentação Técnica"
        icon={FileText}
        extra={`${scaffold.documents.length} documento(s)`}
      >
        {scaffold.documents.length === 0 ? (
          <EmptyLine icon={FileText} text="Nenhum documento técnico vinculado." />
        ) : (
          <div className="divide-y divide-border">
            {scaffold.documents.map((document) => (
              <div
                key={document.id}
                className="grid gap-2 px-4 py-3 md:grid-cols-5 md:items-center"
              >
                <p className="truncate text-[11px] font-semibold text-foreground">
                  {document.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {DOCUMENT_TYPE_LABELS[document.type] ?? document.type}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {document.file_name}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatBytes(document.file_size)}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatDate(document.expires_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </ArchiveCard>

      <ArchiveCard
        title="Auditoria"
        icon={FileClock}
        extra={`${auditLogs.length} evento(s)`}
      >
        {auditLogs.length === 0 ? (
          <EmptyLine icon={FileClock} text="Nenhum evento de auditoria encontrado." />
        ) : (
          <div className="divide-y divide-border">
            {auditLogs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                    {log.action}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {log.description}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground/60">
                  {log.userName ?? "Sistema"}
                </p>
              </div>
            ))}
          </div>
        )}
      </ArchiveCard>

      <ScaffoldQRCard
        scaffoldCode={scaffold.code}
        tag={scaffold.tag}
        origin={origin}
        title="CONSULTA PÚBLICA"
        helperText="Ao escanear, será exibido o registro histórico do andaime desmontado, incluindo status, validade final, inspeções e documentação disponível."
      />
    </div>
  );
}

function ArchiveCard({
  title,
  icon: Icon,
  extra,
  children,
}: {
  title: string;
  icon: React.ElementType;
  extra?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b-2 border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground/60" />
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            {title}
          </h2>
        </div>
        {extra && (
          <span className="font-mono text-[9px] text-muted-foreground">
            {extra}
          </span>
        )}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function ArchiveRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground/40" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <p className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-right text-[11px] font-semibold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyLine({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <EmptyState
      icon={Icon}
      title={text.replace(/\.$/, "")}
      description="Os registros deste bloco aparecerão aqui conforme o histórico operacional for consolidado."
      className="border-0 border-b border-dashed py-8"
    />
  );
}

function LifecycleStrip({
  assemblyDate,
  releaseDate,
  lastInspectionDate,
  dismantledDate,
}: {
  assemblyDate: Date | null | undefined;
  releaseDate: Date | null | undefined;
  lastInspectionDate: Date | null | undefined;
  dismantledDate: Date | null | undefined;
}) {
  const items = [
    { label: "Montagem", value: formatDateOr(assemblyDate, "Não registrada") },
    { label: "Liberação", value: formatDateOr(releaseDate, "Não registrada") },
    {
      label: "Última Inspeção",
      value: formatDateOr(lastInspectionDate, "Não registrada"),
    },
    { label: "Desmontagem", value: formatDateOr(dismantledDate, "Não registrada") },
  ];

  return (
    <section className="border border-border bg-card px-4 py-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.label} className="relative flex gap-3 md:block">
            {index < items.length - 1 && (
              <div className="absolute left-[5px] top-4 h-[calc(100%+1rem)] w-px bg-border md:left-[calc(50%+0.375rem)] md:top-2 md:h-px md:w-[calc(100%-0.75rem)]" />
            )}
            <div className="relative z-10 mt-1 size-3 shrink-0 rounded-full border-2 border-sidebar-primary bg-card md:mx-auto md:mt-0" />
            <div className="md:mt-3 md:text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 font-mono text-[11px] font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
