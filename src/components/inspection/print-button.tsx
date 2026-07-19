"use client";

import { cn } from "@/lib/utils";
import { Printer } from "lucide-react";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className={cn(
        "inline-flex items-center gap-2",
        className,
      )}
    >
      <Printer className="w-4 h-4" />
      Imprimir
    </button>
  );
}
