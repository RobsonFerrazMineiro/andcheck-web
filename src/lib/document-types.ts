import type { DocumentCategory, DocumentType } from "@prisma/client";

import { humanizeCode } from "@/lib/human-readable";

export const DOCUMENT_TYPE_OPTIONS: Array<{
  value: DocumentType;
  label: string;
  shortLabel: string;
  priority: boolean;
}> = [
  {
    value: "ART",
    label: "ART — Anotação de Responsabilidade Técnica",
    shortLabel: "ART",
    priority: true,
  },
  {
    value: "RRT",
    label: "RRT — Registro de Responsabilidade Técnica",
    shortLabel: "RRT",
    priority: true,
  },
  {
    value: "MEMORIAL_CALCULO",
    label: "Memorial de Cálculo",
    shortLabel: "Memorial de Cálculo",
    priority: true,
  },
  {
    value: "CROQUI",
    label: "Croqui",
    shortLabel: "Croqui",
    priority: true,
  },
  {
    value: "PROJETO",
    label: "Projeto Estrutural",
    shortLabel: "Projeto Estrutural",
    priority: false,
  },
  {
    value: "PROCEDIMENTO",
    label: "Procedimento de Montagem",
    shortLabel: "Procedimento de Montagem",
    priority: false,
  },
  {
    value: "CERTIFICADO",
    label: "Certificado",
    shortLabel: "Certificado",
    priority: false,
  },
  {
    value: "OUTRO",
    label: "Outro",
    shortLabel: "Outro",
    priority: false,
  },
];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  ART: "ART",
  RRT: "RRT",
  PROJETO_ESTRUTURAL: "Projeto Estrutural",
  MEMORIAL_CALCULO: "Memorial de Cálculo",
  CROQUI: "Croqui",
  PLANO_MONTAGEM: "Plano de Montagem",
  CERTIFICADO_TECNICO: "Certificado Técnico",
  OUTRO: "Outros",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    DOCUMENT_TYPE_OPTIONS.map((option) => [option.value, option.shortLabel]),
  ),
  PROJETO_ESTRUTURAL: DOCUMENT_CATEGORY_LABELS.PROJETO_ESTRUTURAL,
  PLANO_MONTAGEM: DOCUMENT_CATEGORY_LABELS.PLANO_MONTAGEM,
  CERTIFICADO_TECNICO: DOCUMENT_CATEGORY_LABELS.CERTIFICADO_TECNICO,
};

export function getDocumentTypeLabel(type: string) {
  return DOCUMENT_TYPE_LABELS[type] ?? humanizeCode(type);
}
