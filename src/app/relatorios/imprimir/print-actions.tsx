"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { typography } from "@/lib/design-system";

export function PrintActions({ backHref }: { backHref: string }) {
  return (
    <div className="print-toolbar sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3">
        <Button asChild variant="outline" size="lg" className={typography.action}>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() => window.print()}
          className={typography.action}
        >
          <Printer className="size-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>
    </div>
  );
}
