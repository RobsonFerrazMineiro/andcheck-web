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
import { ReleaseFlowProbe } from "./release-flow-probe";
import { LinkedRecordsButton } from "@/components/scaffold/linked-records-button";
import {
  ActionMenu,
  actionMenuItemClassName,
} from "@/components/shared/action-menu";
import { AuditTimelineButton } from "@/components/shared/audit-timeline";
import { EmptyState } from "@/components/shared/empty-state";
import {
  NonConformityBadge,
  getNonConformityClassificationLabel,
} from "@/components/shared/non-conformity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInspectionById } from "@/lib/actions/inspection-actions";
import { AuditEntityType, getEntityAuditTimeline } from "@/lib/audit";
import { typography } from "@/lib/design-system";
import { getScaffoldTypeLabel } from "@/lib/scaffold-types";

interface Props {
  params: Promise<{ id: string }>;
}

type ChecklistValueCode = "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA";
type InspectionResultCode =
  | "aprovado"
  | "aprovado_com_ressalvas"
  | "reprovado";

type InspectionDetail = {
  id: string;
  scaffold_id: string;
  scaffold_code: string;
  date: Date;
  inspector_name: string;
  result: InspectionResultCode;
  validity_days: number;
  notes: string | null;
  photos: string[];
  signature: string | null;
  scaffold: {
    id: string;
    code: string;
    location: string;
    area: string;
    type: string;
    status: string;
    height: number;
    max_load: number | null;
    responsible: string;
    company: string | null;
  } | null;
  checklist: Array<{
    id: string;
    item_id: string;
    item_label: string;
    category: string;
    value: ChecklistValueCode;
    critical: boolean;
    observation: string | null;
    photo: string | null;
  }>;
  signatures: Array<{
    id: string;
    role_code: string;
    signer_name: string;
    signer_company: string | null;
    signer_position: string | null;
    signature_data: string | null;
    signed_at: Date;
    role: { code: string; name: string };
  }>;
  nonConformities: Array<{
    id: string;
    code: string;
    status: string;
    classification: string;
    dueDate: Date | null;
  }>;
};

function valueToStatus(
  v: ChecklistValueCode,
): "conforme" | "nao_conforme" | "nao_aplicavel" {
  if (v === "CL_OK") return "conforme";
  if (v === "CL_FAIL" || v === "CL_WARN") return "nao_conforme";
  return "nao_aplicavel";
}

const ITEM_ICONS = {
  conforme: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  nao_conforme: <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />,
  nao_aplicavel: (
    <MinusCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
  ),
};
const ITEM_LABELS = {
  conforme: "Conforme",
  nao_conforme: "Não Conforme",
  nao_aplicavel: "N/A",
};
const ITEM_ROW = {
  conforme: "bg-card",
  nao_conforme: "bg-destructive/5",
  nao_aplicavel: "bg-card",
};

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
      <p className={`${typography.sectionLabel} w-32 shrink-0 text-muted-foreground`}>
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
  const inspectionResult = await getInspectionById(id);
  if (!inspectionResult) notFound();
  const inspection = inspectionResult as InspectionDetail;
  const auditTimeline = await getEntityAuditTimeline({
    entityType: AuditEntityType.INSPECTION,
    entityId: inspection.id,
  });

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

  const linkedNonConformities = inspection.nonConformities.map((nc) => ({
    ...nc,
    responsibleUser: null,
  }));

  const grouped: Record<string, typeof checklist> = {};
  checklist.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      <ReleaseFlowProbe
        inspectionId={inspection.id}
        scaffoldStatus={scaffold?.status}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/inspecoes" aria-label="Voltar para inspeções">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
          </Button>
          <p className={`min-w-0 ${typography.sectionLabel} text-muted-foreground`}>
            <Link href="/inspecoes" className="hover:text-foreground">
              Inspeções
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground font-mono">
              {inspection.scaffold_code}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <LinkedRecordsButton
            type="nonConformities"
            records={linkedNonConformities}
            scaffoldId={inspection.scaffold_id}
            scaffoldCode={inspection.scaffold_code}
          />
          <AuditTimelineButton items={auditTimeline} />
        <ActionMenu className="shrink-0">
          <PdfDownloadButton
            className={actionMenuItemClassName}
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
              signatures: inspection.signatures.map((signature) => ({
                role_code: signature.role_code,
                signer_name: signature.signer_name,
                signer_company: signature.signer_company,
                signer_position: signature.signer_position,
                signature_data: signature.signature_data,
              })),
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
          <PrintButton className={actionMenuItemClassName} />
          {scaffold && (
            <Link
              href={"/andaimes/" + inspection.scaffold_id}
              className={actionMenuItemClassName}
            >
              <Construction className="w-4 h-4" />
              Ver andaime
            </Link>
          )}
        </ActionMenu>
        </div>
      </div>

      <div className="bg-sidebar border-l-4 border-l-sidebar-primary px-5 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-primary-foreground/40 mb-1">
              AndCheck • Inspeções
            </p>
            <h2 className="text-[22px] font-bold text-primary-foreground tracking-tight font-mono">
              {inspection.scaffold_code}
            </h2>
            <p className="text-[11px] text-primary-foreground/60 mt-0.5">
              {scaffold?.location ?? "Registro de inspeção"}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 shrink-0 sm:items-end">
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
        <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className={typography.metaStrong}>
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
            color: "text-destructive",
            bg: "border-destructive/30 bg-destructive/5",
            bar: "border-l-destructive",
          },
          {
            label: "N/A",
            value: naAplicavel,
            color: "text-muted-foreground",
            bg: "bg-muted/40 border-border",
            bar: "border-l-muted-foreground",
          },
          {
            label: "Conformidade",
            value: pct + "%",
            color:
              pct >= 80
                ? "text-emerald-600"
                : pct >= 50
                  ? "text-amber-600"
                  : "text-destructive",
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
            <p className={`${typography.sectionLabel} text-muted-foreground`}>
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
            <p className={`${typography.panelTitle} text-foreground`}>
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
                value={getScaffoldTypeLabel(scaffold.type)}
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
            <p className={`${typography.panelTitle} text-foreground`}>
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
              <p className={`${typography.sectionLabel} mb-1 text-muted-foreground`}>
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
          <p className={`${typography.panelTitle} text-foreground`}>
            Assinaturas Obrigatorias
          </p>
        </div>
        {inspection.signatures.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhuma assinatura obrigatória registrada"
            description="As assinaturas coletadas nesta inspeção aparecerão aqui."
            className="border-0 border-b border-dashed py-8"
          />
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
          <p className={`${typography.panelTitle} text-foreground`}>
            Checklist de Conformidade
          </p>
        </div>
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="px-4 py-2 bg-primary/5 border-b border-border">
              <p className={`${typography.sectionLabel} text-muted-foreground`}>
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
                            ? "text-destructive"
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
                            `${typography.sectionLabel} ` +
                            (st === "conforme"
                              ? "text-emerald-600"
                              : st === "nao_conforme"
                                ? "text-destructive"
                                : "text-muted-foreground/60")
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
            <p className={`${typography.panelTitle} text-foreground`}>
              Não Conformidades Geradas
            </p>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">
            {inspection.nonConformities.length} registro(s)
          </span>
        </div>
        {inspection.nonConformities.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhuma não conformidade gerada"
            description="Quando a inspeção gerar tratativas, elas serão exibidas neste painel."
            className="border-0 border-b border-dashed"
          />
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-4 gap-3 px-4 py-2 bg-muted/40 sm:grid">
              {["Código", "Status", "Classificação", "Prazo"].map((h) => (
                <p
                  key={h}
                  className={`${typography.sectionLabel} text-muted-foreground`}
                >
                  {h}
                </p>
              ))}
            </div>
            {inspection.nonConformities.map((nc) => (
              <Link
                key={nc.id}
                href={"/nao-conformidades/" + nc.id}
                className="grid gap-2 px-4 py-3 hover:bg-muted/30 transition-colors sm:grid-cols-4 sm:items-center"
              >
                <p className="text-[11px] font-bold font-mono text-foreground">
                  <span className={`mr-2 ${typography.sectionLabel} text-muted-foreground sm:hidden`}>
                    Código
                  </span>
                  {nc.code}
                </p>
                <div>
                  <NonConformityBadge value={nc.status} size="xs" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className={`mr-2 ${typography.sectionLabel} text-muted-foreground sm:hidden`}>
                    Classificação
                  </span>
                  {getNonConformityClassificationLabel(nc.classification)}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  <span className={`mr-2 ${typography.sectionLabel} text-muted-foreground sm:hidden`}>
                    Prazo
                  </span>
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
          <Button
            asChild
            variant="outline"
            className={`shrink-0 ${typography.panelTitle}`}
          >
            <Link href={"/qr/" + inspection.scaffold_id} target="_blank">
              Ver Página
            </Link>
          </Button>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          asChild
          variant="outline"
          className={typography.panelTitle}
        >
          <Link href="/inspecoes">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </Link>
        </Button>
      </div>
    </div>
  );
}
