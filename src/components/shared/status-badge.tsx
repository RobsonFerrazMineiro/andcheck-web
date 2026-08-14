import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Clock,
  HardHat,
  RefreshCw,
  ShieldOff,
  Wrench,
  XCircle,
} from "lucide-react";

import { typography } from "@/lib/design-system";
import {
  inspectionResultTone,
  scaffoldStatusTone,
  SEMANTIC_TONE_CLASSES,
  type SemanticTone,
} from "@/lib/semantic-tones";
import { humanizeCode } from "@/lib/human-readable";

type StatusKey =
  | "em_montagem"
  | "pendente_liberacao"
  | "liberado"
  | "reprovado"
  | "interditado"
  | "vencido"
  | "desmontado"
  | "pendente"
  | "aprovado"
  | "aprovado_com_ressalvas"
  | "nao_conforme"
  | "conforme"
  | "na"
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict";

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  tone?: SemanticTone;
  iconClassName?: string;
}

const STATUS_MAP: Record<StatusKey, StatusConfig> = {
  em_montagem: {
    label: "EM MONTAGEM",
    icon: Wrench,
  },
  pendente_liberacao: {
    label: "PEND. LIBERAÇÃO",
    icon: Clock,
  },
  liberado: {
    label: "LIBERADO",
    icon: CheckCircle2,
  },
  reprovado: {
    label: "REPROVADO",
    icon: XCircle,
  },
  interditado: {
    label: "INTERDITADO",
    icon: ShieldOff,
  },
  vencido: {
    label: "VENCIDO",
    icon: AlertTriangle,
  },
  desmontado: {
    label: "DESMONTADO",
    icon: HardHat,
  },
  pendente: {
    label: "PENDENTE",
    icon: Clock,
  },
  aprovado: {
    label: "APROVADO",
    icon: CheckCircle2,
  },
  aprovado_com_ressalvas: {
    label: "C/ RESSALVAS",
    icon: AlertTriangle,
  },
  nao_conforme: {
    label: "NÃO CONFORME",
    icon: XCircle,
  },
  conforme: {
    label: "CONFORME",
    icon: CheckCircle2,
  },
  na: {
    label: "N/A",
    icon: Clock,
  },
  pending: {
    label: "PENDENTE",
    icon: Clock,
    tone: "disabled",
  },
  syncing: {
    label: "ENVIANDO",
    icon: RefreshCw,
    tone: "neutral",
    iconClassName: "animate-spin",
  },
  synced: {
    label: "SINCRONIZADO",
    icon: CheckCircle2,
    tone: "success",
  },
  failed: {
    label: "FALHA",
    icon: AlertTriangle,
    tone: "critical",
  },
  conflict: {
    label: "CONFLITO",
    icon: CloudOff,
    tone: "disabled",
  },
};

interface StatusBadgeProps {
  status: string;
  size?: "default" | "lg" | "xl";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const cfg: StatusConfig = STATUS_MAP[status as StatusKey] ?? {
    label: humanizeCode(status).toLocaleUpperCase("pt-BR") || "-",
    icon: Clock,
  };
  const visualClass = statusClass(status);

  const Icon = cfg.icon;
  const isLg = size === "lg";
  const isXl = size === "xl";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${visualClass} ${
        isXl
          ? `${typography.badgeXl} px-4 py-2`
          : isLg
            ? `${typography.badgeLg} px-2.5 py-1`
            : `${typography.badge} px-1.5 py-0.5`
      }`}
    >
      <Icon
        className={`${isXl ? "w-4 h-4" : isLg ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} ${
          cfg.iconClassName ?? ""
        }`}
      />
      {cfg.label}
    </span>
  );
}

function statusClass(status: string) {
  if (status in STATUS_MAP) {
    const cfg = STATUS_MAP[status as StatusKey];
    if (cfg.tone) return SEMANTIC_TONE_CLASSES[cfg.tone].badge;

    const tone =
      status === "aprovado" ||
      status === "aprovado_com_ressalvas" ||
      status === "nao_conforme" ||
      status === "conforme" ||
      status === "na"
        ? inspectionResultTone(status)
        : scaffoldStatusTone(status);
    return SEMANTIC_TONE_CLASSES[tone].badge;
  }

  return SEMANTIC_TONE_CLASSES.disabled.badge;
}
