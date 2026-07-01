import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className={`text-foreground ${typography.emptyState}`}>{title}</p>
      <p
        className={`mx-auto mt-1 max-w-md text-muted-foreground/70 ${typography.bodyMuted}`}
      >
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
