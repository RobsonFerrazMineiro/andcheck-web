"use client";

import { Button } from "@/components/ui/button";
import { useOfflineStatus } from "@/components/offline/offline-provider";
import { surface, typography } from "@/lib/design-system";
import { canNavigateAfterOfflineWrite } from "@/lib/offline/connectivity";
import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STATUS_COPY = {
  offline: {
    label: "Modo offline",
    tone: surface.warningAlertMuted,
    icon: CloudOff,
  },
  syncing: {
    label: "Sincronizando",
    tone: surface.infoAlert,
    icon: RefreshCw,
  },
  "sync-error": {
    label: "Erro de sincronização",
    tone: surface.dangerAlert,
    icon: AlertTriangle,
  },
};

export function ConnectivityIndicator() {
  const { status, isOnline, summary, syncNow } = useOfflineStatus();
  const [showReconnectFeedback, setShowReconnectFeedback] = useState(false);
  const wasOfflineRef = useRef(!isOnline || status === "offline");
  const reconnectFeedbackTimerRef = useRef<number | null>(null);
  const pendingCount = summary.pending + summary.failed + summary.conflict;
  const shouldShowPending =
    isOnline && pendingCount > 0 && !showReconnectFeedback;
  const visibleStatus =
    status === "offline" || status === "syncing" || status === "sync-error"
      ? status
      : null;
  const copy = visibleStatus ? STATUS_COPY[visibleStatus] : null;
  const Icon = copy?.icon;

  useEffect(() => {
    if (!isOnline || status === "offline") {
      wasOfflineRef.current = true;
    }
  }, [isOnline, status]);

  useEffect(() => {
    function clearReconnectFeedbackTimer() {
      if (reconnectFeedbackTimerRef.current) {
        window.clearTimeout(reconnectFeedbackTimerRef.current);
        reconnectFeedbackTimerRef.current = null;
      }
    }

    function handleOffline() {
      wasOfflineRef.current = true;
      clearReconnectFeedbackTimer();
      setShowReconnectFeedback(false);
    }

    function handleOnline() {
      if (!wasOfflineRef.current) return;

      wasOfflineRef.current = false;
      clearReconnectFeedbackTimer();
      setShowReconnectFeedback(true);
      reconnectFeedbackTimerRef.current = window.setTimeout(() => {
        reconnectFeedbackTimerRef.current = null;
        setShowReconnectFeedback(false);
      }, 1600);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      clearReconnectFeedbackTimer();
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!copy && !showReconnectFeedback && !shouldShowPending) {
    return null;
  }

  const label = showReconnectFeedback
    ? "Verificando pendências"
    : status === "sync-error" && pendingCount > 0
      ? `${pendingCount} item(ns) com falha de sincronização`
      : shouldShowPending
        ? `${pendingCount} item(ns) para sincronizar`
        : copy?.label;
  const IndicatorIcon = showReconnectFeedback ? RefreshCw : Icon;
  const tone = showReconnectFeedback
    ? surface.infoAlert
    : shouldShowPending
      ? surface.warningAlertMuted
      : copy?.tone;

  return (
    <div className={`px-4 py-2 ${typography.bodyMuted} ${surface.subtleDividerBar}`}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-2">
        <Link
          href="/sincronizacao"
          onClick={(event) => {
            if (!canNavigateAfterOfflineWrite()) {
              event.preventDefault();
            }
          }}
          className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 ${typography.bodyStrong} shadow-sm ${tone}`}
        >
          {IndicatorIcon ? (
            <IndicatorIcon
              className={`size-3.5 shrink-0 ${
                showReconnectFeedback || status === "syncing"
                  ? "animate-spin"
                  : ""
              }`}
            />
          ) : null}
          <span className="truncate">{label}</span>
        </Link>
        {shouldShowPending ||
        status === "sync-error" ||
        status === "syncing" ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => void syncNow()}
            disabled={status === "offline" || status === "syncing"}
            className="size-8 bg-background/80"
            title="Sincronizar"
            aria-label="Sincronizar"
          >
            <RefreshCw
              className={`size-3.5 ${
                status === "syncing" ? "animate-spin" : ""
              }`}
            />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
