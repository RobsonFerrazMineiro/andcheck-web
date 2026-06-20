"use client";

import { Download, FileSpreadsheet } from "lucide-react";

import type { ManagementReportData } from "@/lib/management-reports";

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

function metricRows(report: ManagementReportData) {
  return [
    ["Total de Andaimes", report.kpis.scaffolds.total],
    ["Andaimes Liberados", report.kpis.scaffolds.liberados],
    ["Andaimes Interditados", report.kpis.scaffolds.interditados],
    ["Inspeções Realizadas", report.kpis.inspections.total],
    ["Inspeções Aprovadas", report.kpis.inspections.aprovadas],
    ["Inspeções Reprovadas", report.kpis.inspections.reprovadas],
    ["NCs Abertas", report.kpis.nonConformities.abertas],
    ["NCs Encerradas", report.kpis.nonConformities.encerradas],
  ];
}

function tableHtml(title: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return `<h2>${escapeHtml(title)}</h2><p>Sem dados no período.</p>`;
  }
  const columns = Object.keys(rows[0]);
  return `
    <h2>${escapeHtml(title)}</h2>
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

function buildExecutiveHtml(report: ManagementReportData) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório Gerencial AndCheck</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; color: #1f2937; margin: 32px; }
          .eyebrow { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b; font-weight: 700; }
          h1 { font-size: 22px; margin: 6px 0 4px; text-transform: uppercase; }
          h2 { font-size: 12px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.12em; color: #334155; }
          .period { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .card { border: 1px solid #cbd5e1; border-left: 4px solid #ea580c; padding: 12px; }
          .label { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .value { font-size: 22px; font-weight: 800; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          th { background: #1f2937; color: white; text-align: left; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; }
          @media print { button { display: none; } body { margin: 18mm; } }
        </style>
      </head>
      <body>
        <p class="eyebrow">AndCheck EHS • Business Intelligence</p>
        <h1>Relatórios Gerenciais</h1>
        <p class="period">Período: ${escapeHtml(report.periodLabel)}</p>
        <div class="grid">
          ${metricRows(report)
            .map(
              ([label, value]) =>
                `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`,
            )
            .join("")}
        </div>
        ${tableHtml("Empresas Mais Ativas", report.rankings.companies)}
        ${tableHtml("Áreas Operacionais", report.rankings.areas)}
        ${tableHtml("Inspetores Mais Ativos", report.rankings.inspectors)}
      </body>
    </html>
  `;
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
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        ${tableHtml(
          "Indicadores",
          metricRows(report).map(([indicador, valor]) => ({ indicador, valor })),
        )}
        ${tableHtml("Andaimes", report.exportRows.scaffolds)}
        ${tableHtml("Inspeções", report.exportRows.inspections)}
        ${tableHtml("Não Conformidades", report.exportRows.nonConformities)}
      </body>
    </html>
  `;
  downloadFile(
    "andcheck-relatorio-gerencial.xls",
    "application/vnd.ms-excel;charset=utf-8",
    html,
  );
}

function exportPdf(report: ManagementReportData) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
  if (!win) return;
  win.document.open();
  win.document.write(buildExecutiveHtml(report));
  win.document.close();
  win.focus();
  win.print();
}

export function ReportExportActions({ report }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => exportPdf(report)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
      >
        <Download className="size-3.5" />
        Exportar PDF
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
