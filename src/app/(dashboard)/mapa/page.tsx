import { isPast } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Construction,
  ShieldOff,
} from "lucide-react";
import Link from "next/link";

import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { getContextCapabilities } from "@/lib/data-scope";
import { typography } from "@/lib/design-system";
import { MapaOperacionalClient } from "./mapa-client";

export default async function MapaPage() {
  const access = await getCurrentUserAccess();
  const [raw, canCreateScaffold, canCreateInspection, canFinalizeInspection] =
    await Promise.all([
      getScaffolds(),
      canCurrentUser("scaffolds.create"),
      canCurrentUser("inspections.create"),
      canCurrentUser("inspections.finalize"),
    ]);
  const capabilities = access ? await getContextCapabilities(access) : null;
  const canFilterCompany = Boolean(
    capabilities?.canSwitchCompany &&
      access?.roleCodes.some((roleCode) =>
        ["SUPER_ADMIN", "HSE_HYDRO", "HSE_GERENCIADORA", "AUDITOR"].includes(roleCode),
      ),
  );

  const canInspect = canCreateInspection || canFinalizeInspection;
  const scaffolds = raw.map((s) => ({
    id: s.id,
    code: s.code,
    location: s.location,
    area: s.area,
    status: s.status as string,
    responsible: s.responsible,
    companyId: s.companyId,
    companyName: s.tenantCompany.name,
    locationDescription: s.location_description,
    validity_date: s.validity_date ? s.validity_date.toISOString() : null,
    latitude: (s as { latitude?: number | null }).latitude ?? null,
    longitude: (s as { longitude?: number | null }).longitude ?? null,
    effectiveStatus:
      s.status === "liberado" && s.validity_date && isPast(s.validity_date)
        ? ("vencido" as string)
        : (s.status as string),
    lastInspection: s.inspections[0]
      ? {
          date: s.inspections[0].date.toISOString(),
          result: s.inspections[0].result as string,
        }
      : null,
  }));

  const total = scaffolds.length;
  const comCoords = scaffolds.filter(
    (s) => s.latitude !== null && s.longitude !== null,
  ).length;
  const semCoords = total - comCoords;

  const liberados = scaffolds.filter(
    (s) => s.effectiveStatus === "liberado",
  ).length;
  const emMontagem = scaffolds.filter(
    (s) => s.effectiveStatus === "em_montagem",
  ).length;
  const pendenteLiberacao = scaffolds.filter(
    (s) => s.effectiveStatus === "pendente_liberacao",
  ).length;
  const reprovados = scaffolds.filter((s) =>
    ["reprovado", "interditado"].includes(s.effectiveStatus),
  ).length;
  const vencidos = scaffolds.filter(
    (s) => s.effectiveStatus === "vencido",
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-border">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            AndCheck • Mapa Operacional
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Mapa Operacional
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {total} andaimes cadastrados · {comCoords} georreferênciados
            {semCoords > 0 && (
              <span className="text-amber-600">
                {" "}
                · {semCoords} sem coordenadas
              </span>
            )}
          </p>
        </div>
        {canCreateScaffold && (
          <Link
            href="/andaimes/novo"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0"
          >
            <Construction className="w-3.5 h-3.5" />
            Novo Andaime
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Liberados",
            value: liberados,
            icon: CheckCircle2,
            iconClass: "text-emerald-600",
            border: "border-l-4 border-l-emerald-600",
            valueClass: "text-emerald-700",
          },
          {
            label: "Em Montagem",
            value: emMontagem,
            icon: Construction,
            iconClass: "text-blue-600",
            border: "border-l-4 border-l-blue-600",
            valueClass: "text-blue-700",
          },
          {
            label: "Pend. Liberação",
            value: pendenteLiberacao,
            icon: Clock,
            iconClass: "text-amber-500",
            border: "border-l-4 border-l-amber-500",
            valueClass: "text-amber-700",
          },
          {
            label: "Reprov. / Interdit.",
            value: reprovados,
            icon: ShieldOff,
            iconClass: "text-red-600",
            border: "border-l-4 border-l-red-600",
            valueClass: "text-red-700",
          },
          {
            label: "Vencidos",
            value: vencidos,
            icon: AlertTriangle,
            iconClass: "text-slate-500",
            border: "border-l-4 border-l-slate-500",
            valueClass: "text-slate-700",
          },
        ].map((k) => {
          const Icon = k.icon;

          return (
            <div
              key={k.label}
              className={`rounded-lg border border-border bg-card p-4 shadow-sm ${k.border}`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p
                  className={`${typography.sectionLabel} leading-tight text-muted-foreground`}
                >
                  {k.label}
                </p>
                <Icon className={`h-4 w-4 shrink-0 ${k.iconClass}`} />
              </div>
              <p
                className={`${typography.kpiValue} leading-none ${k.valueClass}`}
              >
                {k.value}
              </p>
            </div>
          );
        })}
      </div>

      <MapaOperacionalClient
        scaffolds={scaffolds}
        canInspect={canInspect}
        canFilterCompany={canFilterCompany}
        showCompanyName={canFilterCompany}
      />
    </div>
  );
}
