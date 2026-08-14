import { SEMANTIC_TONE_CLASSES, nonConformityStatusTone } from "@/lib/semantic-tones";
import { typography } from "@/lib/design-system";
import { humanizeCode } from "@/lib/human-readable";
import { cn } from "@/lib/utils";

export const NON_CONFORMITY_CLASSIFICATION_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const NON_CONFORMITY_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberta",
  ASSIGNED: "Em Correção",
  IN_PROGRESS: "Em Tratamento",
  PENDING_VERIFICATION: "Aguardando Verificação",
  CLOSED: "Encerrada",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

const CLASSIFICATION_TONE_CLASSES: Record<string, string> = {
  LOW: SEMANTIC_TONE_CLASSES.neutral.badge,
  MEDIUM: SEMANTIC_TONE_CLASSES.warning.badge,
  HIGH: SEMANTIC_TONE_CLASSES.warning.badge,
  CRITICAL: SEMANTIC_TONE_CLASSES.critical.badge,
};

type NonConformityBadgeProps = {
  value: string;
  kind?: "status" | "classification";
  size?: "xs" | "sm";
  className?: string;
};

export function NonConformityBadge({
  value,
  kind = "status",
  size = "sm",
  className,
}: NonConformityBadgeProps) {
  const labels =
    kind === "classification"
      ? NON_CONFORMITY_CLASSIFICATION_LABELS
      : NON_CONFORMITY_STATUS_LABELS;
  const toneClass =
    kind === "classification"
      ? CLASSIFICATION_TONE_CLASSES[value]
      : SEMANTIC_TONE_CLASSES[nonConformityStatusTone(value)].badge;

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-md border",
        size === "xs" ? `${typography.badge} px-1.5 py-0.5` : `${typography.badgeLg} px-2 py-0.5`,
        toneClass ?? SEMANTIC_TONE_CLASSES.disabled.badge,
        className,
      )}
    >
      {labels[value] ?? humanizeCode(value)}
    </span>
  );
}

export function getNonConformityClassificationLabel(value: string) {
  return NON_CONFORMITY_CLASSIFICATION_LABELS[value] ?? humanizeCode(value);
}
