"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormModal } from "@/components/shared/form-modal";
import {
  createCompany,
  setCompanyActive,
  updateCompany,
} from "@/lib/actions/company-actions";
import { surface, typography } from "@/lib/design-system";
import { getUploadedFilePreviewUrl, uploadFile } from "@/lib/upload-file";
import {
  Building2,
  CheckCircle2,
  Eye,
  Factory,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  const [statusTarget, setStatusTarget] = useState<CompanyRow | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return initialCompanies.filter((company) => {
      const matchesSearch =
        !term ||
        [company.name, company.code, ...company.workspaceNames].some((value) =>
          value.toLocaleLowerCase("pt-BR").includes(term),
        );
      const matchesStatus =
        status === "all" || (status === "active") === company.active;
      return (
        matchesSearch &&
        matchesStatus &&
        (type === "all" || type === company.type)
      );
    });
  }, [initialCompanies, search, status, type]);

  const activeCount = initialCompanies.filter(
    (company) => company.active,
  ).length;
  const totalUsers = initialCompanies.reduce(
    (sum, company) => sum + company.users,
    0,
  );
  const totalScaffolds = initialCompanies.reduce(
    (sum, company) => sum + company.scaffolds,
    0,
  );
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
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a empresa.",
        );
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
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o status.",
        );
      } finally {
        setStatusTarget(null);
      }
    });
  }

  const formCompany = editing;

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.active ? "Desativar empresa" : "Ativar empresa"}
        description={
          statusTarget?.active
            ? "A empresa será desativada e deixará de aparecer como ativa nas operações."
            : "A empresa será reativada para uso operacional."
        }
        details={
          statusTarget ? (
            <div className="space-y-1">
              <p className={`${typography.bodyStrong} text-foreground`}>
                {statusTarget.name}
              </p>
              <p className={`${typography.codeMuted} text-muted-foreground`}>
                {statusTarget.code}
              </p>
            </div>
          ) : null
        }
        confirmLabel={statusTarget?.active ? "Desativar empresa" : "Ativar empresa"}
        destructive={Boolean(statusTarget?.active)}
        pending={isPending}
        onCancel={() => setStatusTarget(null)}
        onConfirm={() => {
          if (statusTarget) toggleStatus(statusTarget);
        }}
      />
      <div className="flex flex-col gap-3 pb-4 border-b-2 border-border sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Building2 className="size-4" />
            AndCheck • Empresas
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Gestão de Empresas
          </h1>
          <p
            className={`mt-1 text-muted-foreground ${typography.sectionDescription}`}
          >
            Cadastro, vínculo operacional e status das empresas.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setCreating((value) => !value);
            }}
            disabled={isPending}
          >
            <Plus /> Nova empresa
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Kpi
          icon={Building2}
          label="Empresas"
          value={initialCompanies.length}
          iconClass="text-blue-600"
          borderClass="border-l-4 border-l-blue-500"
          valueClass="text-blue-700"
        />
        <Kpi
          icon={CheckCircle2}
          label="Ativas"
          value={activeCount}
          iconClass="text-green-600"
          borderClass="border-l-4 border-l-green-500"
          valueClass="text-green-700"
        />
        <Kpi
          icon={Users}
          label="Usuários"
          value={totalUsers}
          iconClass="text-violet-600"
          borderClass="border-l-4 border-l-violet-500"
          valueClass="text-violet-700"
        />
        <Kpi
          icon={Factory}
          label="Andaimes"
          value={totalScaffolds}
          iconClass="text-amber-600"
          borderClass="border-l-4 border-l-amber-500"
          valueClass="text-amber-700"
        />
      </div>

      {canManage && (
        <FormModal
          open={creating || Boolean(editing)}
          title={editing ? "Editar empresa" : "Nova empresa"}
          description="Mantenha o cadastro administrativo e os vínculos operacionais da empresa."
          maxWidth="max-w-4xl"
          onClose={() => {
            if (isPending || logoUploading) return;
            setCreating(false);
            setEditing(null);
          }}
        >
            <form action={submit} className="grid gap-4 lg:grid-cols-2">
              {formCompany && (
                <input type="hidden" name="companyId" value={formCompany.id} />
              )}
              <Field
                label="Nome"
                name="name"
                defaultValue={formCompany?.name}
                required
              />
              <Field
                label="Código"
                name="code"
                defaultValue={formCompany?.code}
                placeholder="Gerado automaticamente"
              />
              <SelectField
                label="Tipo"
                name="type"
                defaultValue={
                  formCompany?.type === "CONTRACTOR"
                    ? "SCAFFOLD_COMPANY"
                    : (formCompany?.type ?? "SCAFFOLD_COMPANY")
                }
                options={FORM_TYPE_OPTIONS}
              />
              <OptionalSelectField
                label="Vincular a workspace"
                name="workspaceId"
                options={workspaces.map((workspace) => [
                  workspace.id,
                  workspace.name,
                ])}
              />
              <SelectField
                label="Status"
                name="status"
                defaultValue={
                  formCompany?.active === false ? "INACTIVE" : "ACTIVE"
                }
                options={[
                  ["ACTIVE", "Ativa"],
                  ["INACTIVE", "Inativa"],
                ]}
              />
              <LogoUploadField
                key={formCompany?.id ?? "new-company"}
                initialLogoUrl={formCompany?.logoUrl ?? null}
                onUploadingChange={setLogoUploading}
              />
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={formCompany?.description ?? ""}
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="flex justify-end gap-2 lg:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || logoUploading}
                  onClick={() => {
                    setCreating(false);
                    setEditing(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending || logoUploading}>
                  {(isPending || logoUploading) && (
                    <Loader2 className="animate-spin" />
                  )}{" "}
                  Salvar empresa
                </Button>
              </div>
            </form>
        </FormModal>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div
          className="flex flex-wrap gap-2"
          aria-label="Filtros rapidos por tipo de empresa"
        >
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
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, código ou workspace"
              className="pl-8"
            />
          </div>
          <FilterSelect
            value={status}
            onValueChange={setStatus}
            placeholder="Todos os status"
            options={[
              ["active", "Ativas"],
              ["inactive", "Inativas"],
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div
          className={`hidden grid-cols-[minmax(180px,1.4fr)_150px_minmax(180px,1fr)_80px_80px_90px_120px] gap-4 border-b lg:grid ${surface.tableHeader}`}
        >
          <span>Nome</span>
          <span>Tipo</span>
          <span>Workspace</span>
          <span>Usuários</span>
          <span>Andaimes</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma empresa encontrada"
            description="Ajuste os filtros ou cadastre uma empresa para vincular operações e workspaces."
            className="border-0 border-b border-dashed"
          />
        ) : (
          filtered.map((company, index) => (
            <div
              key={company.id}
              className={`flex items-center gap-3 px-4 py-3 lg:grid lg:grid-cols-[minmax(180px,1.4fr)_150px_minmax(180px,1fr)_80px_80px_90px_120px] lg:gap-4 ${index % 2 ? "bg-muted/20" : "bg-card"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <CompanyLogo
                    name={company.name}
                    logoUrl={company.logoUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p
                      className={`truncate text-foreground ${typography.bodyStrong}`}
                    >
                      {company.name}
                    </p>
                    <p
                      className={`text-muted-foreground ${typography.codeMuted}`}
                    >
                      {company.code}
                    </p>
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`hidden w-fit rounded-md lg:inline-flex ${typography.badge} ${TYPE_BADGE_STYLES[company.type]}`}
              >
                {TYPE_LABELS[company.type]}
              </Badge>
              <p
                className={`hidden truncate text-muted-foreground lg:block ${typography.sectionDescription}`}
              >
                {company.workspaceNames.join(", ") || "Sem vínculo"}
              </p>
              <p className={`hidden lg:block ${typography.code}`}>
                {company.users}
              </p>
              <p className={`hidden lg:block ${typography.code}`}>
                {company.scaffolds}
              </p>
              <StatusBadge active={company.active} />
              <div className="flex justify-end gap-1">
                <Button
                  asChild
                  variant="outline"
                  size="icon-sm"
                  title="Visualizar"
                  aria-label={`Visualizar empresa ${company.name}`}
                >
                  <Link
                    href={`/empresas/${company.id}`}
                    aria-label={`Visualizar empresa ${company.name}`}
                  >
                    <Eye />
                  </Link>
                </Button>
                {canManage && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    title="Editar"
                    aria-label={`Editar empresa ${company.name}`}
                    onClick={() => {
                      setCreating(false);
                      setEditing(company);
                    }}
                  >
                    <Pencil />
                  </Button>
                )}
                {canManage && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    title={company.active ? "Desativar" : "Ativar"}
                    aria-label={
                      company.active
                        ? `Desativar empresa ${company.name}`
                        : `Ativar empresa ${company.name}`
                    }
                    onClick={() => setStatusTarget(company)}
                    disabled={isPending}
                  >
                    <Power />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        <div className="border-t bg-muted/30 px-4 py-2 text-[9px] uppercase tracking-widest text-muted-foreground/50">
          {filtered.length} registro(s) · Módulo administrativo
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  iconClass = "text-primary",
  borderClass = "",
  valueClass = "",
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  iconClass?: string;
  borderClass?: string;
  valueClass?: string;
}) {
  return (
    <div
      className={`andcheck-lift bg-card border border-border rounded-lg p-4 shadow-sm ${borderClass}`}
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

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
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
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "size-8" : "size-14";
  if (logoUrl) {
    return (
      // A logo pode apontar para storage privado ou URL externa administrada.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getUploadedFilePreviewUrl(logoUrl)}
        alt={`Logo ${name}`}
        className={`${dimensions} shrink-0 rounded-md border bg-white object-contain p-1`}
      />
    );
  }

  return (
    <div
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground ${typography.action}`}
    >
      {getInitials(name) || "AC"}
    </div>
  );
}

function LogoUploadField({
  initialLogoUrl,
  onUploadingChange,
}: {
  initialLogoUrl: string | null;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState(
    initialLogoUrl ? getUploadedFilePreviewUrl(initialLogoUrl) : "",
  );
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      toast.error("Use uma imagem PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 2 MB.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(objectUrl);
    setPreviewUrl(objectUrl);
    setIsUploading(true);
    onUploadingChange(true);

    try {
      const uploaded = await uploadFile(file, {
        category: "company-logo",
        fileName: file.name,
      });
      setLogoUrl(uploaded.reference);
      setPreviewUrl(getUploadedFilePreviewUrl(uploaded.reference));
      toast.success("Logo enviada. Salve a empresa para aplicar.");
    } catch (error) {
      setLogoUrl(initialLogoUrl ?? "");
      setPreviewUrl(
        initialLogoUrl ? getUploadedFilePreviewUrl(initialLogoUrl) : "",
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a logo.",
      );
    } finally {
      setIsUploading(false);
      onUploadingChange(false);
      event.target.value = "";
    }
  }

  function clearLogo() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setLogoUrl("");
    setPreviewUrl("");
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="logoFile">Logo</Label>
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <div className="flex items-center gap-3 border bg-muted/20 p-3">
        {previewUrl ? (
          // Preview local/privado da logo selecionada.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Preview da logo"
            className="size-14 shrink-0 border bg-white object-contain p-1"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center border bg-background text-muted-foreground">
            <ImageIcon className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Input
            id="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <p className={`mt-1 text-muted-foreground ${typography.bodyMuted}`}>
            PNG, JPG ou WEBP até 2 MB.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            asChild
          >
            <label htmlFor="logoFile" className="cursor-pointer">
              <Upload className="size-3.5" /> Enviar
            </label>
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearLogo}
              disabled={isUploading}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<[string, string]>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label} *</Label>
      <Select name={name} defaultValue={defaultValue} required>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([value, text]) => (
            <SelectItem key={value} value={value}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function OptionalSelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<[string, string]>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select name={name} defaultValue="none">
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Não vincular agora</SelectItem>
          {options.map(([value, text]) => (
            <SelectItem key={value} value={value}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className={`${typography.bodyMuted} text-muted-foreground`}>
        Opcional. Novos vínculos não substituem os existentes.
      </p>
    </div>
  );
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<[string, string]>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map(([optionValue, label]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TypeFilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors ${typography.action} ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`${typography.codeMuted} ${active ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}
      >
        {count}
      </span>
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 ${typography.badgeLg} ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}
    >
      {active ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <XCircle className="size-3" />
      )}
      {active ? "Ativa" : "Inativa"}
    </span>
  );
}
