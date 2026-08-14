import { humanizeCode } from "@/lib/human-readable";

export const INSPECTION_RESULT_OPTIONS = [
  { value: "aprovado", label: "Aprovado" },
  { value: "aprovado_com_ressalvas", label: "Aprovado com ressalvas" },
  { value: "reprovado", label: "Reprovado" },
];

const INSPECTION_RESULT_LABELS = Object.fromEntries(
  INSPECTION_RESULT_OPTIONS.map((option) => [option.value, option.label]),
);

export function getInspectionResultLabel(result: string) {
  return INSPECTION_RESULT_LABELS[result] ?? humanizeCode(result);
}
