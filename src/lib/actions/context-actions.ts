"use server";

import { AuthorizationError, getCurrentUserAccess } from "@/lib/authz";
import {
  canRoleSwitchAnyWorkspace,
  canRoleSwitchContext,
  COMPANY_CONTEXT_COOKIE,
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
  if (!access || !canRoleSwitchContext(access.roleCodes)) {
    throw new AuthorizationError("Troca de contexto nao permitida.");
  }

  const [company, workspace] = await Promise.all([
    prisma.company.findFirst({
      where: { id: input.companyId, active: true },
      select: { id: true },
    }),
    prisma.workspace.findFirst({
      where: {
        id: input.workspaceId,
        active: true,
        ...(!canRoleSwitchAnyWorkspace(access.roleCodes)
          ? { id: access.workspaceId }
          : {}),
      },
      select: { id: true },
    }),
  ]);

  if (!company || !workspace) {
    throw new AuthorizationError("Contexto selecionado nao esta disponivel.");
  }

  const cookieStore = await cookies();
  cookieStore.set(COMPANY_CONTEXT_COOKIE, company.id, COOKIE_OPTIONS);
  cookieStore.set(WORKSPACE_CONTEXT_COOKIE, workspace.id, COOKIE_OPTIONS);
}
