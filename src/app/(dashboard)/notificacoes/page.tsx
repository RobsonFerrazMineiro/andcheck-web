import {
  getNotifications,
  type NotificationFilter,
} from "@/lib/actions/notification-actions";
import { NOTIFICATION_ENTITY_GROUPS } from "@/lib/notifications/catalog";
import {
  NotificationsClient,
  type NotificationRow,
} from "./notifications-client";

const FILTERS: NotificationFilter[] = [
  "all",
  "unread",
  "critical",
  "scaffolds",
  "inspections",
  "nonconformities",
  "documents",
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
  const notifications = (
    (await getNotifications("all")) as NotificationRecord[]
  ).map((notification) => ({
    ...notification,
    createdAt: notification.createdAt.toISOString(),
  })) satisfies NotificationRow[];

  return <NotificationsClient initialData={notifications} filter={filter} />;
}

function parseFilter(value?: string): NotificationFilter {
  return FILTERS.includes(value as NotificationFilter)
    ? (value as NotificationFilter)
    : "all";
}
