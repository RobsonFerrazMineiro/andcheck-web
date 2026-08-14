export const SCAFFOLD_TYPE_LABELS: Record<string, string> = {
  tubular: "Tubular",
  fachadeiro: "Fachadeiro",
  multidirecional: "Multidirecional",
  suspenso: "Suspenso",
  torre: "Torre",
};

export const SCAFFOLD_TYPE_OPTIONS = Object.entries(SCAFFOLD_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function getScaffoldTypeLabel(type: string) {
  return SCAFFOLD_TYPE_LABELS[type] ?? type;
}
