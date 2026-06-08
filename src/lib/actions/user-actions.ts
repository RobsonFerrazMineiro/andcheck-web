"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import {
  canCurrentUser,
  getCurrentUserAccess,
  requireAnyPermission,
  requirePermission,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const TEMPORARY_PASSWORD = "andcheck@2025";

export async function getUserManagementData() {
  await requireAnyPermission(["users.manage_company", "users.create"]);

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      include: {
        roles: {
          include: { role: true },
          orderBy: { assigned_at: "asc" },
        },
      },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return { users, roles };
}

export async function createUser(formData: FormData) {
  await requirePermission("users.create");

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

  const [passwordHash, role] = await Promise.all([
    bcrypt.hash(TEMPORARY_PASSWORD, 12),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);

  if (!role) {
    throw new Error("Perfil selecionado nao existe.");
  }

  if (
    role.code === "SUPER_ADMIN" &&
    !(await canCurrentUser("permissions.manage"))
  ) {
    throw new Error("Voce nao tem permissao para criar Super Admin.");
  }

  const legacyRole = role.code === "SUPER_ADMIN" ? "admin" : "inspector";

  await prisma.user.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
      role: legacyRole,
      company: company || null,
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

  revalidatePath("/usuarios");
}

export async function updateUser(formData: FormData) {
  await requirePermission("users.update");
  const currentAccess = await getCurrentUserAccess();

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

  if (!role) {
    throw new Error("Perfil selecionado nao existe.");
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

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role: legacyRole,
      company: company || null,
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

  revalidatePath("/usuarios");
}

export async function setUserActive(userId: string, isActive: boolean) {
  await requireAnyPermission(["users.deactivate", "users.update"]);
  const currentAccess = await getCurrentUserAccess();

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  const targetIsSuperAdmin = targetUser?.roles.some(
    (userRole) => userRole.role.code === "SUPER_ADMIN",
  );

  if (targetIsSuperAdmin && !(await canCurrentUser("permissions.manage"))) {
    throw new Error("Voce nao tem permissao para alterar Super Admin.");
  }

  if (!isActive && currentAccess?.userId === userId) {
    throw new Error("Voce nao pode desativar o proprio usuario.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { is_active: isActive },
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

  revalidatePath("/usuarios");
}
