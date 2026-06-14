"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCompany, setCompanyActive, updateCompany } from "@/lib/actions/company-actions";
import { Building2, CheckCircle2, Eye, Factory, Loader2, Pencil, Plus, Power, Search, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type CompanyType = "CLIENT" | "HSE_MANAGER" | "SCAFFOLD_COMPANY" | "CONTRACTOR";
type CompanyRow = {
  id: string;
  name: string;
  code: string;
  type: CompanyType;
  active: boolean;
  description: string | null;
  logoUrl: string | null;
  workspaceNames: string[];
  users: number;
  scaffolds: number;
};

const TYPE_LABELS: Record<CompanyType, string> = {
  CLIENT: "Cliente / Contratante",
  HSE_MANAGER: "Gerenciadora HSE",
  SCAFFOLD_COMPANY: "Empresa de andaimes",
  CONTRACTOR: "Contratada",
};

const TYPE_BADGE_STYLES: Record<CompanyType, string> = {
  CLIENT: "border-blue-200 bg-blue-50 text-blue-700",
  HSE_MANAGER: "border-violet-200 bg-violet-50 text-violet-700",
  SCAFFOLD_COMPANY: "border-amber-200 bg-amber-50 text-amber-700",
  CONTRACTOR: "border-slate-200 bg-slate-100 text-slate-600",
};

const FORM_TYPE_OPTIONS: Array<[string, string]> = [
  ["CLIENT", TYPE_LABELS.CLIENT],
  ["HSE_MANAGER", TYPE_LABELS.HSE_MANAGER],
  ["SCAFFOLD_COMPANY", TYPE_LABELS.SCAFFOLD_COMPANY],
];

export function EmpresasClient({
  initialCompanies,
  workspaces,
  canManage,
}: {
  initialCompanies: CompanyRow[];
  workspaces: Array<{ id: string; name: string }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return initialCompanies.filter((company) => {
      const matchesSearch = !term || [company.name, company.code, ...company.workspaceNames]
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(term));
      const matchesStatus = status === "all" || (status === "active") === company.active;
      return matchesSearch && matchesStatus && (type === "all" || type === company.type);
    });
  }, [initialCompanies, search, status, type]);

  const activeCount = initialCompanies.filter((company) => company.active).length;
  const totalUsers = initialCompanies.reduce((sum, company) => sum + company.users, 0);
  const totalScaffolds = initialCompanies.reduce((sum, company) => sum + company.scaffolds, 0);
  const typeCounts = useMemo(
    () =>
      initialCompanies.reduce<Record<CompanyType, number>>(
        (counts, company) => ({
          ...counts,
          [company.type]: counts[company.type] + 1,
        }),
        { CLIENT: 0, HSE_MANAGER: 0, SCAFFOLD_COMPANY: 0, CONTRACTOR: 0 },
      ),
    [initialCompanies],
  );

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editing) await updateCompany(formData);
        else await createCompany(formData);
        toast.success(editing ? "Empresa atualizada." : "Empresa criada.");
        setEditing(null);
        setCreating(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a empresa.");
      }
    });
  }

  function toggleStatus(company: CompanyRow) {
    startTransition(async () => {
      try {
        await setCompanyActive(company.id, !company.active);
        toast.success(`Empresa ${company.active ? "desativada" : "ativada"}.`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar o status.");
      }
    });
  }

  const formCompany = editing;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Administracao</p>
          <h1 className="text-2xl font-bold tracking-tight">Gestao de Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cadastro, vinculo operacional e status das empresas.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setCreating((value) => !value); }} disabled={isPending}>
            <Plus /> Nova empresa
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Building2} label="Empresas" value={initialCompanies.length} />
        <Kpi icon={CheckCircle2} label="Ativas" value={activeCount} />
        <Kpi icon={Users} label="Usuarios" value={totalUsers} />
        <Kpi icon={Factory} label="Andaimes" value={totalScaffolds} />
      </div>

      {(creating || editing) && canManage && (
        <Card className="rounded-none border-primary/20">
          <CardContent>
            <form action={submit} className="grid gap-4 lg:grid-cols-2">
              {formCompany && <input type="hidden" name="companyId" value={formCompany.id} />}
              <Field label="Nome" name="name" defaultValue={formCompany?.name} required />
              <Field label="Codigo" name="code" defaultValue={formCompany?.code} placeholder="Gerado automaticamente" />
              <SelectField label="Tipo" name="type" defaultValue={formCompany?.type === "CONTRACTOR" ? "SCAFFOLD_COMPANY" : formCompany?.type ?? "SCAFFOLD_COMPANY"} options={FORM_TYPE_OPTIONS} />
              <OptionalSelectField label="Vincular a workspace" name="workspaceId" options={workspaces.map((workspace) => [workspace.id, workspace.name])} />
              <SelectField label="Status" name="status" defaultValue={formCompany?.active === false ? "INACTIVE" : "ACTIVE"} options={[["ACTIVE", "Ativa"], ["INACTIVE", "Inativa"]]} />
              <Field label="Logo" name="logoUrl" defaultValue={formCompany?.logoUrl ?? undefined} placeholder="URL da logo (opcional)" />
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="description">Descricao</Label>
                <Textarea id="description" name="description" defaultValue={formCompany?.description ?? ""} placeholder="Descricao opcional" />
              </div>
              <div className="flex justify-end gap-2 lg:col-span-2">
                <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="animate-spin" />} Salvar empresa</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 border border-border bg-card p-3">
        <div className="flex flex-wrap gap-2" aria-label="Filtros rapidos por tipo de empresa">
          <TypeFilterButton
            active={type === "all"}
            label="Todas"
            count={initialCompanies.length}
            onClick={() => setType("all")}
          />
          {FORM_TYPE_OPTIONS.map(([value, label]) => (
            <TypeFilterButton
              key={value}
              active={type === value}
              label={label}
              count={typeCounts[value as CompanyType]}
              onClick={() => setType(value)}
            />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_190px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, codigo ou workspace" className="pl-8" />
          </div>
          <FilterSelect value={status} onValueChange={setStatus} placeholder="Todos os status" options={[["active", "Ativas"], ["inactive", "Inativas"]]} />
        </div>
      </div>

      <div className="overflow-hidden border border-border bg-card">
        <div className="hidden grid-cols-[minmax(180px,1.4fr)_150px_minmax(180px,1fr)_80px_80px_90px_120px] gap-4 border-b bg-muted/40 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground lg:grid">
          <span>Nome</span><span>Tipo</span><span>Workspace</span><span>Usuarios</span><span>Andaimes</span><span>Status</span><span className="text-right">Acoes</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</div>
        ) : filtered.map((company, index) => (
          <div key={company.id} className={`flex items-center gap-3 px-4 py-3 lg:grid lg:grid-cols-[minmax(180px,1.4fr)_150px_minmax(180px,1fr)_80px_80px_90px_120px] lg:gap-4 ${index % 2 ? "bg-muted/20" : "bg-card"}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{company.name}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{company.code}</p>
            </div>
            <Badge variant="outline" className={`hidden w-fit rounded-none text-[9px] lg:inline-flex ${TYPE_BADGE_STYLES[company.type]}`}>{TYPE_LABELS[company.type]}</Badge>
            <p className="hidden truncate text-[11px] text-muted-foreground lg:block">{company.workspaceNames.join(", ") || "Sem vinculo"}</p>
            <p className="hidden font-mono text-xs lg:block">{company.users}</p>
            <p className="hidden font-mono text-xs lg:block">{company.scaffolds}</p>
            <StatusBadge active={company.active} />
            <div className="flex justify-end gap-1">
              <Button asChild variant="outline" size="icon-sm" title="Visualizar"><Link href={`/empresas/${company.id}`}><Eye /></Link></Button>
              {canManage && <Button variant="outline" size="icon-sm" title="Editar" onClick={() => { setCreating(false); setEditing(company); }}><Pencil /></Button>}
              {canManage && <Button variant="outline" size="icon-sm" title={company.active ? "Desativar" : "Ativar"} onClick={() => toggleStatus(company)} disabled={isPending}><Power /></Button>}
            </div>
          </div>
        ))}
        <div className="border-t bg-muted/30 px-4 py-2 text-[9px] uppercase tracking-widest text-muted-foreground/50">{filtered.length} registro(s) · Modulo administrativo</div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return <Card className="rounded-none"><CardContent className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-mono text-2xl font-bold">{value}</p></div><Icon className="size-5 text-primary" /></CardContent></Card>;
}

function Field({ label, name, defaultValue, placeholder, required }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  return <div className="space-y-1.5"><Label htmlFor={name}>{label}{required ? " *" : ""}</Label><Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} /></div>;
}

function SelectField({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string; options: Array<[string, string]> }) {
  return <div className="space-y-1.5"><Label>{label} *</Label><Select name={name} defaultValue={defaultValue} required><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>;
}

function OptionalSelectField({ label, name, options }: { label: string; name: string; options: Array<[string, string]> }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Select name={name} defaultValue="none"><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nao vincular agora</SelectItem>{options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select><p className="text-[10px] text-muted-foreground">Opcional. Novos vinculos nao substituem os existentes.</p></div>;
}

function FilterSelect({ value, onValueChange, placeholder, options }: { value: string; onValueChange: (value: string) => void; placeholder: string; options: Array<[string, string]> }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{placeholder}</SelectItem>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent></Select>;
}

function TypeFilterButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
      <span className={`font-mono text-[9px] ${active ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
        {count}
      </span>
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`inline-flex w-fit items-center gap-1 border px-2 py-0.5 text-[10px] font-bold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}{active ? "Ativa" : "Inativa"}</span>;
}
