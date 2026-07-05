import { EmptyState } from "@/components/shared/empty-state";
import { NotificationListActions } from "@/components/notifications/notification-list-actions";
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
  getNotifications,
  markAllNotificationsAsRead,
  type NotificationFilter,
} from "@/lib/actions/notification-actions";
import { typography } from "@/lib/design-system";
import { NOTIFICATION_ENTITY_GROUPS } from "@/lib/notifications/catalog";
import { Bell, Check } from "lucide-react";
import Link from "next/link";

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Não lidas" },
  { value: "critical", label: "Críticas" },
  { value: "scaffolds", label: "Andaimes" },
  { value: "inspections", label: "Inspeções" },
  { value: "nonconformities", label: "NCs" },
  { value: "documents", label: "Documentos" },
];

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  type: keyof typeof NOTIFICATION_ENTITY_GROUPS;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
  company: { name: string };
  workspace: { name: string } | null;
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const query = await searchParams;
  const filter = parseFilter(query.filter);
  const notifications = (await getNotifications(filter)) as NotificationRecord[];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Bell className="size-4" />
            AndCheck • Notificações
          </div>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Notificações
          </h1>
          <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
            Alertas internos, histórico e preferências por canal.
          </p>
        </div>
        <form action={markAllNotificationsAsRead} className="shrink-0">
          <Button
            type="submit"
            size="sm"
            className={`h-8 gap-1.5 rounded-md px-3 ${typography.action}`}
          >
            <Check className="size-3.5" />
            Marcar todas como lidas
          </Button>
        </form>
      </div>

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
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            Últimas notificações no seu escopo de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nenhuma notificação encontrada"
              description="As notificações internas aparecem aqui conforme os eventos operacionais forem registrados no seu escopo."
              className="border-dashed"
            />
          ) : (
            notifications.map((notification) => (
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
                      {notification.createdAt.toLocaleString("pt-BR")}
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
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function parseFilter(value?: string): NotificationFilter {
  return FILTERS.some((filter) => filter.value === value)
    ? (value as NotificationFilter)
    : "all";
}

function severityLabel(severity: string) {
  if (severity === "CRITICAL") return "Crítica";
  if (severity === "WARNING") return "Atenção";
  if (severity === "SUCCESS") return "Sucesso";
  return "Info";
}

function groupLabel(type: keyof typeof NOTIFICATION_ENTITY_GROUPS) {
  const group = NOTIFICATION_ENTITY_GROUPS[type];
  if (group === "SCAFFOLD") return "Andaimes";
  if (group === "INSPECTION") return "Inspeções";
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
