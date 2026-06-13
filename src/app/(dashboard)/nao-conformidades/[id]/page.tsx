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
  History,
  Paperclip,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getNonConformityById,
  getNonConformityResponsibleOptions,
} from "@/lib/actions/non-conformity-actions";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import {
  NonConformityEvidencePreview,
  NonConformityItemEvidenceButton,
  NonConformityOperations,
} from "./non-conformity-operations";

type Props = {
  params: Promise<{ id: string }>;
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
};

const CLASSIFICATION_STYLE: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-700 border-slate-300",
  MEDIUM: "bg-amber-50 text-amber-800 border-amber-400/60",
  HIGH: "bg-orange-50 text-orange-800 border-orange-400/60",
  CRITICAL: "bg-red-100 text-red-900 border-red-600/70",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  ASSIGNED: "Em Correcao",
  IN_PROGRESS: "Em Tratamento",
  PENDING_VERIFICATION: "Aguardando Verificacao",
  CLOSED: "Encerrada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-800 border-blue-400/60",
  ASSIGNED: "bg-amber-50 text-amber-800 border-amber-400/60",
  IN_PROGRESS: "bg-amber-50 text-amber-800 border-amber-400/60",
  PENDING_VERIFICATION: "bg-purple-50 text-purple-800 border-purple-400/60",
  CLOSED: "bg-emerald-50 text-emerald-800 border-emerald-400/60",
  REJECTED: "bg-red-50 text-red-800 border-red-400/60",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-400/60",
};

const EVIDENCE_LABELS: Record<string, string> = {
  PHOTO: "Foto",
  PDF: "PDF",
  ART: "ART",
  MEMORIAL_CALCULO: "Memorial de calculo",
  CROQUI: "Croqui",
  DOCUMENT: "Documento",
  OTHER: "Outro",
};

const RESPONSIBLE_ROLE_CODES = ["PLANEJAMENTO", "SUPERVISOR_ENCARREGADO"];
const HSE_ROLE_CODES = ["HSE_HYDRO", "HSE_GERENCIADORA", "HSE_EMPRESA"];
const FINAL_STATUSES = ["CLOSED", "CANCELLED"];

function hasAnyRole(roleCodes: string[], allowed: string[]) {
  return roleCodes.some(
    (roleCode) => roleCode === "SUPER_ADMIN" || allowed.includes(roleCode),
  );
}

function isCorrectionStatus(status: string) {
  return ["ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(status);
}

function Badge({
  value,
  labels,
  styles,
}: {
  value: string;
  labels: Record<string, string>;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={
        "inline-flex items-center border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest " +
        (styles[value] ?? "bg-slate-50 text-slate-600 border-slate-300")
      }
    >
      {labels[value] ?? value}
    </span>
  );
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
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-36 shrink-0">
        {label}
      </p>
      <div className="text-[12px] text-foreground font-medium text-right flex-1 min-w-0 break-words">
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
    <section className="bg-card border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b-2 border-border">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
          {title}
        </p>
      </div>
      {children}
    </section>
  );
}

export default async function NonConformityDetailPage({ params }: Props) {
  const { id } = await params;
  const nc = await getNonConformityById(id);
  if (!nc) notFound();

  const company = nc.companyId ?? nc.scaffold.company ?? "-";
  const responsible = nc.responsibleUser?.name ?? "-";
  const [canUpdate, access] = await Promise.all([
    canCurrentUser("non_conformities.update"),
    getCurrentUserAccess(),
  ]);
  const roleCodes = access?.roleCodes ?? [];
  const isHse = hasAnyRole(roleCodes, HSE_ROLE_CODES);
  const isResponsibleProfile = hasAnyRole(roleCodes, RESPONSIBLE_ROLE_CODES);
  const isFinal = FINAL_STATUSES.includes(nc.status);
  const canAssign =
    canUpdate &&
    !isFinal &&
    ["OPEN", "ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(nc.status);
  const canRequestVerification =
    isResponsibleProfile && isCorrectionStatus(nc.status);
  const canReview = isHse && nc.status === "PENDING_VERIFICATION";
  const canChangeDueDate = isHse && !isFinal;
  const canAddEvidence = isResponsibleProfile && isCorrectionStatus(nc.status);
  const canComment =
    !isFinal && (isResponsibleProfile || isHse);
  const canCancel =
    isHse && ["OPEN", "ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(nc.status);
  const responsibleOptions = canAssign
    ? await getNonConformityResponsibleOptions()
    : [];

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/nao-conformidades"
            className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            <Link href="/nao-conformidades" className="hover:text-foreground">
              Nao Conformidades
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground font-semibold font-mono">
              {nc.code}
            </span>
          </div>
        </div>
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
        />
      </div>

      <div className="bg-primary border-l-4 border-l-sidebar-primary shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-primary-foreground/40 mb-1">
              Controle de Tratativa · AndCheck EHS
            </p>
            <h1 className="text-[22px] font-bold text-primary-foreground tracking-tight font-mono">
              {nc.code}
            </h1>
            <p className="text-[12px] text-primary-foreground/70 mt-1 max-w-2xl">
              {nc.title}
            </p>
          </div>
          <div className="flex flex-wrap lg:justify-end gap-2 shrink-0">
            <Badge
              value={nc.classification}
              labels={CLASSIFICATION_LABELS}
              styles={CLASSIFICATION_STYLE}
            />
            <Badge value={nc.status} labels={STATUS_LABELS} styles={STATUS_STYLE} />
          </div>
        </div>
      </div>

      {nc.status === "CLOSED" && nc.scaffold.status === "pendente_liberacao" && (
        <div className="flex items-center gap-2 border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-[11px] font-semibold">
            Nova inspeção necessária para liberação do andaime.
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
                className="font-mono font-bold hover:text-sidebar-primary"
              >
                {nc.scaffold.code}
              </Link>
            }
          />
          <DetailRow
            icon={ClipboardCheck}
            label="Inspecao origem"
            value={
              <Link
                href={"/inspecoes/" + nc.originInspection.id}
                className="font-mono font-bold hover:text-sidebar-primary"
              >
                {nc.originInspection.scaffold_code} ·{" "}
                {format(nc.originInspection.date, "dd/MM/yyyy")}
              </Link>
            }
          />
          <DetailRow icon={Building2} label="Empresa" value={company} />
          <DetailRow
            icon={Calendar}
            label="Ocorrencia"
            value={format(nc.originInspection.date, "dd/MM/yyyy HH:mm")}
          />
          <DetailRow
            icon={User}
            label="Inspetor"
            value={nc.originInspection.inspector_name}
          />
        </Section>

        <Section title="Operacional" icon={AlertTriangle}>
          <DetailRow icon={User} label="Responsavel" value={responsible} />
          <DetailRow
            icon={Clock}
            label="Prazo"
            value={nc.dueDate ? format(nc.dueDate, "dd/MM/yyyy") : "-"}
          />
          <DetailRow icon={FileText} label="Titulo" value={nc.title} />
        </Section>
      </div>

      <Section title="Descricao" icon={FileText}>
        <div className="px-4 py-4">
          <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
            {nc.description}
          </p>
        </div>
      </Section>

      <Section title="Itens de Checklist Vinculados" icon={ClipboardCheck}>
        {nc.checklistItems.length === 0 ? (
          <div className="px-4 py-5">
            <p className="text-[11px] text-muted-foreground">
              Nenhum item de checklist vinculado a esta NC.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {nc.checklistItems.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-[320px] max-w-2xl pt-1">
                    <p className="text-[12px] font-semibold text-foreground">
                      {item.checklistEntry.item_label}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                      {item.checklistEntry.category} - {item.checklistEntry.value}
                      {item.checklistEntry.critical ? " - Critico" : ""}
                    </p>
                    {item.checklistEntry.observation && (
                      <p className="text-[11px] text-muted-foreground mt-2">
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
                      <NonConformityEvidencePreview
                        key={evidence.id}
                        id={evidence.id}
                        fileUrl={evidence.fileUrl}
                        fileName={evidence.fileName}
                        mimeType={evidence.mimeType}
                        observation={evidence.observation}
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
        <Section title="Evidencias Gerais Legadas" icon={Paperclip}>
          <div className="divide-y divide-border">
            {nc.evidences.map((evidence) => (
              <div
                key={evidence.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                    {EVIDENCE_LABELS[evidence.type] ?? evidence.type} - {evidence.fileName}
                  </p>
                  <NonConformityEvidencePreview
                    id={evidence.id}
                    fileUrl={evidence.fileUrl}
                    fileName={evidence.fileName}
                    mimeType={evidence.mimeType}
                    observation={evidence.observation}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {format(evidence.createdAt, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Historico" icon={History}>
        {nc.history.length === 0 ? (
          <div className="px-4 py-5">
            <p className="text-[11px] text-muted-foreground">
              Nenhum historico registrado para esta NC.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {nc.history.map((entry) => (
              <div key={entry.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[12px] font-bold text-foreground">
                    {entry.action}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono shrink-0">
                    {format(entry.createdAt, "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {entry.description}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {entry.user?.name ?? "Sistema"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex gap-3">
        <Link
          href="/nao-conformidades"
          className="flex items-center gap-1.5 h-8 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
      </div>
    </div>
  );
}
