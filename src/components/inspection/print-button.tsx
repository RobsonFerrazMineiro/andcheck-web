"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => window.print()}
      className={className}
    >
      <Printer className="w-4 h-4" />
      Imprimir
    </Button>
  );
}
