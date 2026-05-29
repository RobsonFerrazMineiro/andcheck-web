/**
 * Dados mockados — camada provisoria isolada.
 * Substituir por Server Actions + Prisma quando o schema estiver pronto.
 */

export type ScaffoldStatus = "liberado" | "pendente" | "em_montagem" | "reprovado" | "vencido";
export type ScaffoldType = "tubular" | "fachadeiro" | "multidirecional" | "suspenso" | "torre";
export type InspectionResult = "aprovado" | "aprovado_com_ressalvas" | "reprovado";

export interface MockScaffold {
  id: string;
  code: string;
  location: string;
  area: string;
  type: ScaffoldType;
  status: ScaffoldStatus;
  validity_date: string | null;
  height: number;
  responsible: string;
  company: string;
  max_load: number | null;
  notes: string;
  created_date: string;
}

export interface MockInspection {
  id: string;
  scaffold_code: string;
  scaffold_id: string;
  date: string;
  inspector_name: string;
  result: InspectionResult;
  created_date: string;
}

export const MOCK_SCAFFOLDS: MockScaffold[] = [
  {
    id: "s1", code: "AND-001", location: "Area de Producao A", area: "Bloco Industrial 01",
    type: "tubular", status: "liberado", validity_date: "2026-06-01", height: 6.0,
    responsible: "Carlos Mendes", company: "Andaimes Souza Ltda", max_load: 300,
    notes: "Andaime em bom estado.", created_date: "2026-04-10",
  },
  {
    id: "s2", code: "AND-002", location: "Corredor Principal", area: "Bloco Industrial 02",
    type: "multidirecional", status: "liberado", validity_date: "2026-05-31", height: 4.5,
    responsible: "Roberto Silva", company: "Andaimes Souza Ltda", max_load: 250,
    notes: "", created_date: "2026-04-15",
  },
  {
    id: "s3", code: "AND-003", location: "Subestacao Eletrica", area: "Utilidades",
    type: "tubular", status: "reprovado", validity_date: null, height: 8.0,
    responsible: "Ana Lima", company: "Construmetal S.A.", max_load: 500,
    notes: "Reprovado por ausencia de tela de protecao.", created_date: "2026-04-20",
  },
  {
    id: "s4", code: "AND-004", location: "Caldeiraria Norte", area: "Manutencao",
    type: "tubular", status: "pendente", validity_date: null, height: 3.5,
    responsible: "Marcos Rocha", company: "Andaimes Souza Ltda", max_load: null,
    notes: "Aguardando inspecao inicial.", created_date: "2026-05-01",
  },
  {
    id: "s5", code: "AND-005", location: "Torre de Resfriamento", area: "Utilidades",
    type: "torre", status: "em_montagem", validity_date: null, height: 12.0,
    responsible: "Roberto Silva", company: "Construmetal S.A.", max_load: 600,
    notes: "Em processo de montagem.", created_date: "2026-05-10",
  },
  {
    id: "s6", code: "AND-006", location: "Galpao de Expedicao", area: "Logistica",
    type: "fachadeiro", status: "liberado", validity_date: "2026-06-02", height: 5.0,
    responsible: "Carlos Mendes", company: "Andaimes Souza Ltda", max_load: 200,
    notes: "", created_date: "2026-05-12",
  },
  {
    id: "s7", code: "AND-007", location: "Tanques TK-01/02", area: "Processo",
    type: "suspenso", status: "vencido", validity_date: "2026-05-25", height: 7.0,
    responsible: "Ana Lima", company: "Construmetal S.A.", max_load: 400,
    notes: "Validade expirada. Requer nova inspecao.", created_date: "2026-04-25",
  },
];

export const MOCK_INSPECTIONS: MockInspection[] = [
  { id: "i1", scaffold_code: "AND-001", scaffold_id: "s1", date: "2026-05-29", inspector_name: "Carlos Mendes", result: "aprovado", created_date: "2026-05-29" },
  { id: "i2", scaffold_code: "AND-003", scaffold_id: "s3", date: "2026-05-28", inspector_name: "Ana Lima", result: "reprovado", created_date: "2026-05-28" },
  { id: "i3", scaffold_code: "AND-002", scaffold_id: "s2", date: "2026-05-27", inspector_name: "Roberto Silva", result: "aprovado_com_ressalvas", created_date: "2026-05-27" },
  { id: "i4", scaffold_code: "AND-006", scaffold_id: "s6", date: "2026-05-26", inspector_name: "Carlos Mendes", result: "aprovado", created_date: "2026-05-26" },
  { id: "i5", scaffold_code: "AND-004", scaffold_id: "s4", date: "2026-05-25", inspector_name: "Ana Lima", result: "reprovado", created_date: "2026-05-25" },
  { id: "i6", scaffold_code: "AND-001", scaffold_id: "s1", date: "2026-05-24", inspector_name: "Roberto Silva", result: "aprovado", created_date: "2026-05-24" },
  { id: "i7", scaffold_code: "AND-007", scaffold_id: "s7", date: "2026-05-23", inspector_name: "Carlos Mendes", result: "reprovado", created_date: "2026-05-23" },
];
