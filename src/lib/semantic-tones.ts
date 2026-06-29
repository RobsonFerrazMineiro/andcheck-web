export type SemanticTone =
  | "success"
  | "critical"
  | "warning"
  | "neutral"
  | "disabled";

export const SEMANTIC_TONE_LABEL: Record<SemanticTone, string> = {
  success: "Situação positiva / concluída",
  critical: "Risco alto / ação imediata",
  warning: "Atenção / acompanhamento",
  neutral: "Informação / indicador neutro",
  disabled: "Sem dados / indisponível",
};

export const SEMANTIC_TONE_HEX: Record<SemanticTone, string> = {
  success: "#16a34a",
  critical: "#dc2626",
  warning: "#f97316",
  neutral: "#2563eb",
  disabled: "#64748b",
};

export const SEMANTIC_TONE_CLASSES: Record<
  SemanticTone,
  {
    badge: string;
    border: string;
    dot: string;
    icon: string;
    subtleBg: string;
    text: string;
  }
> = {
  success: {
    badge: "border-emerald-400/60 bg-emerald-50 text-emerald-800",
    border: "ring-emerald-600/35",
    dot: "bg-emerald-500",
    icon: "text-emerald-600",
    subtleBg: "bg-emerald-500/5",
    text: "text-emerald-700",
  },
  critical: {
    badge: "border-red-500/60 bg-red-50 text-red-800",
    border: "ring-red-500/35",
    dot: "bg-red-600",
    icon: "text-red-600",
    subtleBg: "bg-red-500/5",
    text: "text-red-700",
  },
  warning: {
    badge: "border-orange-400/60 bg-orange-50 text-orange-800",
    border: "ring-orange-500/35",
    dot: "bg-orange-500",
    icon: "text-orange-600",
    subtleBg: "bg-orange-500/5",
    text: "text-orange-700",
  },
  neutral: {
    badge: "border-blue-400/60 bg-blue-50 text-blue-800",
    border: "ring-blue-500/35",
    dot: "bg-blue-500",
    icon: "text-blue-600",
    subtleBg: "bg-blue-500/5",
    text: "text-blue-700",
  },
  disabled: {
    badge: "border-slate-300/70 bg-slate-100 text-slate-600",
    border: "ring-slate-400/35",
    dot: "bg-slate-500",
    icon: "text-slate-500",
    subtleBg: "bg-slate-500/5",
    text: "text-slate-600",
  },
};

export function notificationSeverityTone(severity: string): SemanticTone {
  if (severity === "SUCCESS") return "success";
  if (severity === "CRITICAL") return "critical";
  if (severity === "WARNING") return "warning";
  return "neutral";
}

export function scaffoldStatusTone(status: string): SemanticTone {
  if (status === "liberado") return "success";
  if (
    status === "interditado" ||
    status === "reprovado" ||
    status === "vencido"
  ) {
    return "critical";
  }
  if (status === "pendente_liberacao" || status === "pendente") {
    return "warning";
  }
  if (status === "desmontado") return "disabled";
  return "neutral";
}

export function inspectionResultTone(result: string): SemanticTone {
  if (result === "aprovado" || result === "conforme") return "success";
  if (result === "reprovado" || result === "nao_conforme") return "critical";
  if (result === "aprovado_com_ressalvas") return "warning";
  return "disabled";
}

export function nonConformityStatusTone(status: string): SemanticTone {
  if (status === "CLOSED") return "success";
  if (status === "REJECTED") return "critical";
  if (
    status === "ASSIGNED" ||
    status === "IN_PROGRESS" ||
    status === "PENDING_VERIFICATION"
  ) {
    return "warning";
  }
  if (status === "CANCELLED") return "disabled";
  return "neutral";
}

export function documentStatusTone(status: string): SemanticTone {
  if (status === "ACTIVE" || status === "anexado") return "success";
  if (status === "EXPIRED" || status === "vencido") return "critical";
  if (status === "pendente") return "warning";
  return "disabled";
}
