import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationPreferencesClient } from "@/components/notifications/notification-preferences-client";
import {
  getEmailChannelStatus,
  getNotificationPreferences,
} from "@/lib/actions/notification-actions";
import { typography } from "@/lib/design-system";
import { Bell } from "lucide-react";

export default async function PerfilNotificacoesPage() {
  const [preferences, emailStatus] = await Promise.all([
    getNotificationPreferences(),
    getEmailChannelStatus(),
  ]);

  return (
    <div className="space-y-5">
      <div className="border-b-2 border-border pb-4">
        <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Bell className="size-4" />
          Conta e preferências
        </p>
        <h1 className={`${typography.pageTitle} text-foreground`}>
          Preferências de Notificação
        </h1>
        <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
          Escolha quais alertas deseja receber dentro do sistema e por e-mail.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canais por tipo de alerta</CardTitle>
          <CardDescription>
            Alterações nos checkboxes são salvas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesClient
            preferences={preferences}
            emailStatus={emailStatus}
          />
        </CardContent>
      </Card>
    </div>
  );
}
