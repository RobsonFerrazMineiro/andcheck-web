import { OnlineOnlyNotice } from "@/components/offline/online-only-notice";
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
  getAdminNotificationData,
  resendNotificationEmail,
} from "@/lib/actions/notification-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { BellOff, RefreshCw } from "lucide-react";

type AdminNotificationFailure = {
  id: string;
  recipientEmail: string;
  error: string | null;
  notification: {
    id: string;
    title: string;
    type: string;
    company: { name: string };
    workspace: { name: string } | null;
  };
};

export default async function AdminNotificationsPage() {
  const data = await getAdminNotificationData();
  const latestFailures = data.latestFailures as AdminNotificationFailure[];

  async function resendAction(formData: FormData) {
    "use server";
    await resendNotificationEmail(String(formData.get("notificationId") ?? ""));
  }

  const metrics = [
    { label: "Total", value: data.total },
    { label: "Enviadas", value: data.sent },
    { label: "Pendentes", value: data.pending },
    { label: "Falhas", value: data.failed },
    { label: "E-mails enviados", value: data.emailSent },
    { label: "E-mails com falha", value: data.emailFailed },
  ];

  return (
    <div className="space-y-6">
      <OnlineOnlyNotice moduleName="Monitoramento administrativo de notificacoes" />

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Administracao
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Monitoramento de notificacoes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visao operacional de envios internos e logs de e-mail.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <Card key={metric.label} size="sm">
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimas falhas</CardTitle>
          <CardDescription>
            Registros de e-mail com erro no escopo atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestFailures.length === 0 ? (
            <EmptyState
              icon={BellOff}
              title="Nenhuma falha de e-mail registrada"
              description="Falhas de envio aparecerão aqui para revisão e reenvio administrativo."
              className="border-dashed"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-3 pr-4">Notificacao</th>
                    <th className="py-3 pr-4">Destinatario</th>
                    <th className="py-3 pr-4">Empresa</th>
                    <th className="py-3 pr-4">Erro</th>
                    <th className="py-3 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {latestFailures.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium">
                          {log.notification.title}
                        </div>
                        <Badge className="mt-1" variant="outline">
                          {log.notification.type}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {log.recipientEmail}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {log.notification.company.name}
                        {log.notification.workspace?.name
                          ? ` / ${log.notification.workspace.name}`
                          : ""}
                      </td>
                      <td className="max-w-80 truncate py-3 pr-4 text-muted-foreground">
                        {log.error ?? "Falha sem detalhe"}
                      </td>
                      <td className="py-3 text-right">
                        <form action={resendAction}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={log.notification.id}
                          />
                          <Button type="submit" variant="outline" size="sm">
                            <RefreshCw className="size-4" />
                            Reenviar
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
