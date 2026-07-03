"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { markNotificationAsRead } from "@/lib/actions/notification-actions";
import {
  notificationSeverityTone,
  SEMANTIC_TONE_CLASSES,
} from "@/lib/semantic-tones";
import { Bell, Check, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

type BellNotification = {
  id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
};

export function NotificationBell({
  unreadCount,
  latest,
}: {
  unreadCount: number;
  latest: BellNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={open ? "Fechar notificações" : "Abrir notificações"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notification-bell-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          id="notification-bell-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-bell-title"
          className="absolute right-0 top-10 z-50 w-96 border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="flex items-center justify-between border-b p-3">
            <div>
              <p id="notification-bell-title" className="text-sm font-semibold">
                Notificações
              </p>
              <p className="text-xs text-muted-foreground">
                {unreadCount} não lida(s)
              </p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {latest.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Nenhuma notificação recente"
                description="Novos alertas operacionais aparecerão aqui."
                className="border-0 py-6 shadow-none"
              />
            ) : (
              latest.map((notification) => (
                <div
                  key={notification.id}
                  className="border-b p-3 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${severityDot(notification.severity)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-semibold">
                        {notification.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button asChild variant="ghost" size="xs">
                          <Link
                            href={entityPath(notification)}
                            onClick={() => setOpen(false)}
                          >
                            <ExternalLink className="size-3" />
                            Abrir
                          </Link>
                        </Button>
                        {notification.status !== "READ" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await markNotificationAsRead(notification.id);
                              });
                            }}
                          >
                            <Check className="size-3" />
                            Lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="grid gap-1 border-t p-2">
            <Button asChild variant="ghost" size="sm" className="justify-start">
              <Link href="/notificacoes" onClick={() => setOpen(false)}>
                <Bell className="size-3.5" />
                Ver todas as notificações
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="justify-start">
              <Link href="/perfil/notificacoes" onClick={() => setOpen(false)}>
                <Settings className="size-3.5" />
                Preferências de Notificação
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function severityDot(severity: string) {
  return SEMANTIC_TONE_CLASSES[notificationSeverityTone(severity)].dot;
}

function entityPath(notification: BellNotification) {
  if (!notification.entityType || !notification.entityId) return "/notificacoes";
  if (notification.entityType === "SCAFFOLD") {
    return `/andaimes/${notification.entityId}`;
  }
  if (notification.entityType === "INSPECTION") {
    return `/inspecoes/${notification.entityId}`;
  }
  if (notification.entityType === "NONCONFORMITY") {
    return `/nao-conformidades/${notification.entityId}`;
  }
  if (notification.entityType === "DOCUMENT") {
    return `/documentos/${notification.entityId}`;
  }
  return "/notificacoes";
}
