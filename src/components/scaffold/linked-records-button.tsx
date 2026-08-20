"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import {
  NonConformityBadge,
  getNonConformityClassificationLabel,
} from "@/components/shared/non-conformity-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useExclusiveMenu } from "@/hooks/use-exclusive-menu";
import { surface, typography } from "@/lib/design-system";

type LinkedInspection = {
  id: string;
  date: Date | string;
  inspector_name: string;
  result: string;
  validity_days: number;
};

type LinkedNonConformity = {
  id: string;
  code: string;
  createdAt?: Date | string;
  status: string;
  classification: string;
  dueDate: Date | string | null;
  responsibleUser: { name: string } | null;
};

type LinkedRecordsButtonProps = {
  type: "inspections" | "nonConformities";
  records: LinkedInspection[] | LinkedNonConformity[];
  scaffoldId: string;
  scaffoldCode: string;
};

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className={`ml-1 rounded bg-muted px-1.5 py-0.5 ${typography.bodyStrong} text-muted-foreground`}>
      {count}
    </span>
  );
}

function recordTime(record: LinkedInspection | LinkedNonConformity) {
  const value =
    "date" in record ? record.date : (record.createdAt ?? record.dueDate);
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function LinkedRecordsButton({
  type,
  records,
  scaffoldId,
  scaffoldCode,
}: LinkedRecordsButtonProps) {
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toggleMenu } = useExclusiveMenu(open, setOpen);
  const count = records.length;
  const isInspections = type === "inspections";
  const title = isInspections ? "Inspeções" : "Não Conformidades";
  const Icon = isInspections ? ClipboardCheck : ShieldAlert;
  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => recordTime(right) - recordTime(left)),
    [records],
  );
  const visibleRecords = sortedRecords.slice(0, visibleCount);
  const hasMore = visibleCount < records.length;
  const allHref = isInspections
    ? `/inspecoes?scaffold_id=${encodeURIComponent(scaffoldId)}&scaffold_code=${encodeURIComponent(scaffoldCode)}`
    : `/nao-conformidades?scaffold_id=${encodeURIComponent(scaffoldId)}&scaffold_code=${encodeURIComponent(scaffoldCode)}`;

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
    <div ref={containerRef} className="relative inline-flex">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          if (!open) setVisibleCount(5);
          toggleMenu();
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${title}: ${count} registro(s)`}
        title={`${title}: ${count} registro(s)`}
      >
        <Icon className="size-3.5" />
        <span className="hidden sm:inline">{title}</span>
        <span className="hidden sm:inline">
          <CountBadge count={count} />
        </span>
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={title}
          className={`absolute right-0 top-9 z-50 w-[min(88vw,460px)] overflow-hidden max-[520px]:fixed max-[520px]:inset-x-3 max-[520px]:top-[150px] max-[520px]:w-auto ${surface.popover}`}
        >
          <div className="flex max-h-[68vh] flex-col overflow-hidden">
            <div className={`flex shrink-0 items-center justify-between gap-2 ${surface.popoverHeader}`}>
              <div className="min-w-0">
                <p className={`${typography.panelTitle} text-foreground`}>
                  {title}
                </p>
                <p className={`mt-0.5 ${typography.bodyMuted} text-muted-foreground`}>
                  {count} registro(s)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label={`Fechar ${title.toLowerCase()}`}
                className="size-7"
              >
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {count === 0 ? (
                <EmptyState
                  icon={isInspections ? ClipboardCheck : AlertTriangle}
                  title={
                    isInspections
                      ? "Nenhuma inspeção vinculada a este andaime."
                      : "Nenhuma não conformidade vinculada a este andaime."
                  }
                  description=""
                  className="border-0 py-6"
                />
              ) : (
                <div className={surface.listDivider}>
                  {isInspections
                    ? (visibleRecords as LinkedInspection[]).map((inspection) => (
                        <InspectionRow key={inspection.id} inspection={inspection} />
                      ))
                    : (visibleRecords as LinkedNonConformity[]).map((nc) => (
                        <NonConformityRow key={nc.id} nonConformity={nc} />
                      ))}
                </div>
              )}
            </div>

            {count > 0 && (
              <div className={`flex shrink-0 items-center gap-2 ${surface.popoverFooter}`}>
                {hasMore ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setVisibleCount((current) => current + 5)}
                  >
                    Carregar mais
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={allHref}>
                    <ExternalLink className="size-3.5" />
                    Ver todas
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InspectionRow({ inspection }: { inspection: LinkedInspection }) {
  const date = new Date(inspection.date);

  return (
    <Link
      href={`/inspecoes/${inspection.id}`}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-2.5 py-2 ${surface.rowInteractive}`}
    >
      <div className="min-w-0">
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${typography.bodyMuted} text-muted-foreground`}>
          <span className="inline-flex min-w-0 items-center gap-1">
            <User className="size-3" />
            <span className="truncate">{inspection.inspector_name}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" />
            {format(date, "dd/MM/yyyy")}
          </span>
          {inspection.validity_days > 0 && (
            <span>{inspection.validity_days} dias</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={inspection.result} />
        <ChevronRight className="size-3.5 text-muted-foreground/50" />
      </div>
    </Link>
  );
}

function NonConformityRow({
  nonConformity,
}: {
  nonConformity: LinkedNonConformity;
}) {
  const classification = getNonConformityClassificationLabel(
    nonConformity.classification,
  );

  return (
    <Link
      href={`/nao-conformidades/${nonConformity.id}`}
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-2.5 py-2 ${surface.rowInteractive}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className={`truncate ${typography.code} text-foreground`}>
          {nonConformity.code}
        </p>
        <span className={`px-1.5 py-0.5 ${typography.sectionLabel} text-muted-foreground ${surface.outlinedChip}`}>
          {classification}
        </span>
        <NonConformityBadge value={nonConformity.status} size="xs" />
        {nonConformity.dueDate && (
          <span className={`${typography.bodyMuted} text-muted-foreground`}>
            Prazo: {format(new Date(nonConformity.dueDate), "dd/MM/yyyy")}
          </span>
        )}
      </div>
      <ChevronRight className="mt-1 size-3.5 text-muted-foreground/50" />
    </Link>
  );
}
