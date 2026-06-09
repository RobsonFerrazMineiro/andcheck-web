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

export default async function AuditoriaPage({ searchParams }: Props) {
  const canViewAudit =
    (await canCurrentUser("audit.view")) ||
    (await canCurrentUser("logs.view")) ||
    (await canCurrentUser("permissions.manage"));

  if (!canViewAudit) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const page = Number(single(params.page) ?? "1");
  const result = await getAuditLogs({
    search: single(params.search),
    action: filterValue(params.action),
    entityType: filterValue(params.entityType),
    user: single(params.user),
    company: single(params.company),
    dateFrom: single(params.dateFrom),
    dateTo: single(params.dateTo),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 25,
  });

  const rows = result.items.map((item) => ({
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
  }));

  return (
    <AuditoriaClient
      rows={rows}
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
