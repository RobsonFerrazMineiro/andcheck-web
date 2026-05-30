/**
 * AndCheck EHS — Relatório Técnico Controlado
 * ISO 9001:2015 · ISO 45001:2018 · NR-18 · NR-35 · ABNT NBR 6494
 */
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  item_id: string;
  item_label: string;
  category: string;
  value: "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA";
  critical: boolean;
  observation?: string | null;
}

export interface InspectionForPDF {
  id: string;
  scaffold_code: string;
  date: Date;
  inspector_name: string;
  result: "aprovado" | "aprovado_com_ressalvas" | "reprovado";
  validity_days: number;
  notes?: string | null;
  checklist: ChecklistItem[];
  scaffold?: {
    id: string;
    location: string;
    area: string;
    type: string;
    height: number;
    max_load?: number | null;
    responsible: string;
  } | null;
}

// ── Paleta ───────────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const C: Record<string, RGB> = {
  navyDark: [27, 54, 93],
  navyMid: [56, 93, 138],
  navyLight: [37, 99, 235],
  navyUltraLight: [235, 241, 248],
  orangeEng: [196, 88, 18],
  grayDark: [31, 41, 55],
  grayMid: [100, 116, 139],
  grayLight: [226, 232, 240],
  grayBg: [245, 247, 250],
  white: [255, 255, 255],
  green: [22, 163, 74],
  greenBg: [240, 253, 244],
  greenBorder: [134, 239, 172],
  red: [220, 38, 38],
  redBg: [254, 242, 242],
  redBorder: [252, 165, 165],
  amber: [217, 119, 6],
  amberBg: [255, 251, 235],
  amberBorder: [252, 211, 107],
  grayStatus: [100, 116, 139],
  grayStatusBg: [248, 250, 252],
  grayStatusBorder: [203, 213, 225],
};

const STATUS_CFG = {
  aprovado: {
    label: "APROVADO",
    fg: C.green,
    bg: [232, 248, 239] as RGB,
    border: C.greenBorder,
  },
  aprovado_com_ressalvas: {
    label: "APROVADO C/ RESSALVAS",
    fg: C.amber,
    bg: C.amberBg,
    border: C.amberBorder,
  },
  reprovado: {
    label: "REPROVADO",
    fg: C.red,
    bg: C.redBg,
    border: C.redBorder,
  },
};

function itemStatus(
  value: ChecklistItem["value"],
): "conforme" | "nao_conforme" | "nao_aplicavel" {
  if (value === "CL_OK") return "conforme";
  if (value === "CL_FAIL" || value === "CL_WARN") return "nao_conforme";
  return "nao_aplicavel";
}

const ITEM_CFG = {
  conforme: {
    label: "CONFORME",
    fg: C.green,
    bg: C.greenBg,
    border: C.greenBorder,
  },
  nao_conforme: {
    label: "NÃO CONFORME",
    fg: C.red,
    bg: C.redBg,
    border: C.redBorder,
  },
  nao_aplicavel: {
    label: "N/A",
    fg: C.grayStatus,
    bg: C.grayStatusBg,
    border: C.grayStatusBorder,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const sf = (doc: jsPDF, rgb: RGB) => doc.setFillColor(...rgb);
const st = (doc: jsPDF, rgb: RGB) => doc.setTextColor(...rgb);
const sd = (doc: jsPDF, rgb: RGB) => doc.setDrawColor(...rgb);

function rect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill?: RGB | null,
  draw?: RGB | null,
  lw = 0.2,
) {
  if (fill) sf(doc, fill);
  if (draw) {
    sd(doc, draw);
    doc.setLineWidth(lw);
  }
  doc.rect(x, y, w, h, fill && draw ? "FD" : fill ? "F" : "S");
}

function hline(
  doc: jsPDF,
  y: number,
  x1 = 14,
  x2 = 196,
  color = C.grayLight,
  lw = 0.2,
) {
  sd(doc, color);
  doc.setLineWidth(lw);
  doc.line(x1, y, x2, y);
}

function sectionHeader(
  doc: jsPDF,
  title: string,
  y: number,
  M: number,
  CW: number,
) {
  const H = 7.5;
  rect(doc, M, y, CW, H, C.navyDark, null);
  rect(doc, M, y, 3, H, C.orangeEng, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  st(doc, C.white);
  doc.text(title, M + 7, y + 5.2);
  return y + H + 5;
}

function dataGrid(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  rows: [string, string][],
) {
  const TITLE_H = 7;
  const ROW_H = 9;
  const totalH = TITLE_H + rows.length * ROW_H;

  rect(doc, x, y, w, totalH, C.white, C.grayLight, 0.25);
  rect(doc, x, y, w, TITLE_H, [213, 227, 245], null);
  rect(doc, x, y, 2.5, TITLE_H, C.navyMid, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.navyDark);
  doc.text(title, x + w / 2, y + TITLE_H - 1.8, { align: "center" });

  let ry = y + TITLE_H;
  rows.forEach(([lbl, val], i) => {
    if (i % 2 !== 0) rect(doc, x, ry, w, ROW_H, C.grayBg, null);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    st(doc, C.grayMid);
    doc.text(lbl.toUpperCase(), x + 4, ry + 3.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    st(doc, C.grayDark);
    doc.text(
      doc.splitTextToSize(String(val), w - 8)[0] as string,
      x + 4,
      ry + 7.5,
    );
    hline(doc, ry + ROW_H, x, x + w, C.grayLight, 0.15);
    ry += ROW_H;
  });
  return ry + 4;
}

function addPageHeader(doc: jsPDF, docNum: string, now: string) {
  const PW = 210,
    M = 14;
  rect(doc, 0, 0, PW, 10, C.navyDark, null);
  rect(doc, 0, 0, 3, 10, C.orangeEng, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, [178, 205, 230]);
  doc.text(`AndCheck EHS  ·  ${docNum}  ·  Continuação`, M + 3, 6.5);
  doc.setFont("helvetica", "normal");
  st(doc, [148, 178, 214]);
  doc.text(now, PW - M - 2, 6.5, { align: "right" });
  return 15;
}

// ── Gerador principal ────────────────────────────────────────────────────────

export async function generateInspectionPDF(
  inspection: InspectionForPDF,
  origin: string,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210,
    M = 14,
    CW = PW - M * 2;
  let y = 0;

  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const dateStr = format(inspection.date, "yyyyMMdd");
  const docNum = `${inspection.scaffold_code}-${dateStr}`;
  const revNum = "00";
  const qrUrl = `${origin}/qr/${inspection.scaffold?.id ?? inspection.scaffold_code}`;

  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  // ── CABEÇALHO ─────────────────────────────────────────────────────────────
  const HDR_H = 54,
    QW = 38,
    QH = 38;
  const QX = PW - M - QW - 2;
  const QY = 7;
  const TW = QX - M - 10;

  rect(doc, 0, 0, PW, HDR_H, C.navyDark, null);
  rect(doc, 0, 0, 3, HDR_H, C.orangeEng, null);
  rect(doc, 3, HDR_H - 7, PW - 3, 7, [43, 79, 117], null);

  sd(doc, [56, 93, 138]);
  doc.setLineWidth(0.25);
  doc.line(QX - 3, 5, QX - 3, HDR_H - 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  st(doc, C.white);
  doc.text("RELATÓRIO TÉCNICO DE INSPEÇÃO DE ANDAIME", M + 6, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  st(doc, [148, 178, 214]);
  doc.text(
    "DOCUMENTO CONTROLADO  ·  NR-18  ·  NR-35  ·  ABNT NBR 6494  ·  ISO 45001:2018  ·  ISO 9001:2015",
    M + 6,
    19,
  );

  const META: [string, string][] = [
    ["Nº DO DOCUMENTO", docNum],
    ["REVISÃO", `Rev. ${revNum}`],
    ["DATA DE EMISSÃO", now],
    ["ANDAIME / TAG", inspection.scaffold_code],
  ];
  const fW = TW / 4;
  META.forEach(([lbl, val], i) => {
    const dx = M + 6 + i * fW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    st(doc, [148, 178, 214]);
    doc.text(lbl, dx, 28.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    st(doc, C.white);
    doc.text(doc.splitTextToSize(String(val), fW - 3)[0] as string, dx, 35);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.orangeEng);
  doc.text("SISTEMA ANDCHECK EHS", M + 6, 49.5);
  doc.setFont("helvetica", "normal");
  st(doc, [178, 205, 230]);
  const infoStr = `Inspetor: ${inspection.inspector_name}  ·  Responsável: ${inspection.scaffold?.responsible ?? "—"}`;
  doc.text(doc.splitTextToSize(infoStr, TW - 55)[0] as string, M + 58, 49.5);

  rect(doc, QX - 1, QY - 1, QW + 2, QH + 2, C.white, null);
  doc.addImage(qrDataUrl, "PNG", QX, QY, QW, QW);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  st(doc, C.navyDark);
  doc.text("VERIFICAR ONLINE", QX + QW / 2, QY + QW + 4.5, { align: "center" });

  y = HDR_H + 5;

  // ── RESULTADO FINAL ───────────────────────────────────────────────────────
  const resCfg = STATUS_CFG[inspection.result] ?? {
    label: inspection.result.toUpperCase(),
    fg: C.grayStatus,
    bg: C.grayStatusBg,
    border: C.grayStatusBorder,
  };
  rect(doc, M, y, CW, 11, resCfg.bg, resCfg.border, 0.4);
  rect(doc, M, y, 3, 11, resCfg.fg, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  st(doc, resCfg.fg);
  doc.text(`RESULTADO FINAL DA INSPEÇÃO:  ${resCfg.label}`, PW / 2, y + 7.5, {
    align: "center",
  });
  y += 16;

  // ── SEÇÃO 1 — IDENTIFICAÇÃO ───────────────────────────────────────────────
  y = sectionHeader(doc, "SEÇÃO 1 — IDENTIFICAÇÃO E DADOS GERAIS", y, M, CW);
  const half = (CW - 4) / 2;

  const validDate = format(
    addDays(inspection.date, inspection.validity_days || 7),
    "dd/MM/yyyy",
    { locale: ptBR },
  );

  const scaffoldRows: [string, string][] = [
    ["TAG / Código", inspection.scaffold_code],
    ["Localização", inspection.scaffold?.location ?? "—"],
    ["Área / Setor", inspection.scaffold?.area ?? "—"],
    ["Tipo", inspection.scaffold?.type ?? "—"],
    [
      "Altura",
      inspection.scaffold?.height ? `${inspection.scaffold.height} m` : "—",
    ],
    [
      "Carga Máxima",
      inspection.scaffold?.max_load
        ? `${inspection.scaffold.max_load} kg`
        : "—",
    ],
  ];
  const inspRows: [string, string][] = [
    ["Inspetor", inspection.inspector_name],
    ["Data da Inspeção", format(inspection.date, "dd/MM/yyyy")],
    ["Válido até", validDate],
    ["Prazo (dias)", String(inspection.validity_days || 7)],
    ["Responsável", inspection.scaffold?.responsible ?? "—"],
  ];

  const gridStartY = y;
  const yAfterA = dataGrid(
    doc,
    M,
    gridStartY,
    half,
    "DADOS DO ANDAIME",
    scaffoldRows,
  );
  dataGrid(doc, M + half + 4, gridStartY, half, "DADOS DA INSPEÇÃO", inspRows);
  y = yAfterA + 4;

  // ── SEÇÃO 2 — CHECKLIST ───────────────────────────────────────────────────
  if (y > 228) {
    doc.addPage();
    y = 14;
  }
  y = sectionHeader(doc, "SEÇÃO 2 — CHECKLIST TÉCNICO DE INSPEÇÃO", y, M, CW);

  const COL_BADGE_W = 22,
    COL_RES_W = 28;
  const COL_ITEM_W = CW - COL_BADGE_W - COL_RES_W - 2;

  rect(doc, M, y, CW, 6.5, C.navyMid, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.white);
  doc.text("ITEM / CRITÉRIO INSPECIONADO", M + 4, y + 4.5);
  doc.text("CRITICIDADE", M + COL_ITEM_W + 4, y + 4.5);
  doc.text("RESULTADO", PW - M - COL_RES_W + 1, y + 4.5);
  y += 7.5;

  const grouped: Record<string, ChecklistItem[]> = {};
  inspection.checklist.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  let rowIdx = 0;
  for (const [category, items] of Object.entries(grouped)) {
    if (y > 256) {
      doc.addPage();
      y = addPageHeader(doc, docNum, now);
    }

    rect(doc, M, y, CW, 6, C.navyUltraLight, C.grayLight, 0.25);
    rect(doc, M, y, 2.5, 6, C.navyLight, null);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    st(doc, C.navyDark);
    doc.text(category.toUpperCase(), M + 6, y + 4.2);
    y += 7;

    for (const item of items) {
      if (y > 268) {
        doc.addPage();
        y = addPageHeader(doc, docNum, now);
      }

      const status = itemStatus(item.value);
      const rowH = item.observation ? 12 : 9;
      const rowBg = rowIdx % 2 === 0 ? C.white : C.grayBg;
      const iCfg = ITEM_CFG[status];

      rect(doc, M, y, CW, rowH, rowBg, null);
      rect(doc, M, y, 2, rowH, iCfg.fg, null);

      const textX = M + 5;
      const textY = y + (item.observation ? 4.5 : rowH / 2 + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      st(doc, C.grayDark);
      doc.text(
        (doc.splitTextToSize(item.item_label, COL_ITEM_W - 4) as string[])[0],
        textX,
        textY,
      );

      if (item.observation) {
        doc.setFontSize(5.8);
        st(doc, C.grayMid);
        doc.text(`↳  ${item.observation}`, textX, y + 9.5);
      }

      const critX = M + COL_ITEM_W + 2;
      const critBY = y + (rowH - 4) / 2;
      if (item.critical) {
        rect(doc, critX, critBY, COL_BADGE_W - 2, 4, C.redBg, C.redBorder, 0.3);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.2);
        st(doc, C.red);
        doc.text("CRÍTICO", critX + (COL_BADGE_W - 2) / 2, critBY + 2.8, {
          align: "center",
        });
      }

      const resW = COL_RES_W - 2;
      const resX = PW - M - resW - 1;
      const resBY = y + (rowH - 4) / 2;
      rect(doc, resX, resBY, resW, 4, iCfg.bg, iCfg.border, 0.3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      st(doc, iCfg.fg);
      doc.text(iCfg.label, resX + resW / 2, resBY + 2.8, { align: "center" });

      hline(doc, y + rowH, M, M + CW, C.grayLight, 0.15);
      y += rowH;
      rowIdx++;
    }
    y += 2;
  }
  y += 5;

  // ── SEÇÃO 3 — RESUMO ESTATÍSTICO ─────────────────────────────────────────
  if (y > 238) {
    doc.addPage();
    y = 14;
  }
  y = sectionHeader(doc, "SEÇÃO 3 — RESUMO DE CONFORMIDADE", y, M, CW);

  const conformes = inspection.checklist.filter(
    (i) => itemStatus(i.value) === "conforme",
  ).length;
  const naoConformes = inspection.checklist.filter(
    (i) => itemStatus(i.value) === "nao_conforme",
  ).length;
  const naAplicavel = inspection.checklist.filter(
    (i) => itemStatus(i.value) === "nao_aplicavel",
  ).length;
  const total = inspection.checklist.length;
  const avaliados = total - naAplicavel;
  const pct = avaliados > 0 ? Math.round((conformes / avaliados) * 100) : 0;

  const stats = [
    { lbl: "TOTAL ITENS", val: total, color: C.navyDark, bg: C.navyUltraLight },
    { lbl: "CONFORMES", val: conformes, color: C.green, bg: C.greenBg },
    { lbl: "NÃO CONFORMES", val: naoConformes, color: C.red, bg: C.redBg },
    {
      lbl: "NÃO APLICÁVEIS",
      val: naAplicavel,
      color: C.grayStatus,
      bg: C.grayStatusBg,
    },
    {
      lbl: "ÍNDICE CONFORM.",
      val: `${pct}%`,
      color: pct >= 80 ? C.green : pct >= 60 ? C.amber : C.red,
      bg: pct >= 80 ? C.greenBg : pct >= 60 ? C.amberBg : C.redBg,
    },
  ];
  const sW = (CW - 4 * 4) / 5;
  stats.forEach((s, i) => {
    const sx = M + i * (sW + 4);
    rect(doc, sx, y, sW, 22, s.bg, C.grayLight, 0.25);
    rect(doc, sx, y, sW, 2, s.color, null);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    st(doc, s.color);
    doc.text(String(s.val), sx + sW / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    st(doc, C.grayMid);
    doc.text(s.lbl, sx + sW / 2, y + 19.5, { align: "center" });
  });
  y += 28;

  // ── SEÇÃO 4 — OBSERVAÇÕES ─────────────────────────────────────────────────
  if (inspection.notes) {
    if (y > 246) {
      doc.addPage();
      y = 14;
    }
    y = sectionHeader(
      doc,
      "SEÇÃO 4 — OBSERVAÇÕES TÉCNICAS / AÇÕES CORRETIVAS",
      y,
      M,
      CW,
    );
    const obsLines = doc.splitTextToSize(inspection.notes, CW - 8) as string[];
    const obsH = obsLines.length * 5.2 + 10;
    rect(doc, M, y, CW, obsH, C.grayBg, C.grayLight, 0.25);
    rect(doc, M, y, 2.5, obsH, C.amber, null);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    st(doc, C.grayDark);
    doc.text(obsLines, M + 6, y + 7);
    y += obsH + 6;
  }

  // ── SEÇÃO 5 — ASSINATURAS ────────────────────────────────────────────────
  if (y > 228) {
    doc.addPage();
    y = 14;
  }
  y = sectionHeader(
    doc,
    "SEÇÃO 5 — APROVAÇÃO TÉCNICA E VALIDAÇÃO DOCUMENTAL",
    y,
    M,
    CW,
  );

  const sigW = (CW - 6) / 2;
  const sigH = 40;

  rect(doc, M, y, sigW, sigH, C.white, C.grayLight, 0.3);
  rect(doc, M, y, sigW, 6.5, [235, 241, 248], null);
  rect(doc, M, y, 2.5, 6.5, C.navyMid, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.navyDark);
  doc.text("ASSINATURA DO INSPETOR RESPONSÁVEL", M + sigW / 2, y + 4.5, {
    align: "center",
  });

  hline(doc, y + 35, M + 6, M + sigW - 6, C.grayMid, 0.35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  st(doc, C.grayDark);
  doc.text(inspection.inspector_name, M + sigW / 2, y + 39, {
    align: "center",
  });

  const qrBX = M + sigW + 6;
  rect(doc, qrBX, y, sigW, sigH, C.white, C.grayLight, 0.3);
  rect(doc, qrBX, y, sigW, 6.5, [235, 241, 248], null);
  rect(doc, qrBX, y, 2.5, 6.5, C.orangeEng, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.navyDark);
  doc.text("VERIFICAÇÃO E RASTREABILIDADE ONLINE", qrBX + sigW / 2, y + 4.5, {
    align: "center",
  });

  const qrSz = 26,
    qrBQX = qrBX + 4,
    qrBQY = y + 9;
  rect(
    doc,
    qrBQX - 1,
    qrBQY - 1,
    qrSz + 2,
    qrSz + 2,
    [245, 247, 250],
    C.grayLight,
    0.25,
  );
  doc.addImage(qrDataUrl, "PNG", qrBQX, qrBQY, qrSz, qrSz);

  const txtX = qrBX + qrSz + 10;
  const txtMaxW = sigW - qrSz - 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  st(doc, C.navyDark);
  doc.text("ACESSO AO SISTEMA", txtX, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  st(doc, C.grayMid);
  const qrDesc = doc.splitTextToSize(
    "Escaneie para consultar status atual, validade e histórico de inspeções deste andaime.",
    txtMaxW,
  ) as string[];
  doc.text(qrDesc, txtX, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  st(doc, C.orangeEng);
  doc.text(docNum, txtX, y + 36);

  // ── RODAPÉ — todas as páginas ─────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const FY = 285;
    rect(doc, 0, FY, PW, 12, C.navyDark, null);
    rect(doc, 0, FY, 3, 12, C.orangeEng, null);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    st(doc, [148, 178, 214]);
    doc.text(
      `AndCheck EHS  ·  Documento Controlado  ·  ${docNum}  ·  Rev. ${revNum}  ·  NR-18  ·  NR-35  ·  ABNT NBR 6494`,
      PW / 2,
      FY + 4.5,
      { align: "center" },
    );
    doc.setFont("helvetica", "bold");
    st(doc, [178, 205, 230]);
    doc.text(`Página ${p} de ${totalPages}`, PW - M - 2, FY + 4.5, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    st(doc, [100, 116, 139]);
    doc.text(
      `Emitido em: ${now}  ·  Este documento é válido somente com assinatura do inspetor responsável`,
      M + 3,
      FY + 9,
    );
  }

  return doc;
}
