import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyProfile } from "@/lib/actions/profile-actions";
import { getRoleLabel } from "@/lib/rbac";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Mail,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import type { ElementType } from "react";
import { PasswordForm } from "./password-form";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function PerfilPage() {
  const profile = await getMyProfile();
  const roleLabels =
    profile.roleNames.length > 0
      ? profile.roleNames
      : profile.roleCodes.map((roleCode: string) => getRoleLabel(roleCode));

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
            Dados da sessão autenticada e credenciais do usuário atual.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-md border-emerald-300 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-3" /> Sessão ativa
        </Badge>
      </div>

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
            <Info icon={Building2} label="Empresa do usuário" value={profile.companyName} />
            <Info icon={ShieldCheck} label="Perfil/RBAC" value={roleLabels.join(", ") || "Sem perfil"} />
            <Info icon={MapPin} label="Workspace atual" value={profile.workspaceName} />
            <Info icon={CheckCircle2} label="Status da sessão" value={profile.isActive ? "Ativa" : "Inativa"} />
            <Info icon={CalendarClock} label="Criado em" value={DATE_FORMATTER.format(profile.createdAt)} />
            <Info
              icon={CalendarClock}
              label="Ultimo acesso"
              value={profile.lastAccessAt ? DATE_FORMATTER.format(profile.lastAccessAt) : "Sem registro"}
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
            <PasswordForm />
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
