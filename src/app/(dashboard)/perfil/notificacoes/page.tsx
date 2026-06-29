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

export default async function PerfilNotificacoesPage() {
  const [preferences, emailStatus] = await Promise.all([
    getNotificationPreferences(),
    getEmailChannelStatus(),
  ]);

  return (
    <div className="space-y-5">
      <div className="border-b-2 border-border pb-4">
        <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Conta e preferencias
        </p>
        <h1 className="text-[18px] font-bold uppercase tracking-tight text-foreground">
          Preferencias de Notificacao
        </h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Escolha quais alertas deseja receber dentro do sistema e por e-mail.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canais por tipo de alerta</CardTitle>
          <CardDescription>
            Alteracoes nos checkboxes sao salvas automaticamente.
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
