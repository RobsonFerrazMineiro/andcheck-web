"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function FormModal({
  open,
  title,
  description,
  children,
  onClose,
  maxWidth = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, open, onClose);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
      aria-describedby={description ? "form-modal-description" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl",
          maxWidth,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-sidebar-border bg-sidebar px-5 py-4 text-sidebar-foreground">
          <div className="min-w-0">
            <h2 id="form-modal-title" className={typography.panelTitle}>
              {title}
            </h2>
            {description ? (
              <p
                id="form-modal-description"
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
            onClick={onClose}
            className="shrink-0 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
            aria-label="Fechar modal"
          >
            <X />
          </Button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
