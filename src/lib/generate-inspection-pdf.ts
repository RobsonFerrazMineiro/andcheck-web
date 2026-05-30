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
    empresa?: string | null;
  } | null;
}

// ── Paleta ───────────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const C: Record<string, RGB> = {
  // ── Cores da aplicação AndCheck ──────────────────────────────────────────
  // --primary: #2a2f38  |  --sidebar: #171b22  |  --accent: #ea6a12
  navyDark: [42, 47, 56], // --primary
  navyMid: [58, 68, 82], // tom intermediário sobre o primary
  navyLight: [82, 96, 114], // tom claro para sub-headers de categoria
  navyUltraLight: [228, 230, 234], // fundo claro sobre primary (--muted aprox.)
  orangeEng: [234, 106, 18], // --accent #ea6a12 exato
  grayDark: [27, 31, 39], // --foreground #1b1f27
  grayMid: [87, 103, 120], // --muted-foreground
  grayLight: [214, 218, 224], // --border #d6dae0
  grayBg: [242, 243, 245], // --background #f2f3f5
  white: [255, 255, 255],
  green: [22, 163, 74],
  greenBg: [240, 253, 244],
  greenBorder: [134, 239, 172],
  red: [220, 38, 38],
  redBg: [254, 242, 242],
  redBgStrong: [252, 210, 210],
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  st(doc, C.white);
  doc.text(title, M + 4, y + 5.2);
  return y + H + 2;
}

function dataGrid(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  rows: [string, string][],
) {
  const TITLE_H = 6;
  const ROW_H = 8;
  const totalH = TITLE_H + rows.length * ROW_H;

  // fundo branco base (sem stroke aqui)
  rect(doc, x, y, w, totalH, C.white, null);
  rect(doc, x, y, w, TITLE_H, C.navyDark, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.white);
  doc.text(title, x + w / 2, y + TITLE_H / 2 + 1.2, { align: "center" });

  const LBL_W = w * 0.42; // largura reservada para o label
  let ry = y + TITLE_H;
  rows.forEach(([lbl, val], i) => {
    if (i % 2 !== 0) rect(doc, x, ry, w, ROW_H, C.grayBg, null);
    // label — pequeno, cinza, à esquerda
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    st(doc, C.grayMid);
    doc.text(lbl, x + 4, ry + ROW_H / 2 + 1.5);
    // valor — negrito, escuro, após o label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    st(doc, C.grayDark);
    doc.text(
      doc.splitTextToSize(String(val), w - LBL_W - 6)[0] as string,
      x + 4 + LBL_W,
      ry + ROW_H / 2 + 1.5,
    );
    hline(doc, ry + ROW_H, x, x + w, C.grayLight, 0.15);
    ry += ROW_H;
  });
  // borda externa desenhada por último para não ser coberta pelos fundos cinza
  rect(doc, x, y, w, totalH, null, C.navyDark, 0.4);
  return ry + 4;
}

function addPageHeader(doc: jsPDF, docNum: string, now: string) {
  const PW = 210,
    M = 14;
  rect(doc, 0, 0, PW, 10, C.navyDark, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.navyUltraLight);
  doc.text(`AndCheck EHS  ·  ${docNum}  ·  Continuação`, M + 3, 6.5);
  doc.setFont("helvetica", "normal");
  st(doc, C.navyLight);
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

  // ── Resultado calculado antes para embutir no cabeçalho ─────────────────
  const resCfg = STATUS_CFG[inspection.result] ?? {
    label: inspection.result.toUpperCase(),
    fg: C.grayStatus,
    bg: C.grayStatusBg,
    border: C.grayStatusBorder,
  };
  const RES_H = 10;

  // ── CABEÇALHO ─────────────────────────────────────────────────────────────
  const HDR_BODY = 32; // parte escura (reduzida)
  const HDR_H = HDR_BODY + RES_H;
  const QW = 22;
  const QX = PW - 6 - QW;
  const QY = 3;
  const TX = 8;

  // Fundo escuro
  rect(doc, 0, 0, PW, HDR_BODY, C.navyDark, null);

  // Barra de resultado embutida na base do cabeçalho (cor semântica)
  rect(doc, 0, HDR_BODY, PW, RES_H, resCfg.fg, null);

  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  st(doc, C.white);
  doc.text("RELATÓRIO TÉCNICO DE INSPEÇÃO DE ANDAIME", TX, 9);

  // Normas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  st(doc, C.navyUltraLight);
  doc.text(
    "NR-18  ·  NR-35  ·  ABNT NBR 6494  ·  ISO 45001:2018  ·  ISO 9001:2015  ·  DOCUMENTO CONTROLADO",
    TX,
    13.5,
  );

  // Nº do documento
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  st(doc, C.navyUltraLight);
  doc.text(`DOC N:  ${docNum}`, TX, 18);

  // Data de emissão
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  st(doc, C.navyUltraLight);
  doc.text(`Gerado em:  ${now}`, TX, 22.5);

  // TAG / Andaime em destaque laranja
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  st(doc, C.orangeEng);
  doc.text(`ANDAIME:  ${inspection.scaffold_code}`, TX, 27.5);

  // QR Code
  rect(doc, QX - 1, QY - 1, QW + 2, QW + 2, C.white, null);
  doc.addImage(qrDataUrl, "PNG", QX, QY, QW, QW);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.5);
  st(doc, C.navyUltraLight);
  doc.text("VERIFICAR ONLINE", QX + QW / 2, QY + QW + 3, {
    align: "center",
  });

  // Texto do resultado na barra inferior do cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  st(doc, C.white);
  doc.text(
    `RESULTADO DA INSPEÇÃO:  ${resCfg.label}`,
    PW / 2,
    HDR_BODY + RES_H / 2 + 1.8,
    { align: "center" },
  );

  y = HDR_H + 4;

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
    ["Área", inspection.scaffold?.area ?? "—"],
    ["Tipo", inspection.scaffold?.type ?? "—"],
    ["Localização", inspection.scaffold?.location ?? "—"],
    [
      "Altura",
      inspection.scaffold?.height ? `${inspection.scaffold.height}m` : "—",
    ],
    [
      "Carga Max.",
      inspection.scaffold?.max_load ? `${inspection.scaffold.max_load}kg` : "—",
    ],
  ];

  const statusLabel: Record<string, string> = {
    aprovado: "Aprovado",
    aprovado_com_ressalvas: "Aprovado c/ Ressalvas",
    reprovado: "Reprovado",
  };

  const inspRows: [string, string][] = [
    ["Inspetor", inspection.inspector_name],
    ["Data da Inspeção", format(inspection.date, "dd/MM/yyyy")],
    ["Validade", `${inspection.validity_days || 7} dias (ate ${validDate})`],
    ["Responsável", inspection.scaffold?.responsible ?? "—"],
    ["Empresa", inspection.scaffold?.empresa ?? "—"],
    ["Status", statusLabel[inspection.result] ?? inspection.result],
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
  y = yAfterA + 1;

  // ── SEÇÃO 2 — CHECKLIST ───────────────────────────────────────────────────
  if (y > 270) {
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

  const CATEGORY_ORDER = [
    "SEGURANÇA DOCUMENTAL",
    "ESTRUTURA",
    "ACESSO E PROTEÇÃO",
    "INSTALAÇÕES ELÉTRICAS",
    "EPIS E SEGURANÇA",
  ];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.toUpperCase());
    const ib = CATEGORY_ORDER.indexOf(b.toUpperCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  let rowIdx = 0;
  for (const category of sortedCategories) {
    const items = grouped[category];
    // constantes de badge (fora do loop de item para clareza)
    const BADGE_H = 4.0;
    const BADGE_H_RES = 5;
    const BADGE_R = 1.5;
    const BADGE_R_RES = 0.8;
    const CRIT_W = 11;
    const RES_W = 26;

    const CAT_H = 6;
    const blockH =
      CAT_H + 1 + items.reduce((acc, it) => acc + (it.observation ? 13 : 8), 0);

    if (y + blockH > 282) {
      doc.addPage();
      y = addPageHeader(doc, docNum, now);
    }

    const blockY = y;

    // fundo branco base do bloco (sem stroke)
    rect(doc, M, blockY, CW, blockH, C.white, null);

    // cabeçalho da categoria
    rect(doc, M, y, CW, CAT_H, C.navyDark, null);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    st(doc, C.white);
    doc.text(category.toUpperCase(), M + 4, y + 4.2);
    y += CAT_H + 1;

    for (const item of items) {
      const status = itemStatus(item.value);
      const rowH = item.observation ? 13 : 8;
      const rowBg = rowIdx % 2 === 0 ? C.white : C.grayBg;
      const iCfg = ITEM_CFG[status];

      rect(doc, M, y, CW, rowH, rowBg, null);

      // Badge CRÍTICO
      const critX = M + 2;
      const critBY = y + (rowH - BADGE_H) / 2;
      if (item.critical) {
        sf(doc, C.redBgStrong);
        doc.roundedRect(critX, critBY, CRIT_W, BADGE_H, BADGE_R, BADGE_R, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        st(doc, C.red);
        doc.text("CRÍTICO", critX + CRIT_W / 2, critBY + BADGE_H * 0.68, {
          align: "center",
        });
      }

      // Texto do item
      const textX = M + 2 + CRIT_W + 2;
      const textY = y + rowH / 2 + 1.3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      st(doc, C.grayDark);
      doc.text(
        (
          doc.splitTextToSize(
            item.item_label,
            CW - CRIT_W - 10 - (RES_W + 2),
          ) as string[]
        )[0],
        textX,
        item.observation ? y + 5 : textY,
      );

      if (item.observation) {
        doc.setFontSize(6);
        st(doc, C.grayMid);
        doc.text(`↳  ${item.observation}`, textX, y + 10);
      }

      // Badge RESULTADO
      const resX = PW - M - RES_W - 1;
      const resBY = y + (rowH - BADGE_H_RES) / 2;
      sf(doc, iCfg.fg);
      doc.setLineWidth(0);
      doc.roundedRect(
        resX,
        resBY,
        RES_W,
        BADGE_H_RES,
        BADGE_R_RES,
        BADGE_R_RES,
        "F",
      );
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      st(doc, C.white);
      doc.text(iCfg.label, resX + RES_W / 2, resBY + BADGE_H_RES * 0.68, {
        align: "center",
      });

      hline(doc, y + rowH, M, M + CW, C.grayLight, 0.15);
      y += rowH;
      rowIdx++;
    }

    // borda externa do bloco — navyDark, desenhada por último
    rect(doc, M, blockY, CW, y - blockY, null, C.navyDark, 0.4);

    y += 1.5; // espaçamento entre categorias
  }
  y += 2;

  // ── SEÇÃO 3 — RESUMO ESTATÍSTICO ─────────────────────────────────────────
  if (y > 256) {
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
    rect(doc, sx, y, sW, 22, s.bg, C.navyDark, 0.25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    st(doc, s.color);
    doc.text(String(s.val), sx + sW / 2, y + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    st(doc, C.grayMid);
    doc.text(s.lbl, sx + sW / 2, y + 19.5, { align: "center" });
  });
  y += 24; // 22mm card + 2mm gap

  // ── SEÇÃO 4 — OBSERVAÇÕES ─────────────────────────────────────────────────
  if (inspection.notes) {
    if (y > 260) {
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
    rect(doc, M, y, CW, obsH, C.grayBg, C.navyDark, 0.25);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    st(doc, C.grayDark);
    doc.text(obsLines, M + 4, y + 7);
    y += obsH + 3;
  }

  // ── SEÇÃO 5 — ASSINATURAS ────────────────────────────────────────────────
  if (y > 240) {
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

  rect(doc, M, y, sigW, sigH, C.white, C.navyDark, 0.3);
  rect(doc, M, y, sigW, 6.5, C.navyDark, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.white);
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
  rect(doc, qrBX, y, sigW, sigH, C.white, C.navyDark, 0.3);
  rect(doc, qrBX, y, sigW, 6.5, C.navyDark, null);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  st(doc, C.white);
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
    C.navyDark,
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    st(doc, C.navyUltraLight);
    doc.text(
      `AndCheck EHS  ·  Documento Controlado  ·  ${docNum}  ·  Rev. ${revNum}  ·  NR-18  ·  NR-35  ·  ABNT NBR 6494`,
      PW / 2,
      FY + 4.5,
      { align: "center" },
    );
    doc.setFont("helvetica", "bold");
    st(doc, C.navyLight);
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
