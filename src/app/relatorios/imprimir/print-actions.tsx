"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

export function PrintActions({ backHref }: { backHref: string }) {
  return (
    <div className="print-toolbar sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[11px] font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-orange-600 px-4 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-orange-700"
        >
          <Printer className="size-4" />
          Imprimir / Salvar PDF
        </button>
      </div>
    </div>
  );
}
