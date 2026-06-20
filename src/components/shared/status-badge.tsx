import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardHat,
  ShieldOff,
  Wrench,
  XCircle,
} from "lucide-react";

import { typography } from "@/lib/design-system";

type StatusKey =
  | "em_montagem"
  | "pendente_liberacao"
  | "liberado"
  | "reprovado"
  | "interditado"
  | "vencido"
  | "desmontado"
  // legado (não deve mais surgir, mas mantido para compatibilidade)
  | "pendente"
  // resultados de inspeção
  | "aprovado"
  | "aprovado_com_ressalvas"
  | "nao_conforme"
  | "conforme"
  | "na";

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  cls: string;
}

const STATUS_MAP: Record<StatusKey, StatusConfig> = {
  // ── Ciclo de vida do andaime ──────────────────────────────────────────────
  em_montagem: {
    label: "EM MONTAGEM",
    icon: Wrench,
    cls: "bg-blue-50 text-blue-800 border-blue-400/60",
  },
  pendente_liberacao: {
    label: "PEND. LIBERAÇÃO",
    icon: Clock,
    cls: "bg-amber-50 text-amber-800 border-amber-400/60",
  },
  liberado: {
    label: "LIBERADO",
    icon: CheckCircle2,
    cls: "bg-green-50 text-green-800 border-green-400/60",
  },
  reprovado: {
    label: "REPROVADO",
    icon: XCircle,
    cls: "bg-red-50 text-red-800 border-red-400/60",
  },
  interditado: {
    label: "INTERDITADO",
    icon: ShieldOff,
    cls: "bg-red-100 text-red-900 border-red-600/60",
  },
  vencido: {
    label: "VENCIDO",
    icon: AlertTriangle,
    cls: "bg-orange-50 text-orange-800 border-orange-400/60",
  },
  desmontado: {
    label: "DESMONTADO",
    icon: HardHat,
    cls: "bg-slate-100 text-slate-600 border-slate-400/60",
  },
  // ── Legado ────────────────────────────────────────────────────────────────
  pendente: {
    label: "PENDENTE",
    icon: Clock,
    cls: "bg-amber-50 text-amber-800 border-amber-400/60",
  },
  // ── Resultados de inspeção ────────────────────────────────────────────────
  aprovado: {
    label: "APROVADO",
    icon: CheckCircle2,
    cls: "bg-green-50 text-green-800 border-green-400/60",
  },
  aprovado_com_ressalvas: {
    label: "C/ RESSALVAS",
    icon: AlertTriangle,
    cls: "bg-amber-50 text-amber-800 border-amber-400/60",
  },
  nao_conforme: {
    label: "NÃO CONFORME",
    icon: XCircle,
    cls: "bg-red-50 text-red-800 border-red-400/60",
  },
  conforme: {
    label: "CONFORME",
    icon: CheckCircle2,
    cls: "bg-green-50 text-green-800 border-green-400/60",
  },
  na: {
    label: "N/A",
    icon: Clock,
    cls: "bg-slate-50 text-slate-600 border-slate-300/60",
  },
};

interface StatusBadgeProps {
  status: string;
  size?: "default" | "lg" | "xl";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const cfg: StatusConfig = STATUS_MAP[status as StatusKey] ?? {
    label: status?.toUpperCase() ?? "—",
    icon: Clock,
    cls: "bg-slate-50 text-slate-600 border-slate-300/60",
  };

  const Icon = cfg.icon;
  const isLg = size === "lg";
  const isXl = size === "xl";

  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${cfg.cls} ${
        isXl
          ? `${typography.badgeXl} px-4 py-2`
          : isLg
            ? `${typography.badgeLg} px-2.5 py-1`
            : `${typography.badge} px-1.5 py-0.5`
      }`}
    >
      <Icon
        className={isXl ? "w-4 h-4" : isLg ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}
      />
      {cfg.label}
    </span>
  );
}
