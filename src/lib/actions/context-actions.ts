"use server";

import { AuthorizationError, getCurrentUserAccess } from "@/lib/authz";
import {
  ALL_COMPANIES_CONTEXT,
  COMPANY_CONTEXT_COOKIE,
  getContextCapabilities,
  WORKSPACE_CONTEXT_COOKIE,
} from "@/lib/data-scope";
import { prisma } from "@/lib/prisma";
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
  const access = await getCurrentUserAccess();
  if (!access) {
    throw new AuthorizationError("Troca de contexto nao permitida.");
  }

  const capabilities = await getContextCapabilities(access);
  if (!capabilities.canSwitchCompany && !capabilities.canSwitchWorkspace) {
    throw new AuthorizationError("Troca de contexto nao permitida.");
  }

  const allCompaniesSelected = input.companyId === ALL_COMPANIES_CONTEXT;
  if (allCompaniesSelected && !capabilities.canUseAllCompanies) {
    throw new AuthorizationError("Escopo de todas as empresas nao permitido.");
  }

  const [company, workspace] = await Promise.all([
    allCompaniesSelected
      ? Promise.resolve(null)
      : prisma.company.findFirst({
          where: {
            id: input.companyId,
            active: true,
            type: "SCAFFOLD_COMPANY",
          },
          select: { id: true },
        }),
    prisma.workspace.findFirst({
      where: {
        id: input.workspaceId,
        active: true,
        ...(!capabilities.canSwitchWorkspace
          ? { id: access.workspaceId }
          : {}),
      },
      select: { id: true },
    }),
  ]);

  if ((!allCompaniesSelected && !company) || !workspace) {
    throw new AuthorizationError("Contexto selecionado nao esta disponivel.");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    COMPANY_CONTEXT_COOKIE,
    allCompaniesSelected ? ALL_COMPANIES_CONTEXT : company!.id,
    COOKIE_OPTIONS,
  );
  cookieStore.set(WORKSPACE_CONTEXT_COOKIE, workspace.id, COOKIE_OPTIONS);
}
