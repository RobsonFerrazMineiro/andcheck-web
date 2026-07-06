"use client";

import { CloudOff } from "lucide-react";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_FORMATTER.format(date);
}

export function OfflineDataNotice({
  active,
  label,
  lastCachedAt,
}: {
  active: boolean;
  label: string;
  lastCachedAt?: string;
}) {
  if (!active) return null;

  const cachedAtLabel = formatDate(lastCachedAt);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
      <CloudOff className="size-3.5 shrink-0" />
      <span>
        Exibindo {label} do cache local
        {cachedAtLabel ? ` - atualizado em ${cachedAtLabel}` : ""}.
      </span>
    </div>
  );
}
