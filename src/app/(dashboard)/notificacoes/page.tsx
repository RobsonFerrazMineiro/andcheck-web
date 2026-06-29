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
  archiveNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationFilter,
} from "@/lib/actions/notification-actions";
import { NOTIFICATION_ENTITY_GROUPS } from "@/lib/notifications/catalog";
import { Archive, Check, ExternalLink } from "lucide-react";
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

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const query = await searchParams;
  const filter = parseFilter(query.filter);
  const notifications = await getNotifications(filter);

  async function markReadAction(formData: FormData) {
    "use server";
    await markNotificationAsRead(String(formData.get("id") ?? ""));
  }

  async function archiveAction(formData: FormData) {
    "use server";
    await archiveNotification(String(formData.get("id") ?? ""));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Central operacional
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Notificacoes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alertas internos, historico e preferencias por canal.
          </p>
        </div>
        <form action={markAllNotificationsAsRead}>
          <Button type="submit" variant="outline" size="sm">
            <Check className="size-4" />
            Marcar todas como lidas
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            asChild
            variant={filter === item.value ? "default" : "outline"}
            size="sm"
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
          {notifications.length === 0 ? (
            <div className="border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma notificacao encontrada para este filtro.
            </div>
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

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Button asChild variant="outline" size="sm">
                    <Link href={entityPath(notification)}>
                      <ExternalLink className="size-4" />
                      Abrir
                    </Link>
                  </Button>
                  {notification.status !== "READ" && (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={notification.id} />
                      <Button type="submit" variant="outline" size="sm">
                        <Check className="size-4" />
                        Lida
                      </Button>
                    </form>
                  )}
                  <form action={archiveAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Archive className="size-4" />
                      Arquivar
                    </Button>
                  </form>
                </div>
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
