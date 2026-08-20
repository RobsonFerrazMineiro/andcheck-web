import { OnlineOnlyNotice } from "@/components/offline/online-only-notice";
import { Badge } from "@/components/ui/badge";
import { getEmailTechnicalConfiguration } from "@/lib/actions/notification-actions";
import { surface, typography } from "@/lib/design-system";
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

      <div className={surface.pageHeader}>
        <p
          className={`mb-1 flex items-center gap-2 ${typography.pageEyebrow} text-muted-foreground`}
        >
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

      <section className={surface.panel}>
        <div className={surface.panelHeaderSubtle}>
          <h2 className={`flex items-center gap-2 ${typography.bodyStrong}`}>
            <Mail className="size-4" />
            Canal de e-mail
          </h2>
          <p className={`mt-1 ${typography.sectionDescription} text-muted-foreground`}>
            {config.status.detail}
          </p>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <Metric label="Status" value={config.status.label} />
          <Metric label="Provider" value={config.provider} />
          <Metric label="Remetente" value={config.from} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className={surface.panel}>
          <div className={surface.panelHeaderSubtle}>
            <h2 className={typography.bodyStrong}>Variaveis de ambiente</h2>
            <p className={`mt-1 ${typography.sectionDescription} text-muted-foreground`}>
              Apenas o estado de configuração é exibido; segredos não são
              renderizados.
            </p>
          </div>
          <div className="p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {config.variables.map((variable) => (
                <div
                  key={variable.name}
                  className={`flex min-w-0 items-center justify-between gap-3 p-3 ${surface.mutedInset}`}
                >
                  <span className={`min-w-0 break-all ${typography.codeMuted}`}>{variable.name}</span>
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
          </div>
        </section>

        <section className={surface.panel}>
          <div className={surface.panelHeaderSubtle}>
            <h2 className={typography.bodyStrong}>Provedores planejados</h2>
            <p className={`mt-1 ${typography.sectionDescription} text-muted-foreground`}>
              A camada atual usa adapter abstrato para troca futura de
              provider.
            </p>
          </div>
          <div className="space-y-2 p-4">
            {config.plannedProviders.map((provider) => (
              <div key={provider} className={`p-3 ${surface.mutedInset} ${typography.bodyStrong}`}>
                {provider}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`p-4 ${surface.mutedInset}`}>
      <p className={`${typography.sectionLabel} text-muted-foreground`}>
        {label}
      </p>
      <p className={`mt-2 break-words ${typography.bodyStrong}`}>{value}</p>
    </div>
  );
}
