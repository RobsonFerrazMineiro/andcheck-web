import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanyDetail } from "@/lib/actions/company-actions";
import { typography } from "@/lib/design-system";
import { getUploadedFilePreviewUrl } from "@/lib/upload-file";
import { ArrowLeft, Building2, ClipboardCheck, ClipboardList, Construction, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const TYPE_LABELS = {
  CLIENT: "Cliente / Contratante",
  HSE_MANAGER: "Gerenciadora HSE",
  SCAFFOLD_COMPANY: "Empresa de andaimes",
  CONTRACTOR: "Contratada",
};

type CompanyDetail = {
  id: string;
  name: string;
  code: string;
  type: keyof typeof TYPE_LABELS;
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
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><Building2 className="size-4" /> AndCheck • Empresas</p>
          <h1 className={`${typography.pageTitle} text-foreground`}>{company.name}</h1>
          <p className={`mt-0.5 font-mono ${typography.sectionDescription} text-muted-foreground`}>{company.code}</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto"><Link href="/empresas"><ArrowLeft /> Voltar</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicators.map((indicator) => <Card key={indicator.label} className="min-w-0 rounded-lg py-0"><CardContent className="flex min-w-0 items-center justify-between gap-2 p-2.5 sm:p-3"><div className="min-w-0"><p className="break-words text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{indicator.label}</p><p className="mt-1 font-mono text-xl font-bold">{indicator.value}</p></div><indicator.icon className="size-4 shrink-0 text-primary" /></CardContent></Card>)}
      </div>

      <Card className="rounded-lg">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-[14px]">
            <Building2 className="size-4" />
            Dados Gerais da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <CompanyLogo name={company.name} logoUrl={company.logoUrl} />
            <div className="min-w-0">
              <p className="break-words text-[18px] font-bold leading-tight text-foreground">
                {company.name}
              </p>
              <p className={`mt-0.5 break-all text-muted-foreground ${typography.codeMuted}`}>
                {company.code}
              </p>
              <Badge variant="outline" className="mt-2 w-fit rounded-md">
                {company.active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Info label="Workspaces vinculados" value={company.workspaceLinks.filter((link) => link.active).map((link) => link.workspace.name).join(", ") || "Sem vinculo operacional"} />
            <Info label="Tipo" value={TYPE_LABELS[company.type]} />
            <Info label="Status" value={company.active ? "Ativa" : "Inativa"} />
            <Info label="Data de criação" value={new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(company.createdAt)} />
            <div className="sm:col-span-2"><Info label="Descrição" value={company.description ?? "Não informada"} /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>;
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
    <div className="flex size-14 shrink-0 items-center justify-center bg-primary text-xs font-bold tracking-wide text-primary-foreground">
      {getInitials(name) || "AC"}
    </div>
  );
}
