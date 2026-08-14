export const SCAFFOLD_TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

export function getScaffoldTypeLabel(type: string) {
  return SCAFFOLD_TYPE_LABELS[type] ?? type;
}
