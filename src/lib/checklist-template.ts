/**
 * Template do checklist NR-18 / NR-35 / ABNT NBR 6494
 * Usado na criação de inspeções.
 */

export interface ChecklistItem {
  item: string;
  critical: boolean;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export interface ChecklistValue {
  status: "conforme" | "nao_conforme" | "nao_aplicavel" | "";
  observation: string;
}

export interface ChecklistEntry extends ChecklistItem {
  category: string;
  status: "conforme" | "nao_conforme" | "nao_aplicavel";
  observation: string;
}

const checklistTemplate: ChecklistCategory[] = [
  {
    category: "Segurança Documental",
    items: [
      { item: "ART/RRT de montagem está disponível e válida", critical: true },
      { item: "Projeto estrutural do andaime disponível", critical: true },
      { item: "Ordem de serviço de montagem preenchida", critical: false },
      { item: "PT (Permissão de Trabalho) emitida e válida", critical: true },
      { item: "Montador possui capacitação NR-18 e NR-35", critical: true },
      {
        item: "Memorial de cálculo disponível (quando aplicável)",
        critical: false,
      },
      {
        item: "Placa de identificação com carga máxima fixada",
        critical: true,
      },
    ],
  },
  {
    category: "Estrutura",
    items: [
      {
        item: "Base/sapatas apoiadas em superfície firme e nivelada",
        critical: true,
      },
      { item: "Contraventamentos instalados corretamente", critical: true },
      { item: "Travamento e amarração à estrutura adequados", critical: true },
      { item: "Plataformas de trabalho completas e travadas", critical: true },
      {
        item: "Sem deformações, trincas ou corrosão visível nos tubos",
        critical: true,
      },
      {
        item: "Braçadeiras/acopladores em bom estado e torqueados",
        critical: false,
      },
      { item: "Montantes alinhados e prumo verificado", critical: false },
      {
        item: "Rodapé instalado em todas as plataformas (mín. 20cm)",
        critical: true,
      },
      {
        item: "Tela de proteção instalada (quando necessário)",
        critical: false,
      },
    ],
  },
  {
    category: "Acesso e Proteção",
    items: [
      {
        item: "Escada de acesso interna com degraus antiderrapantes",
        critical: true,
      },
      { item: "Alçapão de acesso com fechamento automático", critical: false },
      {
        item: "Guarda-corpo superior instalado (1,20m de altura)",
        critical: true,
      },
      { item: "Guarda-corpo intermediário instalado (0,70m)", critical: true },
      {
        item: "Sistema de linha de vida instalado (quando aplicável)",
        critical: true,
      },
      { item: "Sinalização e isolamento da área executados", critical: false },
      {
        item: "Rede de segurança ou bandeja coletora (quando necessário)",
        critical: false,
      },
    ],
  },
  {
    category: "Instalações Elétricas",
    items: [
      {
        item: "Distância segura de redes elétricas energizadas",
        critical: true,
      },
      {
        item: "Aterramento do andaime (quando metálico próximo a rede)",
        critical: true,
      },
      { item: "Iluminação adequada no local de trabalho", critical: false },
      {
        item: "Instalação elétrica provisória em conformidade",
        critical: false,
      },
    ],
  },
  {
    category: "EPIs e Segurança",
    items: [
      { item: "Capacete com jugular disponível", critical: true },
      {
        item: "Cinto de segurança tipo paraquedista com talabarte duplo",
        critical: true,
      },
      { item: "Calçado de segurança adequado", critical: false },
      { item: "Luvas de proteção disponíveis", critical: false },
      { item: "Óculos de proteção disponíveis", critical: false },
      {
        item: "Trabalhadores com ASO válido para trabalho em altura",
        critical: true,
      },
      { item: "Treinamento NR-35 vigente (validade 2 anos)", critical: true },
    ],
  },
];

export default checklistTemplate;
