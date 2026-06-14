import "server-only";

import { getCurrentUserAccess } from "@/lib/authz";
import {
  ALL_COMPANIES_CONTEXT,
  COMPANY_CONTEXT_COOKIE,
  getContextCapabilities,
  WORKSPACE_CONTEXT_COOKIE,
} from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function getContextSwitcherData() {
  const access = await getCurrentUserAccess();
  if (!access) return null;

  const capabilities = await getContextCapabilities(access);
  const cookieStore = await cookies();
  const selectedCompanyId = capabilities.canSwitchCompany
    ? cookieStore.get(COMPANY_CONTEXT_COOKIE)?.value ?? ALL_COMPANIES_CONTEXT
    : access.companyId;
  const selectedWorkspaceId = capabilities.canSwitchCompany
    ? cookieStore.get(WORKSPACE_CONTEXT_COOKIE)?.value
    : access.workspaceId;

  const [companies, workspaces] = await Promise.all([
    capabilities.canSwitchCompany
      ? prisma.company.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : prisma.company.findMany({
          where: { id: access.companyId, active: true },
          select: { id: true, name: true },
        }),
    capabilities.canSwitchWorkspace
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

  const companyOptions = capabilities.canUseAllCompanies
    ? [{ id: ALL_COMPANIES_CONTEXT, name: "Todas as empresas" }, ...companies]
    : companies;
  const selectedCompany =
    companyOptions.find((company) => company.id === selectedCompanyId) ??
    companyOptions.find((company) => company.id === access.companyId) ??
    companyOptions[0];
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
    workspaces.find((workspace) => workspace.id === access.workspaceId) ??
    workspaces[0];

  if (!selectedCompany || !selectedWorkspace) return null;

  return {
    canSwitch:
      capabilities.canSwitchCompany || capabilities.canSwitchWorkspace,
    canSwitchCompany: capabilities.canSwitchCompany,
    canSwitchWorkspace: capabilities.canSwitchWorkspace,
    companies: companyOptions,
    workspaces,
    selectedCompanyId: selectedCompany.id,
    selectedWorkspaceId: selectedWorkspace.id,
  };
}
