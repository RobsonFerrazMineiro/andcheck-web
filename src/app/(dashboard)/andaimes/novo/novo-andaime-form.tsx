"use client";

import { ArrowLeft, Construction, Loader2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { createScaffold } from "@/lib/actions/scaffold-actions";
import {
  canNavigateAfterOfflineWrite,
  checkServerConnectivity,
} from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import {
  createOfflineId,
  type OfflineCreateScaffoldPayload,
} from "@/lib/offline/types";

const LocationPicker = dynamic(
  () =>
    import("@/components/maps/location-picker").then((m) => m.LocationPicker),
  { ssr: false },
);

interface ScaffoldForm {
  type: string;
  location: string;
  area: string;
  height: string;
  width: string;
  length: string;
  max_load: string;
  responsible: string;
  company: string;
  notes: string;
}

const INITIAL: ScaffoldForm = {
  type: "tubular",
  location: "",
  area: "",
  height: "",
  width: "",
  length: "",
  max_load: "",
  responsible: "",
  company: "",
  notes: "",
};

export default function NovoAndaimePage() {
  const router = useRouter();
  const [form, setForm] = useState<ScaffoldForm>(INITIAL);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const set =
    (field: keyof ScaffoldForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);

    const toastId = toast.loading("Salvando andaime...");
    try {
      const payload: OfflineCreateScaffoldPayload = {
        type: form.type as
          | "tubular"
          | "fachadeiro"
          | "multidirecional"
          | "suspenso"
          | "torre",
        location: form.location.trim(),
        area: form.area.trim(),
        height: parseFloat(form.height) || 0,
        width: form.width ? parseFloat(form.width) : undefined,
        length: form.length ? parseFloat(form.length) : undefined,
        max_load: form.max_load ? parseFloat(form.max_load) : undefined,
        responsible: form.responsible.trim(),
        company: form.company.trim() || undefined,
        notes: form.notes.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      };

      if ((await checkServerConnectivity()) === "offline") {
        const offlineId = createOfflineId("scaffold");
        await localDb.scaffolds.put({
          id: offlineId,
          code: "Pendente de sincronização",
          type: payload.type,
          status: "em_montagem",
          location: payload.location,
          area: payload.area,
          height: payload.height,
          responsible: payload.responsible,
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
        if (canNavigateAfterOfflineWrite()) {
          router.push("/sincronizacao");
        } else {
          savingRef.current = false;
          setSaving(false);
        }
        return;
      }

      const scaffold = await createScaffold(payload);
      toast.success("Andaime cadastrado com sucesso.", { id: toastId });
      router.push("/andaimes/" + scaffold.id);
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
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 pb-4 border-b-2 border-border">
        <Button variant="ghost" size="icon" className="w-7 h-7" asChild>
          <Link href="/andaimes">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Construction className="size-4" />
            AndCheck • Andaimes
          </div>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Cadastro de Andaime
          </h1>
        </div>
      </div>

      {/* ── Formulário ── */}
      <div className="bg-card border border-border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* TAG e Tipo */}
          <FormSection title="Identificação">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Código / TAG">
                <div className="flex items-center h-9 px-3 border border-border bg-muted/40">
                  <span className="text-[11px] text-muted-foreground italic">
                    Gerado automaticamente ao salvar
                  </span>
                </div>
              </Field>
              <Field label="Tipo *">
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="rounded-md h-9 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tubular">Tubular</SelectItem>
                    <SelectItem value="fachadeiro">Fachadeiro</SelectItem>
                    <SelectItem value="multidirecional">
                      Multidirecional
                    </SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="torre">Torre</SelectItem>
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
                  required
                  className="rounded-md h-9 text-[12px]"
                />
              </Field>
              <Field label="Área / Setor">
                <Input
                  placeholder="Ex: Manutenção Industrial"
                  value={form.area}
                  onChange={set("area")}
                  className="rounded-md h-9 text-[12px]"
                />
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
                  className="rounded-md h-9 text-[12px]"
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
                  className="rounded-md h-9 text-[12px]"
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
                  className="rounded-md h-9 text-[12px]"
                />
              </Field>
              <Field label="Carga Máx. (kg)">
                <Input
                  type="number"
                  min="0"
                  placeholder="500"
                  value={form.max_load}
                  onChange={set("max_load")}
                  className="rounded-md h-9 text-[12px]"
                />
              </Field>
            </div>
          </FormSection>

          {/* Responsabilidade */}
          <FormSection title="Responsabilidade Técnica">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Responsável Técnico">
                <Input
                  placeholder="Nome do responsável"
                  value={form.responsible}
                  onChange={set("responsible")}
                  className="rounded-md h-9 text-[12px]"
                />
              </Field>
              <Field label="Empresa Montadora">
                <Input
                  placeholder="Nome da empresa"
                  value={form.company}
                  onChange={set("company")}
                  className="rounded-md h-9 text-[12px]"
                />
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
                className="rounded-md text-[12px] resize-none"
              />
            </Field>
          </FormSection>

          {/* Status info */}
          <div className="bg-muted/30 border border-border px-4 py-3">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
              Status inicial:{" "}
              <span className="font-bold text-blue-700">EM MONTAGEM</span> — o
              andaime ficará em montagem até ser liberado após inspeção.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-md text-[11px] uppercase tracking-widest h-9"
              disabled={saving}
              onClick={() => router.push("/andaimes")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-md text-[11px] uppercase tracking-widest h-9 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {saving ? "Salvando..." : "Cadastrar Andaime"}
            </Button>
          </div>
        </form>
      </div>

      {/* Rodapé normativo */}
      <p className="text-[8px] text-muted-foreground/30 uppercase tracking-widest text-right">
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
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1.5">
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
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
