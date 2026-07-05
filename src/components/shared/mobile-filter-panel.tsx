"use client";

import { Filter, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function MobileFilterPanel({
  title = "Filtros",
  description,
  buttonLabel = "Filtros",
  summary = "Sem filtros aplicados",
  children,
  desktopClassName,
  mobileClassName,
  modalClassName,
}: {
  title?: string;
  description?: string;
  buttonLabel?: string;
  summary?: ReactNode;
  children: ReactNode;
  desktopClassName?: string;
  mobileClassName?: string;
  modalClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, open, () => setOpen(false));

  return (
    <>
      <div className={cn("md:hidden", mobileClassName)}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-8 shrink-0"
            onClick={() => setOpen(true)}
            aria-label={buttonLabel}
            title={buttonLabel}
          >
            <Filter className="size-3.5" />
          </Button>
          <p className="min-w-0 flex-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {summary}
          </p>
        </div>
      </div>

      <div className={cn("hidden md:block", desktopClassName)}>{children}</div>

      {open ? (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filter-title"
          aria-describedby={
            description ? "mobile-filter-description" : undefined
          }
          className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center"
        >
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
              <div className="min-w-0">
                <h2 id="mobile-filter-title" className={typography.panelTitle}>
                  {title}
                </h2>
                {description ? (
                  <p
                    id="mobile-filter-description"
                    className={`mt-1 text-primary-foreground/60 ${typography.sectionDescription}`}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                className="shrink-0 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
                aria-label="Fechar filtros"
              >
                <X />
              </Button>
            </div>
            <div className={cn("overflow-y-auto p-4", modalClassName)}>
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
