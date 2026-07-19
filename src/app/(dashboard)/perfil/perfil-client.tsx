"use client";

import { OfflineDataNotice } from "@/components/offline/offline-data-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typography } from "@/lib/design-system";
import { useOfflineSnapshotCache } from "@/lib/offline/use-offline-snapshot-cache";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  KeyRound,
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
          <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <User className="size-4" />
            AndCheck - Conta e segurança
          </p>
          <h1 className={`${typography.pageTitle} text-foreground`}>
            Meu Perfil
          </h1>
          <p className={`mt-0.5 ${typography.sectionDescription} text-muted-foreground`}>
            Dados da sessão autenticada e credenciais do usuário atual.
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

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden rounded-lg">
          <CardContent className="p-0">
            <div className="border-b bg-sidebar px-5 py-5 text-sidebar-foreground">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent/60 ring-1 ring-sidebar-border/60">
                  <User className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/55">
                    Usuário autenticado
                  </p>
                  <h2 className="mt-1 break-words text-[18px] font-bold leading-tight">
                    {profile.name}
                  </h2>
                  <p className="mt-1 break-all text-[11px] text-primary-foreground/70">
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-2 [&>*:last-child]:sm:col-span-2">
              <SummaryTile
                icon={Building2}
                label="Empresa"
                value={profile.companyName}
              />
              <SummaryTile
                icon={MapPin}
                label="Workspace"
                value={profile.workspaceName}
              />
              <SummaryTile
                icon={ShieldCheck}
                label="Perfil"
                value={profile.roleLabels.join(", ") || "Sem perfil"}
              />
              <SummaryTile
                icon={CheckCircle2}
                label="Status"
                value={profile.isActive ? "Ativa" : "Inativa"}
              />
              <SummaryTile
                icon={CalendarClock}
                label="Ultimo acesso"
                value={
                  profile.lastAccessAt
                    ? formatDate(profile.lastAccessAt)
                    : "Sem registro"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-[14px]">
              <KeyRound className="size-4" /> Segurança da conta
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Info
                icon={CalendarClock}
                label="Conta criada em"
                value={formatDate(profile.createdAt)}
              />
              <Info
                icon={CheckCircle2}
                label="Sessao"
                value={isOfflineFallback ? "Cache local" : "Ativa online"}
              />
            </div>
            {isOfflineFallback ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                <p className="text-[11px] text-muted-foreground">
                  Alteração de senha indisponível offline. Conecte-se para usar
                  esta ação.
                </p>
              </div>
            ) : (
              <PasswordForm />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="break-words text-[13px] font-semibold text-foreground">
        {value}
      </p>
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
    <div className="flex min-w-0 items-start gap-3 border bg-muted/20 p-3">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return DATE_FORMATTER.format(date);
}
