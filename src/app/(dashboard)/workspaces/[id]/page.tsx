import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceDetail } from "@/lib/actions/workspace-actions";
import { canCurrentUser } from "@/lib/authz";
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
import { WorkspaceStatusButton } from "./workspace-status-button";

const TYPE_LABELS = {
  CLIENT: "Cliente / Contratante",
  HSE_MANAGER: "Gerenciadora HSE",
  SCAFFOLD_COMPANY: "Empresa de andaimes",
  CONTRACTOR: "Contratada",
};

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workspace, canManage] = await Promise.all([
    getWorkspaceDetail(id),
    canCurrentUser("workspaces.manage"),
  ]);
  if (!workspace) notFound();

  const indicators = [
    { label: "Empresas", value: workspace._count.companyLinks, icon: Building2 },
    { label: "Usuarios", value: workspace._count.users, icon: Users },
    { label: "Andaimes", value: workspace._count.scaffolds, icon: Construction },
    { label: "Inspecoes", value: workspace._count.inspections, icon: ClipboardCheck },
    { label: "Nao Conformidades", value: workspace._count.nonConformities, icon: ClipboardList },
    { label: "Documentos", value: workspace._count.scaffoldDocuments, icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace / Planta</p>
          <h1 className="text-2xl font-bold tracking-tight">{workspace.name}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{workspace.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <Button asChild variant="outline"><Link href={`/workspaces?edit=${workspace.id}`}><Pencil /> Editar</Link></Button>}
          {canManage && <WorkspaceStatusButton id={workspace.id} active={workspace.active} />}
          <Button asChild variant="outline"><Link href="/workspaces"><ArrowLeft /> Voltar</Link></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {indicators.map((indicator) => <Card key={indicator.label} className="rounded-none"><CardContent className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{indicator.label}</p><p className="mt-1 font-mono text-2xl font-bold">{indicator.value}</p></div><indicator.icon className="size-5 text-primary" /></CardContent></Card>)}
      </div>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Nome" value={workspace.name} />
          <Info label="Codigo" value={workspace.code} mono />
          <Info label="Empresa proprietaria" value={workspace.ownerCompany.name} />
          <Info label="Status" value={workspace.active ? "Ativo" : "Inativo"} />
          <Info label="Cidade / Estado" value={[workspace.city, workspace.state].filter(Boolean).join(" / ") || "Nao informado"} />
          <Info label="Endereco" value={workspace.address ?? "Nao informado"} />
          <Info label="Coordenadas" value={workspace.latitude === null || workspace.longitude === null ? "Nao informadas" : `${workspace.latitude.toFixed(6)}, ${workspace.longitude.toFixed(6)}`} mono />
          <Info label="Data de criacao" value={new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(workspace.createdAt)} />
          <div className="sm:col-span-2 lg:col-span-4"><Info label="Descricao" value={workspace.description ?? "Nao informada"} /></div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-4" /> Empresas vinculadas</CardTitle></CardHeader>
        <CardContent>
          {workspace.companyLinks.length === 0 ? (
            <div className="border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma empresa opera neste workspace.</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {workspace.companyLinks.map(({ company, role }) => (
                <Link key={company.id} href={`/empresas/${company.id}`} className="flex items-center justify-between gap-3 border bg-muted/15 p-3 transition-colors hover:bg-muted/40">
                  <div className="min-w-0"><p className="truncate text-xs font-bold">{company.name}</p><p className="font-mono text-[10px] text-muted-foreground">{company.code}</p></div>
                  <div className="flex shrink-0 flex-col items-end gap-1"><Badge variant="outline" className="rounded-none text-[9px]">{role === "OWNER" ? "Proprietaria" : TYPE_LABELS[company.type]}</Badge><span className={`text-[9px] font-bold uppercase ${company.active ? "text-emerald-700" : "text-muted-foreground"}`}>{company.active ? "Ativa" : "Inativa"}</span></div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p></div>;
}
