import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ActionMenu,
  actionMenuItemClassName,
} from "@/components/shared/action-menu";
import {
  createOperationalArea,
  getWorkspaceDetail,
  setOperationalAreaActive,
  updateOperationalArea,
} from "@/lib/actions/workspace-actions";
import { canCurrentUser } from "@/lib/authz";
import { typography } from "@/lib/design-system";
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Construction,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Save,
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
      type: keyof typeof TYPE_LABELS;
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
    { label: "Empresas", value: workspace._count.companyLinks, icon: Building2 },
    { label: "Usuários", value: workspace._count.users, icon: Users },
    { label: "Andaimes", value: workspace._count.scaffolds, icon: Construction },
    { label: "Inspeções", value: workspace._count.inspections, icon: ClipboardCheck },
    { label: "Não Conformidades", value: workspace._count.nonConformities, icon: ClipboardList },
    { label: "Documentos", value: workspace._count.scaffoldDocuments, icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><MapPin className="size-4" /> AndCheck • Workspaces</p>
          <h1 className={`${typography.pageTitle} text-foreground`}>{workspace.name}</h1>
          <p className={`mt-0.5 font-mono ${typography.sectionDescription} text-muted-foreground`}>{workspace.code}</p>
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
        {indicators.map((indicator) => <Card key={indicator.label} className="min-w-0 rounded-lg py-0"><CardContent className="flex min-w-0 items-center justify-between gap-2 p-2.5 sm:p-3"><div className="min-w-0"><p className="break-words text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{indicator.label}</p><p className="mt-1 font-mono text-xl font-bold">{indicator.value}</p></div><indicator.icon className="size-4 shrink-0 text-primary" /></CardContent></Card>)}
      </div>

      <Card className="rounded-lg">
        <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Nome" value={workspace.name} />
          <Info label="Código" value={workspace.code} mono />
          <Info label="Empresa proprietária" value={workspace.ownerCompany.name} />
          <Info label="Status" value={workspace.active ? "Ativo" : "Inativo"} />
          <Info label="Cidade / Estado" value={[workspace.city, workspace.state].filter(Boolean).join(" / ") || "Não informado"} />
          <Info label="Endereço" value={workspace.address ?? "Não informado"} />
          <Info label="Coordenadas" value={workspace.latitude === null || workspace.longitude === null ? "Não informadas" : `${workspace.latitude.toFixed(6)}, ${workspace.longitude.toFixed(6)}`} mono />
          <Info label="Data de criação" value={new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(workspace.createdAt)} />
          <div className="sm:col-span-2 lg:col-span-4"><Info label="Descrição" value={workspace.description ?? "Não informada"} /></div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-4" /> Empresas vinculadas</CardTitle></CardHeader>
        <CardContent>
          {workspace.companyLinks.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa vinculada"
              description="As empresas que operam neste workspace aparecerão aqui."
              className="border-dashed"
            />
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {workspace.companyLinks.map(({ company, role }) => (
                <Link key={company.id} href={`/empresas/${company.id}`} className="andcheck-lift flex min-w-0 items-center justify-between gap-3 border bg-muted/15 p-3 hover:bg-muted/40">
                  <div className="min-w-0"><p className="truncate text-xs font-bold">{company.name}</p><p className="font-mono text-[10px] text-muted-foreground">{company.code}</p></div>
                  <div className="flex shrink-0 flex-col items-end gap-1"><Badge variant="outline" className="rounded-md text-[9px]">{role === "OWNER" ? "Proprietária" : TYPE_LABELS[company.type]}</Badge><span className={`text-[9px] font-bold uppercase ${company.active ? "text-emerald-700" : "text-muted-foreground"}`}>{company.active ? "Ativa" : "Inativa"}</span></div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-4" /> Áreas operacionais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {canManage && (
            <form action={createOperationalArea} className="grid gap-2 border border-border bg-muted/20 p-2 md:grid-cols-[minmax(180px,1fr)_120px_minmax(220px,1.4fr)_auto]">
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <Input name="name" placeholder="Nome da área" required className="h-8 rounded-md text-xs" />
              <Input name="code" placeholder="Código" className="h-8 rounded-md text-xs" />
              <Input name="description" placeholder="Descrição" className="h-8 rounded-md text-xs" />
              <Button type="submit" size="sm" className="h-8 rounded-md text-xs"><Plus className="size-3.5" /> Adicionar</Button>
            </form>
          )}

          {workspace.operationalAreas.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Nenhuma área operacional"
              description="Cadastre as áreas do workspace para padronizar o formulário de novos andaimes."
              className="border-dashed"
            />
          ) : (
            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border text-left text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2">Área</th>
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2 text-right">Andaimes</th>
                    <th className="px-3 py-2">Status</th>
                    {canManage && <th className="px-3 py-2 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {workspace.operationalAreas.map((area) => (
                    <tr key={area.id} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-2 align-top font-medium">{area.name}</td>
                      <td className="px-3 py-2 align-top">
                        {area.code ? <span className="font-mono text-xs">{area.code}</span> : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="max-w-md px-3 py-2 align-top text-xs text-muted-foreground">{area.description || "Sem descrição"}</td>
                      <td className="px-3 py-2 text-right align-top font-mono text-xs">{area._count.scaffolds}</td>
                      <td className="px-3 py-2 align-top">
                        <Badge variant={area.isActive ? "default" : "secondary"} className="rounded-md text-[9px]">{area.isActive ? "Ativa" : "Inativa"}</Badge>
                      </td>
                      {canManage && (
                        <td className="px-3 py-2 align-top">
                          <div className="flex justify-end gap-2">
                            <details className="group relative">
                              <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted">
                                <Pencil className="size-3.5" /> Editar
                              </summary>
                              <div className="mt-2 w-[360px] border border-border bg-card p-3 shadow-sm">
                                <form action={updateOperationalArea} className="grid gap-2 sm:grid-cols-[1fr_110px]">
                                  <input type="hidden" name="areaId" value={area.id} />
                                  <Input name="name" defaultValue={area.name} required className="h-8 rounded-md text-xs" />
                                  <Input name="code" defaultValue={area.code ?? ""} className="h-8 rounded-md text-xs" />
                                  <Input name="description" defaultValue={area.description ?? ""} className="h-8 rounded-md text-xs sm:col-span-2" />
                                  <Button type="submit" size="sm" variant="outline" className="h-8 rounded-md text-xs sm:col-span-2"><Save className="size-3.5" /> Salvar</Button>
                                </form>
                              </div>
                            </details>
                            <form action={setOperationalAreaActive.bind(null, area.id, !area.isActive)}>
                              <Button type="submit" variant="outline" size="sm" className="h-8 rounded-md text-xs">
                                {area.isActive ? "Desativar" : "Ativar"}
                              </Button>
                            </form>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className={`mt-1 break-words text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p></div>;
}
