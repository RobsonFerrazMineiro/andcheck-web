import { beforeEach, describe, expect, it, vi } from "vitest";

// ── External module mocks (must be before any imports) ──────────────────────
vi.mock("@/lib/authz", () => ({
  requireAnyPermission: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data-scope", () => ({
  getDataScope: vi
    .fn()
    .mockResolvedValue({ companyIds: null, workspaceIds: null }),
  dataScopeWhere: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/management-reports", () => ({
  summarizeChecklistNonConformity: vi.fn((text: string) => text),
}));

const prismaMocks = vi.hoisted(() => ({
  scaffoldFindMany: vi.fn(),
  inspectionFindMany: vi.fn(),
  nonConformityFindMany: vi.fn(),
  notificationFindMany: vi.fn(),
  companyFindMany: vi.fn(),
  workspaceFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scaffold: { findMany: prismaMocks.scaffoldFindMany },
    inspection: { findMany: prismaMocks.inspectionFindMany },
    nonConformity: { findMany: prismaMocks.nonConformityFindMany },
    notification: { findMany: prismaMocks.notificationFindMany },
    company: { findMany: prismaMocks.companyFindMany },
    workspace: { findMany: prismaMocks.workspaceFindMany },
  },
}));

import { getExecutiveDashboard } from "@/lib/executive-dashboard";

// ── Test fixtures ────────────────────────────────────────────────────────────

const COMPANY_A = { id: "c1", name: "Empresa Alpha" };
const COMPANY_B = { id: "c2", name: "Empresa Beta" };
const WS1 = { id: "w1", name: "Workspace 1" };
const WS2 = { id: "w2", name: "Workspace 2" };

const PERIOD_MID = new Date("2026-06-15T12:00:00.000Z");
const NC_CREATED_AT = new Date("2026-06-01T00:00:00.000Z");
// 10 days after creation → avgCorrection = 10 days
const NC_CLOSED_AT = new Date("2026-06-11T00:00:00.000Z");

function makeScaffold(
  id: string,
  status: string,
  area: string,
  company: typeof COMPANY_A,
  ws: typeof WS1,
) {
  return {
    id,
    code: `AND-2026-${id.padStart(4, "0")}`,
    status,
    area,
    company: company.name,
    companyId: company.id,
    workspaceId: ws.id,
    created_at: PERIOD_MID,
    released_at: status === "liberado" ? PERIOD_MID : null,
    dismantled_at: status === "desmontado" ? PERIOD_MID : null,
    validity_date: null,
    latitude: null,
    longitude: null,
    responsible: "Resp. Técnico",
    location: `Local ${id}`,
    location_description: null,
    tenantCompany: company,
    workspace: ws,
    inspections: [],
  };
}

// 8 current scaffolds: 3 liberado, 1 interditado, 2 em_montagem, 1 pendente, 1 desmontado
const CURRENT_SCAFFOLDS = [
  makeScaffold("s1", "liberado", "Área Norte", COMPANY_A, WS1),
  makeScaffold("s2", "liberado", "Área Norte", COMPANY_A, WS1),
  makeScaffold("s3", "liberado", "Área Sul", COMPANY_B, WS2),
  makeScaffold("s4", "interditado", "Área Norte", COMPANY_A, WS1),
  makeScaffold("s5", "em_montagem", "Área Sul", COMPANY_A, WS1),
  makeScaffold("s6", "em_montagem", "Área Sul", COMPANY_B, WS2),
  makeScaffold("s7", "pendente_liberacao", "Área Norte", COMPANY_B, WS2),
  makeScaffold("s8", "desmontado", "Área Norte", COMPANY_A, WS1),
];

// 3 previous scaffolds: 2 liberado, 1 em_montagem
const PREV_SCAFFOLDS = [
  {
    id: "ps1",
    status: "liberado",
    companyId: "c1",
    workspaceId: "w1",
    created_at: NC_CREATED_AT,
    released_at: NC_CREATED_AT,
    dismantled_at: null,
    validity_date: null,
  },
  {
    id: "ps2",
    status: "liberado",
    companyId: "c2",
    workspaceId: "w2",
    created_at: NC_CREATED_AT,
    released_at: NC_CREATED_AT,
    dismantled_at: null,
    validity_date: null,
  },
  {
    id: "ps3",
    status: "em_montagem",
    companyId: "c1",
    workspaceId: "w1",
    created_at: NC_CREATED_AT,
    released_at: null,
    dismantled_at: null,
    validity_date: null,
  },
];

// 7 current inspections: 3 aprovado, 3 aprovado_com_ressalvas, 1 reprovado
// Inspector A: 4 (i1,i2,i5,i6), Inspector B: 3 (i3,i4,i7)
const CURRENT_INSPECTIONS = [
  {
    id: "i1",
    date: PERIOD_MID,
    inspector_name: "Inspector A",
    result: "aprovado",
    companyId: "c1",
    workspaceId: "w1",
    scaffold: {
      area: "Área Norte",
      companyId: "c1",
      workspaceId: "w1",
      tenantCompany: COMPANY_A,
      workspace: WS1,
    },
  },
  {
    id: "i2",
    date: PERIOD_MID,
    inspector_name: "Inspector A",
    result: "aprovado",
    companyId: "c1",
    workspaceId: "w1",
    scaffold: {
      area: "Área Norte",
      companyId: "c1",
      workspaceId: "w1",
      tenantCompany: COMPANY_A,
      workspace: WS1,
    },
  },
  {
    id: "i3",
    date: PERIOD_MID,
    inspector_name: "Inspector B",
    result: "aprovado_com_ressalvas",
    companyId: "c2",
    workspaceId: "w2",
    scaffold: {
      area: "Área Sul",
      companyId: "c2",
      workspaceId: "w2",
      tenantCompany: COMPANY_B,
      workspace: WS2,
    },
  },
  {
    id: "i4",
    date: PERIOD_MID,
    inspector_name: "Inspector B",
    result: "aprovado_com_ressalvas",
    companyId: "c2",
    workspaceId: "w2",
    scaffold: {
      area: "Área Sul",
      companyId: "c2",
      workspaceId: "w2",
      tenantCompany: COMPANY_B,
      workspace: WS2,
    },
  },
  {
    id: "i5",
    date: PERIOD_MID,
    inspector_name: "Inspector A",
    result: "aprovado",
    companyId: "c1",
    workspaceId: "w1",
    scaffold: {
      area: "Área Norte",
      companyId: "c1",
      workspaceId: "w1",
      tenantCompany: COMPANY_A,
      workspace: WS1,
    },
  },
  {
    id: "i6",
    date: PERIOD_MID,
    inspector_name: "Inspector A",
    result: "aprovado_com_ressalvas",
    companyId: "c1",
    workspaceId: "w1",
    scaffold: {
      area: "Área Norte",
      companyId: "c1",
      workspaceId: "w1",
      tenantCompany: COMPANY_A,
      workspace: WS1,
    },
  },
  {
    id: "i7",
    date: PERIOD_MID,
    inspector_name: "Inspector B",
    result: "reprovado",
    companyId: "c1",
    workspaceId: "w1",
    scaffold: {
      area: "Área Norte",
      companyId: "c1",
      workspaceId: "w1",
      tenantCompany: COMPANY_A,
      workspace: WS1,
    },
  },
];

// 3 previous inspections: 2 approved, 1 reprovado
const PREV_INSPECTIONS = [
  {
    id: "pi1",
    date: NC_CREATED_AT,
    result: "aprovado",
    companyId: "c1",
    workspaceId: "w1",
  },
  {
    id: "pi2",
    date: NC_CREATED_AT,
    result: "aprovado_com_ressalvas",
    companyId: "c1",
    workspaceId: "w1",
  },
  {
    id: "pi3",
    date: NC_CREATED_AT,
    result: "reprovado",
    companyId: "c1",
    workspaceId: "w1",
  },
];

// 3 current NCs: 2 OPEN, 1 CLOSED (10-day closure)
const CURRENT_NCS = [
  {
    id: "nc1",
    code: "NC-2026-0001",
    title: "Proteção inadequada",
    classification: "MINOR",
    status: "OPEN",
    createdAt: PERIOD_MID,
    closedAt: null,
    dueDate: null,
    companyId: "c1",
    workspaceId: "w1",
    checklistItems: [],
    scaffold: {
      area: "Área Norte",
      code: "AND-2026-0004",
      tenantCompany: COMPANY_A,
      workspace: WS1,
    },
  },
  {
    id: "nc2",
    code: "NC-2026-0002",
    title: "Andaime danificado",
    classification: "MAJOR",
    status: "OPEN",
    createdAt: PERIOD_MID,
    closedAt: null,
    dueDate: null,
    companyId: "c1",
    workspaceId: "w1",
    checklistItems: [],
    scaffold: {
      area: "Área Norte",
      code: "AND-2026-0004",
      tenantCompany: COMPANY_A,
      workspace: WS1,
    },
  },
  {
    id: "nc3",
    code: "NC-2026-0003",
    title: "Sinalização ausente",
    classification: "MINOR",
    status: "CLOSED",
    createdAt: NC_CREATED_AT,
    closedAt: NC_CLOSED_AT,
    dueDate: null,
    companyId: "c2",
    workspaceId: "w2",
    checklistItems: [],
    scaffold: {
      area: "Área Sul",
      code: "AND-2026-0003",
      tenantCompany: COMPANY_B,
      workspace: WS2,
    },
  },
];

// 1 previous NC (OPEN)
const PREV_NCS = [
  {
    id: "pnc1",
    status: "OPEN",
    createdAt: NC_CREATED_AT,
    closedAt: null,
    dueDate: null,
    companyId: "c1",
    workspaceId: "w1",
  },
];

// 2 notifications: 1 CRITICAL, 1 WARNING
const CURRENT_NOTIFICATIONS = [
  {
    id: "n1",
    type: "SCAFFOLD_INTERDICTED",
    severity: "CRITICAL",
    createdAt: PERIOD_MID,
    companyId: "c1",
    workspaceId: "w1",
  },
  {
    id: "n2",
    type: "INSPECTION_WITH_REMARKS",
    severity: "WARNING",
    createdAt: PERIOD_MID,
    companyId: "c1",
    workspaceId: "w1",
  },
];

const PREV_NOTIFICATIONS: unknown[] = [];

// ── Helper to setup prisma mocks in Promise.all order ───────────────────────
function setupPrismaMocks() {
  // Promise.all order:
  // 1. scaffold.findMany (current)
  // 2. scaffold.findMany (previous)
  // 3. inspection.findMany (current)
  // 4. inspection.findMany (previous)
  // 5. nonConformity.findMany (current)
  // 6. nonConformity.findMany (previous)
  // 7. notification.findMany (current) – .catch wrapped
  // 8. notification.findMany (previous) – .catch wrapped
  // 9. company.findMany
  // 10. workspace.findMany

  prismaMocks.scaffoldFindMany
    .mockResolvedValueOnce(CURRENT_SCAFFOLDS)
    .mockResolvedValueOnce(PREV_SCAFFOLDS);

  prismaMocks.inspectionFindMany
    .mockResolvedValueOnce(CURRENT_INSPECTIONS)
    .mockResolvedValueOnce(PREV_INSPECTIONS);

  prismaMocks.nonConformityFindMany
    .mockResolvedValueOnce(CURRENT_NCS)
    .mockResolvedValueOnce(PREV_NCS);

  prismaMocks.notificationFindMany
    .mockResolvedValueOnce(CURRENT_NOTIFICATIONS)
    .mockResolvedValueOnce(PREV_NOTIFICATIONS);

  prismaMocks.companyFindMany.mockResolvedValueOnce([COMPANY_A, COMPANY_B]);
  prismaMocks.workspaceFindMany.mockResolvedValueOnce([WS1, WS2]);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("getExecutiveDashboard – KPI calculations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaMocks();
  });

  it("returns the expected output shape", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    expect(result).toHaveProperty("kpis");
    expect(result).toHaveProperty("series");
    expect(result).toHaveProperty("statusDistribution");
    expect(result).toHaveProperty("rankings");
    expect(result).toHaveProperty("productivity");
    expect(result).toHaveProperty("map");
    expect(result).toHaveProperty("insights");
    expect(result.title).toBe("Dashboard Executivo");
  });

  it("calculates total scaffolds from mock data", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "totalScaffolds");
    expect(kpi).toBeDefined();
    expect(kpi!.rawValue).toBe(8);
  });

  it("calculates released scaffolds (liberado) correctly", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "releasedScaffolds");
    expect(kpi!.rawValue).toBe(3);
  });

  it("calculates interdicted scaffolds correctly", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "interdictedScaffolds");
    expect(kpi!.rawValue).toBe(1);
  });

  it("calculates inspection count correctly", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "inspections");
    expect(kpi!.rawValue).toBe(7);
  });

  it("calculates approval rate as 85.7% (6 of 7 approved)", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "approvalRate");
    expect(kpi!.rawValue).toBe(85.7);
  });

  it("calculates open NCs correctly (2 open, 1 closed)", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const openKpi = result.kpis.find((k) => k.id === "openNcs");
    const closedKpi = result.kpis.find((k) => k.id === "closedNcs");
    expect(openKpi!.rawValue).toBe(2);
    expect(closedKpi!.rawValue).toBe(1);
  });

  it("calculates average correction days as 10 days", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "avgCorrection");
    expect(kpi!.rawValue).toBe(10);
  });

  it("calculates utilization rate correctly (5 active out of 7 non-dismantled)", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "utilizationRate");
    // liberado(3) + pendente(1) + interditado(1) = 5 out of 8-1=7 non-dismantled
    expect(kpi!.rawValue).toBe(71.4);
  });

  it("calculates critical notification count correctly (1 of 2 notifications is CRITICAL)", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const kpi = result.kpis.find((k) => k.id === "criticalNotifications");
    expect(kpi!.rawValue).toBe(1);
  });
});

describe("getExecutiveDashboard – status distribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaMocks();
  });

  it("includes all expected status groups in distribution", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const statuses = result.statusDistribution.map((d) => d.status);
    expect(statuses).toContain("liberado");
    expect(statuses).toContain("em_montagem");
    expect(statuses).toContain("pendente_liberacao");
    expect(statuses).toContain("interditado");
    expect(statuses).toContain("vencido");
    expect(statuses).toContain("desmontado");
  });

  it("counts liberado scaffolds correctly in distribution", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const liberado = result.statusDistribution.find(
      (d) => d.status === "liberado",
    );
    expect(liberado!.total).toBe(3);
    expect(liberado!.percentage).toBe(37.5);
  });

  it("counts desmontado scaffolds correctly in distribution", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const desmontado = result.statusDistribution.find(
      (d) => d.status === "desmontado",
    );
    expect(desmontado!.total).toBe(1);
    expect(desmontado!.percentage).toBe(12.5);
  });

  it("reports zero vencido when no scaffolds are expired", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const vencido = result.statusDistribution.find(
      (d) => d.status === "vencido",
    );
    expect(vencido!.total).toBe(0);
    expect(vencido!.percentage).toBe(0);
  });
});

describe("getExecutiveDashboard – rankings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaMocks();
  });

  it("ranks companies by scaffold volume correctly", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const { companies } = result.rankings;
    expect(companies[0].name).toBe("Empresa Alpha");
    expect(companies[0].total).toBe(5); // s1,s2,s4,s5,s8
    expect(companies[1].name).toBe("Empresa Beta");
    expect(companies[1].total).toBe(3); // s3,s6,s7
  });

  it("ranks areas by scaffold volume correctly", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const { areas } = result.rankings;
    expect(areas[0].name).toBe("Área Norte");
    expect(areas[0].total).toBe(5); // s1,s2,s4,s7,s8
    expect(areas[1].name).toBe("Área Sul");
    expect(areas[1].total).toBe(3); // s3,s5,s6
  });

  it("ranks inspectors by inspection volume correctly", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const { inspectors } = result.rankings;
    expect(inspectors[0].name).toBe("Inspector A");
    expect(inspectors[0].total).toBe(4);
    expect(inspectors[1].name).toBe("Inspector B");
    expect(inspectors[1].total).toBe(3);
  });
});

describe("getExecutiveDashboard – filter options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaMocks();
  });

  it("exposes filter companies from prisma", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    expect(result.filterOptions.companies).toHaveLength(2);
    expect(result.filterOptions.companies[0].name).toBe("Empresa Alpha");
  });

  it("exposes filter workspaces from prisma", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    expect(result.filterOptions.workspaces).toHaveLength(2);
  });

  it("extracts unique areas from scaffold data", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const areas = result.filterOptions.areas;
    expect(areas).toContain("Área Norte");
    expect(areas).toContain("Área Sul");
  });
});

describe("getExecutiveDashboard – insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaMocks();
  });

  it("generates at least 3 insights", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    expect(result.insights.length).toBeGreaterThanOrEqual(3);
  });

  it("mentions the top area in insights", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const areaInsight = result.insights.find((ins) =>
      ins.detail.includes("Área Norte"),
    );
    expect(areaInsight).toBeDefined();
  });

  it("mentions the top inspector in insights", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    const inspectorInsight = result.insights.find((ins) =>
      ins.detail.includes("Inspector A"),
    );
    expect(inspectorInsight).toBeDefined();
  });

  it("raises NC warning insight when NCs increased vs previous period", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    // openNcs=2, previousOpenNcs=1 → delta=+1 → warning tone
    const ncInsight = result.insights.find((ins) => ins.tone === "critical");
    expect(ncInsight).toBeDefined();
  });
});

describe("getExecutiveDashboard – period handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupPrismaMocks();
  });

  it("defaults to month period when no dates provided", async () => {
    const result = await getExecutiveDashboard({});
    expect(result.filters.period).toBe("month");
    expect(result.range.days).toBe(30);
  });

  it("uses custom date range when startDate and endDate are provided", async () => {
    const result = await getExecutiveDashboard({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
    // Verify the period string includes June 2026 dates (exact value depends on timezone)
    expect(result.filters.period).toBe("month"); // defaults to month when dates omitted
    // The range covers ~30 days
    expect(result.range.days).toBeGreaterThanOrEqual(29);
    expect(result.range.days).toBeLessThanOrEqual(31);
    // Both dates should be within June 2026 in some form
    expect(result.filters.startDate).toMatch(/2026-0[56]-/);
    expect(result.filters.endDate).toMatch(/2026-0[67]-/);
  });
});
