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

export const ALL_COMPANIES_CONTEXT = "__all_companies__";
export const COMPANY_CONTEXT_COOKIE = "andcheck_company_context";
export const WORKSPACE_CONTEXT_COOKIE = "andcheck_workspace_context";

export const COMPANY_SCOPED_ROLE_CODES = [
  "ADMIN_EMPRESA",
  "HSE_EMPRESA",
  "PLANEJAMENTO",
  "SUPERVISOR",
  "ENCARREGADO",
  "SUPERVISOR_ENCARREGADO",
  "MONTADOR_LIDER",
  "AUDITOR",
] as const;

export type DataScope = {
  isGlobal: boolean;
  companyScope: "ALL_IN_WORKSPACE" | "SINGLE_COMPANY" | "GLOBAL";
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

type UserAccess = NonNullable<Awaited<ReturnType<typeof getCurrentUserAccess>>>;

export const getContextCapabilities = cache(async (access: UserAccess) => {
  const hasWorkspaceRole = access.roleCodes.some((roleCode: string) =>
    CONTEXT_SWITCHER_ROLES.has(roleCode),
  );
  const isAuditor = access.roleCodes.includes("AUDITOR");
  // Until workspace grants exist, an auditor tied to the workspace owner is workspace-scoped.
  const auditorHasWorkspaceScope = isAuditor
    ? Boolean(
        await prisma.workspace.findFirst({
          where: {
            id: access.workspaceId,
            ownerCompanyId: access.companyId,
            active: true,
          },
          select: { id: true },
        }),
      )
    : false;

  return {
    canSwitchCompany: hasWorkspaceRole || auditorHasWorkspaceScope,
    canSwitchWorkspace: access.roleCodes.some((roleCode: string) =>
      GLOBAL_WORKSPACE_ROLES.has(roleCode),
    ),
    canUseAllCompanies: hasWorkspaceRole || auditorHasWorkspaceScope,
  };
});

export const getDataScope = cache(async (): Promise<DataScope> => {
  const access = await getCurrentUserAccess();
  if (!access) throw new AuthorizationError("Usuário não autenticado.");

  const capabilities = await getContextCapabilities(access);

  if (capabilities.canSwitchCompany) {
    const cookieStore = await cookies();
    const selectedCompanyId = cookieStore.get(COMPANY_CONTEXT_COOKIE)?.value;
    const selectedWorkspaceId = cookieStore.get(
      WORKSPACE_CONTEXT_COOKIE,
    )?.value;
    const allCompaniesSelected =
      capabilities.canUseAllCompanies &&
      (!selectedCompanyId || selectedCompanyId === ALL_COMPANIES_CONTEXT);
    const selectedWorkspace = selectedWorkspaceId
      ? await prisma.workspace.findFirst({
          where: {
            id: selectedWorkspaceId,
            active: true,
            ...(!capabilities.canSwitchWorkspace
              ? { id: access.workspaceId }
              : {}),
          },
          select: { id: true },
        })
      : null;
    const effectiveWorkspaceId = selectedWorkspace?.id ?? access.workspaceId;
    const linkedCompanies = await prisma.companyWorkspace.findMany({
      where: {
        workspaceId: effectiveWorkspaceId,
        active: true,
        company: { active: true },
      },
      select: {
        companyId: true,
        role: true,
        company: { select: { type: true } },
      },
    });
    const linkedCompanyIds = linkedCompanies.map((link) => link.companyId);
    const selectableCompanyIds = linkedCompanies
      .filter(
        (link) =>
          link.role === "SCAFFOLD_COMPANY" &&
          link.company.type === "SCAFFOLD_COMPANY",
      )
      .map((link) => link.companyId);
    const selectedCompany =
      selectedCompanyId &&
      !allCompaniesSelected &&
      selectableCompanyIds.includes(selectedCompanyId)
        ? { id: selectedCompanyId }
        : null;
    const useAllCompanies = allCompaniesSelected || !selectedCompany;

    return {
      isGlobal: false,
      companyScope: useAllCompanies
        ? "ALL_IN_WORKSPACE"
        : "SINGLE_COMPANY",
      companyIds: useAllCompanies ? linkedCompanyIds : [selectedCompany.id],
      workspaceIds: [effectiveWorkspaceId],
      userId: access.userId,
      actorCompanyId: access.companyId,
      actorWorkspaceId: access.workspaceId,
    };
  }

  return {
    isGlobal: false,
    companyScope: "SINGLE_COMPANY",
    companyIds: [access.companyId],
    workspaceIds: [access.workspaceId],
    userId: access.userId,
    actorCompanyId: access.companyId,
    actorWorkspaceId: access.workspaceId,
  };
});

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
