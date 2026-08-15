"use client";

import { CloudOff } from "lucide-react";

import { SEMANTIC_TONE_CLASSES } from "@/lib/semantic-tones";

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
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${SEMANTIC_TONE_CLASSES.warning.badge}`}
    >
      <CloudOff className="size-3.5 shrink-0" />
      <span>
        Exibindo {label} do cache local
        {cachedAtLabel ? ` - atualizado em ${cachedAtLabel}` : ""}.
      </span>
    </div>
  );
}
