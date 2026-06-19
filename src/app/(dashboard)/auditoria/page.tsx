import { redirect } from "next/navigation";

import { getAuditLogs } from "@/lib/audit";
import { canCurrentUser } from "@/lib/authz";
import { AuditoriaClient } from "./auditoria-client";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filterValue(value: string | string[] | undefined) {
  const result = single(value);
  return result === "all" ? undefined : result;
}

type AuditLogItem = Awaited<ReturnType<typeof getAuditLogs>>["items"][number];

function mapAuditRow(item: AuditLogItem) {
  return {
    id: item.id,
    userName: item.userName,
    userRole: item.userRole,
    entityType: item.entityType,
    entityId: item.entityId,
    entityLabel: item.entityLabel,
    action: item.action,
    description: item.description,
    oldValue: item.oldValue,
    newValue: item.newValue,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    workspaceId: item.workspaceId,
    companyId: item.companyId,
    createdAt: item.createdAt.toISOString(),
  };
}

export default async function AuditoriaPage({ searchParams }: Props) {
  const canViewAudit =
    (await canCurrentUser("audit.view")) ||
    (await canCurrentUser("logs.view")) ||
    (await canCurrentUser("permissions.manage"));

  if (!canViewAudit) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const page = Number(single(params.page) ?? "1");
  const auditFilters = {
    search: single(params.search),
    action: filterValue(params.action),
    entityType: filterValue(params.entityType),
    user: single(params.user),
    company: single(params.company),
    dateFrom: single(params.dateFrom),
    dateTo: single(params.dateTo),
  };
  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const [result, exportResult] = await Promise.all([
    getAuditLogs({
      ...auditFilters,
      page: currentPage,
      pageSize: 25,
    }),
    getAuditLogs({
      ...auditFilters,
      page: 1,
      pageSize: 1000,
    }),
  ]);

  const rows = result.items.map(mapAuditRow);
  const exportRows = exportResult.items.map(mapAuditRow);

  return (
    <AuditoriaClient
      rows={rows}
      exportRows={exportRows}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      filters={{
        search: single(params.search) ?? "",
        action: filterValue(params.action) ?? "",
        entityType: filterValue(params.entityType) ?? "",
        user: single(params.user) ?? "",
        company: single(params.company) ?? "",
        dateFrom: single(params.dateFrom) ?? "",
        dateTo: single(params.dateTo) ?? "",
      }}
    />
  );
}
