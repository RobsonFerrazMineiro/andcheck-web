"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-primary-foreground/80" />
            <p id="confirm-dialog-title" className={typography.panelTitle}>
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex size-7 items-center justify-center rounded-md text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground disabled:opacity-50"
            aria-label="Fechar confirmação"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <p
            id="confirm-dialog-description"
            className={`${typography.bodyStrong} text-foreground`}
          >
            {description}
          </p>
          {details ? (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-muted-foreground">
              {details}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              destructive &&
                "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700/30",
            )}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
