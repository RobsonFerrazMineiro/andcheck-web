"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  createWorkspace,
  setWorkspaceActive,
  updateWorkspace,
} from "@/lib/actions/workspace-actions";
import { surface, typography } from "@/lib/design-system";
import {
  Building2,
  CheckCircle2,
  Construction,
  Eye,
  Factory,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

const LocationPicker = dynamic(
  () =>
    import("@/components/maps/location-picker").then(
      (module) => module.LocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-95 items-center justify-center border border-border bg-muted/20 text-xs text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Carregando mapa...
      </div>
    ),
  },
);

type WorkspaceRow = {
  id: string;
  name: string;
  code: string;
  ownerCompanyId: string;
  ownerCompanyName: string;
  city: string | null;
  state: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  active: boolean;
  companies: number;
  scaffolds: number;
};

export function WorkspacesClient({
  initialWorkspaces,
  ownerCompanies,
  canManage,
  initialEditingId,
}: {
  initialWorkspaces: WorkspaceRow[];
  ownerCompanies: Array<{ id: string; name: string }>;
  canManage: boolean;
  initialEditingId?: string;
}) {
  const router = useRouter();
  const initialEditing =
    initialWorkspaces.find((workspace) => workspace.id === initialEditingId) ??
    null;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [ownerCompanyId, setOwnerCompanyId] = useState("all");
  const [editing, setEditing] = useState<WorkspaceRow | null>(initialEditing);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return initialWorkspaces.filter((workspace) => {
      const matchesSearch =
        !term ||
        [workspace.name, workspace.code, workspace.city, workspace.state].some(
          (value) => value?.toLocaleLowerCase("pt-BR").includes(term),
        );
      const matchesStatus =
        status === "all" || (status === "active") === workspace.active;
      const matchesOwner =
        ownerCompanyId === "all" || ownerCompanyId === workspace.ownerCompanyId;
      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [initialWorkspaces, ownerCompanyId, search, status]);

  const activeCount = initialWorkspaces.filter(
    (workspace) => workspace.active,
  ).length;
  const linkedCompanies = initialWorkspaces.reduce(
    (sum, workspace) => sum + workspace.companies,
    0,
  );
  const linkedScaffolds = initialWorkspaces.reduce(
    (sum, workspace) => sum + workspace.scaffolds,
    0,
  );

  function closeForm() {
    setCreating(false);
    setEditing(null);
    if (initialEditingId) router.replace("/workspaces");
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editing) await updateWorkspace(formData);
        else await createWorkspace(formData);
        toast.success(editing ? "Workspace atualizado." : "Workspace criado.");
        closeForm();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o workspace.",
        );
      }
    });
  }

  function toggleStatus(workspace: WorkspaceRow) {
    startTransition(async () => {
      try {
        await setWorkspaceActive(workspace.id, !workspace.active);
        toast.success(
          `Workspace ${workspace.active ? "desativado" : "ativado"}.`,
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o status.",
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 pb-4 border-b-2 border-border sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`${typography.pageEyebrow} text-muted-foreground`}>
            AndCheck • Workspaces
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Gestão de Workspaces
          </h1>
          <p
            className={`mt-1 text-muted-foreground ${typography.sectionDescription}`}
          >
            Cadastro e controle das plantas operacionais.
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
            <Plus /> Novo workspace
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={MapPin}
          label="Workspaces"
          value={initialWorkspaces.length}
          iconClass="text-blue-600"
          borderClass="border-l-4 border-l-blue-500"
          valueClass="text-blue-700"
        />
        <Kpi
          icon={CheckCircle2}
          label="Ativos"
          value={activeCount}
          iconClass="text-green-600"
          borderClass="border-l-4 border-l-green-500"
          valueClass="text-green-700"
        />
        <Kpi
          icon={Building2}
          label="Empresas vinculadas"
          value={linkedCompanies}
          iconClass="text-violet-600"
          borderClass="border-l-4 border-l-violet-500"
          valueClass="text-violet-700"
        />
        <Kpi
          icon={Construction}
          label="Andaimes vinculados"
          value={linkedScaffolds}
          iconClass="text-amber-600"
          borderClass="border-l-4 border-l-amber-500"
          valueClass="text-amber-700"
        />
      </div>

      {(creating || editing) && canManage && (
        <Card className="rounded-lg border-primary/20">
          <CardContent>
            <form action={submit} className="grid gap-4 lg:grid-cols-2">
              {editing && (
                <input type="hidden" name="workspaceId" value={editing.id} />
              )}
              <Field
                label="Nome"
                name="name"
                defaultValue={editing?.name}
                required
              />
              <Field
                label="Código"
                name="code"
                defaultValue={editing?.code}
                placeholder="Gerado automaticamente"
              />
              <SelectField
                label="Empresa proprietaria"
                name="ownerCompanyId"
                defaultValue={editing?.ownerCompanyId ?? ownerCompanies[0]?.id}
                options={ownerCompanies.map((company) => [
                  company.id,
                  company.name,
                ])}
              />
              <SelectField
                label="Status"
                name="status"
                defaultValue={editing?.active === false ? "INACTIVE" : "ACTIVE"}
                options={[
                  ["ACTIVE", "Ativo"],
                  ["INACTIVE", "Inativo"],
                ]}
              />
              <Field
                label="Cidade"
                name="city"
                defaultValue={editing?.city ?? undefined}
              />
              <Field
                label="Estado"
                name="state"
                defaultValue={editing?.state ?? undefined}
                placeholder="PA"
                maxLength={2}
              />
              <div className="lg:col-span-2">
                <Field
                  label="Endereço"
                  name="address"
                  defaultValue={editing?.address ?? undefined}
                />
              </div>
              <div className="space-y-3 lg:col-span-2">
                <div>
                  <Label>Localização da planta</Label>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Selecione no mapa a localização aproximada da planta
                    operacional.
                  </p>
                </div>
                <WorkspaceLocationFields
                  key={editing?.id ?? "new-workspace"}
                  initialLatitude={editing?.latitude ?? null}
                  initialLongitude={editing?.longitude ?? null}
                />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  placeholder="Descrição opcional da planta"
                />
              </div>
              <div className="flex justify-end gap-2 lg:col-span-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="animate-spin" />}
                  Salvar workspace
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_190px_240px]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, código, cidade ou estado"
            className="pl-8"
          />
        </div>
        <FilterSelect
          value={status}
          onValueChange={setStatus}
          placeholder="Todos os status"
          options={[
            ["active", "Ativos"],
            ["inactive", "Inativos"],
          ]}
        />
        <FilterSelect
          value={ownerCompanyId}
          onValueChange={setOwnerCompanyId}
          placeholder="Todas as proprietarias"
          options={ownerCompanies.map((company) => [company.id, company.name])}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div
          className={`hidden grid-cols-[minmax(190px,1.4fr)_110px_minmax(170px,1fr)_140px_150px_90px_120px] gap-4 border-b lg:grid ${surface.tableHeader}`}
        >
          <span>Nome</span>
          <span>Código</span>
          <span>Proprietaria</span>
          <span>Cidade/Estado</span>
          <span>Coordenadas</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum workspace encontrado.
          </div>
        ) : (
          filtered.map((workspace, index) => (
            <div
              key={workspace.id}
              className={`flex items-center gap-3 px-4 py-3 lg:grid lg:grid-cols-[minmax(190px,1.4fr)_110px_minmax(170px,1fr)_140px_150px_90px_120px] lg:gap-4 ${index % 2 ? "bg-muted/20" : "bg-card"}`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-foreground ${typography.bodyStrong}`}
                >
                  {workspace.name}
                </p>
                <p
                  className={`truncate text-muted-foreground lg:hidden ${typography.bodyMuted}`}
                >
                  {workspace.ownerCompanyName}
                </p>
              </div>
              <p className={`hidden lg:block ${typography.codeMuted}`}>
                {workspace.code}
              </p>
              <p
                className={`hidden truncate text-muted-foreground lg:block ${typography.sectionDescription}`}
              >
                {workspace.ownerCompanyName}
              </p>
              <p
                className={`hidden text-muted-foreground lg:block ${typography.sectionDescription}`}
              >
                {locationLabel(workspace.city, workspace.state)}
              </p>
              <p
                className={`hidden text-muted-foreground lg:block ${typography.codeMuted}`}
              >
                {coordinatesLabel(workspace.latitude, workspace.longitude)}
              </p>
              <StatusBadge active={workspace.active} />
              <div className="flex justify-end gap-1">
                <Button
                  asChild
                  variant="outline"
                  size="icon-sm"
                  title="Visualizar"
                >
                  <Link href={`/workspaces/${workspace.id}`}>
                    <Eye />
                  </Link>
                </Button>
                {canManage && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    title="Editar"
                    onClick={() => {
                      setCreating(false);
                      setEditing(workspace);
                    }}
                  >
                    <Pencil />
                  </Button>
                )}
                {canManage && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    title={workspace.active ? "Desativar" : "Ativar"}
                    onClick={() => toggleStatus(workspace)}
                    disabled={isPending}
                  >
                    <Power />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        <div
          className={`border-t bg-muted/30 px-4 py-2 text-muted-foreground/50 ${typography.panelSubtitle}`}
        >
          {filtered.length} registro(s) · Módulo administrativo
        </div>
      </div>
    </div>
  );
}

function locationLabel(city: string | null, state: string | null) {
  return [city, state].filter(Boolean).join(" / ") || "-";
}

function coordinatesLabel(latitude: number | null, longitude: number | null) {
  return latitude === null || longitude === null
    ? "Não informadas"
    : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function parseCoordinate(value: string, min: number, max: number) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function WorkspaceLocationFields({
  initialLatitude,
  initialLongitude,
}: {
  initialLatitude: number | null;
  initialLongitude: number | null;
}) {
  const [latitude, setLatitude] = useState<number | null>(initialLatitude);
  const [longitude, setLongitude] = useState<number | null>(initialLongitude);
  const [latitudeInput, setLatitudeInput] = useState(
    initialLatitude?.toString() ?? "",
  );
  const [longitudeInput, setLongitudeInput] = useState(
    initialLongitude?.toString() ?? "",
  );

  function updateCoordinates(lat: number, lng: number) {
    const nextLatitude = Number(lat.toFixed(6));
    const nextLongitude = Number(lng.toFixed(6));
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
    setLatitudeInput(nextLatitude.toString());
    setLongitudeInput(nextLongitude.toString());
  }

  function updateLatitude(value: string) {
    setLatitudeInput(value);
    setLatitude(parseCoordinate(value, -90, 90));
  }

  function updateLongitude(value: string) {
    setLongitudeInput(value);
    setLongitude(parseCoordinate(value, -180, 180));
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="latitude"
        value={latitude !== null && longitude !== null ? latitude : ""}
      />
      <input
        type="hidden"
        name="longitude"
        value={latitude !== null && longitude !== null ? longitude : ""}
      />
      <LocationPicker
        latitude={latitude}
        longitude={longitude}
        onChange={updateCoordinates}
        instruction="Clique no mapa ou arraste o pin para ajustar a localização aproximada da planta operacional."
        currentLocationLabel="Usar localização atual"
        height={380}
        defaultCenter={{ lat: -1.536, lng: -48.752 }}
        defaultZoom={14}
        selectedZoom={17}
        showCoordinates={false}
      />
      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
        <p className={`${typography.sectionLabel} text-muted-foreground`}>
          Coordenadas
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={latitudeInput}
              onChange={(event) => updateLatitude(event.target.value)}
              placeholder="-1.5205"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={longitudeInput}
              onChange={(event) => updateLongitude(event.target.value)}
              placeholder="-48.6278"
              className="font-mono"
            />
          </div>
        </div>
        <p className={`${typography.bodyMuted} text-muted-foreground`}>
          Coordenadas opcionais. Use estes campos apenas para ajuste tecnico
          fino.
        </p>
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
  icon: typeof Factory;
  label: string;
  value: number;
  iconClass?: string;
  borderClass?: string;
  valueClass?: string;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-lg p-4 shadow-sm ${borderClass}`}
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
  type = "text",
  step,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  step?: string;
  maxLength?: number;
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
        type={type}
        step={step}
        maxLength={maxLength}
      />
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
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}
