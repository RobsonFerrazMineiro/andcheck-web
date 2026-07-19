import { Filter } from "lucide-react";
import type { ReactNode } from "react";

import { typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function FilterShell({
  title = "Filtros",
  meta,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}
    >
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <Filter className="size-4 shrink-0 text-muted-foreground" />
        <p className={`${typography.sectionLabel} text-muted-foreground`}>
          {title}
        </p>
        {meta ? (
          <span
            className={`${typography.panelSubtitle} min-w-0 truncate text-muted-foreground/50`}
          >
            {meta}
          </span>
        ) : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <span className={`${typography.sectionLabel} text-muted-foreground`}>
        {label}
      </span>
      {children}
    </div>
  );
}
