"use client";

import { Button } from "@/components/ui/button";
import { useOfflineStatus } from "@/components/offline/offline-provider";
import { canNavigateAfterOfflineWrite } from "@/lib/offline/connectivity";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";

const STATUS_COPY = {
  online: {
    label: "Online",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  offline: {
    label: "Offline",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    icon: CloudOff,
  },
  syncing: {
    label: "Sincronizando",
    tone: "border-blue-200 bg-blue-50 text-blue-900",
    icon: RefreshCw,
  },
  "sync-error": {
    label: "Erro de sincronizacao",
    tone: "border-red-200 bg-red-50 text-red-900",
    icon: AlertTriangle,
  },
};

export function ConnectivityIndicator() {
  const { status, summary, syncNow } = useOfflineStatus();
  const copy = STATUS_COPY[status];
  const Icon = copy.icon;
  const pendingCount = summary.pending + summary.failed + summary.conflict;

  return (
    <div className={`border-b px-4 py-2 text-xs ${copy.tone}`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <Link
          href="/sincronizacao"
          onClick={(event) => {
            if (!canNavigateAfterOfflineWrite()) {
              event.preventDefault();
            }
          }}
          className="flex min-w-0 items-center gap-2 font-semibold"
        >
          <Icon
            className={`size-3.5 shrink-0 ${
              status === "syncing" ? "animate-spin" : ""
            }`}
          />
          <span className="truncate">
            {copy.label}
            {pendingCount > 0
              ? ` - ${pendingCount} item(ns) pendente(s) de sincronizacao`
              : " - sem pendencias"}
          </span>
        </Link>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => void syncNow()}
          disabled={status === "offline" || status === "syncing"}
          className="h-6 bg-background/80 text-[10px]"
        >
          <RefreshCw className="size-3" />
          Sincronizar
        </Button>
      </div>
    </div>
  );
}
