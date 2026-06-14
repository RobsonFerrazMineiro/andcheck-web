import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanyDetail } from "@/lib/actions/company-actions";
import { ArrowLeft, Building2, ClipboardCheck, ClipboardList, Construction, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const TYPE_LABELS = {
  CLIENT: "Cliente / Contratante",
  HSE_MANAGER: "Gerenciadora HSE",
  SCAFFOLD_COMPANY: "Empresa de andaimes",
  CONTRACTOR: "Contratada",
};

export default async function EmpresaDetalhePage({ params }: PageProps<"/empresas/[id]">) {
  const { id } = await params;
  const company = await getCompanyDetail(id);
  if (!company) notFound();

  const indicators = [
    { label: "Usuarios", value: company._count.users, icon: Users },
    { label: "Andaimes", value: company._count.scaffolds, icon: Construction },
    { label: "Inspecoes", value: company._count.inspections, icon: ClipboardCheck },
    { label: "NCs", value: company._count.nonConformities, icon: ClipboardList },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Empresa</p>
          <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{company.code}</p>
        </div>
        <Button asChild variant="outline"><Link href="/empresas"><ArrowLeft /> Voltar</Link></Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {indicators.map((indicator) => <Card key={indicator.label} className="rounded-none"><CardContent className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{indicator.label}</p><p className="mt-1 font-mono text-2xl font-bold">{indicator.value}</p></div><indicator.icon className="size-5 text-primary" /></CardContent></Card>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="rounded-none">
          <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="Workspaces vinculados" value={company.workspaceLinks.filter((link) => link.active).map((link) => link.workspace.name).join(", ") || "Sem vinculo operacional"} />
            <Info label="Tipo" value={TYPE_LABELS[company.type]} />
            <Info label="Status" value={company.active ? "Ativa" : "Inativa"} />
            <Info label="Data de criacao" value={new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(company.createdAt)} />
            <div className="sm:col-span-2"><Info label="Descricao" value={company.description ?? "Nao informada"} /></div>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-4" /> Empresa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-lg font-bold">{company.name}</p><Badge variant="outline" className="mt-1 rounded-none">{company.active ? "Ativa" : "Inativa"}</Badge></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {indicators.map((indicator) => <div key={indicator.label} className="border bg-muted/20 p-2"><span className="text-muted-foreground">{indicator.label}:</span> <strong className="font-mono">{indicator.value}</strong></div>)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {indicators.map((indicator) => <Button key={indicator.label} variant="outline" disabled className="justify-start"><indicator.icon /> {indicator.label === "NCs" ? "Nao Conformidades" : indicator.label}</Button>)}
            </div>
            <p className="text-[10px] text-muted-foreground">Atalhos preparados para integracao administrativa futura.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>;
}
