import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

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
  const session = await auth();
  const sessionUser = session?.user as
    | { id?: string; email?: string | null; role?: string | null }
    | undefined;

  if (!sessionUser?.email && !sessionUser?.id) return null;

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

  if (!user || !user.is_active) return null;

  const roleCodes =
    user.roles.length > 0
      ? user.roles.map((userRole) => userRole.role.code)
      : legacyRoleCodes(user.role);

  return {
    userId: user.id,
    email: user.email,
    roleCodes,
  };
}

export async function canCurrentUser(permission: PermissionCode) {
  const access = await getCurrentUserAccess();
  if (!access) return false;

  return access.roleCodes.some((roleCode) =>
    roleHasPermission(roleCode, permission),
  );
}

export async function requirePermission(permission: PermissionCode) {
  if (await canCurrentUser(permission)) return;
  throw new AuthorizationError();
}

export async function requireAnyPermission(permissions: PermissionCode[]) {
  const access = await getCurrentUserAccess();
  if (
    access &&
    permissions.some((permission) =>
      access.roleCodes.some((roleCode) => roleHasPermission(roleCode, permission)),
    )
  ) {
    return;
  }

  throw new AuthorizationError();
}

export async function requireRole(roleCode: string) {
  const access = await getCurrentUserAccess();
  if (access?.roleCodes.includes(roleCode)) return;
  throw new AuthorizationError();
}
