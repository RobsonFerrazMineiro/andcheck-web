import { CheckCircle2, XCircle } from "lucide-react";

import { typography } from "@/lib/design-system";

type ActiveStatusBadgeProps = {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  compact?: boolean;
};

export function ActiveStatusBadge({
  active,
  activeLabel = "Ativo",
  inactiveLabel = "Inativo",
  compact = false,
}: ActiveStatusBadgeProps) {
  const Icon = active ? CheckCircle2 : XCircle;

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-md border ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      } ${compact ? `${typography.badge} px-1.5 py-0.5` : `${typography.badgeLg} px-2.5 py-1`}`}
    >
      <Icon className={compact ? "size-2.5" : "size-3"} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
