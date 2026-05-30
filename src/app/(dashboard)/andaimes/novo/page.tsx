"use client";

import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

interface ScaffoldForm {
  code: string;
  type: string;
  location: string;
  area: string;
  height: string;
  width: string;
  length: string;
  max_load: string;
  responsible: string;
  validity_date: string;
  notes: string;
}

const INITIAL: ScaffoldForm = {
  code: "",
  type: "tubular",
  location: "",
  area: "",
  height: "",
  width: "",
  length: "",
  max_load: "",
  responsible: "",
  validity_date: "",
  notes: "",
};

export default function NovoAndaimePage() {
  const router = useRouter();
  const [form, setForm] = useState<ScaffoldForm>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (field: keyof ScaffoldForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const scaffold = await createScaffold({
        code: form.code.trim().toUpperCase(),
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
        validity_date: form.validity_date
          ? new Date(form.validity_date)
          : undefined,
        notes: form.notes.trim() || undefined,
      });
      router.push("/andaimes/" + scaffold.id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar andaime.";
      setError(
        msg.includes("Unique constraint")
          ? "Já existe um andaime com este código."
          : msg,
      );
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 pb-4 border-b-2 border-border">
        <Button variant="ghost" size="icon" className="w-7 h-7" asChild>
          <Link href="/andaimes">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
            AndCheck EHS · Gestão de Ativos
          </p>
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
              <Field label="Código / TAG *">
                <Input
                  placeholder="AND-001"
                  value={form.code}
                  onChange={set("code")}
                  required
                  className="rounded-none h-9 text-[12px]"
                />
              </Field>
              <Field label="Tipo *">
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="rounded-none h-9 text-[12px]">
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
                  className="rounded-none h-9 text-[12px]"
                />
              </Field>
              <Field label="Área / Setor">
                <Input
                  placeholder="Ex: Manutenção Industrial"
                  value={form.area}
                  onChange={set("area")}
                  className="rounded-none h-9 text-[12px]"
                />
              </Field>
            </div>
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
                  className="rounded-none h-9 text-[12px]"
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
                  className="rounded-none h-9 text-[12px]"
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
                  className="rounded-none h-9 text-[12px]"
                />
              </Field>
              <Field label="Carga Máx. (kg)">
                <Input
                  type="number"
                  min="0"
                  placeholder="500"
                  value={form.max_load}
                  onChange={set("max_load")}
                  className="rounded-none h-9 text-[12px]"
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
                  className="rounded-none h-9 text-[12px]"
                />
              </Field>
              <Field label="Validade (data)">
                <Input
                  type="date"
                  value={form.validity_date}
                  onChange={set("validity_date")}
                  className="rounded-none h-9 text-[12px]"
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
                className="rounded-none text-[12px] resize-none"
              />
            </Field>
          </FormSection>

          {/* Status info */}
          <div className="bg-muted/30 border border-border px-4 py-3">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
              Status inicial:{" "}
              <span className="font-bold text-amber-700">PENDENTE</span> — o
              andaime aguardará inspeção antes de ser liberado.
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-300 px-4 py-3">
              <p className="text-[11px] text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none text-[11px] uppercase tracking-widest h-9"
              asChild
            >
              <Link href="/andaimes">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-none text-[11px] uppercase tracking-widest h-9 bg-primary hover:bg-primary/90"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Salvando..." : "Cadastrar Andaime"}
            </Button>
          </div>
        </form>
      </div>

      {/* Rodapé normativo */}
      <p className="text-[8px] text-muted-foreground/30 uppercase tracking-widest text-right">
        Conforme NR-18 · NBR 6494 · AndCheck EHS · Documento Controlado
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
