import { EmptyState } from "@/components/shared/empty-state";
import {
  ActionMenu,
  actionMenuItemClassName,
} from "@/components/shared/action-menu";
import { ActiveStatusBadge } from "@/components/shared/active-status-badge";
import { Badge } from "@/components/ui/badge";
import { getWorkspaceDetail } from "@/lib/actions/workspace-actions";
import { canCurrentUser } from "@/lib/authz";
import { getCompanyTypeLabel, type CompanyTypeCode } from "@/lib/company-types";
import { surface, typography } from "@/lib/design-system";
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Construction,
  FileText,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OperationalAreasManager } from "./operational-areas-manager";
import { WorkspaceStatusButton } from "./workspace-status-button";

type WorkspaceDetail = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  city: string | null;
  state: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  createdAt: Date;
  ownerCompany: { id: string; name: string };
  companyLinks: Array<{
    role: string;
    company: {
      id: string;
      name: string;
      code: string;
      type: CompanyTypeCode;
      active: boolean;
    };
  }>;
  operationalAreas: Array<{
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    isActive: boolean;
    _count: { scaffolds: number };
  }>;
  _count: {
    companyLinks: number;
    users: number;
    scaffolds: number;
    inspections: number;
    nonConformities: number;
    scaffoldDocuments: number;
  };
};

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspaceResult, canManage] = await Promise.all([
    getWorkspaceDetail(id),
    canCurrentUser("workspaces.manage"),
  ]);
  if (!workspaceResult) notFound();
  const workspace = workspaceResult as WorkspaceDetail;

  const indicators = [
    {
      label: "Empresas",
      value: workspace._count.companyLinks,
      icon: Building2,
      iconClass: "text-blue-600",
      borderClass: "border-l-4 border-l-blue-500",
      valueClass: "text-blue-700",
    },
    {
      label: "Usuários",
      value: workspace._count.users,
      icon: Users,
      iconClass: "text-green-600",
      borderClass: "border-l-4 border-l-green-500",
      valueClass: "text-green-700",
    },
    {
      label: "Andaimes",
      value: workspace._count.scaffolds,
      icon: Construction,
      iconClass: "text-amber-600",
      borderClass: "border-l-4 border-l-amber-500",
      valueClass: "text-amber-700",
    },
    {
      label: "Inspeções",
      value: workspace._count.inspections,
      icon: ClipboardCheck,
      iconClass: "text-violet-600",
      borderClass: "border-l-4 border-l-violet-500",
      valueClass: "text-violet-700",
    },
    {
      label: "Não conformidades",
      value: workspace._count.nonConformities,
      icon: ClipboardList,
      iconClass: "text-rose-600",
      borderClass: "border-l-4 border-l-rose-500",
      valueClass: "text-rose-700",
    },
    {
      label: "Documentos",
      value: workspace._count.scaffoldDocuments,
      icon: FileText,
      iconClass: "text-muted-foreground",
      borderClass: "border-l-4 border-l-muted-foreground",
      valueClass: "text-foreground",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className={`mb-1 flex items-center gap-2 ${typography.pageEyebrow} text-muted-foreground`}
          >
            <MapPin className="size-4" />
            AndCheck • Workspaces
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            {workspace.name}
          </h1>
          <p
            className={`mt-0.5 font-mono ${typography.sectionDescription} text-muted-foreground`}
          >
            {workspace.code}
          </p>
        </div>
        <ActionMenu className="justify-end sm:w-auto">
          {canManage && (
            <Link
              href={`/workspaces?edit=${workspace.id}`}
              className={actionMenuItemClassName}
            >
              <Pencil className="size-3.5" /> Editar
            </Link>
          )}
          {canManage && (
            <WorkspaceStatusButton
              id={workspace.id}
              active={workspace.active}
              className={actionMenuItemClassName}
            />
          )}
          <Link href="/workspaces" className={actionMenuItemClassName}>
            <ArrowLeft className="size-3.5" /> Voltar
          </Link>
        </ActionMenu>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {indicators.map((indicator) => (
          <Kpi key={indicator.label} {...indicator} />
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className={surface.panelHeader}>
          <div className="flex items-center gap-2">
            <MapPin className={surface.panelHeaderIcon} />
            <h2 className={surface.panelHeaderTitle}>Dados gerais</h2>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="break-words text-[18px] font-bold leading-tight text-foreground">
                {workspace.name}
              </p>
              <p
                className={`mt-0.5 break-all text-muted-foreground ${typography.codeMuted}`}
              >
                {workspace.code}
              </p>
            </div>
            <ActiveStatusBadge active={workspace.active} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Empresa proprietária"
              value={workspace.ownerCompany.name}
            />
            <Info
              label="Cidade / Estado"
              value={
                [workspace.city, workspace.state].filter(Boolean).join(" / ") ||
                "Não informado"
              }
            />
            <Info
              label="Endereço"
              value={workspace.address ?? "Não informado"}
            />
            <Info
              label="Data de criação"
              value={new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
              }).format(workspace.createdAt)}
            />
            <Info
              label="Coordenadas"
              value={
                workspace.latitude === null || workspace.longitude === null
                  ? "Não informadas"
                  : `${workspace.latitude.toFixed(6)}, ${workspace.longitude.toFixed(6)}`
              }
              mono
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <Info
                label="Descrição"
                value={workspace.description ?? "Não informada"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className={surface.panelHeader}>
          <div className="flex items-center gap-2">
            <Building2 className={surface.panelHeaderIcon} />
            <h2 className={surface.panelHeaderTitle}>Empresas vinculadas</h2>
          </div>
          <p className={surface.panelHeaderSubtitle}>
            {workspace.companyLinks.length} registro(s)
          </p>
        </div>
        <div className="p-4">
          {workspace.companyLinks.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa vinculada"
              description="As empresas que operam neste workspace aparecerão aqui."
              className="border-dashed"
            />
          ) : (
            <div className="andcheck-long-list grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workspace.companyLinks.map(({ company, role }) => (
                <Link
                  key={company.id}
                  href={`/empresas/${company.id}`}
                  className="andcheck-lift flex min-h-24 min-w-0 flex-col justify-between rounded-lg border border-border bg-card p-3 shadow-sm hover:bg-primary/5"
                >
                  <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`break-words text-foreground sm:truncate ${typography.bodyStrong}`}
                      >
                        {company.name}
                      </p>
                      <p
                        className={`mt-1 break-all text-muted-foreground ${typography.codeMuted}`}
                      >
                        {company.code}
                      </p>
                    </div>
                    <ActiveStatusBadge active={company.active} compact />
                  </div>
                  <Badge
                    variant="outline"
                    className={`w-fit max-w-full rounded-md ${typography.badge}`}
                  >
                    {role === "OWNER"
                      ? "Proprietária"
                      : getCompanyTypeLabel(company.type)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className={surface.panelHeader}>
          <div className="flex items-center gap-2">
            <MapPin className={surface.panelHeaderIcon} />
            <h2 className={surface.panelHeaderTitle}>Áreas operacionais</h2>
          </div>
          <p className={surface.panelHeaderSubtitle}>
            {workspace.operationalAreas.length} registro(s)
          </p>
        </div>
        <div className="p-4">
          <OperationalAreasManager
            workspaceId={workspace.id}
            canManage={canManage}
            areas={workspace.operationalAreas}
          />
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className={`${typography.sectionLabel} text-muted-foreground`}>
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  iconClass,
  borderClass,
  valueClass,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  iconClass: string;
  borderClass: string;
  valueClass: string;
}) {
  return (
    <div
      className={`andcheck-lift min-w-0 rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4 ${borderClass}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p
          className={`${typography.sectionLabel} leading-tight text-muted-foreground`}
        >
          {label}
        </p>
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
      </div>
      <p className={`${typography.kpiValue} leading-none ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
