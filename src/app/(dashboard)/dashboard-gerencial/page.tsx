import { ExecutiveDashboardClient } from "@/components/dashboard/executive-dashboard-client";
import { OnlineOnlyNotice } from "@/components/offline/online-only-notice";
import {
  getExecutiveDashboard,
  type ExecutiveDashboardFilters,
  type ExecutivePeriod,
} from "@/lib/executive-dashboard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseFilters(params: Record<string, string | string[] | undefined>) {
  const period = first(params.period);
  return {
    companyId: first(params.companyId),
    workspaceId: first(params.workspaceId),
    area: first(params.area),
    status: first(params.status),
    period: ["week", "month", "quarter", "year"].includes(period ?? "")
      ? (period as ExecutivePeriod)
      : "month",
    startDate: first(params.startDate),
    endDate: first(params.endDate),
  } satisfies ExecutiveDashboardFilters;
}

export default async function ExecutiveDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = parseFilters(await searchParams);
  const data = await getExecutiveDashboard(filters);

  return (
    <div className="space-y-4">
      <OnlineOnlyNotice moduleName="Dashboard Gerencial" />
      <ExecutiveDashboardClient data={data} />
    </div>
  );
}
