"use client";

import { format } from "date-fns";
import type { ReactNode } from "react";
import { useRef } from "react";

import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { typography } from "@/lib/design-system";
import type { AuditRow } from "./auditoria-client";

export type AuditDetailDialogProps = {
  row: AuditRow;
  title: string;
  companyLabel: string;
  actionLabel: string;
  entityLabel: string;
  entityBadge: ReactNode;
  actionBadge: ReactNode;
  onClose: () => void;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatJson(value: unknown) {
  if (value === null || value === undefined) return "-";
  return JSON.stringify(value, null, 2);
}

function normalizeToken(value: string) {
  return value.replaceAll("_", " ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ativo" : "Inativo";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : format(date, "dd/MM/yyyy HH:mm");
    }
    return normalizeToken(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (
      value.every((item) =>
        ["string", "number", "boolean"].includes(typeof item),
      )
    ) {
      return value.map(formatValue).join(", ");
    }
    return `${value.length} registro(s)`;
  }
  if (isPlainObject(value)) {
    const compact = Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== "")
      .slice(0, 3)
      .map(([key, item]) => `${key.replaceAll("_", " ")}: ${formatValue(item)}`);
    return compact.length ? compact.join(" | ") : "-";
  }
  return String(value);
}

function comparisonRows(row: AuditRow) {
  const oldObject = isPlainObject(row.oldValue) ? row.oldValue : {};
  const newObject = isPlainObject(row.newValue) ? row.newValue : {};
  const keys = Array.from(
    new Set([...Object.keys(oldObject), ...Object.keys(newObject)]),
  ).filter((key) => key !== "id");

  if (keys.length === 0) {
    return [
      {
        field: "Dados",
        before: formatValue(row.oldValue),
        after: formatValue(row.newValue),
      },
    ];
  }

  return keys.map((key) => ({
    field: key.replaceAll("_", " "),
    before: formatValue(oldObject[key]),
    after: formatValue(newObject[key]),
  }));
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-[12px] font-semibold text-foreground mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </p>
      <pre className="bg-muted/40 rounded-lg border border-border p-3 text-[11px] font-mono whitespace-pre-wrap break-words max-h-72 overflow-auto">
        {formatJson(value)}
      </pre>
    </div>
  );
}

export function AuditDetailDialog({
  row,
  title,
  companyLabel,
  actionLabel,
  entityLabel,
  entityBadge,
  actionBadge,
  onClose,
}: AuditDetailDialogProps) {
  const detailDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(detailDialogRef, true, onClose);

  return (
    <div
      ref={detailDialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-border bg-card shadow-xl">
        <div className="flex flex-col gap-3 border-b border-sidebar-border bg-sidebar px-4 py-4 text-sidebar-foreground sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className={`${typography.pageEyebrow} text-primary-foreground/50`}>
              Evento de Auditoria
            </p>
            <h2
              id="audit-detail-title"
              className="mt-1 break-words text-[15px] font-bold text-primary-foreground"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`h-7 w-fit rounded-md border border-primary-foreground/20 px-3 text-primary-foreground/70 ${typography.action}`}
          >
            Fechar
          </button>
        </div>

        <div className="border-b border-border p-4 sm:p-5">
          <p className={`mb-3 text-muted-foreground ${typography.action}`}>
            Resumo
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {entityBadge}
            {actionBadge}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Detail label="Evento" value={title} />
            <Detail label="Usuário" value={row.userName ?? "Sistema"} />
            <Detail label="Perfil" value={row.userRole ?? "-"} />
            <Detail
              label="Sessão"
              value={row.sessionId ? row.sessionId.slice(0, 12) : "-"}
            />
            <Detail
              label="Data/Hora"
              value={format(new Date(row.createdAt), "dd/MM/yyyy HH:mm:ss")}
            />
            <Detail label="Empresa/Planta" value={companyLabel} />
            <Detail label="IP" value={row.ipAddress ?? "-"} />
            <Detail
              label="Dispositivo/Navegador"
              value={
                [row.deviceType, row.osName, row.browserName]
                  .filter(Boolean)
                  .join(" / ") || "-"
              }
            />
            <Detail label="User Agent" value={row.userAgent ?? "-"} />
            <Detail label="Ação" value={actionLabel} />
            <Detail label="Entidade" value={entityLabel} />
          </div>
        </div>

        <div className="border-b border-border p-4 sm:p-5">
          <p className={`mb-3 text-muted-foreground ${typography.action}`}>
            Alterações
          </p>
          <div className="divide-y divide-border border border-border md:hidden">
            {comparisonRows(row).map((item) => (
              <div key={item.field} className="grid gap-3 p-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    Campo
                  </p>
                  <p className="mt-1 break-words text-[12px] font-semibold text-foreground">
                    {item.field}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Antes
                    </p>
                    <p className="mt-1 break-words text-[11px] text-muted-foreground">
                      {item.before}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Depois
                    </p>
                    <p className="mt-1 break-words text-[11px] text-foreground">
                      {item.after}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto border border-border md:block">
            <div className="min-w-[680px] grid grid-cols-[190px_1fr_1fr] bg-muted/50 border-b border-border">
              {["Campo", "Antes", "Depois"].map((header) => (
                <p
                  key={header}
                  className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {header}
                </p>
              ))}
            </div>
            <div className="min-w-[680px] divide-y divide-border">
              {comparisonRows(row).map((item) => (
                <div key={item.field} className="grid grid-cols-[190px_1fr_1fr]">
                  <p className="px-3 py-2 text-[11px] font-semibold text-foreground">
                    {item.field}
                  </p>
                  <p className="px-3 py-2 text-[11px] text-muted-foreground break-words">
                    {item.before}
                  </p>
                  <p className="px-3 py-2 text-[11px] text-foreground break-words">
                    {item.after}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <details className="p-4 sm:p-5">
          <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ver dados técnicos
          </summary>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <JsonBlock title="Valor anterior" value={row.oldValue} />
            <JsonBlock title="Valor novo" value={row.newValue} />
          </div>
        </details>
      </div>
    </div>
  );
}
