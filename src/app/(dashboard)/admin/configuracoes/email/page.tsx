import { OnlineOnlyNotice } from "@/components/offline/online-only-notice";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEmailTechnicalConfiguration } from "@/lib/actions/notification-actions";
import { typography } from "@/lib/design-system";
import { CheckCircle2, Mail, XCircle } from "lucide-react";

type EmailTechnicalConfiguration = {
  status: { label: string; detail: string };
  provider: string;
  from: string;
  variables: Array<{ name: string; configured: boolean }>;
  plannedProviders: string[];
};

export default async function AdminEmailConfigurationPage() {
  const config =
    (await getEmailTechnicalConfiguration()) as EmailTechnicalConfiguration;

  return (
    <div className="space-y-5">
      <OnlineOnlyNotice moduleName="Configurações administrativas" />

      <div className="border-b-2 border-border pb-4">
        <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Mail className="size-4" />
          AndCheck • Administração
        </p>
        <h1 className={`${typography.pageTitle} text-foreground`}>
          Configuração técnica de e-mail
        </h1>
        <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
          Estado do provider adapter e variaveis de ambiente do envio de
          notificações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            Canal de e-mail
          </CardTitle>
          <CardDescription>{config.status.detail}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Metric label="Status" value={config.status.label} />
          <Metric label="Provider" value={config.provider} />
          <Metric label="Remetente" value={config.from} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Variaveis de ambiente</CardTitle>
            <CardDescription>
              Apenas o estado de configuração é exibido; segredos não são
              renderizados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.variables.map((variable) => (
                <div
                  key={variable.name}
                  className="flex min-w-0 items-center justify-between gap-3 border p-3"
                >
                  <span className="min-w-0 break-all font-mono text-xs">{variable.name}</span>
                  <Badge
                    variant={variable.configured ? "outline" : "destructive"}
                  >
                    {variable.configured ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <XCircle className="size-3" />
                    )}
                    {variable.configured ? "Configurada" : "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provedores planejados</CardTitle>
            <CardDescription>
              A camada atual usa adapter abstrato para troca futura de
              provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {config.plannedProviders.map((provider) => (
              <div key={provider} className="border p-3 text-sm font-medium">
                {provider}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
