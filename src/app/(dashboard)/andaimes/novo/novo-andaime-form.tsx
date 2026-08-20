"use client";

import { ArrowLeft, Construction, Loader2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

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
import { createScaffold, updateScaffold } from "@/lib/actions/scaffold-actions";
import { control, surface, typography } from "@/lib/design-system";
import { checkServerConnectivity } from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import {
  createOfflineId,
  type OfflineCreateScaffoldPayload,
  type OfflineUpdateScaffoldPayload,
} from "@/lib/offline/types";
import { SCAFFOLD_TYPE_OPTIONS } from "@/lib/scaffold-types";

const LocationPicker = dynamic(
  () =>
    import("@/components/maps/location-picker").then((m) => m.LocationPicker),
  { ssr: false },
);

interface ScaffoldForm {
  type: string;
  location: string;
  area: string;
  areaId: string;
  height: string;
  width: string;
  length: string;
  max_load: string;
  responsible: string;
  responsibleUserId: string;
  company: string;
  mountingCompanyId: string;
  notes: string;
}

const INITIAL: ScaffoldForm = {
  type: "tubular",
  location: "",
  area: "",
  areaId: "",
  height: "",
  width: "",
  length: "",
  max_load: "",
  responsible: "",
  responsibleUserId: "",
  company: "",
  mountingCompanyId: "",
  notes: "",
};

type NewScaffoldFormContext = {
  workspace: { id: string; name: string; code: string } | null;
  operationalAreas: Array<{ id: string; name: string; code: string | null }>;
  mountingCompanies: Array<{ id: string; name: string; code: string }>;
  responsibles: Array<{
    id: string;
    name: string;
    companyId: string;
    tenantCompany: { name: string };
  }>;
  defaults: {
    areaId: string | null;
    mountingCompanyId: string | null;
    responsibleUserId: string | null;
  };
};

const NEW_SCAFFOLD_CONTEXT_CACHE_KEY = "scaffold:new-form-context";

function withContextDefaults(
  initial: ScaffoldForm,
  context?: NewScaffoldFormContext,
) {
  if (!context) return initial;
  const next = { ...initial };
  const defaultArea = context.operationalAreas.find(
    (area) => area.id === context.defaults.areaId,
  );
  if (defaultArea) {
    next.areaId = defaultArea.id;
    next.area = defaultArea.name;
  }
  const defaultCompany = context.mountingCompanies.find(
    (company) => company.id === context.defaults.mountingCompanyId,
  );
  if (defaultCompany) {
    next.mountingCompanyId = defaultCompany.id;
    next.company = defaultCompany.name;
  }
  const defaultResponsible = context.responsibles.find(
    (user) => user.id === context.defaults.responsibleUserId,
  );
  if (defaultResponsible) {
    next.responsibleUserId = defaultResponsible.id;
    next.responsible = defaultResponsible.name;
  }
  return next;
}

const SCAFFOLD_CREATE_UI_DIAGNOSTICS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_SCAFFOLD_CREATE_DIAGNOSTICS === "true" ||
  process.env.NEXT_PUBLIC_RELEASE_FLOW_DIAGNOSTICS === "true";

function logScaffoldCreateUi(message: string, detail?: Record<string, unknown>) {
  if (!SCAFFOLD_CREATE_UI_DIAGNOSTICS_ENABLED) return;
  const detailLabel = detail ? ` ${JSON.stringify(detail)}` : "";
  console.info(`[scaffold-create-ui] ${message}${detailLabel}`);
}

const SCAFFOLD_PREFS_KEY = "andcheck:intelligence:scaffold-form";

type ScaffoldFormPreferences = {
  type?: string;
  location?: string;
  area?: string;
  responsible?: string;
  company?: string;
  recentLocations?: string[];
  recentAreas?: string[];
  recentResponsibles?: string[];
  recentCompanies?: string[];
};

function readScaffoldPreferences(): ScaffoldFormPreferences {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SCAFFOLD_PREFS_KEY) ?? "{}",
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function uniqueRecent(values: Array<string | undefined>, limit = 8) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).slice(0, limit);
}

function writeScaffoldPreferences(form: ScaffoldForm) {
  if (typeof window === "undefined") return;
  const current = readScaffoldPreferences();
  const next: ScaffoldFormPreferences = {
    type: form.type,
    location: form.location.trim() || current.location,
    area: form.area.trim() || current.area,
    responsible: form.responsible.trim() || current.responsible,
    company: form.company.trim() || current.company,
    recentLocations: uniqueRecent([
      form.location,
      ...(current.recentLocations ?? []),
    ]),
    recentAreas: uniqueRecent([form.area, ...(current.recentAreas ?? [])]),
    recentResponsibles: uniqueRecent([
      form.responsible,
      ...(current.recentResponsibles ?? []),
    ]),
    recentCompanies: uniqueRecent([
      form.company,
      ...(current.recentCompanies ?? []),
    ]),
  };
  window.localStorage.setItem(SCAFFOLD_PREFS_KEY, JSON.stringify(next));
}

type EditableScaffold = {
  id: string;
  code: string;
  type: string;
  location: string;
  area: string;
  areaId?: string | null;
  height: number;
  width: number | null;
  length: number | null;
  max_load: number | null;
  responsible: string;
  responsibleUserId?: string | null;
  company: string | null;
  mountingCompanyId?: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function NovoAndaimeForm({
  mode = "create",
  scaffold,
  formContext,
}: {
  mode?: "create" | "edit";
  scaffold?: EditableScaffold;
  formContext?: NewScaffoldFormContext;
}) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(scaffold);
  const [form, setForm] = useState<ScaffoldForm>(() =>
    scaffold
      ? {
          type: scaffold.type,
          location: scaffold.location,
          area: scaffold.area,
          areaId: scaffold.areaId ?? "",
          height: String(scaffold.height),
          width: scaffold.width === null ? "" : String(scaffold.width),
          length: scaffold.length === null ? "" : String(scaffold.length),
          max_load:
            scaffold.max_load === null ? "" : String(scaffold.max_load),
          responsible: scaffold.responsible,
          responsibleUserId: scaffold.responsibleUserId ?? "",
          company: scaffold.company ?? "",
          mountingCompanyId: scaffold.mountingCompanyId ?? "",
          notes: scaffold.notes ?? "",
        }
      : withContextDefaults(INITIAL, formContext),
  );
  const [context, setContext] = useState<NewScaffoldFormContext | undefined>(
    formContext,
  );
  const [latitude, setLatitude] = useState<number | null>(
    scaffold?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    scaffold?.longitude ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const savingRef = useRef(false);
  const [suggestions, setSuggestions] = useState<ScaffoldFormPreferences>({});

  const datalistId = useId();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSuggestions(readScaffoldPreferences());
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (formContext) {
      localDb.metadata
        .set(NEW_SCAFFOLD_CONTEXT_CACHE_KEY, formContext)
        .catch(() => undefined);
      return;
    }

    localDb.metadata
      .get<NewScaffoldFormContext>(NEW_SCAFFOLD_CONTEXT_CACHE_KEY)
      .then((cached) => {
        if (cached) setContext(cached);
      })
      .catch(() => undefined);
  }, [formContext]);

  const set =
    (field: keyof ScaffoldForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const createUiStartedAt = performance.now();
    logScaffoldCreateUi("click.................... 0ms", { mode });

    savingRef.current = true;
    setSaving(true);

    const toastId = toast.loading("Salvando andaime...");
    logScaffoldCreateUi("server action starting", {
      elapsedMs: Math.round(performance.now() - createUiStartedAt),
    });
    try {
      if (!form.area.trim() || !form.responsible.trim()) {
        toast.error("Informe área operacional e responsável técnico.", {
          id: toastId,
        });
        savingRef.current = false;
        setSaving(false);
        return;
      }
      const payload: OfflineCreateScaffoldPayload = {
        type: form.type as
          | "tubular"
          | "fachadeiro"
          | "multidirecional"
          | "suspenso"
          | "torre",
        location: form.location.trim(),
        area: form.area.trim(),
        areaId: form.areaId || undefined,
        height: parseFloat(form.height) || 0,
        width: form.width ? parseFloat(form.width) : undefined,
        length: form.length ? parseFloat(form.length) : undefined,
        max_load: form.max_load ? parseFloat(form.max_load) : undefined,
        responsible: form.responsible.trim(),
        responsibleUserId: form.responsibleUserId || undefined,
        company: form.company.trim() || undefined,
        mountingCompanyId: form.mountingCompanyId || undefined,
        notes: form.notes.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      };
      writeScaffoldPreferences(form);

      if ((await checkServerConnectivity()) === "offline") {
        if (isEdit && scaffold) {
          const updatePayload: OfflineUpdateScaffoldPayload = {
            id: scaffold.id,
            ...payload,
          };
          const current = await localDb.scaffolds.get(scaffold.id);
          await localDb.scaffolds.put({
            ...(current ?? {
              id: scaffold.id,
              code: scaffold.code,
              status: "em_montagem",
              validity_date: null,
              _count: { inspections: 0 },
            }),
            ...updatePayload,
            syncStatus: "pending",
            updatedAt: new Date().toISOString(),
          });
          await localDb.syncQueue.upsertLatest({
            action: "scaffold.update",
            entityType: "scaffold",
            entityId: scaffold.id,
            payload: updatePayload,
          });
          toast.success("Edição salva offline para sincronização.", {
            id: toastId,
          });
          setSavedOffline(true);
          router.push(`/andaimes/${scaffold.id}`);
          return;
        }

        const offlineId = createOfflineId("scaffold");
        await localDb.scaffolds.put({
          id: offlineId,
          code: "Pendente de sincronização",
          type: payload.type,
          status: "em_montagem",
          location: payload.location,
          area: payload.area,
          areaId: payload.areaId,
          height: payload.height,
          responsible: payload.responsible,
          responsibleUserId: payload.responsibleUserId,
          company: payload.company,
          mountingCompanyId: payload.mountingCompanyId,
          validity_date: null,
          _count: { inspections: 0 },
          syncStatus: "pending",
          createdAt: new Date().toISOString(),
        });
        await localDb.syncQueue.enqueue({
          action: "scaffold.create",
          entityType: "scaffold",
          entityId: offlineId,
          payload,
        });
        toast.success("Andaime salvo offline para sincronização.", {
          id: toastId,
        });
        setSavedOffline(true);
        router.push(`/andaimes/${offlineId}`);
        return;
      }

      if (isEdit && scaffold) {
        const updated = await updateScaffold(scaffold.id, payload);
        toast.success("Andaime atualizado com sucesso.", { id: toastId });
        router.push("/andaimes/" + updated.id);
        return;
      }

      const created = await createScaffold(payload);
      const serverReturnedAt = performance.now();
      logScaffoldCreateUi("server returned", {
        elapsedMs: Math.round(serverReturnedAt - createUiStartedAt),
        scaffoldId: created.id,
        status: created.status,
      });
      toast.success("Andaime cadastrado com sucesso.", { id: toastId });
      logScaffoldCreateUi("navigation started", {
        elapsedMs: Math.round(performance.now() - createUiStartedAt),
        href: `/andaimes/${created.id}`,
      });
      router.push("/andaimes/" + created.id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar andaime.";
      toast.error(
        msg.includes("Unique constraint")
          ? "Já existe um andaime com este código."
          : "Não foi possível salvar o andaime. Verifique os dados e tente novamente.",
        { id: toastId },
      );
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className={`max-w-3xl pb-10 ${surface.pageStackContained}`}>
      {/* ── Header ── */}
      <div className={`flex items-center gap-3 ${surface.pageHeader}`}>
        <Button variant="ghost" size="icon" className="w-7 h-7" asChild>
          <Link href="/andaimes">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <div
            className={`mb-1 flex items-center gap-2 ${typography.pageEyebrow} text-muted-foreground`}
          >
            <Construction className="size-4" />
            AndCheck • Andaimes
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            {isEdit ? `Editar ${scaffold?.code}` : "Cadastro de Andaime"}
          </h1>
        </div>
      </div>

      {/* ── Formulário ── */}
      <div className={`p-4 sm:p-5 ${surface.card}`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <SmartDatalist
            id={`${datalistId}-locations`}
            values={suggestions.recentLocations}
          />
          <SmartDatalist
            id={`${datalistId}-areas`}
            values={suggestions.recentAreas}
          />
          <SmartDatalist
            id={`${datalistId}-responsibles`}
            values={suggestions.recentResponsibles}
          />
          <SmartDatalist
            id={`${datalistId}-companies`}
            values={suggestions.recentCompanies}
          />
          {/* TAG e Tipo */}
          <FormSection title="Identificação">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Código / TAG">
                <div className={`flex h-9 items-center px-3 ${surface.readonlyInset}`}>
                  <span className={`${typography.sectionDescription} italic text-muted-foreground`}>
                    {isEdit
                      ? scaffold?.code
                      : "Gerado automaticamente ao salvar"}
                  </span>
                </div>
              </Field>
              <Field label="Tipo *">
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className={control.selectMd}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCAFFOLD_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FormSection>

          {/* Localização */}
          <FormSection title="Localização">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Localização *">
                <Input
                  placeholder="Ex: Área 5 – Plataforma B"
                  value={form.location}
                  onChange={set("location")}
                  list={`${datalistId}-locations`}
                  required
                  className={control.inputMd}
                />
                <SmartSuggestion
                  value={suggestions.location}
                  onApply={(value) =>
                    setForm((current) => ({ ...current, location: value }))
                  }
                />
              </Field>
              <Field label="Área / Setor *">
                {context?.operationalAreas.length ? (
                  <Select
                    value={form.areaId || undefined}
                    onValueChange={(value) => {
                      const area = context.operationalAreas.find(
                        (item) => item.id === value,
                      );
                      setForm((current) => ({
                        ...current,
                        areaId: value,
                        area: area?.name ?? current.area,
                      }));
                    }}
                  >
                    <SelectTrigger className={control.selectMd}>
                      <SelectValue placeholder="Selecione a área operacional" />
                    </SelectTrigger>
                    <SelectContent>
                      {context.operationalAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.code ? `${area.code} - ${area.name}` : area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      placeholder="Ex: Manutenção Industrial"
                      value={form.area}
                      onChange={set("area")}
                      list={`${datalistId}-areas`}
                      required
                      className={control.inputMd}
                    />
                    <SmartSuggestion
                      value={suggestions.area}
                      onApply={(value) =>
                        setForm((current) => ({ ...current, area: value }))
                      }
                    />
                  </>
                )}
              </Field>
            </div>
            <Field label="Geolocalização (opcional)">
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </Field>
          </FormSection>

          {/* Dados Técnicos */}
          <FormSection title="Dados Técnicos">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Altura (m) *">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="12.5"
                  value={form.height}
                  onChange={set("height")}
                  required
                  className={control.inputMd}
                />
              </Field>
              <Field label="Largura (m)">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="1.5"
                  value={form.width}
                  onChange={set("width")}
                  className={control.inputMd}
                />
              </Field>
              <Field label="Comprimento (m)">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="4.0"
                  value={form.length}
                  onChange={set("length")}
                  className={control.inputMd}
                />
              </Field>
              <Field label="Carga Máx. (kg)">
                <Input
                  type="number"
                  min="0"
                  placeholder="500"
                  value={form.max_load}
                  onChange={set("max_load")}
                  className={control.inputMd}
                />
              </Field>
            </div>
          </FormSection>

          {/* Responsabilidade */}
          <FormSection title="Responsabilidade Técnica">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Responsável Técnico *">
                {context?.responsibles.length ? (
                  <Select
                    value={form.responsibleUserId || undefined}
                    onValueChange={(value) => {
                      const responsible = context.responsibles.find(
                        (item) => item.id === value,
                      );
                      setForm((current) => ({
                        ...current,
                        responsibleUserId: value,
                        responsible: responsible?.name ?? current.responsible,
                      }));
                    }}
                  >
                    <SelectTrigger className={control.selectMd}>
                      <SelectValue placeholder="Selecione o responsável técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      {context.responsibles.map((responsible) => (
                        <SelectItem key={responsible.id} value={responsible.id}>
                          {responsible.name} - {responsible.tenantCompany.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      placeholder="Nome do responsável"
                      value={form.responsible}
                      onChange={set("responsible")}
                      list={`${datalistId}-responsibles`}
                      required
                      className={control.inputMd}
                    />
                    <SmartSuggestion
                      value={suggestions.responsible}
                      onApply={(value) =>
                        setForm((current) => ({
                          ...current,
                          responsible: value,
                        }))
                      }
                    />
                  </>
                )}
              </Field>
              <Field label="Empresa Montadora">
                {context?.mountingCompanies.length ? (
                  <Select
                    value={form.mountingCompanyId || undefined}
                    onValueChange={(value) => {
                      const company = context.mountingCompanies.find(
                        (item) => item.id === value,
                      );
                      setForm((current) => ({
                        ...current,
                        mountingCompanyId: value,
                        company: company?.name ?? current.company,
                      }));
                    }}
                  >
                    <SelectTrigger className={control.selectMd}>
                      <SelectValue placeholder="Selecione a empresa montadora" />
                    </SelectTrigger>
                    <SelectContent>
                      {context.mountingCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.code} - {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input
                      placeholder="Nome da empresa"
                      value={form.company}
                      onChange={set("company")}
                      list={`${datalistId}-companies`}
                      className={control.inputMd}
                    />
                    <SmartSuggestion
                      value={suggestions.company}
                      onApply={(value) =>
                        setForm((current) => ({ ...current, company: value }))
                      }
                    />
                  </>
                )}
              </Field>
            </div>
          </FormSection>

          {/* Observações */}
          <FormSection title="Observações">
            <Field label="Observações gerais">
              <Textarea
                placeholder="Informações adicionais sobre o andaime..."
                value={form.notes}
                onChange={set("notes")}
                rows={3}
                className={`resize-none rounded-md ${typography.bodyStrong}`}
              />
            </Field>
          </FormSection>

          {/* Status info */}
          <div className={`px-4 py-3 ${surface.mutedInset}`}>
            <p className={`${typography.sectionLabel} text-muted-foreground`}>
              {isEdit ? (
                <>
                  Edicao operacional:{" "}
                  <span className={`${typography.bodyStrong} text-blue-700`}>
                    DADOS TECNICOS
                  </span>{" "}
                  - status e ciclo de vida permanecem nas acoes do andaime.
                </>
              ) : (
                <>
                  Status inicial:{" "}
                  <span className={`${typography.bodyStrong} text-blue-700`}>EM MONTAGEM</span>{" "}
                  - o andaime ficara em montagem ate ser liberado apos
                  inspeção.
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className={control.buttonMd}
              disabled={saving || savedOffline}
              onClick={() =>
                router.push(isEdit && scaffold ? `/andaimes/${scaffold.id}` : "/andaimes")
              }
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || savedOffline}
              className={control.buttonMd}
            >
              {saving || savedOffline ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {savedOffline
                ? "Salvo offline"
                : saving
                ? "Salvando..."
                : isEdit
                  ? "Salvar Alteracoes"
                  : "Cadastrar Andaime"}
            </Button>
          </div>
        </form>
      </div>

      {/* Rodapé normativo */}
      <p className={`${typography.metaStrong} text-right text-muted-foreground/30`}>
        Conforme NR-18 · NBR 6494 · AndCheck · Documento Controlado
      </p>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className={`${typography.sectionLabel} ${surface.sectionDivider} text-muted-foreground`}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={`${typography.panelTitle} text-muted-foreground`}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function SmartDatalist({
  id,
  values = [],
}: {
  id: string;
  values?: string[];
}) {
  if (values.length === 0) return null;

  return (
    <datalist id={id}>
      {values.map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}

function SmartSuggestion({
  value,
  onApply,
}: {
  value?: string;
  onApply: (value: string) => void;
}) {
  if (!value) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={() => onApply(value)}
      className={`mt-1 max-w-full justify-start ${typography.sectionLabel} text-muted-foreground ${surface.mutedInset} hover:bg-muted/60`}
    >
      Ultimo usado: <span className="ml-1 truncate text-foreground">{value}</span>
    </Button>
  );
}
