"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import {
  canCurrentUser,
  getCurrentUserAccess,
  requireAnyPermission,
  requirePermission,
} from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  assertRecordInDataScope,
  COMPANY_SCOPED_ROLE_CODES,
  dataScopeWhere,
  getDataScope,
  getOwnedCreationContext,
} from "@/lib/data-scope";
import {
  DEFAULT_COMPANY_ID,
  DEFAULT_WORKSPACE_ID,
} from "@/lib/multi-company";

const TEMPORARY_PASSWORD = "andcheck@2025";

export async function getUserManagementData() {
  await requireAnyPermission(["users.manage_company", "users.create"]);
  const scope = await getDataScope();

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: dataScopeWhere(scope),
      orderBy: { name: "asc" },
      include: {
        roles: {
          include: { role: true },
          orderBy: { assigned_at: "asc" },
        },
      },
    }),
    prisma.role.findMany({
      where: scope.isGlobal
        ? undefined
        : { code: { in: [...COMPANY_SCOPED_ROLE_CODES] } },
      orderBy: { name: "asc" },
    }),
  ]);

  return { users, roles };
}

export async function createUser(formData: FormData) {
  await requirePermission("users.create");
  const scope = await getDataScope();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim();
  const registration = String(formData.get("registration") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "").trim();
  const isActive = String(formData.get("status") ?? "active") === "active";

  if (!name || !email || !roleId) {
    throw new Error("Nome, e-mail e perfil sao obrigatorios.");
  }

  const [passwordHash, role, selectedCompany] = await Promise.all([
    bcrypt.hash(TEMPORARY_PASSWORD, 12),
    prisma.role.findUnique({ where: { id: roleId } }),
    scope.isGlobal && company
      ? prisma.company.findFirst({
          where: {
            OR: [
              { id: company },
              { name: { equals: company, mode: "insensitive" } },
              { tradeName: { equals: company, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true },
        })
      : null,
  ]);

  if (!role) {
    throw new Error("Perfil selecionado nao existe.");
  }
  if (
    !scope.isGlobal &&
    !COMPANY_SCOPED_ROLE_CODES.includes(
      role.code as (typeof COMPANY_SCOPED_ROLE_CODES)[number],
    )
  ) {
    throw new Error("Perfil fora do escopo permitido para esta empresa.");
  }

  if (
    role.code === "SUPER_ADMIN" &&
    !(await canCurrentUser("permissions.manage"))
  ) {
    throw new Error("Voce nao tem permissao para criar Super Admin.");
  }

  const legacyRole = role.code === "SUPER_ADMIN" ? "admin" : "inspector";
  const creationContext = scope.isGlobal
    ? {
        companyId: selectedCompany?.id ?? DEFAULT_COMPANY_ID,
        workspaceId: DEFAULT_WORKSPACE_ID,
      }
    : getOwnedCreationContext(scope);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
      role: legacyRole,
      company: selectedCompany?.name ?? (company || null),
      ...creationContext,
      registration: registration || null,
      department: department || null,
      position: position || null,
      is_active: isActive,
      roles: {
        create: {
          role_id: role.id,
        },
      },
    },
  });
  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: user.id,
    entityLabel: user.name,
    action: AuditAction.CREATE,
    description: `Usuario ${user.name} criado`,
    newValue: {
      name: user.name,
      email: user.email,
      company: user.company,
      registration: user.registration,
      department: user.department,
      position: user.position,
      is_active: user.is_active,
      role: role.code,
    },
    companyId: user.companyId,
    workspaceId: user.workspaceId,
  });

  revalidatePath("/usuarios");
}

export async function updateUser(formData: FormData) {
  await requirePermission("users.update");
  const currentAccess = await getCurrentUserAccess();
  const scope = await getDataScope();

  const userId = String(formData.get("user_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim();
  const registration = String(formData.get("registration") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "").trim();
  const isActive = String(formData.get("status") ?? "active") === "active";

  if (!userId || !name || !email || !roleId) {
    throw new Error("Usuario, nome, e-mail e perfil sao obrigatorios.");
  }

  const [targetUser, role] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);

  if (!targetUser) {
    throw new Error("Usuario selecionado nao existe.");
  }
  assertRecordInDataScope(scope, targetUser);

  if (!role) {
    throw new Error("Perfil selecionado nao existe.");
  }
  if (
    !scope.isGlobal &&
    !COMPANY_SCOPED_ROLE_CODES.includes(
      role.code as (typeof COMPANY_SCOPED_ROLE_CODES)[number],
    )
  ) {
    throw new Error("Perfil fora do escopo permitido para esta empresa.");
  }

  const targetIsSuperAdmin = targetUser.roles.some(
    (userRole) => userRole.role.code === "SUPER_ADMIN",
  );
  const canManagePermissions = await canCurrentUser("permissions.manage");

  if ((targetIsSuperAdmin || role.code === "SUPER_ADMIN") && !canManagePermissions) {
    throw new Error("Voce nao tem permissao para alterar Super Admin.");
  }

  if (!isActive && currentAccess?.userId === userId) {
    throw new Error("Voce nao pode desativar o proprio usuario.");
  }

  const legacyRole = role.code === "SUPER_ADMIN" ? "admin" : "inspector";
  const oldRoleCode = targetUser.roles[0]?.role.code ?? null;
  const selectedCompany =
    scope.isGlobal && company
      ? await prisma.company.findFirst({
          where: {
            OR: [
              { id: company },
              { name: { equals: company, mode: "insensitive" } },
              { tradeName: { equals: company, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true },
        })
      : null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role: legacyRole,
      company: selectedCompany?.name ?? (company || null),
      companyId: scope.isGlobal
        ? selectedCompany?.id ?? targetUser.companyId
        : targetUser.companyId,
      registration: registration || null,
      department: department || null,
      position: position || null,
      is_active: isActive,
      roles: {
        deleteMany: {},
        create: {
          role_id: role.id,
        },
      },
    },
  });
  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: user.id,
    entityLabel: user.name,
    action: oldRoleCode !== role.code ? AuditAction.ROLE_CHANGE : AuditAction.UPDATE,
    description:
      oldRoleCode !== role.code
        ? `Perfil do usuario ${user.name} alterado de ${oldRoleCode ?? "-"} para ${role.code}`
        : `Usuario ${user.name} atualizado`,
    oldValue: {
      name: targetUser.name,
      email: targetUser.email,
      company: targetUser.company,
      registration: targetUser.registration,
      department: targetUser.department,
      position: targetUser.position,
      is_active: targetUser.is_active,
      role: oldRoleCode,
    },
    newValue: {
      name: user.name,
      email: user.email,
      company: user.company,
      registration: user.registration,
      department: user.department,
      position: user.position,
      is_active: user.is_active,
      role: role.code,
    },
    companyId: user.companyId,
    workspaceId: user.workspaceId,
  });

  revalidatePath("/usuarios");
}

export async function setUserActive(userId: string, isActive: boolean) {
  await requireAnyPermission(["users.deactivate", "users.update"]);
  const currentAccess = await getCurrentUserAccess();
  const scope = await getDataScope();

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  const targetIsSuperAdmin = targetUser?.roles.some(
    (userRole) => userRole.role.code === "SUPER_ADMIN",
  );
  assertRecordInDataScope(scope, targetUser);

  if (targetIsSuperAdmin && !(await canCurrentUser("permissions.manage"))) {
    throw new Error("Voce nao tem permissao para alterar Super Admin.");
  }

  if (!isActive && currentAccess?.userId === userId) {
    throw new Error("Voce nao pode desativar o proprio usuario.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { is_active: isActive },
  });
  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: user.id,
    entityLabel: user.name,
    action: AuditAction.STATUS_CHANGE,
    description: `Usuario ${user.name} ${isActive ? "reativado" : "desativado"}`,
    oldValue: { is_active: targetUser?.is_active ?? null },
    newValue: { is_active: user.is_active },
    companyId: user.companyId,
    workspaceId: user.workspaceId,
  });

  revalidatePath("/usuarios");
}

export async function deleteUser(userId: string) {
  await requirePermission("permissions.manage");
  const currentAccess = await getCurrentUserAccess();

  if (currentAccess?.userId === userId) {
    throw new Error("Voce nao pode excluir o proprio usuario.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  if (!targetUser) {
    throw new Error("Usuario selecionado nao existe.");
  }

  const protectedRole = targetUser.roles.find((userRole) =>
    ["SUPER_ADMIN", "ADMIN_EMPRESA"].includes(userRole.role.code),
  );

  if (protectedRole) {
    throw new Error("Nao e permitido excluir usuarios administradores.");
  }

  await prisma.user.delete({ where: { id: userId } });
  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: targetUser.id,
    entityLabel: targetUser.name,
    action: AuditAction.DELETE,
    description: `Usuario ${targetUser.name} excluido`,
    oldValue: {
      name: targetUser.name,
      email: targetUser.email,
      company: targetUser.company,
      registration: targetUser.registration,
      department: targetUser.department,
      position: targetUser.position,
      is_active: targetUser.is_active,
      roles: targetUser.roles.map((userRole) => userRole.role.code),
    },
    companyId: targetUser.companyId,
    workspaceId: targetUser.workspaceId,
  });

  revalidatePath("/usuarios");
}
