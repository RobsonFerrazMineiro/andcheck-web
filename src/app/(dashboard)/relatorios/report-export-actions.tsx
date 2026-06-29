"use client";

import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";

import type { KpiTrend, ManagementReportData } from "@/lib/management-reports";

type Props = {
  report: ManagementReportData;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatRate(value: number | null) {
  if (value === null) return "Sem base histórica";
  return `${Math.round(value)}%`;
}

function formatAverage(value: number | null) {
  if (value === null) return "Sem base histórica";
  const rounded = Math.round(value * 10) / 10;
  return rounded === 1 ? "1 dia" : `${rounded.toLocaleString("pt-BR")} dias`;
}

function formatPercent(value: number, total: number) {
  if (total === 0) return "Sem base histórica";
  return `${Math.round((value / total) * 100)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) return "";
  return Math.round(value * 10) / 10;
}

function trendRow(name: string, trend: KpiTrend, suffix = "") {
  return {
    "Nome do KPI": name,
    "Valor atual":
      trend.status === "no-history"
        ? "Sem base histórica"
        : `${formatNumber(trend.currentValue)}${suffix}`,
    "Valor anterior":
      trend.previousValue === null
        ? "Sem base histórica"
        : `${formatNumber(trend.previousValue)}${suffix}`,
    "Diferença absoluta":
      trend.absoluteDiff === null ? "" : `${formatNumber(trend.absoluteDiff)}${suffix}`,
    "Diferença percentual":
      trend.percentDiff === null ? "" : `${formatNumber(trend.percentDiff)}%`,
    Tendência:
      trend.direction === "up"
        ? "Alta"
        : trend.direction === "down"
          ? "Queda"
          : trend.direction === "neutral"
            ? "Estável"
            : "Sem base",
    "Status da tendência": trend.status,
  };
}

function worksheetName(name: string) {
  return name.replace(/[\]\\/?*:[]/g, "").slice(0, 31);
}

function tableHtml(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return "<p>Sem dados no período.</p>";
  }
  const columns = Object.keys(rows[0]);
  return `
    <table>
      <thead><tr>${columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${columns
                .map((col) => `<td>${escapeHtml(row[col])}</td>`)
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function worksheetXml(name: string) {
  return `
    <x:ExcelWorksheet>
      <x:Name>${escapeHtml(worksheetName(name))}</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet>
  `;
}

function sheetHtml(name: string, rows: Array<Record<string, unknown>>) {
  return `
    <h1>${escapeHtml(name)}</h1>
    ${tableHtml(rows)}
    <br style="page-break-before: always;" />
  `;
}

function getCompanyLabel(report: ManagementReportData) {
  if (report.filters.companyId === "all") return "Todas as empresas";
  return (
    report.options.companies.find((company) => company.id === report.filters.companyId)
      ?.name ?? report.filters.companyId
  );
}

function getWorkspaceLabel(report: ManagementReportData) {
  if (report.filters.workspaceId === "all") return "Todos os workspaces";
  return (
    report.options.workspaces.find(
      (workspace) => workspace.id === report.filters.workspaceId,
    )?.name ?? report.filters.workspaceId
  );
}

function summaryRows(report: ManagementReportData) {
  return [
    { Indicador: "Empresa", Valor: getCompanyLabel(report) },
    { Indicador: "Workspace", Valor: getWorkspaceLabel(report) },
    {
      Indicador: "Área",
      Valor: report.filters.area === "all" ? "Todas as áreas" : report.filters.area,
    },
    { Indicador: "Período", Valor: report.periodLabel },
    { Indicador: "Data de emissão", Valor: new Date().toLocaleString("pt-BR") },
    { Indicador: "Total de andaimes", Valor: report.kpis.scaffolds.total },
    { Indicador: "Inspeções realizadas", Valor: report.kpis.inspections.total },
    {
      Indicador: "Taxa de aprovação",
      Valor: formatPercent(report.kpis.inspections.aprovadas, report.kpis.inspections.total),
    },
    {
      Indicador: "Índice de conformidade",
      Valor: formatPercent(report.kpis.inspections.aprovadas, report.kpis.inspections.total),
    },
    { Indicador: "NCs abertas", Valor: report.kpis.nonConformities.abertas },
    { Indicador: "NCs encerradas", Valor: report.kpis.nonConformities.encerradas },
    {
      Indicador: "Tempo médio de operação",
      Valor: formatAverage(report.kpis.averages.operationDays),
    },
    {
      Indicador: "Tempo médio de correção",
      Valor: formatAverage(report.kpis.averages.correctionDays),
    },
    {
      Indicador: "Taxa de utilização",
      Valor: formatRate(report.kpis.quality.utilizationRate),
    },
  ];
}

function kpiRows(report: ManagementReportData) {
  return [
    trendRow("Taxa de aprovação", report.trends.approvalRate, "%"),
    trendRow("Tempo médio de operação", report.trends.operationDays, " dias"),
    trendRow("Tempo médio de correção", report.trends.correctionDays, " dias"),
    trendRow("NCs encerradas", report.trends.closedNonConformities),
    trendRow("NCs em dia", report.trends.onTimeClosureRate, "%"),
  ];
}

function rankingRows(report: ManagementReportData) {
  return [
    ...report.rankings.companies.map((item, index) => ({
      Ranking: "Empresas",
      Posição: index + 1,
      Nome: item.name,
      Andaimes: item.scaffolds,
      Inspeções: item.inspections,
      NCs: item.ncs,
      "Taxa de aprovação": formatRate(item.approvalRate),
    })),
    ...report.rankings.areas.map((item, index) => ({
      Ranking: "Áreas",
      Posição: index + 1,
      Nome: item.name,
      Andaimes: item.scaffolds,
      Inspeções: item.inspections,
      NCs: item.ncs,
      "Taxa de aprovação": "",
    })),
    ...report.rankings.inspectors.map((item, index) => ({
      Ranking: "Inspetores",
      Posição: index + 1,
      Nome: item.name,
      Andaimes: "",
      Inspeções: item.inspections,
      NCs: "",
      "Taxa de aprovação": formatRate(item.approvalRate),
    })),
    ...report.rankings.nonConformities.map((item, index) => ({
      Ranking: "Top NCs",
      Posição: index + 1,
      Nome: item.title,
      Andaimes: "",
      Inspeções: "",
      NCs: item.occurrences,
      "Taxa de aprovação": "",
    })),
  ];
}

function filterRows(report: ManagementReportData) {
  return [
    { Filtro: "Empresa selecionada", Valor: getCompanyLabel(report) },
    { Filtro: "Workspace selecionado", Valor: getWorkspaceLabel(report) },
    {
      Filtro: "Área selecionada",
      Valor: report.filters.area === "all" ? "Todas as áreas" : report.filters.area,
    },
    { Filtro: "Período selecionado", Valor: report.filters.period },
    { Filtro: "Data inicial", Valor: report.filters.dateFrom },
    { Filtro: "Data final", Valor: report.filters.dateTo },
    {
      Filtro: "Usuário que exportou",
      Valor: report.exportedBy || "Usuário autenticado",
    },
    { Filtro: "Data/hora da exportação", Valor: new Date().toLocaleString("pt-BR") },
  ];
}

function downloadFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportExcel(report: ManagementReportData) {
  const sheets = [
    ["Resumo Executivo", summaryRows(report)],
    ["KPIs", kpiRows(report)],
    ["Andaimes", report.exportRows.scaffolds],
    ["Inspeções", report.exportRows.inspections],
    ["Não Conformidades", report.exportRows.nonConformities],
    ["Rankings", rankingRows(report)],
    ["Filtros Aplicados", filterRows(report)],
  ] satisfies Array<[string, Array<Record<string, unknown>>]>;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              ${sheets.map(([name]) => worksheetXml(name)).join("")}
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml><![endif]-->
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { background: #1f2937; color: #fff; font-size: 16px; padding: 10px; margin: 0 0 12px; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; vertical-align: top; }
        </style>
      </head>
      <body>
        ${sheets.map(([name, rows]) => sheetHtml(name, rows)).join("")}
      </body>
    </html>
  `;
  downloadFile(
    "andcheck-relatorio-gerencial.xls",
    "application/vnd.ms-excel;charset=utf-8",
    html,
  );
}

export function ReportExportActions({ report }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);

  function exportPdf() {
    setPdfLoading(true);
    const opened = window.open(
      `/relatorios/imprimir${window.location.search}`,
      "_blank",
      "noopener,noreferrer",
    );
    if (!opened) {
      toast.error("Permita pop-ups para abrir a página de impressão.");
    }
    window.setTimeout(() => {
      setPdfLoading(false);
    }, 500);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={exportPdf}
        disabled={pdfLoading}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Printer className="size-3.5" />
        {pdfLoading ? "Abrindo..." : "Exportar PDF"}
      </button>
      <button
        type="button"
        onClick={() => exportExcel(report)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[10px] font-bold uppercase tracking-widest text-accent-foreground hover:bg-accent/90"
      >
        <FileSpreadsheet className="size-3.5" />
        Exportar Excel
      </button>
    </div>
  );
}
