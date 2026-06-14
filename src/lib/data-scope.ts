import "server-only";

import { AuthorizationError, getCurrentUserAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { cache } from "react";

const CONTEXT_SWITCHER_ROLES = new Set([
  "SUPER_ADMIN",
  "HSE_HYDRO",
  "HSE_GERENCIADORA",
]);

const GLOBAL_WORKSPACE_ROLES = new Set(["SUPER_ADMIN"]);

export const COMPANY_CONTEXT_COOKIE = "andcheck_company_context";
export const WORKSPACE_CONTEXT_COOKIE = "andcheck_workspace_context";

export const COMPANY_SCOPED_ROLE_CODES = [
  "ADMIN_EMPRESA",
  "HSE_EMPRESA",
  "PLANEJAMENTO",
  "SUPERVISOR_ENCARREGADO",
  "MONTADOR_LIDER",
  "AUDITOR",
] as const;

export type DataScope = {
  isGlobal: boolean;
  companyIds: string[] | null;
  workspaceIds: string[] | null;
  userId: string;
  actorCompanyId: string;
  actorWorkspaceId: string;
};

type ScopedRecord = {
  companyId: string;
  workspaceId: string;
};

export const getDataScope = cache(async (): Promise<DataScope> => {
  const access = await getCurrentUserAccess();
  if (!access) throw new AuthorizationError("Usuario nao autenticado.");

  const canSwitchContext = access.roleCodes.some((roleCode) =>
    CONTEXT_SWITCHER_ROLES.has(roleCode),
  );

  if (canSwitchContext) {
    const cookieStore = await cookies();
    const selectedCompanyId = cookieStore.get(COMPANY_CONTEXT_COOKIE)?.value;
    const selectedWorkspaceId = cookieStore.get(
      WORKSPACE_CONTEXT_COOKIE,
    )?.value;
    const canSwitchAnyWorkspace = access.roleCodes.some((roleCode) =>
      GLOBAL_WORKSPACE_ROLES.has(roleCode),
    );
    const [selectedCompany, selectedWorkspace] = await Promise.all([
      selectedCompanyId
        ? prisma.company.findFirst({
            where: { id: selectedCompanyId, active: true },
            select: { id: true },
          })
        : null,
      selectedWorkspaceId
        ? prisma.workspace.findFirst({
            where: {
              id: selectedWorkspaceId,
              active: true,
              ...(!canSwitchAnyWorkspace
                ? { id: access.workspaceId }
                : {}),
            },
            select: { id: true },
          })
        : null,
    ]);

    return {
      isGlobal: false,
      companyIds: [selectedCompany?.id ?? access.companyId],
      workspaceIds: [selectedWorkspace?.id ?? access.workspaceId],
      userId: access.userId,
      actorCompanyId: access.companyId,
      actorWorkspaceId: access.workspaceId,
    };
  }

  return {
    isGlobal: false,
    companyIds: [access.companyId],
    workspaceIds: [access.workspaceId],
    userId: access.userId,
    actorCompanyId: access.companyId,
    actorWorkspaceId: access.workspaceId,
  };
});

export function canRoleSwitchContext(roleCodes: string[]) {
  return roleCodes.some((roleCode) => CONTEXT_SWITCHER_ROLES.has(roleCode));
}

export function canRoleSwitchAnyWorkspace(roleCodes: string[]) {
  return roleCodes.some((roleCode) => GLOBAL_WORKSPACE_ROLES.has(roleCode));
}

export function dataScopeWhere(scope: DataScope) {
  if (scope.isGlobal) return {};

  return {
    ...(scope.companyIds ? { companyId: { in: scope.companyIds } } : {}),
    ...(scope.workspaceIds
      ? { workspaceId: { in: scope.workspaceIds } }
      : {}),
  };
}

export function isRecordInDataScope(scope: DataScope, record: ScopedRecord) {
  if (scope.isGlobal) return true;

  const companyAllowed =
    !scope.companyIds || scope.companyIds.includes(record.companyId);
  const workspaceAllowed =
    !scope.workspaceIds || scope.workspaceIds.includes(record.workspaceId);

  return companyAllowed && workspaceAllowed;
}

export function assertRecordInDataScope(
  scope: DataScope,
  record: ScopedRecord | null | undefined,
) {
  if (!record || !isRecordInDataScope(scope, record)) {
    throw new AuthorizationError("Registro fora do escopo permitido.");
  }
}

export function getOwnedCreationContext(scope: DataScope) {
  return {
    companyId: scope.companyIds?.[0] ?? scope.actorCompanyId,
    workspaceId: scope.workspaceIds?.[0] ?? scope.actorWorkspaceId,
  };
}
