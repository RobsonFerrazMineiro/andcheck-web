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

export type ContextOption = {
  id: string;
  name: string;
};

export type WorkspaceOption = ContextOption & {
  code: string;
};

export type ContextSwitcherData = {
  canSwitch: boolean;
  canSwitchCompany: boolean;
  canSwitchWorkspace: boolean;
  companies: ContextOption[];
  workspaces: WorkspaceOption[];
  selectedCompanyId: string;
  selectedWorkspaceId: string;
};

export async function getContextSwitcherData(): Promise<ContextSwitcherData | null> {
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

  const workspaces = capabilities.canSwitchWorkspace
    ? prisma.workspace.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      })
    : prisma.workspace.findMany({
        where: { id: access.workspaceId, active: true },
        select: { id: true, name: true, code: true },
      });
  const workspaceOptions = await workspaces;
  const selectedWorkspace =
    workspaceOptions.find((workspace) => workspace.id === selectedWorkspaceId) ??
    workspaceOptions.find((workspace) => workspace.id === access.workspaceId) ??
    workspaceOptions[0];
  if (!selectedWorkspace) return null;

  const companies = capabilities.canSwitchCompany
    ? await prisma.company.findMany({
        where: {
          active: true,
          type: "SCAFFOLD_COMPANY",
          workspaceLinks: {
            some: {
              workspaceId: selectedWorkspace.id,
              role: "SCAFFOLD_COMPANY",
              active: true,
            },
          },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : await prisma.company.findMany({
        where: { id: access.companyId, active: true },
        select: { id: true, name: true },
      });

  const companyOptions = capabilities.canUseAllCompanies
    ? [{ id: ALL_COMPANIES_CONTEXT, name: "Todas as empresas" }, ...companies]
    : companies;
  const selectedCompany =
    companyOptions.find((company) => company.id === selectedCompanyId) ??
    companyOptions.find((company) => company.id === access.companyId) ??
    companyOptions[0];
  if (!selectedCompany || !selectedWorkspace) return null;

  return {
    canSwitch:
      capabilities.canSwitchCompany || capabilities.canSwitchWorkspace,
    canSwitchCompany: capabilities.canSwitchCompany,
    canSwitchWorkspace: capabilities.canSwitchWorkspace,
    companies: companyOptions,
    workspaces: workspaceOptions,
    selectedCompanyId: selectedCompany.id,
    selectedWorkspaceId: selectedWorkspace.id,
  };
}
