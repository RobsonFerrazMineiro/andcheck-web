import { humanizeCode } from "@/lib/human-readable";
import { scaffoldStatusTone, SEMANTIC_TONE_HEX } from "@/lib/semantic-tones";

export const SCAFFOLD_STATUS_FILTER_OPTIONS = [
  "liberado",
  "pendente",
  "reprovado",
  "vencido",
  "em_montagem",
].map((value) => ({ value, label: humanizeCode(value) }));

export function getScaffoldStatusLabel(status: string) {
  return humanizeCode(status);
}

export function getScaffoldStatusColor(status: string) {
  return SEMANTIC_TONE_HEX[scaffoldStatusTone(status)];
}
