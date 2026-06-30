import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  Layers,
  MapPin,
  MinusCircle,
  QrCode,
  Ruler,
  User,
  Weight,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PdfDownloadButton } from "@/components/inspection/pdf-download-button";
import { PrintButton } from "@/components/inspection/print-button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  nonConformityStatusTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";
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

const TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

const NC_CLASSIFICATION_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const NC_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  ASSIGNED: "Em Correção",
  IN_PROGRESS: "Em Tratamento",
  PENDING_VERIFICATION: "Aguardando Verificação",
  CLOSED: "Encerrada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

const NC_STATUS_STYLE: Record<string, string> = {
  OPEN: SEMANTIC_TONE_CLASSES[nonConformityStatusTone("OPEN")].badge,
  ASSIGNED: SEMANTIC_TONE_CLASSES[nonConformityStatusTone("ASSIGNED")].badge,
  IN_PROGRESS:
    SEMANTIC_TONE_CLASSES[nonConformityStatusTone("IN_PROGRESS")].badge,
  PENDING_VERIFICATION:
    SEMANTIC_TONE_CLASSES[nonConformityStatusTone("PENDING_VERIFICATION")]
      .badge,
  CLOSED: SEMANTIC_TONE_CLASSES[nonConformityStatusTone("CLOSED")].badge,
  REJECTED: SEMANTIC_TONE_CLASSES[nonConformityStatusTone("REJECTED")].badge,
  CANCELLED:
    SEMANTIC_TONE_CLASSES[nonConformityStatusTone("CANCELLED")].badge,
};

function NcBadge({ value }: { value: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest " +
        (NC_STATUS_STYLE[value] ?? "border-slate-300 bg-slate-50 text-slate-700")
      }
    >
      {NC_STATUS_LABELS[value] ?? value}
    </span>
  );
}

function TechRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground w-32 shrink-0">
        {label}
      </p>
      <div className="text-[12px] text-foreground font-medium text-right flex-1">
        {value}
      </div>
    </div>
  );
}

export default async function InspectionDetailPage({ params }: Props) {
  const { id } = await params;
  const inspection = await getInspectionById(id);
  if (!inspection) notFound();

  const scaffold = inspection.scaffold;
  const checklist = inspection.checklist;
  const hasCriticalFailure = checklist.some(
    (item) => item.critical && item.value === "CL_FAIL",
  );

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
    inspection.scaffold_code + "-" + format(inspection.date, "yyyyMMdd");

  const grouped: Record<string, typeof checklist> = {};
  checklist.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-3">
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
        <div className="flex items-center gap-2 shrink-0">
          <PdfDownloadButton
            inspection={{
              id: inspection.id,
              scaffold_code: inspection.scaffold_code,
              date: inspection.date,
              inspector_name: inspection.inspector_name,
              result: inspection.result,
              validity_days: inspection.validity_days,
              notes: inspection.notes,
              photos: inspection.photos,
              signature: inspection.signature,
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
          <PrintButton />
          {scaffold && (
            <Link
              href={"/andaimes/" + inspection.scaffold_id}
              className="flex items-center gap-1.5 h-8 px-3 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors"
            >
              <Construction className="w-3.5 h-3.5" /> Ver Andaime
            </Link>
          )}
        </div>
      </div>

      <div className="bg-primary border-l-4 border-l-sidebar-primary shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-foreground/40">
              <ClipboardCheck className="size-4" />
              AndCheck • Inspeções
            </div>
            <h2 className="text-[22px] font-bold text-primary-foreground tracking-tight font-mono">
              {docNum}
            </h2>
            <p className="text-[11px] text-primary-foreground/60 mt-0.5">
              NR-18 · NR-35 · ABNT NBR 6494
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={inspection.result} size="xl" />
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
      </div>

      {scaffold?.status === "interditado" && hasCriticalFailure && (
        <div className="flex items-start gap-3 border border-red-300 bg-red-50 px-4 py-3 text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Inspeção reprovada com item crítico
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              O resultado deste relatório é Reprovado. Como houve falha em item
              crítico, o status operacional atual do andaime é Interditado e o
              uso permanece proibido até correção e nova inspeção.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Conformes",
            value: conformes,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-200",
            bar: "border-l-green-600",
          },
          {
            label: "Não Conformes",
            value: naoConformes,
            color: "text-red-600",
            bg: "bg-red-50 border-red-200",
            bar: "border-l-red-600",
          },
          {
            label: "N/A",
            value: naAplicavel,
            color: "text-slate-500",
            bg: "bg-muted/40 border-border",
            bar: "border-l-slate-400",
          },
          {
            label: "Conformidade",
            value: pct + "%",
            color:
              pct >= 80
                ? "text-emerald-600"
                : pct >= 50
                  ? "text-amber-600"
                  : "text-red-600",
            bg: "bg-card border-border",
            bar:
              pct >= 80
                ? "border-l-green-600"
                : pct >= 50
                  ? "border-l-amber-500"
                  : "border-l-red-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={
              "border border-l-4 p-3 text-center " + s.bg + " " + s.bar
            }
          >
            <p className={"text-[22px] font-bold font-mono " + s.color}>
              {s.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Dados do Andaime */}
        <div className="bg-card border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b-2 border-border">
            <Construction className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Dados do Andaime
            </p>
          </div>
          {scaffold ? (
            <>
              <TechRow
                icon={Construction}
                label="Tag / Código"
                value={
                  <span className="font-mono font-bold">{scaffold.code}</span>
                }
              />
              <TechRow
                icon={AlertTriangle}
                label="Status Atual"
                value={<StatusBadge status={scaffold.status} />}
              />
              <TechRow
                icon={MapPin}
                label="Localização"
                value={scaffold.location}
              />
              <TechRow icon={Building2} label="Área" value={scaffold.area} />
              <TechRow
                icon={Layers}
                label="Tipo"
                value={TYPE_LABELS[scaffold.type] ?? scaffold.type}
              />
              <TechRow
                icon={Ruler}
                label="Altura"
                value={scaffold.height + " m"}
              />
              {scaffold.max_load && (
                <TechRow
                  icon={Weight}
                  label="Carga Máxima"
                  value={scaffold.max_load + " kg"}
                />
              )}
            </>
          ) : (
            <TechRow
              icon={Construction}
              label="Código"
              value={
                <span className="font-mono">{inspection.scaffold_code}</span>
              }
            />
          )}
        </div>

        {/* Dados da Inspeção */}
        <div className="bg-card border border-border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b-2 border-border">
            <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Dados da Inspeção
            </p>
          </div>
          <TechRow
            icon={User}
            label="Inspetor"
            value={inspection.inspector_name}
          />
          {scaffold?.responsible && (
            <TechRow
              icon={User}
              label="Responsável"
              value={scaffold.responsible}
            />
          )}
          {scaffold?.company && (
            <TechRow
              icon={Building2}
              label="Empresa"
              value={scaffold.company}
            />
          )}
          <TechRow
            icon={Calendar}
            label="Data da Inspeção"
            value={format(inspection.date, "dd/MM/yyyy")}
          />
          <TechRow
            icon={Clock}
            label="Validade da Liberação"
            value={
              validadeDate
                ? inspection.validity_days + " dias (até " + validadeDate + ")"
                : "—"
            }
          />
          {inspection.notes && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Observações
              </p>
              <p className="text-[11px] text-foreground leading-relaxed">
                {inspection.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b-2 border-border bg-muted/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            Assinaturas Obrigatorias
          </p>
        </div>
        {inspection.signatures.length === 0 ? (
          <div className="px-4 py-5">
            <p className="text-[11px] text-muted-foreground">
              Nenhuma assinatura obrigatoria registrada nesta inspeção.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {inspection.signatures.map((signature) => (
              <div
                key={signature.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-foreground truncate">
                      {signature.role.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Assinado por {signature.signer_name}
                      {signature.signer_company
                        ? " · " + signature.signer_company
                        : ""}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {format(signature.signed_at, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            ))}
          </div>
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

      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Não Conformidades Geradas
            </p>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">
            {inspection.nonConformities.length} registro(s)
          </span>
        </div>
        {inspection.nonConformities.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground">
              Nenhuma não conformidade gerada por esta inspeção.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-4 gap-3 px-4 py-2 bg-muted/40">
              {["Código", "Status", "Classificação", "Prazo"].map((h) => (
                <p
                  key={h}
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </p>
              ))}
            </div>
            {inspection.nonConformities.map((nc) => (
              <Link
                key={nc.id}
                href={"/nao-conformidades/" + nc.id}
                className="grid grid-cols-4 gap-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <p className="text-[11px] font-bold font-mono text-foreground">
                  {nc.code}
                </p>
                <div>
                  <NcBadge value={nc.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {NC_CLASSIFICATION_LABELS[nc.classification] ?? nc.classification}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {nc.dueDate ? format(nc.dueDate, "dd/MM/yyyy") : "-"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {scaffold && (
        <div className="bg-muted/40 border border-border flex items-center gap-4 px-5 py-4">
          <QrCode className="w-9 h-9 text-muted-foreground/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-foreground">
              Consulta Online via QR Code
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Escaneie o QR Code no documento PDF para acessar o status atual,
              validade e histórico de inspeções deste andaime.
            </p>
          </div>
          <Link
            href={"/qr/" + inspection.scaffold_id}
            target="_blank"
            className="flex items-center gap-1.5 h-8 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors shrink-0"
          >
            Ver Página
          </Link>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/inspecoes"
          className="flex items-center gap-1.5 h-8 px-4 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
      </div>
    </div>
  );
}
