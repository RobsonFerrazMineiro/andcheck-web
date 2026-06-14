import "server-only";

import { getCurrentUserAccess } from "@/lib/authz";
import {
  canRoleSwitchAnyWorkspace,
  canRoleSwitchContext,
  COMPANY_CONTEXT_COOKIE,
  WORKSPACE_CONTEXT_COOKIE,
} from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function getContextSwitcherData() {
  const access = await getCurrentUserAccess();
  if (!access) return null;

  const canSwitch = canRoleSwitchContext(access.roleCodes);
  const canSwitchAnyWorkspace = canRoleSwitchAnyWorkspace(access.roleCodes);
  const cookieStore = await cookies();
  const selectedCompanyId = canSwitch
    ? cookieStore.get(COMPANY_CONTEXT_COOKIE)?.value
    : access.companyId;
  const selectedWorkspaceId = canSwitch
    ? cookieStore.get(WORKSPACE_CONTEXT_COOKIE)?.value
    : access.workspaceId;

  const [companies, workspaces] = await Promise.all([
    canSwitch
      ? prisma.company.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : prisma.company.findMany({
          where: { id: access.companyId, active: true },
          select: { id: true, name: true },
        }),
    canSwitchAnyWorkspace
      ? prisma.workspace.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        })
      : prisma.workspace.findMany({
          where: { id: access.workspaceId, active: true },
          select: { id: true, name: true, code: true },
        }),
  ]);

  const selectedCompany =
    companies.find((company) => company.id === selectedCompanyId) ??
    companies.find((company) => company.id === access.companyId) ??
    companies[0];
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
    workspaces.find((workspace) => workspace.id === access.workspaceId) ??
    workspaces[0];

  if (!selectedCompany || !selectedWorkspace) return null;

  return {
    canSwitch,
    canSwitchCompany: canSwitch,
    canSwitchWorkspace: canSwitchAnyWorkspace,
    companies,
    workspaces,
    selectedCompanyId: selectedCompany.id,
    selectedWorkspaceId: selectedWorkspace.id,
  };
}
