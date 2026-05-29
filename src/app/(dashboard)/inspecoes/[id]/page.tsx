import { addDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Construction,
  MinusCircle,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  MOCK_INSPECTIONS,
  MOCK_SCAFFOLDS,
} from "@/lib/mock-data";

interface Props {
  params: Promise<{ id: string }>;
}

const ITEM_ICONS = {
  conforme: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  nao_conforme: <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />,
  nao_aplicavel: <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
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
  const inspection = MOCK_INSPECTIONS.find((i) => i.id === id);
  if (!inspection) notFound();

  const scaffold = MOCK_SCAFFOLDS.find((s) => s.id === inspection.scaffold_id);

  const totalItems = inspection.checklist.length;
  const conformes = inspection.checklist.filter((i) => i.status === "conforme").length;
  const naoConformes = inspection.checklist.filter((i) => i.status === "nao_conforme").length;
  const naAplicavel = inspection.checklist.filter((i) => i.status === "nao_aplicavel").length;
  const pct =
    totalItems - naAplicavel > 0
      ? Math.round((conformes / (totalItems - naAplicavel)) * 100)
      : 0;

  const validadeDate =
    inspection.result !== "reprovado" && inspection.validity_days > 0
      ? format(addDays(parseISO(inspection.date), inspection.validity_days), "dd/MM/yyyy")
      : null;

  const docNum = "AND-" + inspection.scaffold_code + "-" + inspection.date.replace(/-/g, "");

  // Agrupar checklist por categoria
  const grouped: Record<string, typeof inspection.checklist> = {};
  inspection.checklist.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/inspecoes"
          className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
          <Link href="/inspecoes" className="hover:text-foreground">Inspeções</Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground font-semibold font-mono">{docNum}</span>
        </div>
      </div>

      {/* Header Block */}
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
                Válido até <span className="font-bold font-mono text-primary-foreground">{validadeDate}</span>
              </p>
            )}
          </div>
        </div>
        {/* Barra de conformidade */}
        <div className="px-5 pb-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-primary-foreground/10 overflow-hidden">
            <div
              className={"h-full transition-all " + (pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400")}
              style={{ width: pct + "%" }}
            />
          </div>
          <p className="text-[11px] font-bold text-primary-foreground/80 shrink-0">
            {pct}% conformes
          </p>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Conformes", value: conformes, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Não Conformes", value: naoConformes, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "N/A", value: naAplicavel, color: "text-slate-500", bg: "bg-muted/40 border-border" },
        ].map((s) => (
          <div key={s.label} className={"border p-3 text-center " + s.bg}>
            <p className={"text-[22px] font-bold font-mono " + s.color}>{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Info geral */}
      <div className="bg-card border border-border shadow-sm p-5">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-2">
          Dados da Inspeção
        </h3>
        <InfoRow label="Andaime" value={
          <span className="font-mono font-bold">{inspection.scaffold_code}
            {scaffold && <span className="text-muted-foreground font-normal ml-2">— {scaffold.location}</span>}
          </span>
        } />
        <InfoRow label="Data" value={
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
            {format(parseISO(inspection.date), "dd/MM/yyyy")}
          </span>
        } />
        <InfoRow label="Inspetor" value={
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground/40" />
            {inspection.inspector_name}
          </span>
        } />
        <InfoRow label="Resultado" value={<StatusBadge status={inspection.result} />} />
        <InfoRow label="Validade" value={
          validadeDate
            ? <span className="font-mono font-bold">{inspection.validity_days} dias — até {validadeDate}</span>
            : <span className="text-muted-foreground">—</span>
        } />
        {inspection.observations && (
          <InfoRow label="Observações" value={
            <p className="text-[11px] text-muted-foreground leading-relaxed">{inspection.observations}</p>
          } />
        )}
      </div>

      {/* Andaime info */}
      {scaffold && (
        <div className="bg-card border border-border shadow-sm p-5">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-2">
            Andaime Inspecionado
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/8 flex items-center justify-center shrink-0">
              <Construction className="w-4 h-4 text-primary/40" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[13px] font-mono">{scaffold.code}</p>
              <p className="text-[11px] text-muted-foreground">{scaffold.location} · {scaffold.area}</p>
            </div>
            <Link
              href={"/andaimes/" + scaffold.id}
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
            >
              Ver andaime
            </Link>
          </div>
        </div>
      )}

      {/* Checklist por categoria */}
      <div className="space-y-4">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Checklist Detalhado — {totalItems} itens
        </h3>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-card border border-border shadow-sm overflow-hidden">
            <div className="bg-primary/5 px-5 py-3 border-b border-border flex items-center justify-between">
              <h4 className="font-bold text-[11px] text-foreground uppercase tracking-widest">{category}</h4>
              <div className="flex gap-1.5">
                {[
                  { s: "conforme", c: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                  { s: "nao_conforme", c: "bg-red-100 text-red-700 border-red-200" },
                ].map(({ s, c }) => {
                  const count = items.filter((i) => i.status === s).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={s} variant="outline" className={"text-[9px] " + c}>
                      {count} {ITEM_LABELS[s as keyof typeof ITEM_LABELS]}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="divide-y divide-border">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={"px-5 py-3 flex items-start gap-3 " + ITEM_ROW[item.status]}
                >
                  <span className="mt-0.5">{ITEM_ICONS[item.status]}</span>
                  <div className="flex-1">
                    <p className="text-[12px] text-foreground leading-relaxed">{item.item}</p>
                    {item.observation && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">{item.observation}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.critical && (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[9px] uppercase tracking-wider">
                        <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                        Crítico
                      </Badge>
                    )}
                    <span className={"text-[9px] font-bold uppercase tracking-wider " + (item.status === "conforme" ? "text-emerald-600" : item.status === "nao_conforme" ? "text-red-600" : "text-slate-400")}>
                      {ITEM_LABELS[item.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé do documento */}
      <div className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between gap-2">
        <div>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            Documento controlado · AndCheck EHS · {docNum}
          </p>
          <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">
            NR-18 / NR-35 / ABNT NBR 6494 — {format(parseISO(inspection.date), "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={"/andaimes/" + inspection.scaffold_id}
            className="inline-flex items-center gap-1.5 h-7 px-3 text-[9px] font-bold uppercase tracking-widest border border-border hover:bg-muted/50 transition-colors"
          >
            <Construction className="w-3 h-3" />
            Ver Andaime
          </Link>
          <Link
            href="/inspecoes/nova"
            className="inline-flex items-center gap-1.5 h-7 px-3 text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ClipboardCheck className="w-3 h-3" />
            Nova Inspeção
          </Link>
        </div>
      </div>
    </div>
  );
}
