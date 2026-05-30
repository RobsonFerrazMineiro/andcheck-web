"use client";

import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import ChecklistSection from "@/components/inspection/checklist-section";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { createInspection } from "@/lib/actions/inspection-actions";
import type { ChecklistValue as FormValue } from "@/lib/checklist-template";
import checklistTemplate from "@/lib/checklist-template";

type ScaffoldOption = {
  id: string;
  code: string;
  location: string;
  area: string;
};

function statusToPrisma(
  status: string,
): "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA" {
  if (status === "conforme") return "CL_OK";
  if (status === "nao_conforme") return "CL_FAIL";
  return "CL_NA";
}

export function NovaInspecaoForm({
  scaffolds,
}: {
  scaffolds: ScaffoldOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [selectedScaffoldId, setSelectedScaffoldId] = useState(
    params.get("scaffold_id") ?? "",
  );
  const [inspectorName, setInspectorName] = useState("");
  const [validityDays, setValidityDays] = useState("7");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [checklistValues, setChecklistValues] = useState<FormValue[][]>(
    checklistTemplate.map((cat) =>
      cat.items.map(() => ({ status: "", observation: "" })),
    ),
  );

  const selectedScaffold = scaffolds.find((s) => s.id === selectedScaffoldId);

  const criticalIssues = useMemo(() => {
    const issues: string[] = [];
    checklistTemplate.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => {
        if (
          item.critical &&
          checklistValues[ci][ii].status === "nao_conforme"
        ) {
          issues.push(item.item);
        }
      });
    });
    return issues;
  }, [checklistValues]);

  const autoResult = useMemo(() => {
    if (criticalIssues.length > 0) return "reprovado";
    const hasNonConform = checklistValues
      .flat()
      .some((v) => v.status === "nao_conforme");
    if (hasNonConform) return "aprovado_com_ressalvas";
    return "aprovado";
  }, [criticalIssues, checklistValues]);

  const isComplete = useMemo(
    () => checklistValues.every((cat) => cat.every((v) => v.status !== "")),
    [checklistValues],
  );
  const canSubmit =
    isComplete &&
    !!selectedScaffoldId &&
    inspectorName.trim().length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedScaffold) return;
    // Previne duplo clique via ref (guard extra além do state)
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const toastId = toast.loading("Salvando inspeção...");
    try {
      const checklist = checklistTemplate.flatMap((cat, ci) =>
        cat.items.map((item, ii) => ({
          item_id: `${ci}_${ii}`,
          item_label: item.item,
          category: cat.category,
          value: statusToPrisma(checklistValues[ci][ii].status),
          critical: item.critical ?? false,
          observation: checklistValues[ci][ii].observation || undefined,
        })),
      );
      const created = await createInspection({
        scaffold_id: selectedScaffold.id,
        scaffold_code: selectedScaffold.code,
        inspector_name: inspectorName.trim(),
        result: autoResult as
          | "aprovado"
          | "aprovado_com_ressalvas"
          | "reprovado",
        validity_days: autoResult !== "reprovado" ? Number(validityDays) : 0,
        notes: observations.trim() || undefined,
        checklist,
      });
      toast.success("Inspeção registrada com sucesso!", { id: toastId });
      router.replace("/inspecoes/" + created.id);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar a inspeção. Tente novamente.", {
        id: toastId,
      });
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div className="flex items-center gap-2">
        <Link
          href="/inspecoes"
          className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
          <Link href="/inspecoes" className="hover:text-foreground">
            Inspeções
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground font-semibold">Nova Inspeção</span>
        </div>
      </div>

      <div className="pb-4 border-b-2 border-border">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          AndCheck EHS · NR-18 / NR-35 / ABNT NBR 6494
        </p>
        <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
          Nova Inspeção
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Checklist de{" "}
          {checklistTemplate.reduce((a, c) => a + c.items.length, 0)} itens ·
          Resultado calculado automaticamente
        </p>
      </div>

      <div className="bg-card border border-border shadow-sm p-5 space-y-4">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
          Informações Gerais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Andaime *
            </Label>
            <Select
              value={selectedScaffoldId}
              onValueChange={setSelectedScaffoldId}
            >
              <SelectTrigger className="h-8 text-[11px] rounded-none">
                <SelectValue placeholder="Selecionar andaime..." />
              </SelectTrigger>
              <SelectContent>
                {scaffolds.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Nome do Inspetor *
            </Label>
            <Input
              placeholder="Nome completo"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="h-8 text-[11px] rounded-none"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider font-bold">
            Validade da liberação
          </Label>
          <Select value={validityDays} onValueChange={setValidityDays}>
            <SelectTrigger className="w-40 h-8 text-[11px] rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 dias</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {checklistTemplate.map((cat, catIdx) => (
        <ChecklistSection
          key={cat.category}
          category={cat.category}
          items={cat.items}
          values={checklistValues[catIdx]}
          onChange={(newValues) => {
            const updated = [...checklistValues];
            updated[catIdx] = newValues;
            setChecklistValues(updated);
          }}
        />
      ))}

      {criticalIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
              Liberação bloqueada — {criticalIssues.length} item(ns) crítico(s)
              não conforme(s)
            </p>
          </div>
          <ul className="space-y-1 pl-6">
            {criticalIssues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-red-600"
              >
                <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isComplete && (
        <div
          className={
            "border p-4 flex items-center gap-4 " +
            (autoResult === "aprovado"
              ? "bg-emerald-50 border-emerald-200"
              : autoResult === "reprovado"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200")
          }
        >
          {autoResult === "aprovado" && (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          )}
          {autoResult === "reprovado" && (
            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
          )}
          {autoResult === "aprovado_com_ressalvas" && (
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Resultado calculado
            </p>
            <StatusBadge status={autoResult} size="lg" />
          </div>
          {autoResult !== "reprovado" && (
            <div className="ml-auto text-right">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                Válido até
              </p>
              <p className="text-[13px] font-bold font-mono text-foreground">
                {format(
                  addDays(new Date(), Number(validityDays)),
                  "dd/MM/yyyy",
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border shadow-sm p-5 space-y-3">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
          Observações Gerais
        </h3>
        <Textarea
          placeholder="Registre observações gerais sobre a inspeção..."
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="text-[11px] rounded-none min-h-20"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-border">
        <Link
          href="/inspecoes"
          className="inline-flex items-center justify-center h-8 px-5 text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center gap-2 h-8 px-5 text-[10px] font-bold uppercase tracking-widest bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <ClipboardCheck className="w-3.5 h-3.5" />
              {isComplete ? "Registrar Inspeção" : "Preencha todos os itens"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
