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
import { typography } from "@/lib/design-system";
import { EmptyState } from "@/components/shared/empty-state";
import { Bell, BellOff, RefreshCw } from "lucide-react";

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
    <div className="space-y-5">
      <OnlineOnlyNotice moduleName="Monitoramento administrativo de notificações" />

      <div className="border-b-2 border-border pb-4">
        <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Bell className="size-4" />
          AndCheck ⬢ Administracao
        </p>
        <h1 className={`${typography.pageTitle} text-foreground`}>
          Monitoramento de notificações
        </h1>
        <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
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
          <CardTitle>Últimas falhas</CardTitle>
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
            <>
              <div className="grid gap-3 md:hidden">
                {latestFailures.map((log) => (
                  <div key={log.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-[12px] font-semibold text-foreground">
                          {log.notification.title}
                        </p>
                        <Badge className="mt-1" variant="outline">
                          {log.notification.type}
                        </Badge>
                      </div>
                      <form action={resendAction} className="shrink-0">
                        <input
                          type="hidden"
                          name="notificationId"
                          value={log.notification.id}
                        />
                        <Button type="submit" variant="outline" size="icon-sm" aria-label="Reenviar">
                          <RefreshCw className="size-3.5" />
                        </Button>
                      </form>
                    </div>
                    <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground">
                      <p className="break-all">{log.recipientEmail}</p>
                      <p>
                        {log.notification.company.name}
                        {log.notification.workspace?.name
                          ? ` / ${log.notification.workspace.name}`
                          : ""}
                      </p>
                      <p className="break-words text-red-700">
                        {log.error ?? "Falha sem detalhe"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-3 pr-4">Notificacao</th>
                    <th className="py-3 pr-4">Destinatario</th>
                    <th className="py-3 pr-4">Empresa</th>
                    <th className="py-3 pr-4">Erro</th>
                <th className="py-3 text-right">Ação</th>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
