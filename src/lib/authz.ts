import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";
import { assertSameOriginRequest } from "@/lib/request-security";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export class AuthorizationError extends Error {
  constructor(message = "Voce nao tem permissao para executar esta acao.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

function legacyRoleCodes(role?: string | null) {
  if (role === "admin") return ["SUPER_ADMIN"];
  if (role === "inspector") return ["HSE_EMPRESA"];
  return ["AUDITOR"];
}

export async function getCurrentUserAccess() {
  const state = await getCurrentUserAccessState();
  return state.access;
}

const getCurrentUserAccessState = cache(async () => {
  const session = await auth();
  const sessionUser = session?.user as
    | { id?: string; email?: string | null; role?: string | null }
    | undefined;

  if (!sessionUser?.email && !sessionUser?.id) {
    return { status: "unauthenticated" as const, access: null };
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(sessionUser.id ? [{ id: sessionUser.id }] : []),
        ...(sessionUser.email ? [{ email: sessionUser.email }] : []),
      ],
    },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user || !user.is_active) {
    return { status: "inactive" as const, access: null };
  }

  const roleCodes =
    user.roles.length > 0
      ? user.roles.map((userRole) => userRole.role.code)
      : legacyRoleCodes(user.role);

  return {
    status: "active" as const,
    access: {
      userId: user.id,
      email: user.email,
      roleCodes,
      companyId: user.companyId,
      workspaceId: user.workspaceId,
    },
  };
});

export async function canCurrentUser(permission: PermissionCode) {
  const access = await getCurrentUserAccess();
  if (!access) return false;

  return access.roleCodes.some((roleCode) =>
    roleHasPermission(roleCode, permission),
  );
}

export async function requirePermission(permission: PermissionCode) {
  await assertSameOriginRequest();
  const state = await getCurrentUserAccessState();
  if (
    state.access?.roleCodes.some((roleCode) =>
      roleHasPermission(roleCode, permission),
    )
  ) {
    await assertActiveCompanyForCreation(permission, state.access.companyId);
    await assertActiveWorkspaceForCreation(permission);
    return;
  }

  if (state.status === "inactive") redirect("/logout");
  if (state.status === "unauthenticated") redirect("/login");

  throw new AuthorizationError();
}

const COMPANY_ACTIVE_CREATION_PERMISSIONS = new Set<PermissionCode>([
  "users.create",
  "scaffolds.create",
  "inspections.create",
]);

const WORKSPACE_ACTIVE_CREATION_PERMISSIONS = new Set<PermissionCode>([
  "scaffolds.create",
  "inspections.create",
]);

export async function assertActiveCompanyForCreation(
  permission: PermissionCode,
  companyId?: string,
) {
  if (!COMPANY_ACTIVE_CREATION_PERMISSIONS.has(permission)) return;

  const resolvedCompanyId =
    companyId ?? (await getCurrentUserAccess())?.companyId;
  if (!resolvedCompanyId) {
    throw new AuthorizationError("Usuario nao autenticado.");
  }

  const company = await prisma.company.findUnique({
    where: { id: resolvedCompanyId },
    select: { active: true },
  });
  if (!company?.active) {
    throw new AuthorizationError(
      "Empresa inativa. Novas operacoes nao sao permitidas.",
    );
  }
}

export async function assertActiveWorkspaceForCreation(
  permission: PermissionCode,
  workspaceId?: string,
) {
  if (!WORKSPACE_ACTIVE_CREATION_PERMISSIONS.has(permission)) return;

  const resolvedWorkspaceId =
    workspaceId ??
    (await cookies()).get("andcheck_workspace_context")?.value ??
    (await getCurrentUserAccess())?.workspaceId;
  if (!resolvedWorkspaceId) {
    throw new AuthorizationError("Usuario nao autenticado.");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: resolvedWorkspaceId },
    select: { active: true },
  });
  if (!workspace?.active) {
    throw new AuthorizationError(
      "Workspace inativo. Novas operacoes nao sao permitidas.",
    );
  }
}

export async function requireAnyPermission(permissions: PermissionCode[]) {
  await assertSameOriginRequest();
  const state = await getCurrentUserAccessState();
  const access = state.access;
  if (
    access &&
    permissions.some((permission) =>
      access.roleCodes.some((roleCode) => roleHasPermission(roleCode, permission)),
    )
  ) {
    const creationPermission = permissions.find((permission) =>
      WORKSPACE_ACTIVE_CREATION_PERMISSIONS.has(permission),
    );
    if (creationPermission) {
      await assertActiveWorkspaceForCreation(creationPermission);
    }
    return;
  }

  if (state.status === "inactive") redirect("/logout");
  if (state.status === "unauthenticated") redirect("/login");

  throw new AuthorizationError();
}

export async function requireRole(roleCode: string) {
  await assertSameOriginRequest();
  const state = await getCurrentUserAccessState();
  const access = state.access;
  if (access?.roleCodes.includes(roleCode)) return;

  if (state.status === "inactive") redirect("/logout");
  if (state.status === "unauthenticated") redirect("/login");

  throw new AuthorizationError();
}
