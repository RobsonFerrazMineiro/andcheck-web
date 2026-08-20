import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
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

import {
  LazyScaffoldActionsBar,
  LazyScaffoldDocumentSection,
  LazyScaffoldQRCard,
} from "@/components/scaffold/lazy-scaffold-panels";
import { LinkedRecordsButton } from "@/components/scaffold/linked-records-button";
import { AuditTimelineButton } from "@/components/shared/audit-timeline";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getScaffoldDocuments } from "@/lib/actions/document-actions";
import { getScaffoldById } from "@/lib/actions/scaffold-actions";
import { AuditEntityType, getEntityAuditTimeline } from "@/lib/audit";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { surface, typography } from "@/lib/design-system";
import { getScaffoldTypeLabel } from "@/lib/scaffold-types";
import { isActiveNonConformityStatus } from "@/lib/non-conformity-status";

const NC_RESPONSIBLE_ROLE_CODES = [
  "PLANEJAMENTO",
  "SUPERVISOR",
  "ENCARREGADO",
  "SUPERVISOR_ENCARREGADO",
];

type Props = { params: Promise<{ id: string }> };

type ScaffoldDetail = {
  id: string;
  code: string;
  tag: string;
  type: string;
  status: string;
  location: string;
  area: string;
  height: number;
  max_load: number | null;
  responsible: string;
  company: string | null;
  validity_date: Date | null;
  notes: string | null;
  inspections: Array<{
    id: string;
    date: Date;
    inspector_name: string;
    result: string;
    validity_days: number;
  }>;
  nonConformities: Array<{
    id: string;
    code: string;
    status: string;
    classification: string;
    dueDate: Date | null;
    responsibleUser: {
      id: string;
      name: string;
      company: string | null;
    } | null;
  }>;
};

export default async function AndaimeDetailPage({ params }: Props) {
  const { id } = await params;
  const scaffoldResult = await getScaffoldById(id);
  if (!scaffoldResult) notFound();
  const scaffold = scaffoldResult as ScaffoldDetail;
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
    canUpdateScaffold,
    canAddDocument,
    canDeleteDocument,
    access,
    auditTimeline,
  ] = await Promise.all([
    getScaffoldDocuments(id),
    canCurrentUser("inspections.create"),
    canCurrentUser("scaffolds.complete_assembly"),
    canCurrentUser("scaffolds.dismantle"),
    canCurrentUser("scaffolds.update"),
    canCurrentUser("documents.create"),
    canCurrentUser("permissions.manage"),
    getCurrentUserAccess(),
    getEntityAuditTimeline({
      entityType: AuditEntityType.SCAFFOLD,
      entityId: scaffold.id,
    }),
  ]);
  const canActOnNonConformity = Boolean(
    access?.roleCodes.some(
      (roleCode: string) =>
        roleCode === "SUPER_ADMIN" ||
        NC_RESPONSIBLE_ROLE_CODES.includes(roleCode),
    ),
  );

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <div className={`max-w-4xl ${surface.pageStackContained}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/andaimes" aria-label="Voltar para andaimes">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <p className={`min-w-0 ${typography.sectionLabel} text-muted-foreground`}>
            <Link href="/andaimes" className="hover:text-foreground">
              Andaimes
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">{scaffold.code}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <LinkedRecordsButton
            type="inspections"
            records={inspections}
            scaffoldId={scaffold.id}
            scaffoldCode={scaffold.code}
          />
          <LinkedRecordsButton
            type="nonConformities"
            records={scaffold.nonConformities}
            scaffoldId={scaffold.id}
            scaffoldCode={scaffold.code}
          />
          <AuditTimelineButton items={auditTimeline} />
          <LazyScaffoldActionsBar
            scaffoldId={scaffold.id}
            scaffoldCode={scaffold.code}
            status={scaffold.status}
            canCreateInspection={canCreateInspection}
            hasActiveNonConformity={Boolean(activeNonConformity)}
            canCompleteAssembly={canCompleteAssembly}
            canDismantle={canDismantle}
            canUpdateScaffold={canUpdateScaffold}
          />
        </div>
      </div>

      {activeNonConformity && (
        <div className={`${surface.warningAlert} px-4 py-3`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className={`${typography.bodyStrong} leading-relaxed`}>
              {canActOnNonConformity
                ? "Existe não conformidade ativa vinculada a este andaime. Conclua a tratativa para permitir uma nova inspeção."
                : "Existe não conformidade ativa vinculada a este andaime. Uma nova inspeção poderá ser iniciada após a conclusão da tratativa pelo responsável."}
            </p>
          </div>
        </div>
      )}

      <div className={`px-5 py-4 ${surface.operationalHero}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className={`${typography.pageEyebrow} mb-1 ${surface.onDarkSubtleText}`}>
              Ficha Técnica do Ativo
            </p>
            <h1 className={`${typography.pageCodeTitle} text-primary-foreground`}>
              {scaffold.code}
            </h1>
            <p className={`mt-0.5 ${typography.sectionDescription} ${surface.onDarkMutedText}`}>
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
            value={getScaffoldTypeLabel(scaffold.type)}
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
            <div className={surface.actionFooter}>
              <p className={`${typography.sectionLabel} mb-1 text-muted-foreground`}>
                Observações
              </p>
              <p className={`${typography.sectionDescription} leading-relaxed text-foreground`}>
                {scaffold.notes}
              </p>
            </div>
          )}
        </TechCard>
      </div>

      <LazyScaffoldDocumentSection
        scaffoldId={scaffold.id}
        initialDocuments={documents}
        canAddDocument={canAddDocument}
        canDeleteDocument={canDeleteDocument}
      />

      <LazyScaffoldQRCard
        scaffoldCode={scaffold.code}
        tag={scaffold.tag}
        origin={origin}
      />
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
    <div className={surface.panel}>
      <div className={`flex items-center justify-between ${surface.panelHeaderMuted}`}>
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
          <p className={`${typography.panelTitle} text-foreground`}>
            {title}
          </p>
        </div>
        {extra}
      </div>
      <div className={surface.listDivider}>{children}</div>
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
        <p className={`${typography.sectionLabel} shrink-0 text-muted-foreground`}>
          {label}
        </p>
        <p className={`${typography.bodyStrong} truncate text-right text-foreground`}>
          {value}
        </p>
      </div>
    </div>
  );
}
