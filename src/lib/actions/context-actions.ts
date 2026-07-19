"use server";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { AuthorizationError, getCurrentUserAccess } from "@/lib/authz";
import {
  ALL_COMPANIES_CONTEXT,
  COMPANY_CONTEXT_COOKIE,
  getContextCapabilities,
  WORKSPACE_CONTEXT_COOKIE,
} from "@/lib/data-scope";
import { requiredId } from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";
import { assertSameOriginRequest } from "@/lib/request-security";
import { cookies } from "next/headers";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 90,
};

export async function updateActiveContext(input: {
  companyId: string;
  workspaceId: string;
}) {
  await assertSameOriginRequest();
  const access = await getCurrentUserAccess();
  if (!access) {
    throw new AuthorizationError("Troca de contexto não permitida.");
  }

  const capabilities = await getContextCapabilities(access);
  if (!capabilities.canSwitchCompany && !capabilities.canSwitchWorkspace) {
    throw new AuthorizationError("Troca de contexto não permitida.");
  }

  const workspaceId = requiredId(input.workspaceId, "Workspace");
  const allCompaniesSelected = input.companyId === ALL_COMPANIES_CONTEXT;
  const companyId = allCompaniesSelected
    ? ALL_COMPANIES_CONTEXT
    : requiredId(input.companyId, "Empresa");
  if (allCompaniesSelected && !capabilities.canUseAllCompanies) {
    throw new AuthorizationError("Escopo de todas as empresas não permitido.");
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      active: true,
      ...(!capabilities.canSwitchWorkspace ? { id: access.workspaceId } : {}),
    },
    select: { id: true },
  });
  const company =
    !allCompaniesSelected && workspace
      ? await prisma.company.findFirst({
          where: {
            id: companyId,
            active: true,
            type: "SCAFFOLD_COMPANY",
            workspaceLinks: {
              some: {
                workspaceId: workspace.id,
                role: "SCAFFOLD_COMPANY",
                active: true,
              },
            },
          },
          select: { id: true },
        })
      : null;
  const useAllCompanies =
    allCompaniesSelected || (!company && capabilities.canUseAllCompanies);

  if ((!useAllCompanies && !company) || !workspace) {
    throw new AuthorizationError("Contexto selecionado não está disponível.");
  }

  const cookieStore = await cookies();
  const previousCompanyId = cookieStore.get(COMPANY_CONTEXT_COOKIE)?.value;
  const previousWorkspaceId = cookieStore.get(WORKSPACE_CONTEXT_COOKIE)?.value;
  const nextCompanyId = useAllCompanies ? ALL_COMPANIES_CONTEXT : company!.id;
  cookieStore.set(
    COMPANY_CONTEXT_COOKIE,
    nextCompanyId,
    COOKIE_OPTIONS,
  );
  cookieStore.set(WORKSPACE_CONTEXT_COOKIE, workspace.id, COOKIE_OPTIONS);

  await createAuditLog({
    entityType: AuditEntityType.SETTINGS,
    entityId: access.userId,
    entityLabel: "context-switcher",
    action: AuditAction.UPDATE,
    description: "Contexto ativo alterado",
    oldValue: {
      companyId: previousCompanyId ?? null,
      workspaceId: previousWorkspaceId ?? null,
    },
    newValue: {
      companyId: nextCompanyId,
      workspaceId: workspace.id,
    },
    companyId: useAllCompanies ? access.companyId : company!.id,
    workspaceId: workspace.id,
  });
}
