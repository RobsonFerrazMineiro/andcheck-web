import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { surface, typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Não foi possível carregar as informações",
  description = "Tente novamente. Se o problema continuar, acione o suporte com o horário da tentativa.",
  actionLabel = "Tentar novamente",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        `rounded-lg px-6 py-10 text-center shadow-sm ${surface.dangerAlert}`,
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-md border border-destructive/30 bg-background text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <p className={typography.emptyState}>{title}</p>
      <p className={`mx-auto mt-1 max-w-md text-destructive/75 ${typography.bodyMuted}`}>
        {description}
      </p>
      {onRetry ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" onClick={onRetry} variant="outline" size="sm">
            <RotateCcw className="size-3.5" />
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
