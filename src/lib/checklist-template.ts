/**
 * Template do checklist NR-18 / NR-35 / ABNT NBR 6494
 * Usado na criação de inspeções.
 */

export interface ChecklistItem {
  item: string;
  critical: boolean;
  /** Referência normativa exibida no PDF técnico (ex: "NR-18.15.22") */
  reference?: string;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export interface ChecklistValue {
  status: "conforme" | "nao_conforme" | "nao_aplicavel" | "";
  observation: string;
  photo?: string; // referencia do arquivo no storage
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
      {
        item: "ART/RRT de montagem está disponível e válida",
        critical: true,
        reference: "NR-18.15.33 / Lei 6496/77",
      },
      {
        item: "Projeto estrutural do andaime disponível",
        critical: true,
        reference: "ABNT NBR 6494:2019",
      },
      {
        item: "Ordem de serviço de montagem preenchida",
        critical: false,
        reference: "NR-18.15",
      },
      {
        item: "PT (Permissão de Trabalho) emitida e válida",
        critical: true,
        reference: "NR-35 item 4.1",
      },
      {
        item: "Montador possui capacitação NR-18 e NR-35",
        critical: true,
        reference: "NR-18.3 / NR-35.4",
      },
      {
        item: "Memorial de cálculo disponível (quando aplicável)",
        critical: false,
        reference: "ABNT NBR 6494:2019",
      },
      {
        item: "Placa de identificação com carga máxima fixada",
        critical: true,
        reference: "NR-18.15.25",
      },
    ],
  },
  {
    category: "Estrutura",
    items: [
      {
        item: "Base/sapatas apoiadas em superfície firme e nivelada",
        critical: true,
        reference: "ABNT NBR 6494:2019",
      },
      {
        item: "Contraventamentos instalados corretamente",
        critical: true,
        reference: "ABNT NBR 6494:2019",
      },
      {
        item: "Travamento e amarração à estrutura adequados",
        critical: true,
        reference: "NR-18.15.12",
      },
      {
        item: "Plataformas de trabalho completas e travadas",
        critical: true,
        reference: "NR-18.15.18",
      },
      {
        item: "Sem deformações, trincas ou corrosão visível nos tubos",
        critical: true,
        reference: "ABNT NBR 6494:2019",
      },
      {
        item: "Braçadeiras/acopladores em bom estado e torqueados",
        critical: false,
        reference: "ABNT NBR 6494:2019",
      },
      {
        item: "Montantes alinhados e prumo verificado",
        critical: false,
        reference: "ABNT NBR 6494:2019",
      },
      {
        item: "Rodapé instalado em todas as plataformas (mín. 20cm)",
        critical: true,
        reference: "NR-18.15.22",
      },
      {
        item: "Tela de proteção instalada (quando necessário)",
        critical: false,
        reference: "NR-18.15.23",
      },
    ],
  },
  {
    category: "Acesso e Proteção",
    items: [
      {
        item: "Escada de acesso interna com degraus antiderrapantes",
        critical: true,
        reference: "NR-18.15.16",
      },
      {
        item: "Alçapão de acesso com fechamento automático",
        critical: false,
        reference: "NR-18.15.17",
      },
      {
        item: "Guarda-corpo superior instalado (1,20m de altura)",
        critical: true,
        reference: "NR-18.15.22",
      },
      {
        item: "Guarda-corpo intermediário instalado (0,70m)",
        critical: true,
        reference: "NR-18.15.22",
      },
      {
        item: "Sistema de linha de vida instalado (quando aplicável)",
        critical: true,
        reference: "NR-35 item 5.2",
      },
      {
        item: "Sinalização e isolamento da área executados",
        critical: false,
        reference: "NR-18.15.6",
      },
      {
        item: "Rede de segurança ou bandeja coletora (quando necessário)",
        critical: false,
        reference: "NR-18.15.24",
      },
    ],
  },
  {
    category: "Instalações Elétricas",
    items: [
      {
        item: "Distância segura de redes elétricas energizadas",
        critical: true,
        reference: "NR-10 item 10.2",
      },
      {
        item: "Aterramento do andaime (quando metálico próximo a rede)",
        critical: true,
        reference: "NR-10 item 10.2",
      },
      {
        item: "Iluminação adequada no local de trabalho",
        critical: false,
        reference: "NR-17.5.3",
      },
      {
        item: "Instalação elétrica provisória em conformidade",
        critical: false,
        reference: "NR-10 item 10.2",
      },
    ],
  },
  {
    category: "EPIs e Segurança",
    items: [
      {
        item: "Capacete com jugular disponível",
        critical: true,
        reference: "NR-6 / NR-18",
      },
      {
        item: "Cinto de segurança tipo paraquedista com talabarte duplo",
        critical: true,
        reference: "NR-35 item 5.3",
      },
      {
        item: "Calçado de segurança adequado",
        critical: false,
        reference: "NR-6 item 6.3",
      },
      {
        item: "Luvas de proteção disponíveis",
        critical: false,
        reference: "NR-6 item 6.3",
      },
      {
        item: "Óculos de proteção disponíveis",
        critical: false,
        reference: "NR-6 item 6.3",
      },
      {
        item: "Trabalhadores com ASO válido para trabalho em altura",
        critical: true,
        reference: "NR-35 item 4.1",
      },
      {
        item: "Treinamento NR-35 vigente (validade 2 anos)",
        critical: true,
        reference: "NR-35 item 4.2",
      },
    ],
  },
];

export default checklistTemplate;
