import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardCheck,
  Clock,
  Construction,
  FileClock,
  FileText,
  MapPin,
  User,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScaffoldQRCard } from "@/components/scaffold/qr-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getArchivedScaffoldByTag } from "@/lib/actions/scaffold-actions";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ART: "ART",
  RRT: "RRT",
  PROJETO: "Projeto Estrutural",
  PROJETO_ESTRUTURAL: "Projeto Estrutural",
  MEMORIAL_CALCULO: "Memorial de Calculo",
  CROQUI: "Croqui",
  CERTIFICADO: "Certificado Tecnico",
  PLANO_MONTAGEM: "Plano de Montagem",
  CERTIFICADO_TECNICO: "Certificado Tecnico",
  PROCEDIMENTO: "Outros",
  OUTRO: "Outros",
};

const NC_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  ASSIGNED: "Em Correcao",
  IN_PROGRESS: "Em Tratamento",
  PENDING_VERIFICATION: "Aguardando Verificacao",
  CLOSED: "Encerrada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

function formatDate(value: Date | null | undefined) {
  return value ? format(value, "dd/MM/yyyy") : "-";
}

function formatDateTime(value: Date | null | undefined) {
  return value ? format(value, "dd/MM/yyyy HH:mm") : "-";
}

function formatBytes(value: number | null) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = { params: Promise<{ tag: string }> };

export default async function AcervoDetalhePage({ params }: Props) {
  const { tag } = await params;
  const data = await getArchivedScaffoldByTag(decodeURIComponent(tag));
  if (!data) notFound();

  const { scaffold, auditLogs } = data;
  const lastInspection = scaffold.inspections[0];
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
              Historico operacional e documentacao tecnica
            </p>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-primary-foreground">
              {scaffold.code}
            </h1>
            <p className="mt-0.5 text-[11px] text-primary-foreground/60">
              {scaffold.location}
            </p>
          </div>
          <StatusBadge status={scaffold.status} size="xl" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ArchiveCard title="Dados do Andaime" icon={Construction}>
          <ArchiveRow icon={MapPin} label="Area" value={scaffold.area} />
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
            icon={User}
            label="Responsavel"
            value={scaffold.responsible}
          />
        </ArchiveCard>

        <ArchiveCard title="Datas" icon={Calendar}>
          <ArchiveRow
            icon={Calendar}
            label="Montagem"
            value={formatDate(scaffold.assembly_completed_at)}
          />
          <ArchiveRow
            icon={ClipboardCheck}
            label="Ultima Inspecao"
            value={formatDate(lastInspection?.date)}
          />
          <ArchiveRow
            icon={Clock}
            label="Desmontagem"
            value={formatDate(scaffold.dismantled_at)}
          />
        </ArchiveCard>

        <ArchiveCard title="Resumo Historico" icon={FileClock}>
          <ArchiveRow
            icon={ClipboardCheck}
            label="Inspecoes"
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
        </ArchiveCard>
      </div>

      <ArchiveCard
        title="Historico de Inspecoes"
        icon={ClipboardCheck}
        extra={`${scaffold.inspections.length} registro(s)`}
      >
        {scaffold.inspections.length === 0 ? (
          <EmptyLine icon={ClipboardCheck} text="Nenhuma inspecao registrada." />
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
        title="Nao Conformidades"
        icon={AlertTriangle}
        extra={`${scaffold.nonConformities.length} registro(s)`}
      >
        {scaffold.nonConformities.length === 0 ? (
          <EmptyLine icon={AlertTriangle} text="Nenhuma nao conformidade vinculada." />
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
        title="Documentacao Tecnica"
        icon={FileText}
        extra={`${scaffold.documents.length} arquivo(s)`}
      >
        {scaffold.documents.length === 0 ? (
          <EmptyLine icon={FileText} text="Nenhum documento tecnico vinculado." />
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
        title="QR Historico"
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
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="py-8 text-center">
      <Icon className="mx-auto mb-2 size-8 text-muted-foreground/20" />
      <p className="text-[11px] text-muted-foreground">{text}</p>
    </div>
  );
}
