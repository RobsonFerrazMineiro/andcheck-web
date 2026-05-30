import { addDays, format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Construction,
  MinusCircle,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PdfDownloadButton } from "@/components/inspection/pdf-download-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { getInspectionById } from "@/lib/actions/inspection-actions";
import { ChecklistValue } from "@prisma/client";

interface Props {
  params: Promise<{ id: string }>;
}

function valueToStatus(
  v: ChecklistValue,
): "conforme" | "nao_conforme" | "nao_aplicavel" {
  if (v === "CL_OK") return "conforme";
  if (v === "CL_FAIL" || v === "CL_WARN") return "nao_conforme";
  return "nao_aplicavel";
}

const ITEM_ICONS = {
  conforme: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  nao_conforme: <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />,
  nao_aplicavel: (
    <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
  ),
};
const ITEM_LABELS = {
  conforme: "Conforme",
  nao_conforme: "Não Conforme",
  nao_aplicavel: "N/A",
};
const ITEM_ROW = {
  conforme: "bg-card",
  nao_conforme: "bg-red-50/60",
  nao_aplicavel: "bg-card",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-28 shrink-0 pt-0.5">
        {label}
      </p>
      <div className="text-[12px] text-foreground font-medium">{value}</div>
    </div>
  );
}

export default async function InspectionDetailPage({ params }: Props) {
  const { id } = await params;
  const inspection = await getInspectionById(id);
  if (!inspection) notFound();

  const scaffold = inspection.scaffold;
  const checklist = inspection.checklist;

  const totalItems = checklist.length;
  const conformes = checklist.filter(
    (i) => valueToStatus(i.value) === "conforme",
  ).length;
  const naoConformes = checklist.filter(
    (i) => valueToStatus(i.value) === "nao_conforme",
  ).length;
  const naAplicavel = checklist.filter(
    (i) => valueToStatus(i.value) === "nao_aplicavel",
  ).length;
  const pct =
    totalItems - naAplicavel > 0
      ? Math.round((conformes / (totalItems - naAplicavel)) * 100)
      : 0;

  const validadeDate =
    inspection.result !== "reprovado" && inspection.validity_days > 0
      ? format(addDays(inspection.date, inspection.validity_days), "dd/MM/yyyy")
      : null;

  const docNum =
    "AND-" +
    inspection.scaffold_code +
    "-" +
    format(inspection.date, "yyyyMMdd");

  const grouped: Record<string, typeof checklist> = {};
  checklist.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
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
          <span className="text-foreground font-semibold font-mono">
            {docNum}
          </span>
        </div>
      </div>

      <div className="bg-primary overflow-hidden shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[9px] font-semibold tracking-widest uppercase text-primary-foreground/40 mb-1">
              Relatório Técnico de Inspeção · AndCheck EHS
            </p>
            <h2 className="text-[22px] font-bold text-primary-foreground tracking-tight font-mono">
              {docNum}
            </h2>
            <p className="text-[11px] text-primary-foreground/60 mt-0.5">
              NR-18 · NR-35 · ABNT NBR 6494
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={inspection.result} size="lg" />
            {validadeDate && (
              <p className="text-[10px] text-primary-foreground/60">
                Válido até{" "}
                <span className="font-bold font-mono text-primary-foreground">
                  {validadeDate}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-primary-foreground/10 overflow-hidden">
            <div
              className={
                "h-full transition-all " +
                (pct >= 80
                  ? "bg-emerald-400"
                  : pct >= 50
                    ? "bg-amber-400"
                    : "bg-red-400")
              }
              style={{ width: pct + "%" }}
            />
          </div>
          <p className="text-[11px] font-bold text-primary-foreground/80 shrink-0">
            {pct}% conformes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Conformes",
            value: conformes,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-200",
          },
          {
            label: "Não Conformes",
            value: naoConformes,
            color: "text-red-600",
            bg: "bg-red-50 border-red-200",
          },
          {
            label: "N/A",
            value: naAplicavel,
            color: "text-slate-500",
            bg: "bg-muted/40 border-border",
          },
        ].map((s) => (
          <div key={s.label} className={"border p-3 text-center " + s.bg}>
            <p className={"text-[22px] font-bold font-mono " + s.color}>
              {s.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border shadow-sm p-5">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-2">
          Dados da Inspeção
        </h3>
        <InfoRow
          label="Andaime"
          value={
            <span className="font-mono font-bold">
              {inspection.scaffold_code}
              {scaffold && (
                <span className="text-muted-foreground font-normal ml-2">
                  — {scaffold.location}
                </span>
              )}
            </span>
          }
        />
        <InfoRow
          label="Data"
          value={
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
              {format(inspection.date, "dd/MM/yyyy")}
            </span>
          }
        />
        <InfoRow
          label="Inspetor"
          value={
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground/40" />
              {inspection.inspector_name}
            </span>
          }
        />
        <InfoRow
          label="Resultado"
          value={<StatusBadge status={inspection.result} />}
        />
        <InfoRow
          label="Validade"
          value={
            validadeDate ? (
              <span className="font-mono font-bold">
                {inspection.validity_days} dias — até {validadeDate}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
        {inspection.notes && (
          <InfoRow
            label="Observações"
            value={
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                {inspection.notes}
              </span>
            }
          />
        )}
        {scaffold && (
          <>
            <InfoRow label="Tipo" value={scaffold.code} />
            <InfoRow
              label="Localização"
              value={
                <Link
                  href={"/andaimes/" + scaffold.id}
                  className="flex items-center gap-1.5 hover:text-primary"
                >
                  <Construction className="w-3.5 h-3.5 text-muted-foreground/40" />
                  {scaffold.location} — {scaffold.area}
                </Link>
              }
            />
          </>
        )}
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-border bg-muted/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            Checklist de Conformidade
          </p>
        </div>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="px-4 py-2 bg-primary/5 border-b border-border">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                {category}
              </p>
            </div>
            {items.map((item) => {
              const st = valueToStatus(item.value);
              return (
                <div
                  key={item.id}
                  className={
                    "flex items-start gap-3 px-4 py-3 border-b border-border/50 " +
                    ITEM_ROW[st]
                  }
                >
                  {ITEM_ICONS[st]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={
                          "text-[12px] font-medium " +
                          (st === "nao_conforme"
                            ? "text-red-700"
                            : "text-foreground")
                        }
                      >
                        {item.item_label}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.critical && (
                          <Badge
                            variant="destructive"
                            className="text-[8px] px-1.5 py-0 h-4"
                          >
                            Crítico
                          </Badge>
                        )}
                        <span
                          className={
                            "text-[9px] font-bold uppercase " +
                            (st === "conforme"
                              ? "text-emerald-600"
                              : st === "nao_conforme"
                                ? "text-red-600"
                                : "text-slate-400")
                          }
                        >
                          {ITEM_LABELS[st]}
                        </span>
                      </div>
                    </div>
                    {item.observation && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {item.observation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link
          href="/inspecoes"
          className="flex items-center gap-1.5 h-8 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
        <Link
          href={"/andaimes/" + inspection.scaffold_id}
          className="flex items-center gap-1.5 h-8 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors"
        >
          <Construction className="w-3.5 h-3.5" /> Ver Andaime
        </Link>
        <PdfDownloadButton
          inspection={{
            id: inspection.id,
            scaffold_code: inspection.scaffold_code,
            date: inspection.date,
            inspector_name: inspection.inspector_name,
            result: inspection.result,
            validity_days: inspection.validity_days,
            notes: inspection.notes,
            checklist: inspection.checklist,
            scaffold: scaffold
              ? {
                  id: scaffold.id,
                  location: scaffold.location,
                  area: scaffold.area,
                  type: scaffold.type,
                  height: scaffold.height,
                  max_load: scaffold.max_load,
                  responsible: scaffold.responsible,
                }
              : null,
          }}
        />
      </div>
    </div>
  );
}
