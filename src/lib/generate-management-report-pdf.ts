import { format } from "date-fns";
import { jsPDF } from "jspdf";

import type { ManagementReportData } from "@/lib/management-reports";

type RGB = [number, number, number];
type DonutItem = { label: string; value: number; color: RGB };
type KpiTrend = { value: string; color: RGB; direction: "up" | "down" | "flat" } | null;
type KpiIcon =
  | "scaffold"
  | "inspection"
  | "nc"
  | "time"
  | "rate"
  | "closed"
  | "ontime"
  | "correction";

const C = {
  primary: [31, 41, 55] as RGB,
  slate: [71, 85, 105] as RGB,
  muted: [100, 116, 139] as RGB,
  border: [203, 213, 225] as RGB,
  bg: [248, 250, 252] as RGB,
  orange: [217, 119, 6] as RGB,
  blue: [100, 116, 139] as RGB,
  sky: [2, 132, 199] as RGB,
  green: [5, 150, 105] as RGB,
  teal: [13, 148, 136] as RGB,
  red: [190, 18, 60] as RGB,
  rose: [225, 29, 72] as RGB,
  amber: [217, 119, 6] as RGB,
  yellow: [202, 138, 4] as RGB,
  white: [255, 255, 255] as RGB,
  black: [17, 24, 39] as RGB,
};

type ReportFilterLabels = {
  company: string;
  workspace: string;
  area: string;
};

function rgb([r, g, b]: RGB) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function setText(doc: jsPDF, color: RGB) {
  doc.setTextColor(...color);
}

function setFill(doc: jsPDF, color: RGB) {
  doc.setFillColor(...color);
}

function setDraw(doc: jsPDF, color: RGB) {
  doc.setDrawColor(...color);
}

function setHairline(doc: jsPDF) {
  doc.setLineWidth(0.2);
}

function text(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  options: Parameters<jsPDF["text"]>[3] = {},
) {
  doc.text(value, x, y, options);
}

function formatAverage(value: number | null) {
  if (value === null) return "Sem base histórica";
  const rounded = Math.round(value * 10) / 10;
  return rounded === 1 ? "1 dia" : `${rounded.toLocaleString("pt-BR")} dias`;
}

function percent(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatPercent(value: number, total: number) {
  if (total === 0) return "Sem base";
  return percent(value, total);
}

function formatRate(value: number | null) {
  if (value === null) return "Sem base histórica";
  return `${Math.round(value)}%`;
}

function diffTrend(
  current: number | null,
  previous: number | null,
  suffix: string,
  lowerIsBetter = false,
  showComparison = false,
): KpiTrend {
  if (current === null || previous === null) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) {
    return {
      value: showComparison ? "0 vs período anterior" : "0",
      color: C.muted,
      direction: "flat",
    };
  }
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const abs = Math.abs(diff).toLocaleString("pt-BR");
  const comparison = showComparison ? " vs período anterior" : "";
  return {
    value: `${diff > 0 ? "+" : "-"}${abs}${suffix}${comparison}`,
    color: improved ? C.green : C.red,
    direction: diff > 0 ? "up" : "down",
  };
}

function trendOrNoBase(trend: KpiTrend): KpiTrend {
  return trend ?? { value: "Sem base histórica", color: C.muted, direction: "flat" };
}

function sectionHeader(doc: jsPDF, title: string, x: number, y: number, w: number) {
  setHairline(doc);
  setFill(doc, C.primary);
  doc.rect(x, y, w, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, C.white);
  text(doc, title.toUpperCase(), x + 4, y + 5.4);
}

function drawKpiIcon(doc: jsPDF, icon: KpiIcon, x: number, y: number, color: RGB) {
  setDraw(doc, color);
  setText(doc, color);
  doc.setLineWidth(0.35);
  doc.circle(x, y, 4.2, "S");

  if (icon === "scaffold") {
    doc.line(x - 2.2, y + 1.8, x + 2.2, y + 1.8);
    doc.line(x - 1.7, y + 1.8, x - 0.6, y - 1.8);
    doc.line(x + 1.7, y + 1.8, x + 0.6, y - 1.8);
    doc.line(x - 1.1, y, x + 1.1, y);
  }
  if (icon === "inspection") {
    doc.rect(x - 1.8, y - 2.2, 3.6, 4.4, "S");
    doc.line(x - 0.9, y, x - 0.1, y + 0.8);
    doc.line(x - 0.1, y + 0.8, x + 1.2, y - 0.9);
  }
  if (icon === "nc") {
    doc.triangle(x, y - 2.2, x - 2.2, y + 1.8, x + 2.2, y + 1.8, "S");
    doc.line(x, y - 0.8, x, y + 0.7);
    doc.circle(x, y + 1.3, 0.25, "F");
  }
  if (icon === "time" || icon === "correction") {
    doc.circle(x, y, 2.3, "S");
    doc.line(x, y, x, y - 1.3);
    doc.line(x, y, x + 1.2, y + 0.8);
  }
  if (icon === "rate" || icon === "ontime") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    text(doc, "%", x, y + 2.1, { align: "center" });
  }
  if (icon === "closed") {
    doc.line(x - 1.6, y, x - 0.4, y + 1.2);
    doc.line(x - 0.4, y + 1.2, x + 1.8, y - 1.4);
  }

  setHairline(doc);
}

function drawTrendGlyph(doc: jsPDF, trend: KpiTrend, x: number, y: number) {
  if (!trend || trend.direction === "flat") return;
  setDraw(doc, trend.color);
  doc.setLineWidth(0.35);
  if (trend.direction === "up") {
    doc.line(x, y + 1.4, x + 2.8, y - 1.4);
    doc.line(x + 2.8, y - 1.4, x + 2.8, y + 0.4);
    doc.line(x + 2.8, y - 1.4, x + 1, y - 1.4);
  } else {
    doc.line(x, y - 1.4, x + 2.8, y + 1.4);
    doc.line(x + 2.8, y + 1.4, x + 2.8, y - 0.4);
    doc.line(x + 2.8, y + 1.4, x + 1, y + 1.4);
  }
  setHairline(doc);
}

function addHeader(doc: jsPDF, labels: ReportFilterLabels, report: ManagementReportData) {
  setFill(doc, C.primary);
  doc.rect(0, 0, 297, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, C.white);
  text(doc, "ANDCHECK EHS • BUSINESS INTELLIGENCE", 14, 9);
  doc.setFontSize(16);
  text(doc, "RELATÓRIOS GERENCIAIS", 14, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, C.slate);
  text(doc, `Empresa: ${labels.company}`, 14, 30);
  text(doc, `Workspace: ${labels.workspace}`, 90, 30);
  text(doc, `Área: ${labels.area}`, 170, 30);
  text(doc, `Período: ${report.periodLabel}`, 14, 36);
  text(doc, `Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 90, 36);
}

function card(
  doc: jsPDF,
  label: string,
  value: string | number,
  x: number,
  y: number,
  w: number,
  color: RGB,
  icon?: KpiIcon,
  trend: KpiTrend = null,
) {
  setHairline(doc);
  setFill(doc, C.white);
  setDraw(doc, C.border);
  doc.rect(x, y, w, 25, "FD");
  setFill(doc, color);
  doc.rect(x, y, 1.8, 25, "F");
  if (icon) {
    drawKpiIcon(doc, icon, x + w - 9.5, y + 7.6, color);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  setText(doc, C.muted);
  text(doc, label.toUpperCase(), x + 5, y + 6.2);
  doc.setFontSize(String(value).length > 14 ? 11 : 15);
  setText(doc, C.black);
  text(doc, String(value), x + 5, y + 15);
  if (trend) {
    drawTrendGlyph(doc, trend, x + 5, y + 21.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(doc, trend.color);
    text(doc, trend.value, x + (trend.direction === "flat" ? 5 : 10.5), y + 22);
  }
}

function donut(
  doc: jsPDF,
  items: DonutItem[],
  x: number,
  y: number,
  radius: number,
  strokeWidth: number,
  center?: { value: string; label: string; valueSize?: number; labelSize?: number },
) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const ctx = doc.context2d;
  ctx.save();
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "butt";
  ctx.strokeStyle = rgb(C.border);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2, false);
  ctx.stroke();

  if (total > 0) {
    let start = -Math.PI / 2;
    const gap = 0.026;
    items
      .filter((item) => item.value > 0)
      .forEach((item) => {
        const slice = (item.value / total) * Math.PI * 2;
        ctx.strokeStyle = rgb(item.color);
        ctx.beginPath();
        ctx.arc(x, y, radius, start + gap, start + slice - gap, false);
        ctx.stroke();
        start += slice;
      });
  }
  ctx.restore();
  setHairline(doc);

  if (center) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(center.valueSize ?? 12);
    setText(doc, C.black);
    text(doc, center.value, x, y - 1, { align: "center" });
    doc.setFontSize(center.labelSize ?? 6);
    setText(doc, C.muted);
    doc.splitTextToSize(center.label.toUpperCase(), 30).forEach((line: string, index: number) => {
      text(doc, line, x, y + 4.4 + index * 3, { align: "center" });
    });
  }
}

function legendWithPercent(
  doc: jsPDF,
  items: DonutItem[],
  x: number,
  y: number,
  labelW = 44,
  rowGap = 7.2,
) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  items.forEach((item, index) => {
    const cy = y + index * rowGap;
    setFill(doc, item.color);
    doc.rect(x, cy - 2.7, 2.8, 2.8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.7);
    setText(doc, C.slate);
    text(doc, item.label, x + 5, cy);
    setText(doc, C.black);
    text(doc, String(item.value), x + labelW + 11, cy, { align: "right" });
    setText(doc, C.muted);
    text(doc, percent(item.value, total), x + labelW + 28, cy, { align: "right" });
  });
}

function largeDonutPanel(
  doc: jsPDF,
  title: string,
  items: DonutItem[],
  x: number,
  y: number,
  w: number,
  h: number,
  footer?: string,
) {
  setHairline(doc);
  sectionHeader(doc, title, x, y, w);
  setFill(doc, C.white);
  setDraw(doc, C.border);
  doc.rect(x, y + 8, w, h - 8, "FD");
  donut(doc, items, x + 35, y + 45, 24, 7.5);
  legendWithPercent(doc, items, x + 70, y + 27, 32, 6.7);

  if (footer) {
    setFill(doc, C.bg);
    setDraw(doc, C.border);
    doc.rect(x + 70, y + h - 16, w - 78, 9, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    setText(doc, C.slate);
    text(doc, footer, x + 74, y + h - 10.2);
  }
}

function performancePanel(
  doc: jsPDF,
  items: DonutItem[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  setHairline(doc);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const approved = items.find((item) => item.label === "Aprovadas")?.value ?? 0;
  sectionHeader(doc, "Desempenho de Inspeções", x, y, w);
  setFill(doc, C.white);
  setDraw(doc, C.border);
  doc.rect(x, y + 8, w, h - 8, "FD");
  const legendX = x + 62;
  const donutX = x + (legendX - x) / 2;
  donut(doc, items, donutX, y + 33, 17, 5.5, {
    value: formatPercent(approved, total),
    label: "Taxa de aprovação",
    valueSize: 13,
    labelSize: 6,
  });
  legendWithPercent(doc, items, legendX, y + 28, 34, 7.4);
}

function groupedNcChart(
  doc: jsPDF,
  report: ManagementReportData,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  setHairline(doc);
  sectionHeader(doc, "Evolução das NCs", x, y, w);
  setFill(doc, C.white);
  setDraw(doc, C.border);
  doc.rect(x, y + 8, w, h - 8, "FD");

  const rows = report.charts.nonConformityTrend;
  const max = Math.max(1, ...rows.flatMap((item) => [item.abertas, item.encerradas]));
  const chartX = x + 10;
  const chartTop = y + 25;
  const chartH = h - 41;
  const chartW = w - 12;
  const baseY = chartTop + chartH;

  setFill(doc, C.rose);
  doc.rect(x + 8, y + 16, 2.8, 2.8, "F");
  setFill(doc, C.teal);
  doc.rect(x + 47, y + 16, 2.8, 2.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setText(doc, C.slate);
  text(doc, "NCs abertas", x + 13, y + 18.5);
  text(doc, "NCs encerradas", x + 52, y + 18.5);

  const ticks = [max, Math.round(max / 2), 0].filter(
    (tick, index, values) => values.indexOf(tick) === index,
  );
  setDraw(doc, C.border);
  doc.setLineWidth(0.15);
  doc.line(chartX, chartTop, chartX, baseY);
  doc.line(chartX, baseY, chartX + chartW, baseY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  ticks.forEach((tick) => {
    const tickY = baseY - (tick / max) * chartH;
    setText(doc, C.muted);
    text(doc, String(tick), chartX - 3, tickY + 1.5, { align: "right" });
    setDraw(doc, C.border);
    doc.line(chartX, tickY, chartX + chartW, tickY);
  });

  const groupW = chartW / Math.max(1, rows.length);
  const barW = Math.min(4.2, groupW * 0.2);
  const pairGap = Math.min(0.35, groupW * 0.06);
  const labelInterval = Math.max(1, Math.ceil(rows.length / 8));
  rows.forEach((item, index) => {
    const center = chartX + groupW * index + groupW / 2;
    const openedH = (item.abertas / max) * chartH;
    const closedH = (item.encerradas / max) * chartH;

    setFill(doc, C.rose);
    const openedX = center - barW - pairGap / 2;
    const closedX = center + pairGap / 2;

    doc.rect(openedX, baseY - openedH, barW, openedH || 0.8, "F");
    setFill(doc, C.teal);
    doc.rect(closedX, baseY - closedH, barW, closedH || 0.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    setText(doc, C.black);
    text(doc, String(item.abertas), openedX + barW / 2, baseY - openedH - 1.1, {
      align: "center",
    });
    text(doc, String(item.encerradas), closedX + barW / 2, baseY - closedH - 1.1, {
      align: "center",
    });
    setText(doc, C.muted);
    if (index % labelInterval === 0 || index === rows.length - 1) {
      const labelX = center + (item.label.includes(" - ") ? 4.4 : item.label.length === 5 ? 1.2 : item.label.includes("/") ? 4.4 : 1.4);
      text(doc, item.label, labelX, baseY + 3.5, {
        align: "center",
        angle: -90,
      });
    }
  });
}

function rankingTable(
  doc: jsPDF,
  title: string,
  rows: Array<Array<string | number>>,
  x: number,
  y: number,
  w: number,
  widths: number[],
  columns: string[],
) {
  sectionHeader(doc, title, x, y, w);
  let cy = y + 8;
  setFill(doc, C.bg);
  setDraw(doc, C.border);
  doc.rect(x, cy, w, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  setText(doc, C.muted);
  let cx = x + 3;
  columns.forEach((column, index) => {
    text(doc, column.toUpperCase(), cx, cy + 4.8);
    cx += widths[index];
  });
  cy += 7;

  rows.slice(0, 5).forEach((row) => {
    const cellLines = row.map((cell, index) =>
      doc.splitTextToSize(String(cell), Math.max(6, widths[index] - 3)),
    );
    const rowH = Math.max(8, Math.max(...cellLines.map((lines) => lines.length)) * 3.5 + 3);
    setDraw(doc, C.border);
    doc.line(x, cy + rowH, x + w, cy + rowH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.1);
    setText(doc, C.black);
    let tx = x + 3;
    cellLines.forEach((lines, index) => {
      doc.text(lines.slice(0, 2), tx, cy + 4.8);
      tx += widths[index];
    });
    cy += rowH;
  });
}

function addFooter(doc: jsPDF) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, C.muted);
  text(
    doc,
    "Documento gerado automaticamente pelo AndCheck. Dados respeitam escopo, RBAC e filtros aplicados.",
    14,
    206,
  );
}

export function generateManagementReportPdf(
  report: ManagementReportData,
  labels: ReportFilterLabels,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const M = 14;
  const W = 269;
  const gap = 4;
  const cardW = (W - gap * 3) / 4;

  const scaffoldItems: DonutItem[] = [
    { label: "Liberados", value: report.kpis.scaffolds.liberados, color: C.green },
    { label: "Em montagem", value: report.kpis.scaffolds.emMontagem, color: C.orange },
    { label: "Pendentes", value: report.kpis.scaffolds.pendentes, color: C.yellow },
    { label: "Interditados", value: report.kpis.scaffolds.interditados, color: C.red },
    { label: "Vencidos", value: report.kpis.scaffolds.vencidos, color: C.rose },
    { label: "Desmontados", value: report.kpis.scaffolds.desmontados, color: C.slate },
  ];
  const inspectionItems: DonutItem[] = [
    { label: "Aprovadas", value: report.kpis.inspections.aprovadas, color: C.green },
    { label: "Reprovadas", value: report.kpis.inspections.reprovadas, color: C.red },
    { label: "Com ressalvas", value: report.kpis.inspections.ressalvas, color: C.amber },
  ];
  const operationItems: DonutItem[] = [
    { label: "Aprovadas", value: report.kpis.inspections.aprovadas, color: C.green },
    { label: "Reprovadas", value: report.kpis.inspections.reprovadas, color: C.red },
    { label: "Com ressalvas", value: report.kpis.inspections.ressalvas, color: C.amber },
    { label: "NCs em tratamento", value: report.kpis.nonConformities.emTratamento, color: C.sky },
    { label: "NCs vencidas", value: report.kpis.nonConformities.vencidas, color: C.slate },
  ];
  const approvalTrend = diffTrend(
    report.trends.approvalRate.current,
    report.trends.approvalRate.previous,
    "%",
    false,
    true,
  );
  const closedNcTrend = diffTrend(
    report.trends.closedNonConformities.current,
    report.trends.closedNonConformities.previous,
    "",
  );
  const onTimeTrend = diffTrend(
    report.trends.onTimeClosureRate.current,
    report.trends.onTimeClosureRate.previous,
    "%",
  );
  const correctionTrend = diffTrend(
    report.trends.correctionDays.current,
    report.trends.correctionDays.previous,
    " dias",
    true,
  );
  addHeader(doc, labels, report);

  let y = 44;
  sectionHeader(doc, "KPIs principais", M, y, W);
  y += 11;
  card(doc, "Total de andaimes", report.kpis.scaffolds.total, M, y, cardW, C.orange, "scaffold");
  card(doc, "Inspeções realizadas", report.kpis.inspections.total, M + (cardW + gap), y, cardW, C.blue, "inspection");
  card(doc, "NCs abertas", report.kpis.nonConformities.abertas, M + (cardW + gap) * 2, y, cardW, C.red, "nc");
  card(
    doc,
    "Tempo médio operação",
    formatAverage(report.kpis.averages.operationDays),
    M + (cardW + gap) * 3,
    y,
    cardW,
    C.green,
    "time",
  );

  y += 28;
  card(
    doc,
    "Taxa de aprovação",
    formatRate(report.trends.approvalRate.current),
    M,
    y,
    cardW,
    C.green,
    "rate",
    trendOrNoBase(approvalTrend),
  );
  card(
    doc,
    "NCs encerradas",
    report.kpis.nonConformities.encerradas,
    M + (cardW + gap),
    y,
    cardW,
    C.green,
    "closed",
    trendOrNoBase(closedNcTrend),
  );
  card(
    doc,
    "NCs em dia",
    formatRate(report.kpis.quality.onTimeClosureRate),
    M + (cardW + gap) * 2,
    y,
    cardW,
    C.blue,
    "ontime",
    trendOrNoBase(onTimeTrend),
  );
  card(
    doc,
    "Tempo médio correção",
    formatAverage(report.kpis.averages.correctionDays),
    M + (cardW + gap) * 3,
    y,
    cardW,
    C.orange,
    "correction",
    trendOrNoBase(correctionTrend),
  );

  y += 34;
  const bigW = (W - gap) / 2;
  largeDonutPanel(doc, "Andaimes", scaffoldItems, M, y, bigW, 76);
  largeDonutPanel(
    doc,
    "Inspeções e NCs",
    operationItems,
    M + bigW + gap,
    y,
    bigW,
    76,
    `Tempo médio de correção: ${formatAverage(report.kpis.averages.correctionDays)}`,
  );

  doc.addPage("a4", "landscape");
  addHeader(doc, labels, report);
  y = 44;
  const chartW = (W - gap) / 2;
  performancePanel(doc, inspectionItems, M, y, chartW, 58);
  groupedNcChart(doc, report, M + chartW + gap, y, chartW, 58);

  y += 62;
  const panelW = (W - gap * 2) / 3;
  rankingTable(
    doc,
    "Top 5 empresas",
    report.rankings.companies.map((item, index) => [
      index + 1,
      item.name,
      item.scaffolds,
      item.inspections,
      item.ncs,
    ]),
    M,
    y,
    panelW,
    [8, 42, 12, 14, 10],
    ["#", "Empresa", "And.", "Insp.", "NC"],
  );
  rankingTable(
    doc,
    "Top 5 áreas",
    report.rankings.areas.map((item, index) => [
      index + 1,
      item.name,
      item.scaffolds,
      item.inspections,
      item.ncs,
    ]),
    M + panelW + gap,
    y,
    panelW,
    [8, 42, 12, 14, 10],
    ["#", "Área", "And.", "Insp.", "NC"],
  );
  rankingTable(
    doc,
    "Top 5 inspetores",
    report.rankings.inspectors.map((item, index) => [
      index + 1,
      item.name,
      item.inspections,
      item.aprovadas,
      item.reprovadas,
    ]),
    M + (panelW + gap) * 2,
    y,
    panelW,
    [8, 41, 14, 12, 10],
    ["#", "Inspetor", "Insp.", "Apr.", "Rep."],
  );

  y += 60;
  sectionHeader(doc, "Insights operacionais", M, y, W);
  y += 11;
  const insights = [
    ["Empresa mais ativa", report.rankings.companies[0]?.name ?? "Sem dados"],
    ["Área com maior volume", report.rankings.areas[0]?.name ?? "Sem dados"],
    ["Inspetor mais ativo", report.rankings.inspectors[0]?.name ?? "Sem dados"],
    ["Tempo médio de correção", formatAverage(report.kpis.averages.correctionDays)],
  ];
  insights.forEach(([label, value], index) => {
    card(doc, label, value, M + index * (cardW + gap), y, cardW, C.slate);
  });
  addFooter(doc);

  return doc.output("arraybuffer");
}
