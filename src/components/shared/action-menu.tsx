"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useExclusiveMenu } from "@/hooks/use-exclusive-menu";
import { surface, typography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type ActionMenuProps = {
  label?: string;
  align?: "left" | "right";
  children: React.ReactNode;
  className?: string;
};

export function ActionMenu({
  label = "Ações",
  align = "right",
  children,
  className,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toggleMenu } = useExclusiveMenu(open, setOpen);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={toggleMenu}
      >
        <MoreHorizontal className="size-3.5" />
        <span className="hidden sm:inline">{label}</span>
      </Button>

      {open && (
        <div
          role="menu"
          className={cn(
            `absolute top-9 z-50 grid min-w-56 gap-1 p-1 text-popover-foreground ${surface.popover}`,
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const actionMenuItemClassName =
  `flex min-h-8 w-full items-center justify-start gap-2 rounded-sm border-0 bg-transparent px-3 py-2 text-left ${typography.action} text-muted-foreground shadow-none transition-colors hover:translate-y-0 hover:bg-muted hover:text-foreground hover:shadow-none active:translate-y-0 disabled:pointer-events-none disabled:opacity-50`;
