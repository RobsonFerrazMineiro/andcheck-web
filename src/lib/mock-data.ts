/**
 * Dados mockados — camada provisória isolada.
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

export interface ChecklistEntry {
  category: string;
  item: string;
  critical: boolean;
  status: "conforme" | "nao_conforme" | "nao_aplicavel";
  observation: string;
}

export interface MockInspection {
  id: string;
  scaffold_code: string;
  scaffold_id: string;
  date: string;
  inspector_name: string;
  result: InspectionResult;
  validity_days: number;
  observations: string;
  checklist: ChecklistEntry[];
  created_date: string;
}

export const MOCK_SCAFFOLDS: MockScaffold[] = [
  { id: "s1", code: "AND-001", location: "Area de Producao A", area: "Bloco Industrial 01", type: "tubular", status: "liberado", validity_date: "2026-06-01", height: 6.0, responsible: "Carlos Mendes", company: "Andaimes Souza Ltda", max_load: 300, notes: "Andaime em bom estado de conservacao.", created_date: "2026-04-10" },
  { id: "s2", code: "AND-002", location: "Corredor Principal", area: "Bloco Industrial 02", type: "multidirecional", status: "liberado", validity_date: "2026-05-31", height: 4.5, responsible: "Roberto Silva", company: "Andaimes Souza Ltda", max_load: 250, notes: "", created_date: "2026-04-15" },
  { id: "s3", code: "AND-003", location: "Subestacao Eletrica", area: "Utilidades", type: "tubular", status: "reprovado", validity_date: null, height: 8.0, responsible: "Ana Lima", company: "Construmetal S.A.", max_load: 500, notes: "Reprovado por ausencia de tela de protecao.", created_date: "2026-04-20" },
  { id: "s4", code: "AND-004", location: "Caldeiraria Norte", area: "Manutenção", type: "tubular", status: "pendente", validity_date: null, height: 3.5, responsible: "Marcos Rocha", company: "Andaimes Souza Ltda", max_load: null, notes: "Aguardando inspeção inicial.", created_date: "2026-05-01" },
  { id: "s5", code: "AND-005", location: "Torre de Resfriamento", area: "Utilidades", type: "torre", status: "em_montagem", validity_date: null, height: 12.0, responsible: "Roberto Silva", company: "Construmetal S.A.", max_load: 600, notes: "Em montagem.", created_date: "2026-05-10" },
  { id: "s6", code: "AND-006", location: "Galpão de Expedição", area: "Logística", type: "fachadeiro", status: "liberado", validity_date: "2026-06-02", height: 5.0, responsible: "Carlos Mendes", company: "Andaimes Souza Ltda", max_load: 200, notes: "", created_date: "2026-05-12" },
  { id: "s7", code: "AND-007", location: "Tanques TK-01/02", area: "Processo", type: "suspenso", status: "vencido", validity_date: "2026-05-25", height: 7.0, responsible: "Ana Lima", company: "Construmetal S.A.", max_load: 400, notes: "Validade expirada.", created_date: "2026-04-25" },
];

const CL_OK: ChecklistEntry[] = [
  { category: "Segurança Documental", item: "ART/RRT de montagem está disponível e válida", critical: true, status: "conforme", observation: "" },
  { category: "Segurança Documental", item: "Projeto estrutural do andaime disponível", critical: true, status: "conforme", observation: "" },
  { category: "Segurança Documental", item: "Ordem de serviço de montagem preenchida", critical: false, status: "conforme", observation: "" },
  { category: "Segurança Documental", item: "PT (Permissão de Trabalho) emitida e válida", critical: true, status: "conforme", observation: "" },
  { category: "Segurança Documental", item: "Montador possui capacitação NR-18 e NR-35", critical: true, status: "conforme", observation: "" },
  { category: "Segurança Documental", item: "Memorial de cálculo disponível", critical: false, status: "nao_aplicavel", observation: "" },
  { category: "Segurança Documental", item: "Placa de identificação com carga máxima fixada", critical: true, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Base/sapatas apoiadas em superficie firme e nivelada", critical: true, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Contraventamentos instalados corretamente", critical: true, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Travamento e amarracao a estrutura adequados", critical: true, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Plataformas de trabalho completas e travadas", critical: true, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Sem deformacoes, trincas ou corrosao visiveis", critical: true, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Bracadeiras/acopladores em bom estado", critical: false, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Montantes alinhados e prumo verificado", critical: false, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Rodapé instalado (min. 20cm)", critical: true, status: "conforme", observation: "" },
  { category: "Estrutura", item: "Tela de proteção instalada", critical: false, status: "conforme", observation: "" },
  { category: "Acesso e Proteção", item: "Escada de acesso com degraus antiderrapantes", critical: true, status: "conforme", observation: "" },
  { category: "Acesso e Proteção", item: "Alçapão de acesso com fechamento automático", critical: false, status: "conforme", observation: "" },
  { category: "Acesso e Proteção", item: "Guarda-corpo superior instalado (1,20m)", critical: true, status: "conforme", observation: "" },
  { category: "Acesso e Proteção", item: "Guarda-corpo intermediário instalado (0,70m)", critical: true, status: "conforme", observation: "" },
  { category: "Acesso e Proteção", item: "Sistema de linha de vida instalado", critical: true, status: "nao_aplicavel", observation: "" },
  { category: "Acesso e Proteção", item: "Sinalização e isolamento da área", critical: false, status: "conforme", observation: "" },
  { category: "Acesso e Proteção", item: "Rede de segurança ou bandeja coletora", critical: false, status: "nao_aplicavel", observation: "" },
  { category: "Instalacoes Eletricas", item: "Distancia segura de redes eletricas", critical: true, status: "conforme", observation: "" },
  { category: "Instalações Elétricas", item: "Aterramento do andaime", critical: true, status: "nao_aplicavel", observation: "" },
  { category: "Instalações Elétricas", item: "Iluminação adequada no local", critical: false, status: "conforme", observation: "" },
  { category: "Instalações Elétricas", item: "Instalação elétrica provisória em conformidade", critical: false, status: "nao_aplicavel", observation: "" },
  { category: "EPIs e Segurança", item: "Capacete com jugular disponível", critical: true, status: "conforme", observation: "" },
  { category: "EPIs e Segurança", item: "Cinto de segurança tipo paraquedista", critical: true, status: "conforme", observation: "" },
  { category: "EPIs e Segurança", item: "Calçado de segurança adequado", critical: false, status: "conforme", observation: "" },
  { category: "EPIs e Segurança", item: "Luvas de proteção disponíveis", critical: false, status: "conforme", observation: "" },
  { category: "EPIs e Segurança", item: "Óculos de proteção disponíveis", critical: false, status: "conforme", observation: "" },
  { category: "EPIs e Segurança", item: "Trabalhadores com ASO válido para altura", critical: true, status: "conforme", observation: "" },
  { category: "EPIs e Segurança", item: "Treinamento NR-35 vigente (2 anos)", critical: true, status: "conforme", observation: "" },
];

const CL_FAIL: ChecklistEntry[] = CL_OK.map((e) => {
  if (e.item === "Tela de proteção instalada") return { ...e, status: "nao_conforme", observation: "Tela ausente no nível 2" };
  if (e.item === "Rodapé instalado (min. 20cm)") return { ...e, status: "nao_conforme", observation: "Rodapé não instalado no nível 3" };
  if (e.item === "ART/RRT de montagem está disponível e válida") return { ...e, status: "nao_conforme", observation: "ART vencida" };
  return e;
});

const CL_WARN: ChecklistEntry[] = CL_OK.map((e) => {
  if (e.item === "Iluminação adequada no local") return { ...e, status: "nao_conforme", observation: "Iluminação insuficiente no lado leste" };
  if (e.item === "Sinalização e isolamento da área") return { ...e, status: "nao_conforme", observation: "Fita de isolamento parcialmente removida" };
  return e;
});

export const MOCK_INSPECTIONS: MockInspection[] = [
  { id: "i1", scaffold_code: "AND-001", scaffold_id: "s1", date: "2026-05-29", inspector_name: "Carlos Mendes", result: "aprovado", validity_days: 7, observations: "Andaime em otimas condicoes. Aprovado sem ressalvas.", checklist: CL_OK, created_date: "2026-05-29" },
  { id: "i2", scaffold_code: "AND-003", scaffold_id: "s3", date: "2026-05-28", inspector_name: "Ana Lima", result: "reprovado", validity_days: 0, observations: "Itens críticos não conformes. Interdição imediata.", checklist: CL_FAIL, created_date: "2026-05-28" },
  { id: "i3", scaffold_code: "AND-002", scaffold_id: "s2", date: "2026-05-27", inspector_name: "Roberto Silva", result: "aprovado_com_ressalvas", validity_days: 7, observations: "Aprovado com ressalvas. Corrigir iluminacao em 48h.", checklist: CL_WARN, created_date: "2026-05-27" },
  { id: "i4", scaffold_code: "AND-006", scaffold_id: "s6", date: "2026-05-26", inspector_name: "Carlos Mendes", result: "aprovado", validity_days: 7, observations: "", checklist: CL_OK, created_date: "2026-05-26" },
  { id: "i5", scaffold_code: "AND-004", scaffold_id: "s4", date: "2026-05-25", inspector_name: "Ana Lima", result: "reprovado", validity_days: 0, observations: "Documentacao incompleta. ART vencida.", checklist: CL_FAIL, created_date: "2026-05-25" },
  { id: "i6", scaffold_code: "AND-001", scaffold_id: "s1", date: "2026-05-24", inspector_name: "Roberto Silva", result: "aprovado", validity_days: 7, observations: "", checklist: CL_OK, created_date: "2026-05-24" },
  { id: "i7", scaffold_code: "AND-007", scaffold_id: "s7", date: "2026-05-23", inspector_name: "Carlos Mendes", result: "reprovado", validity_days: 0, observations: "Validade vencida. Reinspe cao obrigatoria.", checklist: CL_FAIL, created_date: "2026-05-23" },
];
