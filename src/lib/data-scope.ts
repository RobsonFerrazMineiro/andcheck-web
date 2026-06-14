import { AuthorizationError, getCurrentUserAccess } from "@/lib/authz";

const WORKSPACE_WIDE_ROLES = new Set(["HSE_HYDRO", "HSE_GERENCIADORA"]);

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

export async function getDataScope(): Promise<DataScope> {
  const access = await getCurrentUserAccess();
  if (!access) throw new AuthorizationError("Usuario nao autenticado.");

  if (access.roleCodes.includes("SUPER_ADMIN")) {
    return {
      isGlobal: true,
      companyIds: null,
      workspaceIds: null,
      userId: access.userId,
      actorCompanyId: access.companyId,
      actorWorkspaceId: access.workspaceId,
    };
  }

  const hasWorkspaceWideAccess = access.roleCodes.some((roleCode) =>
    WORKSPACE_WIDE_ROLES.has(roleCode),
  );

  return {
    isGlobal: false,
    companyIds: hasWorkspaceWideAccess ? null : [access.companyId],
    workspaceIds: [access.workspaceId],
    userId: access.userId,
    actorCompanyId: access.companyId,
    actorWorkspaceId: access.workspaceId,
  };
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
