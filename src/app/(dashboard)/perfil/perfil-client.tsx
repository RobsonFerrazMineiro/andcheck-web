"use client";

import { OfflineDataNotice } from "@/components/offline/offline-data-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOfflineSnapshotCache } from "@/lib/offline/use-offline-snapshot-cache";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Mail,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import { useMemo, type ElementType } from "react";
import { PasswordForm } from "./password-form";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

export type ProfileSnapshot = {
  name: string;
  email: string;
  companyName: string;
  workspaceName: string;
  isActive: boolean;
  roleLabels: string[];
  createdAt: string;
  lastAccessAt: string | null;
};

export function PerfilClient({
  initialProfile,
}: {
  initialProfile: ProfileSnapshot;
}) {
  const initialProfiles = useMemo(() => [initialProfile], [initialProfile]);
  const {
    data: profiles,
    isOfflineFallback,
    lastCachedAt,
  } = useOfflineSnapshotCache({
    cacheKey: "profile:current",
    initialData: initialProfiles,
  });
  const profile = profiles[0] ?? initialProfile;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Conta e seguranca
          </p>
          <h1 className="text-[18px] font-bold uppercase tracking-tight text-foreground">
            Meu Perfil
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Dados da sessao autenticada e credenciais do usuario atual.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit rounded-md border-emerald-300 bg-emerald-50 text-emerald-700"
        >
          <CheckCircle2 className="size-3" />
          {isOfflineFallback ? "Cache local" : "Sessao ativa"}
        </Badge>
      </div>

      <OfflineDataNotice
        active={isOfflineFallback}
        label="perfil"
        lastCachedAt={lastCachedAt}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4" /> Identidade
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info icon={User} label="Nome" value={profile.name} />
            <Info icon={Mail} label="E-mail" value={profile.email} />
            <Info
              icon={Building2}
              label="Empresa do usuario"
              value={profile.companyName}
            />
            <Info
              icon={ShieldCheck}
              label="Perfil/RBAC"
              value={profile.roleLabels.join(", ") || "Sem perfil"}
            />
            <Info
              icon={MapPin}
              label="Workspace atual"
              value={profile.workspaceName}
            />
            <Info
              icon={CheckCircle2}
              label="Status da sessao"
              value={profile.isActive ? "Ativa" : "Inativa"}
            />
            <Info
              icon={CalendarClock}
              label="Criado em"
              value={formatDate(profile.createdAt)}
            />
            <Info
              icon={CalendarClock}
              label="Ultimo acesso"
              value={
                profile.lastAccessAt
                  ? formatDate(profile.lastAccessAt)
                  : "Sem registro"
              }
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Seguranca
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isOfflineFallback ? (
              <p className="text-[11px] text-muted-foreground">
                Alteracao de senha indisponivel offline. Conecte-se para usar
                esta acao.
              </p>
            ) : (
              <PasswordForm />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border bg-muted/20 p-3">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return DATE_FORMATTER.format(date);
}
