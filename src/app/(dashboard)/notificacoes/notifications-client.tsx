"use client";

import { NotificationListActions } from "@/components/notifications/notification-list-actions";
import { OfflineDataNotice } from "@/components/offline/offline-data-notice";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  markAllNotificationsAsRead,
  type NotificationFilter,
} from "@/lib/actions/notification-actions";
import { typography } from "@/lib/design-system";
import { NOTIFICATION_ENTITY_GROUPS } from "@/lib/notifications/catalog";
import { useOfflineEntityCache } from "@/lib/offline/use-offline-entity-cache";
import { Bell, Check } from "lucide-react";
import Link from "next/link";

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Nao lidas" },
  { value: "critical", label: "Criticas" },
  { value: "scaffolds", label: "Andaimes" },
  { value: "inspections", label: "Inspecoes" },
  { value: "nonconformities", label: "NCs" },
  { value: "documents", label: "Documentos" },
];

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  type: keyof typeof NOTIFICATION_ENTITY_GROUPS;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  company: { name: string };
  workspace: { name: string } | null;
};

export function NotificationsClient({
  initialData,
  filter,
}: {
  initialData: NotificationRow[];
  filter: NotificationFilter;
}) {
  const {
    data: notifications,
    isOfflineFallback,
    lastCachedAt,
  } = useOfflineEntityCache({
    storeName: "notifications",
    initialData,
  });

  const filtered = notifications.filter((notification) =>
    matchesFilter(notification, filter),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Bell className="size-4" />
            AndCheck • Notificacoes
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Notificacoes
          </h1>
          <p
            className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}
          >
            Alertas internos, historico e preferencias por canal.
          </p>
        </div>
        <form action={markAllNotificationsAsRead} className="shrink-0">
          <Button
            type="submit"
            size="sm"
            disabled={isOfflineFallback}
            className={`h-8 gap-1.5 rounded-md px-3 ${typography.action}`}
          >
            <Check className="size-3.5" />
            Marcar todas como lidas
          </Button>
        </form>
      </div>

      <OfflineDataNotice
        active={isOfflineFallback}
        label="notificacoes"
        lastCachedAt={lastCachedAt}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            asChild
            variant={filter === item.value ? "default" : "ghost"}
            size="sm"
            className={`h-8 rounded-md px-3 ${typography.action} ${
              filter === item.value ? "" : "border border-border/70"
            }`}
          >
            <Link href={`/notificacoes?filter=${item.value}`}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historico</CardTitle>
          <CardDescription>
            Ultimas notificacoes no seu escopo de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nenhuma notificacao encontrada"
              description="As notificacoes internas aparecem aqui conforme os eventos operacionais forem registrados no seu escopo."
              className="border-dashed"
            />
          ) : (
            filtered.map((notification) => (
              <div
                key={notification.id}
                className="grid gap-3 border p-4 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        notification.severity === "CRITICAL"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {severityLabel(notification.severity)}
                    </Badge>
                    <Badge variant="secondary">
                      {groupLabel(notification.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-sm font-semibold">
                    {notification.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {notification.company.name}
                    {notification.workspace?.name
                      ? ` / ${notification.workspace.name}`
                      : ""}
                  </p>
                </div>

                <NotificationListActions
                  id={notification.id}
                  title={notification.title}
                  href={entityPath(notification)}
                  status={notification.status}
                  disabled={isOfflineFallback}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function matchesFilter(notification: NotificationRow, filter: NotificationFilter) {
  if (filter === "all") return notification.status !== "ARCHIVED";
  if (filter === "unread") {
    return !["READ", "ARCHIVED"].includes(notification.status);
  }
  if (filter === "critical") {
    return (
      notification.severity === "CRITICAL" &&
      notification.status !== "ARCHIVED"
    );
  }
  return groupLabel(notification.type).toLowerCase() === filterLabel(filter);
}

function filterLabel(filter: NotificationFilter) {
  if (filter === "scaffolds") return "andaimes";
  if (filter === "inspections") return "inspecoes";
  if (filter === "nonconformities") return "ncs";
  if (filter === "documents") return "documentos";
  return filter;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

function severityLabel(severity: string) {
  if (severity === "CRITICAL") return "Critica";
  if (severity === "WARNING") return "Atencao";
  if (severity === "SUCCESS") return "Sucesso";
  return "Info";
}

function groupLabel(type: keyof typeof NOTIFICATION_ENTITY_GROUPS) {
  const group = NOTIFICATION_ENTITY_GROUPS[type];
  if (group === "SCAFFOLD") return "Andaimes";
  if (group === "INSPECTION") return "Inspecoes";
  if (group === "NONCONFORMITY") return "NCs";
  if (group === "DOCUMENT") return "Documentos";
  return "Geral";
}

function entityPath(notification: {
  entityType: string | null;
  entityId: string | null;
}) {
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
