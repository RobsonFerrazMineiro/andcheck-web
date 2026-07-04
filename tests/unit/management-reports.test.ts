import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// ── Hoisted Prisma mock handles ──────────────────────────────────────────────
const prismaMocks = vi.hoisted(() => ({
  scaffoldFindMany: vi.fn(),
  scaffoldGroupBy: vi.fn(),
  inspectionFindMany: vi.fn(),
  nonConformityFindMany: vi.fn(),
  companyFindMany: vi.fn(),
  workspaceFindMany: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserAccess: vi.fn().mockResolvedValue(null),
  requireAnyPermission: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data-scope", () => ({
  dataScopeWhere: vi.fn().mockReturnValue({}),
  getDataScope: vi
    .fn()
    .mockResolvedValue({ companyIds: null, workspaceIds: null }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: { findMany: prismaMocks.companyFindMany },
    workspace: { findMany: prismaMocks.workspaceFindMany },
    scaffold: {
      findMany: prismaMocks.scaffoldFindMany,
      groupBy: prismaMocks.scaffoldGroupBy,
    },
    inspection: { findMany: prismaMocks.inspectionFindMany },
    nonConformity: { findMany: prismaMocks.nonConformityFindMany },
  },
}));

import {
  calculateKpiTrend,
  getManagementReportData,
  resolveManagementReportFilterLabels,
  summarizeChecklistNonConformity,
} from "@/lib/management-reports";

// ── calculateKpiTrend ─────────────────────────────────────────────────────────

describe("management report trends", () => {
  it("marks higher values as positive when higher is better", () => {
    const trend = calculateKpiTrend({
      currentValue: 80,
      previousValue: 70,
      metricType: "percentage",
      polarity: "higher-is-better",
    });

    expect(trend.direction).toBe("up");
    expect(trend.status).toBe("positive");
    expect(trend.label).toBe("+10%");
  });

  it("marks lower values as positive when lower is better", () => {
    const trend = calculateKpiTrend({
      currentValue: 2.4,
      previousValue: 3.6,
      metricType: "days",
      polarity: "lower-is-better",
      unitLabel: " dias",
    });

    expect(trend.direction).toBe("down");
    expect(trend.status).toBe("positive");
    expect(trend.label).toBe("-1,2 dias");
  });

  it("handles missing historical bases", () => {
    expect(
      calculateKpiTrend({
        currentValue: null,
        previousValue: null,
        metricType: "number",
        polarity: "higher-is-better",
      }).status,
    ).toBe("no-history");

    expect(
      calculateKpiTrend({
        currentValue: 1,
        previousValue: null,
        metricType: "number",
        polarity: "higher-is-better",
      }).status,
    ).toBe("new-record");
  });

  it("marks equal values as neutral (stable)", () => {
    const trend = calculateKpiTrend({
      currentValue: 75,
      previousValue: 75,
      metricType: "percentage",
      polarity: "higher-is-better",
    });
    expect(trend.direction).toBe("neutral");
    expect(trend.status).toBe("neutral");
    expect(trend.label).toBe("Estável");
  });

  it("marks decrease as negative when higher is better", () => {
    const trend = calculateKpiTrend({
      currentValue: 60,
      previousValue: 80,
      metricType: "percentage",
      polarity: "higher-is-better",
    });
    expect(trend.direction).toBe("down");
    expect(trend.status).toBe("negative");
  });

  it("marks increase as negative when lower is better", () => {
    const trend = calculateKpiTrend({
      currentValue: 10,
      previousValue: 5,
      metricType: "days",
      polarity: "lower-is-better",
      unitLabel: " dias",
    });
    expect(trend.direction).toBe("up");
    expect(trend.status).toBe("negative");
  });

  it("returns new-record when currentValue > 0 and no previous", () => {
    const trend = calculateKpiTrend({
      currentValue: 42,
      previousValue: null,
      metricType: "number",
      polarity: "higher-is-better",
    });
    expect(trend.status).toBe("new-record");
    expect(trend.label).toBe("Novo registro");
  });

  it("returns no-history when current is 0 and no previous", () => {
    const trend = calculateKpiTrend({
      currentValue: 0,
      previousValue: null,
      metricType: "number",
      polarity: "higher-is-better",
    });
    expect(trend.status).toBe("no-history");
    expect(trend.label).toBe("Sem base histórica");
  });

  it("fills absoluteDiff and percentDiff in normal case", () => {
    const trend = calculateKpiTrend({
      currentValue: 60,
      previousValue: 40,
      metricType: "number",
      polarity: "higher-is-better",
    });
    expect(trend.absoluteDiff).toBe(20);
    expect(trend.percentDiff).toBe(50);
  });
});

// ── summarizeChecklistNonConformity ───────────────────────────────────────────

describe("summarizeChecklistNonConformity", () => {
  it("returns canonical label for guarda-corpo superior", () => {
    expect(
      summarizeChecklistNonConformity("Guarda-corpo superior ausente"),
    ).toBe("Guarda-corpo superior ausente/irregular");
  });

  it("returns canonical label for rodapé", () => {
    expect(summarizeChecklistNonConformity("Rodapé ausente")).toBe(
      "Rodapé ausente ou irregular",
    );
  });

  it("returns canonical label for base/sapatas", () => {
    expect(summarizeChecklistNonConformity("Base inadequada")).toBe(
      "Base/sapatas inadequadas",
    );
  });

  it("returns canonical label for escada", () => {
    expect(summarizeChecklistNonConformity("Escada de acesso irregular")).toBe(
      "Acesso por escada irregular",
    );
  });

  it("returns canonical label for sinalização", () => {
    expect(summarizeChecklistNonConformity("Sinalização da área ausente")).toBe(
      "Sinalização ou isolamento da área ausente",
    );
  });

  it("returns canonical label for capacete", () => {
    expect(
      summarizeChecklistNonConformity("Capacete com jugular ausente"),
    ).toBe("Capacete com jugular ausente");
  });

  it("truncates unrecognized labels to 72 characters", () => {
    const longLabel =
      "Situação completamente desconhecida que não se enquadra em nenhuma categoria específica do sistema";
    const result = summarizeChecklistNonConformity(longLabel);
    expect(result.length).toBeLessThanOrEqual(72);
  });

  it("returns cleaned text for short unrecognized label", () => {
    const result = summarizeChecklistNonConformity("Outros problemas gerais");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("strips parenthetical annotations from unrecognized labels", () => {
    const result = summarizeChecklistNonConformity("Item genérico (ver NR-18)");
    expect(result).not.toContain("(ver NR-18)");
  });
});

// ── resolveManagementReportFilterLabels ───────────────────────────────────────

describe("resolveManagementReportFilterLabels", () => {
  const baseReport = {
    filters: { companyId: "all", workspaceId: "all", area: "all" },
    options: {
      companies: [{ id: "c1", name: "Empresa Alpha" }],
      workspaces: [{ id: "w1", name: "Workspace 1" }],
      areas: ["Área Norte"],
    },
  } as Parameters<typeof resolveManagementReportFilterLabels>[0];

  it("returns 'Todas as empresas' when companyId is all", () => {
    const labels = resolveManagementReportFilterLabels(baseReport);
    expect(labels.company).toBe("Todas as empresas");
  });

  it("returns 'Todos os workspaces' when workspaceId is all", () => {
    const labels = resolveManagementReportFilterLabels(baseReport);
    expect(labels.workspace).toBe("Todos os workspaces");
  });

  it("returns 'Todas as áreas' when area is all", () => {
    const labels = resolveManagementReportFilterLabels(baseReport);
    expect(labels.area).toBe("Todas as áreas");
  });

  it("resolves specific company name by id", () => {
    const report = {
      ...baseReport,
      filters: { ...baseReport.filters, companyId: "c1" },
    };
    const labels = resolveManagementReportFilterLabels(report);
    expect(labels.company).toBe("Empresa Alpha");
  });

  it("resolves specific workspace name by id", () => {
    const report = {
      ...baseReport,
      filters: { ...baseReport.filters, workspaceId: "w1" },
    };
    const labels = resolveManagementReportFilterLabels(report);
    expect(labels.workspace).toBe("Workspace 1");
  });

  it("returns area name directly when a specific area is selected", () => {
    const report = {
      ...baseReport,
      filters: { ...baseReport.filters, area: "Área Norte" },
    };
    const labels = resolveManagementReportFilterLabels(report);
    expect(labels.area).toBe("Área Norte");
  });

  it("falls back gracefully when company id is not found", () => {
    const report = {
      ...baseReport,
      filters: { ...baseReport.filters, companyId: "nonexistent" },
    };
    const labels = resolveManagementReportFilterLabels(report);
    expect(labels.company).toBe("Empresa selecionada");
  });

  it("falls back gracefully when workspace id is not found", () => {
    const report = {
      ...baseReport,
      filters: { ...baseReport.filters, workspaceId: "nonexistent" },
    };
    const labels = resolveManagementReportFilterLabels(report);
    expect(labels.workspace).toBe("Workspace selecionado");
  });
});

// ── getManagementReportData ───────────────────────────────────────────────────

// ── Fixtures ─────────────────────────────────────────────────────────────────

const R_A = { id: "c1", name: "Empresa Alpha" };
const R_B = { id: "c2", name: "Empresa Beta" };
const R_W1 = { id: "w1", name: "Workspace 1" };
// Fixed UTC time that falls within the custom period (2026-06-01 → 2026-06-30)
const R_T = new Date("2026-06-15T12:00:00.000Z");
const R_NC_CREATED = new Date("2026-06-10T00:00:00.000Z");
// due date already in the past relative to fake-today (June 16)
const R_NC_DUE = new Date("2026-06-14T00:00:00.000Z");
// closed 2 days after creation, before due date → on time
const R_NC_CLOSED = new Date("2026-06-12T00:00:00.000Z");

// Custom period params so resolvePeriod never depends on real "now"
const CUSTOM_PARAMS = {
  period: "custom",
  dateFrom: "2026-06-01",
  dateTo: "2026-06-30",
};

function makeSc(
  id: string,
  status: string,
  area: string,
  company: typeof R_A,
  ws: typeof R_W1,
  inspectionDates: Date[] = [],
) {
  return {
    id,
    code: `AND-${id}`,
    area,
    status,
    created_at: R_T,
    released_at: status === "liberado" ? R_T : null,
    validity_date: null,
    responsible: "Responsável Técnico",
    tenantCompany: company,
    workspace: ws,
    inspections: inspectionDates.map((date) => ({ date })),
    _count: {
      inspections: inspectionDates.length,
      nonConformities: 0,
    },
  };
}

// 7 scaffolds: 3 liberado, 1 interditado, 1 em_montagem, 1 pendente_liberacao, 1 desmontado
const R_SCAFFOLDS = [
  makeSc("s1", "liberado", "Área Norte", R_A, R_W1, [R_T]),
  makeSc("s2", "liberado", "Área Norte", R_A, R_W1, []),
  makeSc("s3", "liberado", "Área Sul", R_B, R_W1, []),
  makeSc("s4", "interditado", "Área Norte", R_A, R_W1, []),
  makeSc("s5", "em_montagem", "Área Sul", R_A, R_W1, []),
  makeSc("s6", "pendente_liberacao", "Área Norte", R_B, R_W1, []),
  makeSc("s7", "desmontado", "Área Norte", R_A, R_W1, []),
];

function makeInsp(
  id: string,
  scaffoldId: string,
  result: string,
  inspector: string,
  company: typeof R_A,
  area: string,
) {
  return {
    id,
    scaffold_id: scaffoldId,
    scaffold_code: `AND-${scaffoldId}`,
    date: R_T,
    inspector_name: inspector,
    result,
    notes: null,
    companyId: company.id,
    workspaceId: R_W1.id,
    _count: { nonConformities: 0 },
    scaffold: {
      code: `AND-${scaffoldId}`,
      area,
      tenantCompany: company,
      workspace: R_W1,
    },
  };
}

// 6 inspections: 3 aprovado, 2 ressalvas, 1 reprovado
// Inspector A: i1(aprovado), i2(aprovado), i4(ressalvas)
// Inspector B: i3(aprovado), i5(ressalvas), i6(reprovado)
const R_INSPECTIONS = [
  makeInsp("i1", "s1", "aprovado", "Inspector A", R_A, "Área Norte"),
  makeInsp("i2", "s2", "aprovado", "Inspector A", R_A, "Área Norte"),
  makeInsp("i3", "s3", "aprovado", "Inspector B", R_B, "Área Sul"),
  makeInsp(
    "i4",
    "s4",
    "aprovado_com_ressalvas",
    "Inspector A",
    R_A,
    "Área Norte",
  ),
  makeInsp(
    "i5",
    "s3",
    "aprovado_com_ressalvas",
    "Inspector B",
    R_B,
    "Área Sul",
  ),
  makeInsp("i6", "s4", "reprovado", "Inspector B", R_A, "Área Norte"),
];

// 4 NCs: 2 OPEN, 1 IN_PROGRESS, 1 CLOSED
const R_NCS = [
  {
    id: "nc1",
    code: "NC-0001",
    title: "Guarda-corpo superior ausente",
    status: "OPEN",
    createdAt: R_NC_CREATED,
    dueDate: R_NC_DUE,
    closedAt: null,
    description: "Desc1",
    classification: "MAJOR",
    companyId: R_A.id,
    workspaceId: R_W1.id,
    responsibleUser: { name: "Resp A" },
    checklistItems: [],
    scaffold: {
      code: "AND-s4",
      area: "Área Norte",
      tenantCompany: R_A,
      workspace: R_W1,
    },
  },
  {
    id: "nc2",
    code: "NC-0002",
    title: "Rodapé irregular",
    status: "OPEN",
    createdAt: R_NC_CREATED,
    dueDate: null,
    closedAt: null,
    description: "Desc2",
    classification: "MINOR",
    companyId: R_A.id,
    workspaceId: R_W1.id,
    responsibleUser: null,
    checklistItems: [
      { checklistEntry: { item_label: "Guarda-corpo superior ausente" } },
    ],
    scaffold: {
      code: "AND-s4",
      area: "Área Norte",
      tenantCompany: R_A,
      workspace: R_W1,
    },
  },
  {
    id: "nc3",
    code: "NC-0003",
    title: "Escada de acesso irregular",
    status: "IN_PROGRESS",
    createdAt: R_NC_CREATED,
    dueDate: R_NC_DUE,
    closedAt: null,
    description: "Desc3",
    classification: "MINOR",
    companyId: R_A.id,
    workspaceId: R_W1.id,
    responsibleUser: { name: "Resp B" },
    checklistItems: [],
    scaffold: {
      code: "AND-s1",
      area: "Área Norte",
      tenantCompany: R_A,
      workspace: R_W1,
    },
  },
  {
    id: "nc4",
    code: "NC-0004",
    title: "Rodapé ausente",
    status: "CLOSED",
    createdAt: R_NC_CREATED,
    dueDate: R_NC_DUE,
    closedAt: R_NC_CLOSED,
    description: "Desc4",
    classification: "MINOR",
    companyId: R_A.id,
    workspaceId: R_W1.id,
    responsibleUser: { name: "Resp A" },
    checklistItems: [],
    scaffold: {
      code: "AND-s1",
      area: "Área Norte",
      tenantCompany: R_A,
      workspace: R_W1,
    },
  },
];

// Closed NCs query (separate closedNcWhere): only nc4
const R_CLOSED_NCS = [
  {
    id: "nc4",
    createdAt: R_NC_CREATED,
    dueDate: R_NC_DUE,
    closedAt: R_NC_CLOSED,
  },
];

// Previous closed NCs (same period back): also on time
const R_PREV_CLOSED_NCS = [
  {
    id: "pnc1",
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    dueDate: new Date("2026-05-15T00:00:00.000Z"),
    closedAt: new Date("2026-05-10T00:00:00.000Z"),
  },
];

// Dismantled scaffolds: released June 1 → dismantled June 15 = 14.5 operation days
const R_DISMANTLED = [
  {
    id: "s7",
    released_at: new Date("2026-06-01T00:00:00.000Z"),
    assembly_completed_at: null,
    created_at: new Date("2026-05-25T00:00:00.000Z"),
    dismantled_at: R_T,
  },
];

// Previous dismantled: 9 operation days
const R_PREV_DISMANTLED = [
  {
    id: "ps1",
    released_at: new Date("2026-05-01T00:00:00.000Z"),
    assembly_completed_at: null,
    created_at: new Date("2026-04-25T00:00:00.000Z"),
    dismantled_at: new Date("2026-05-10T00:00:00.000Z"),
  },
];

// Previous inspections: 2 aprovado, 1 reprovado → previousApprovalRate = 66.67%
const R_PREV_INSPECTIONS = [
  { id: "pi1", result: "aprovado" },
  { id: "pi2", result: "aprovado" },
  { id: "pi3", result: "reprovado" },
];

/**
 * Setup mock return values in the exact order Promise.all calls them:
 *  1  company.findMany
 *  2  workspace.findMany
 *  3  scaffold.groupBy  (areas)
 *  4  scaffold.findMany (current scaffolds)
 *  5  inspection.findMany (current)
 *  6  nonConformity.findMany (current)
 *  7  nonConformity.findMany (closed, current period)
 *  8  scaffold.findMany (dismantled, current period)
 *  9  inspection.findMany (previous period)
 * 10  nonConformity.findMany (closed, previous period)
 * 11  scaffold.findMany (dismantled, previous period)
 */
function setupReportMocks() {
  prismaMocks.companyFindMany.mockResolvedValueOnce([R_A, R_B]);
  prismaMocks.workspaceFindMany.mockResolvedValueOnce([R_W1]);
  prismaMocks.scaffoldGroupBy.mockResolvedValueOnce([
    { area: "Área Norte" },
    { area: "Área Sul" },
  ]);
  prismaMocks.scaffoldFindMany
    .mockResolvedValueOnce(R_SCAFFOLDS)
    .mockResolvedValueOnce(R_DISMANTLED)
    .mockResolvedValueOnce(R_PREV_DISMANTLED);
  prismaMocks.inspectionFindMany
    .mockResolvedValueOnce(R_INSPECTIONS)
    .mockResolvedValueOnce(R_PREV_INSPECTIONS);
  prismaMocks.nonConformityFindMany
    .mockResolvedValueOnce(R_NCS)
    .mockResolvedValueOnce(R_CLOSED_NCS)
    .mockResolvedValueOnce(R_PREV_CLOSED_NCS);
}

/**
 * Resets ALL prisma mock queues (Once values) before each test so that
 * leftover values from one test don't bleed into the next.
 * vi.clearAllMocks() only resets call counts — it does NOT clear the Once queue.
 */
function resetPrismaMocks() {
  prismaMocks.scaffoldFindMany.mockReset();
  prismaMocks.scaffoldGroupBy.mockReset();
  prismaMocks.inspectionFindMany.mockReset();
  prismaMocks.nonConformityFindMany.mockReset();
  prismaMocks.companyFindMany.mockReset();
  prismaMocks.workspaceFindMany.mockReset();
}

// ── KPIs and shape ───────────────────────────────────────────────────────────

describe("getManagementReportData – shape and KPIs", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    resetPrismaMocks();
    setupReportMocks();
  });

  it("returns expected top-level shape", async () => {
    const result = await getManagementReportData(CUSTOM_PARAMS);

    expect(result).toHaveProperty("kpis");
    expect(result).toHaveProperty("trends");
    expect(result).toHaveProperty("charts");
    expect(result).toHaveProperty("rankings");
    expect(result).toHaveProperty("options");
    expect(result).toHaveProperty("filters");
    expect(result).toHaveProperty("exportRows");
    expect(result).toHaveProperty("periodLabel");
    expect(result.periodLabel).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("counts scaffold statuses correctly", async () => {
    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);

    expect(kpis.scaffolds.total).toBe(7);
    expect(kpis.scaffolds.liberados).toBe(3);
    expect(kpis.scaffolds.interditados).toBe(1);
    expect(kpis.scaffolds.emMontagem).toBe(1);
    expect(kpis.scaffolds.pendentes).toBe(1);
    expect(kpis.scaffolds.desmontados).toBe(1);
  });

  it("computes activeScaffolds and utilizationRate", async () => {
    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);
    // active = liberado(3) + em_montagem(1) + pendente(1) + interditado(1) = 6
    expect(kpis.quality.activeScaffolds).toBe(6);
    expect(kpis.quality.utilizationRate).toBeCloseTo(85.71, 1);
  });

  it("counts inspection results correctly", async () => {
    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);

    expect(kpis.inspections.total).toBe(6);
    expect(kpis.inspections.aprovadas).toBe(3);
    expect(kpis.inspections.ressalvas).toBe(2);
    expect(kpis.inspections.reprovadas).toBe(1);
  });

  it("counts NC statuses with vencidas for overdue items", async () => {
    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);
    // nc1: OPEN, dueDate June 14 < today June 16 → vencida
    // nc2: OPEN, dueDate null → not vencida
    // nc3: IN_PROGRESS, dueDate June 14 < today → vencida
    // nc4: CLOSED → excluded from vencidas
    expect(kpis.nonConformities.abertas).toBe(2);
    expect(kpis.nonConformities.emTratamento).toBe(1);
    expect(kpis.nonConformities.encerradas).toBe(1);
    expect(kpis.nonConformities.vencidas).toBe(2);
  });

  it("computes average operation days from dismantled scaffolds", async () => {
    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);
    // released June 1 → dismantled June 15T12 = 14.5 days
    expect(kpis.averages.operationDays).toBeCloseTo(14.5, 1);
  });

  it("computes average correction days from closed NCs", async () => {
    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);
    // nc4: created June 10, closed June 12 = 2 days
    expect(kpis.averages.correctionDays).toBeCloseTo(2, 1);
  });

  it("computes onTimeClosureRate as 100% when all closed NCs met deadline", async () => {
    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);
    // nc4 closed June 12, due June 14 → on time
    expect(kpis.quality.onTimeClosureRate).toBe(100);
  });

  it("populates filter options from DB results", async () => {
    const { options } = await getManagementReportData(CUSTOM_PARAMS);

    expect(options.companies).toHaveLength(2);
    expect(options.companies[0].name).toBe("Empresa Alpha");
    expect(options.workspaces).toHaveLength(1);
    expect(options.areas).toContain("Área Norte");
    expect(options.areas).toContain("Área Sul");
  });

  it("returns null averages when there are no dismantled or closed NCs", async () => {
    // Override mocks with empty arrays for this test
    resetPrismaMocks();
    prismaMocks.companyFindMany.mockResolvedValueOnce([]);
    prismaMocks.workspaceFindMany.mockResolvedValueOnce([]);
    prismaMocks.scaffoldGroupBy.mockResolvedValueOnce([]);
    prismaMocks.scaffoldFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]) // dismantled
      .mockResolvedValueOnce([]); // prev dismantled
    prismaMocks.inspectionFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaMocks.nonConformityFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const { kpis } = await getManagementReportData(CUSTOM_PARAMS);

    expect(kpis.scaffolds.total).toBe(0);
    expect(kpis.inspections.total).toBe(0);
    expect(kpis.averages.operationDays).toBeNull();
    expect(kpis.averages.correctionDays).toBeNull();
    expect(kpis.quality.utilizationRate).toBeNull();
    expect(kpis.quality.onTimeClosureRate).toBeNull();
  });
});

// ── Trends ───────────────────────────────────────────────────────────────────

describe("getManagementReportData – trends", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    resetPrismaMocks();
    setupReportMocks();
  });

  it("approvalRate trend is negative when current is lower than previous", async () => {
    const { trends } = await getManagementReportData(CUSTOM_PARAMS);
    // current: 3/6 = 50%;  previous: 2/3 ≈ 66.67%  → down, negative
    expect(trends.approvalRate.direction).toBe("down");
    expect(trends.approvalRate.status).toBe("negative");
  });

  it("operationDays trend is negative when current is higher (lower-is-better)", async () => {
    const { trends } = await getManagementReportData(CUSTOM_PARAMS);
    // current: 14.5 days; previous: 9 days → up is bad (lower-is-better)
    expect(trends.operationDays.direction).toBe("up");
    expect(trends.operationDays.status).toBe("negative");
  });

  it("correctionDays trend is positive when current is lower (lower-is-better)", async () => {
    const { trends } = await getManagementReportData(CUSTOM_PARAMS);
    // current: 2 days; previous: 9 days → down is good (lower-is-better)
    expect(trends.correctionDays.direction).toBe("down");
    expect(trends.correctionDays.status).toBe("positive");
  });

  it("closedNonConformities trend is neutral when equal", async () => {
    const { trends } = await getManagementReportData(CUSTOM_PARAMS);
    // current 1 closed, previous 1 closed → equal → neutral
    expect(trends.closedNonConformities.direction).toBe("neutral");
    expect(trends.closedNonConformities.status).toBe("neutral");
  });

  it("onTimeClosureRate trend is neutral when both periods are 100%", async () => {
    const { trends } = await getManagementReportData(CUSTOM_PARAMS);
    expect(trends.onTimeClosureRate.direction).toBe("neutral");
    expect(trends.onTimeClosureRate.status).toBe("neutral");
  });
});

// ── Rankings ─────────────────────────────────────────────────────────────────

describe("getManagementReportData – rankings", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    resetPrismaMocks();
    setupReportMocks();
  });

  it("ranks companies by total activity (scaffolds + inspections + NCs)", async () => {
    const { rankings } = await getManagementReportData(CUSTOM_PARAMS);
    // R_A: 5 scaffolds + 4 inspections + 4 NCs = 13
    // R_B: 2 scaffolds + 2 inspections + 0 NCs = 4
    expect(rankings.companies[0].name).toBe("Empresa Alpha");
    expect(rankings.companies[0].scaffolds).toBe(5);
    expect(rankings.companies[0].inspections).toBe(4);
    expect(rankings.companies[0].ncs).toBe(4);
    expect(rankings.companies[1].name).toBe("Empresa Beta");
  });

  it("ranks areas by total activity", async () => {
    const { rankings } = await getManagementReportData(CUSTOM_PARAMS);
    // Área Norte: scaffolds(s1,s2,s4,s6,s7)=5, inspections(i1,i2,i4,i6)=4, NCs=4 → 13
    // Área Sul:   scaffolds(s3,s5)=2, inspections(i3,i5)=2, NCs=0             → 4
    expect(rankings.areas[0].name).toBe("Área Norte");
    expect(rankings.areas[0].scaffolds).toBe(5);
    expect(rankings.areas[1].name).toBe("Área Sul");
    expect(rankings.areas[1].scaffolds).toBe(2);
  });

  it("ranks inspectors by inspection count", async () => {
    const { rankings } = await getManagementReportData(CUSTOM_PARAMS);
    // Both Inspector A and Inspector B have 3 inspections each
    expect(rankings.inspectors).toHaveLength(2);
    expect(rankings.inspectors[0].inspections).toBe(3);
    expect(rankings.inspectors[1].inspections).toBe(3);
    // Inspector A: (2 aprovadas + 1 ressalvas) / 3 = 100% approval rate
    const inspA = rankings.inspectors.find((i) => i.name === "Inspector A");
    expect(inspA?.approvalRate).toBeCloseTo(100, 0);
  });

  it("ranks NC types by frequency, uses checklistItem labels when present", async () => {
    const { rankings } = await getManagementReportData(CUSTOM_PARAMS);
    // nc1: title "Guarda-corpo superior ausente" → "Guarda-corpo superior ausente/irregular" (1)
    // nc2: checklistItem "Guarda-corpo superior ausente" → same label (1) → total 2
    // nc3: "Escada de acesso irregular" → "Acesso por escada irregular" (1)
    // nc4: "Rodapé ausente" → "Rodapé ausente ou irregular" (1)
    expect(rankings.nonConformities[0].title).toBe(
      "Guarda-corpo superior ausente/irregular",
    );
    expect(rankings.nonConformities[0].occurrences).toBe(2);
    // ties sorted by title alphabetically: "Acesso" < "Rodapé"
    expect(rankings.nonConformities[1].title).toBe(
      "Acesso por escada irregular",
    );
    expect(rankings.nonConformities[2].title).toBe(
      "Rodapé ausente ou irregular",
    );
  });

  it("computes inspectorRanking approvalRate including ressalvas", async () => {
    const { rankings } = await getManagementReportData(CUSTOM_PARAMS);
    // Inspector B: 1 aprovado + 1 ressalvas + 1 reprovado = 3 → rate = (1+1)/3 = 66.67%
    const inspB = rankings.inspectors.find((i) => i.name === "Inspector B");
    expect(inspB?.approvalRate).toBeCloseTo(66.67, 1);
  });
});

// ── Export rows and charts ────────────────────────────────────────────────────

describe("getManagementReportData – export rows and charts", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    resetPrismaMocks();
    setupReportMocks();
  });

  it("exportRows.scaffolds has correct row count with required fields", async () => {
    const { exportRows } = await getManagementReportData(CUSTOM_PARAMS);

    expect(exportRows.scaffolds).toHaveLength(7);
    const first = exportRows.scaffolds[0];
    expect(first).toHaveProperty("codigoTag");
    expect(first).toHaveProperty("empresa");
    expect(first).toHaveProperty("area");
    expect(first).toHaveProperty("status");
    expect(first.empresa).toBe("Empresa Alpha");
  });

  it("exportRows.inspections includes nested scaffold-level fields", async () => {
    const { exportRows } = await getManagementReportData(CUSTOM_PARAMS);

    expect(exportRows.inspections).toHaveLength(6);
    const first = exportRows.inspections[0];
    expect(first).toHaveProperty("tagAndaime");
    expect(first).toHaveProperty("inspetor");
    expect(first).toHaveProperty("resultado");
    expect(first.inspetor).toBe("Inspector A");
  });

  it("exportRows.nonConformities uses tipoNc from checklistItem when present", async () => {
    const { exportRows } = await getManagementReportData(CUSTOM_PARAMS);

    expect(exportRows.nonConformities).toHaveLength(4);
    // nc2 has a checklistItem with label "Guarda-corpo superior ausente"
    const nc2Row = exportRows.nonConformities.find(
      (r) => r.codigoNc === "NC-0002",
    );
    expect(nc2Row?.tipoNc).toBe("Guarda-corpo superior ausente/irregular");
    // nc1 uses title since checklistItems is empty
    const nc1Row = exportRows.nonConformities.find(
      (r) => r.codigoNc === "NC-0001",
    );
    expect(nc1Row?.tipoNc).toBe("Guarda-corpo superior ausente/irregular");
  });

  it("charts use day granularity for a 30-day custom period", async () => {
    const { charts } = await getManagementReportData(CUSTOM_PARAMS);

    expect(charts.granularity).toBe("day");
    // June 1 → June 30 = 30 daily buckets
    expect(charts.inspectionTrend).toHaveLength(30);
    expect(charts.nonConformityTrend).toHaveLength(30);
  });
});
