import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

import { surface, typography } from "@/lib/design-system";

type RankingDetailPageProps = {
  title: string;
  description: string;
  periodLabel: string;
  backHref: string;
  columns: string[];
  rows: ReactNode[][];
};

export function formatApprovalRate(value: number | null) {
  if (value === null) return "Sem base";
  return `${Math.round(value)}%`;
}

export function joinLimited(values: string[]) {
  if (values.length === 0) return "-";
  if (values.length === 1) return values[0];
  if (values.length === 2) return values.join(" / ");
  return `${values.slice(0, 2).join(" / ")} +${values.length - 2}`;
}

export function RankingDetailPage({
  title,
  description,
  periodLabel,
  backHref,
  columns,
  rows,
}: RankingDetailPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <BarChart3 className="size-4" />
            AndCheck • Relatórios Gerenciais
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>{title}</h1>
          <p
            className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}
          >
            {description}
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className={surface.panelHeader}>
          <p className={surface.panelHeaderTitle}>Ranking completo</p>
          <p className={surface.panelHeaderSubtitle}>{periodLabel}</p>
        </div>
        <div className="divide-y divide-border md:hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">
              Sem dados no periodo.
            </p>
          ) : (
            rows.map((row, index) => (
              <div key={index} className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      {columns[1] ?? "Item"}
                    </p>
                    <div className="mt-1 break-words text-[13px] font-semibold text-foreground">
                      {row[1] ?? "-"}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-md border border-border bg-muted/20 px-2 py-1 text-right">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                      {columns[0] ?? "Posição"}
                    </p>
                    <div className="font-mono text-[12px] font-bold text-foreground">
                      {row[0] ?? index + 1}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {row.slice(2).map((cell, cellIndex) => (
                    <div
                      key={`${index}-${cellIndex + 2}`}
                      className="min-w-0 rounded-md border border-border/70 bg-muted/15 p-2"
                    >
                      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                        {columns[cellIndex + 2]}
                      </p>
                      <div className="mt-1 break-words text-[11px] font-semibold text-foreground">
                        {cell}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-sidebar">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/65"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-6 text-center text-[11px] text-muted-foreground"
                  >
                    Sem dados no período.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={index} className="hover:bg-muted/30">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${index}-${cellIndex}`}
                        className="px-4 py-3 text-[11px] text-foreground"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
