import { isPast } from "date-fns";
import { Construction } from "lucide-react";
import Link from "next/link";

import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { getContextCapabilities } from "@/lib/data-scope";
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
            AndCheck EHS · Visualizacao Espacial
          </p>
          <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
            Mapa Operacional
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {total} andaimes cadastrados · {comCoords} georreferenciados
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
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground text-[10px] font-bold uppercase tracking-widest h-8 px-4 shrink-0"
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
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-200",
            bar: "border-l-emerald-600",
          },
          {
            label: "Em Montagem",
            value: emMontagem,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-200",
            bar: "border-l-blue-600",
          },
          {
            label: "Pend. Liberacao",
            value: pendenteLiberacao,
            color: "text-amber-600",
            bg: "bg-amber-50 border-amber-200",
            bar: "border-l-amber-500",
          },
          {
            label: "Reprov. / Interdit.",
            value: reprovados,
            color: "text-red-600",
            bg: "bg-red-50 border-red-200",
            bar: "border-l-red-600",
          },
          {
            label: "Vencidos",
            value: vencidos,
            color: "text-gray-600",
            bg: "bg-gray-50 border-gray-300",
            bar: "border-l-gray-600",
          },
        ].map((k) => (
          <div
            key={k.label}
            className={
              "border border-l-4 p-3 text-center " + k.bg + " " + k.bar
            }
          >
            <p className={"text-[26px] font-black font-mono " + k.color}>
              {k.value}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {k.label}
            </p>
          </div>
        ))}
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
