import { ActiveStatusBadge } from "@/components/shared/active-status-badge";
import { Button } from "@/components/ui/button";
import { getCompanyDetail } from "@/lib/actions/company-actions";
import { getCompanyTypeLabel, type CompanyTypeCode } from "@/lib/company-types";
import { surface, typography } from "@/lib/design-system";
import { getUploadedFilePreviewUrl } from "@/lib/upload-file";
import { ArrowLeft, Building2, ClipboardCheck, ClipboardList, Construction, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type CompanyDetail = {
  id: string;
  name: string;
  code: string;
  type: CompanyTypeCode;
  active: boolean;
  createdAt: Date;
  description: string | null;
  logoUrl: string | null;
  workspaceLinks: Array<{
    active: boolean;
    workspace: { id: string; name: string; code: string; active: boolean };
  }>;
  _count: {
    users: number;
    scaffolds: number;
    inspections: number;
    nonConformities: number;
  };
};

export default async function EmpresaDetalhePage({ params }: PageProps<"/empresas/[id]">) {
  const { id } = await params;
  const result = await getCompanyDetail(id);
  if (!result) notFound();
  const company = result as CompanyDetail;

  const indicators = [
    { label: "Usuários", value: company._count.users, icon: Users },
    { label: "Andaimes", value: company._count.scaffolds, icon: Construction },
    { label: "Inspeções", value: company._count.inspections, icon: ClipboardCheck },
    { label: "NCs", value: company._count.nonConformities, icon: ClipboardList },
  ];

  return (
    <div className="space-y-5">
      <div className={surface.pageHeaderResponsive}>
        <div>
          <p
            className={`mb-1 flex items-center gap-2 ${typography.pageEyebrow} text-muted-foreground`}
          ><Building2 className="size-4" /> AndCheck • Empresas</p>
          <h1 className={`${typography.pageTitle} text-foreground`}>{company.name}</h1>
          <p className={`mt-0.5 ${typography.codeMuted} text-muted-foreground`}>{company.code}</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/empresas"><ArrowLeft /> Voltar</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicators.map((indicator) => <div key={indicator.label} className={`flex min-w-0 items-center justify-between gap-2 ${surface.kpiCard}`}><div className="min-w-0"><p className={`break-words ${typography.sectionLabel} text-muted-foreground`}>{indicator.label}</p><p className={`mt-1 ${typography.kpiValue}`}>{indicator.value}</p></div><indicator.icon className="size-4 shrink-0 text-primary" /></div>)}
      </div>

      <section className={surface.panel}>
        <div className={surface.panelHeaderSubtle}>
          <h2 className={`flex items-center gap-2 ${typography.bodyStrong}`}>
            <Building2 className="size-4" />
            Dados Gerais da Empresa
          </h2>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className={`flex min-w-0 items-start gap-3 p-3 ${surface.subtleBox}`}>
            <CompanyLogo name={company.name} logoUrl={company.logoUrl} />
            <div className="min-w-0">
              <p className={`${typography.pageTitle} break-words leading-tight text-foreground`}>
                {company.name}
              </p>
              <p className={`mt-0.5 break-all text-muted-foreground ${typography.codeMuted}`}>
                {company.code}
              </p>
              <div className="mt-2">
                <ActiveStatusBadge
                  active={company.active}
                  activeLabel="Ativa"
                  inactiveLabel="Inativa"
                  compact
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Workspaces vinculados" value={company.workspaceLinks.filter((link) => link.active).map((link) => link.workspace.name).join(", ") || "Sem vinculo operacional"} />
            <Info label="Tipo" value={getCompanyTypeLabel(company.type)} />
            <Info label="Status" value={company.active ? "Ativa" : "Inativa"} />
            <Info label="Data de criação" value={new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(company.createdAt)} />
            <div className="sm:col-span-2"><Info label="Descrição" value={company.description ?? "Não informada"} /></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className={`${typography.sectionLabel} text-muted-foreground`}>{label}</p><p className={`mt-1 break-words ${typography.bodyStrong}`}>{value}</p></div>;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function CompanyLogo({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  if (logoUrl) {
    return (
      // Logos podem vir de storage privado ou URL externa cadastrada.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getUploadedFilePreviewUrl(logoUrl)}
        alt={`Logo ${name}`}
        className="size-14 shrink-0 border bg-white object-contain p-1"
      />
    );
  }

  return (
    <div className={`flex size-14 shrink-0 items-center justify-center bg-primary ${typography.badgeLg} text-primary-foreground`}>
      {getInitials(name) || "AC"}
    </div>
  );
}
