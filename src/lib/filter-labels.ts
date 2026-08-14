import { humanizeCode } from "@/lib/human-readable";

export const EXPIRATION_FILTER_LABELS: Record<string, string> = {
  overdue: "Vencidas",
  expiring_soon: "Prestes a vencer",
  expiring_today: "Vencendo hoje",
};

export function getExpirationFilterLabel(value: string) {
  return EXPIRATION_FILTER_LABELS[value] ?? humanizeCode(value);
}
