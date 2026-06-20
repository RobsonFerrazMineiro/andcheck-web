import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Construction,
  MapPin,
  Ruler,
  User,
  Weight,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ScaffoldActionsBar } from "@/components/scaffold/actions-bar";
import { ScaffoldDocumentSection } from "@/components/scaffold/document-section";
import { ScaffoldQRCard } from "@/components/scaffold/qr-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getScaffoldDocuments } from "@/lib/actions/document-actions";
import { getScaffoldById } from "@/lib/actions/scaffold-actions";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { isActiveNonConformityStatus } from "@/lib/non-conformity-status";

const NC_RESPONSIBLE_ROLE_CODES = [
  "PLANEJAMENTO",
  "SUPERVISOR",
  "ENCARREGADO",
  "SUPERVISOR_ENCARREGADO",
];

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

const NC_CLASSIFICATION_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
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

const NC_STATUS_STYLE: Record<string, string> = {
  OPEN: "border-blue-400/60 bg-blue-50 text-blue-800",
  ASSIGNED: "border-amber-400/60 bg-amber-50 text-amber-800",
  IN_PROGRESS: "border-amber-400/60 bg-amber-50 text-amber-800",
  PENDING_VERIFICATION: "border-purple-400/60 bg-purple-50 text-purple-800",
  CLOSED: "border-emerald-400/60 bg-emerald-50 text-emerald-800",
  REJECTED: "border-red-400/60 bg-red-50 text-red-800",
  CANCELLED: "border-slate-400/60 bg-slate-100 text-slate-600",
};

function NcBadge({ value }: { value: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest " +
        (NC_STATUS_STYLE[value] ?? "border-slate-300 bg-slate-50 text-slate-700")
      }
    >
      {NC_STATUS_LABELS[value] ?? value}
    </span>
  );
}

type Props = { params: Promise<{ id: string }> };

export default async function AndaimeDetailPage({ params }: Props) {
  const { id } = await params;
  const scaffold = await getScaffoldById(id);
  if (!scaffold) notFound();
  if (scaffold.status === "desmontado") {
    redirect(`/acervo/${encodeURIComponent(scaffold.code)}`);
  }

  const inspections = scaffold.inspections;
  const activeNonConformity = scaffold.nonConformities.find((nc) =>
    isActiveNonConformityStatus(nc.status),
  );
  const [
    documents,
    canCreateInspection,
    canCompleteAssembly,
    canDismantle,
    canAddDocument,
    canDeleteDocument,
    access,
  ] = await Promise.all([
    getScaffoldDocuments(id),
    canCurrentUser("inspections.create"),
    canCurrentUser("scaffolds.complete_assembly"),
    canCurrentUser("scaffolds.dismantle"),
    canCurrentUser("documents.create"),
    canCurrentUser("permissions.manage"),
    getCurrentUserAccess(),
  ]);
  const canActOnNonConformity = Boolean(
    access?.roleCodes.some(
      (roleCode) =>
        roleCode === "SUPER_ADMIN" ||
        NC_RESPONSIBLE_ROLE_CODES.includes(roleCode),
    ),
  );

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/andaimes"
            className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            <Link href="/andaimes" className="hover:text-foreground">
              Andaimes
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{scaffold.code}</span>
          </p>
        </div>
        <ScaffoldActionsBar
          scaffoldId={scaffold.id}
          scaffoldCode={scaffold.code}
          status={scaffold.status}
          canCreateInspection={canCreateInspection}
          hasActiveNonConformity={Boolean(activeNonConformity)}
          canCompleteAssembly={canCompleteAssembly}
          canDismantle={canDismantle}
        />
      </div>

      {activeNonConformity && (
        <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-[11px] font-semibold leading-relaxed">
              {canActOnNonConformity
                ? "Existe não conformidade ativa vinculada a este andaime. Conclua a tratativa para permitir uma nova inspeção."
                : "Existe não conformidade ativa vinculada a este andaime. Uma nova inspeção poderá ser iniciada após a conclusão da tratativa pelo responsável."}
            </p>
          </div>
        </div>
      )}

      <div className="bg-primary border-l-4 border-l-sidebar-primary px-5 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-primary-foreground/40 mb-1">
              Ficha Técnica do Ativo
            </p>
            <h1 className="text-[22px] font-bold text-primary-foreground font-mono tracking-tight">
              {scaffold.code}
            </h1>
            <p className="text-[11px] text-primary-foreground/60 mt-0.5">
              {scaffold.location}
            </p>
          </div>
          <div className="shrink-0">
            <StatusBadge status={scaffold.status} size="xl" />
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <TechCard title="Dados do Andaime" icon={Construction}>
          <TechRow
            icon={Construction}
            label="Tipo de Andaime"
            value={TYPE_LABELS[scaffold.type] ?? scaffold.type}
          />
          <TechRow
            icon={MapPin}
            label="Localização"
            value={scaffold.location}
          />
          {scaffold.area && (
            <TechRow
              icon={Building2}
              label="Área / Setor"
              value={scaffold.area}
            />
          )}
          <TechRow icon={Ruler} label="Altura" value={scaffold.height + " m"} />
          {scaffold.max_load && (
            <TechRow
              icon={Weight}
              label="Carga Máxima"
              value={scaffold.max_load + " kg"}
            />
          )}
        </TechCard>

        <TechCard title="Dados da Inspeção" icon={ClipboardCheck}>
          {scaffold.responsible && (
            <TechRow
              icon={User}
              label="Responsável"
              value={scaffold.responsible}
            />
          )}
          {scaffold.company && (
            <TechRow
              icon={Building2}
              label="Empresa"
              value={scaffold.company}
            />
          )}
          {inspections.length > 0 && (
            <>
              <TechRow
                icon={User}
                label="Inspetor"
                value={inspections[0].inspector_name}
              />
              <TechRow
                icon={Calendar}
                label="Data da Inspeção"
                value={format(inspections[0].date, "dd/MM/yyyy")}
              />
              {inspections[0].validity_days > 0 && scaffold.validity_date && (
                <TechRow
                  icon={Clock}
                  label="Validade da Liberação"
                  value={
                    inspections[0].validity_days +
                    " dias (até " +
                    format(scaffold.validity_date, "dd/MM/yyyy") +
                    ")"
                  }
                />
              )}
            </>
          )}
          {scaffold.notes && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Observações
              </p>
              <p className="text-[11px] text-foreground leading-relaxed">
                {scaffold.notes}
              </p>
            </div>
          )}
        </TechCard>
      </div>

      <ScaffoldDocumentSection
        scaffoldId={scaffold.id}
        initialDocuments={documents}
        canAddDocument={canAddDocument}
        canDeleteDocument={canDeleteDocument}
      />

      <TechCard
        title="Não Conformidades Vinculadas"
        icon={AlertTriangle}
        extra={
          <span className="text-[9px] text-muted-foreground font-mono">
            {scaffold.nonConformities.length} registro(s)
          </span>
        }
      >
        {scaffold.nonConformities.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground">
              Nenhuma não conformidade vinculada a este andaime
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-5 gap-3 px-4 py-2 bg-muted/40">
              {["Código", "Status", "Classificação", "Prazo", "Responsável"].map(
                (h) => (
                  <p
                    key={h}
                    className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </p>
                ),
              )}
            </div>
            {scaffold.nonConformities.map((nc) => (
              <Link
                key={nc.id}
                href={"/nao-conformidades/" + nc.id}
                className="grid grid-cols-5 gap-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <p className="text-[11px] font-bold font-mono text-foreground">
                  {nc.code}
                </p>
                <div>
                  <NcBadge value={nc.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {NC_CLASSIFICATION_LABELS[nc.classification] ?? nc.classification}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {nc.dueDate ? format(nc.dueDate, "dd/MM/yyyy") : "-"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {nc.responsibleUser?.name ?? "-"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </TechCard>

      <ScaffoldQRCard
        scaffoldCode={scaffold.code}
        tag={scaffold.tag}
        origin={origin}
      />

      <TechCard
        title="Histórico de Inspeções"
        icon={ClipboardCheck}
        extra={
          <span className="text-[9px] text-muted-foreground font-mono">
            {inspections.length} registro(s)
          </span>
        }
      >
        {inspections.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground">
              Nenhuma inspeção registrada para este andaime
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 px-4 py-2 bg-muted/40">
              {["Inspetor", "Data", "Resultado"].map((h) => (
                <p
                  key={h}
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </p>
              ))}
            </div>
            {inspections.map((insp) => (
              <Link
                key={insp.id}
                href={"/inspecoes/" + insp.id}
                className="grid grid-cols-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors group"
              >
                <p className="text-[11px] font-semibold text-foreground truncate">
                  {insp.inspector_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(insp.date, "dd/MM/yyyy")}
                </p>
                <div className="flex items-center justify-between">
                  <StatusBadge status={insp.result} />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </TechCard>
    </div>
  );
}

interface TechCardProps {
  title: string;
  icon: React.ElementType;
  extra?: React.ReactNode;
  children: React.ReactNode;
}
function TechCard({ title, icon: Icon, extra, children }: TechCardProps) {
  return (
    <div className="bg-card border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b-2 border-border">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            {title}
          </p>
        </div>
        {extra}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}
interface TechRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}
function TechRow({ icon: Icon, label, value }: TechRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
          {label}
        </p>
        <p className="text-[11px] font-semibold text-foreground text-right truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
