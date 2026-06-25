"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

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

export function ReportExportActions({ report }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function exportPdf() {
    const toastId = toast.loading("Gerando PDF gerencial...");
    setPdfLoading(true);

    try {
      const response = await fetch(`/api/relatorios/pdf${window.location.search}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Não foi possível gerar o PDF.");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("A resposta recebida não é um PDF válido.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");

      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = "relatorio-gerencial-andcheck.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("PDF gerado com sucesso.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o PDF gerencial.",
        { id: toastId },
      );
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={exportPdf}
        disabled={pdfLoading}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="size-3.5" />
        {pdfLoading ? "Gerando..." : "Exportar PDF"}
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
