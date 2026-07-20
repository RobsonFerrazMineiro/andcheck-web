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
  COMPANY_SCOPED_ROLE_CODES,
  WORKSPACE_SCOPED_ROLE_CODES,
  dataScopeWhere,
  getDataScope,
} from "@/lib/data-scope";
import {
  optionalText,
  requiredEmail,
  requiredId,
  requiredText,
} from "@/lib/input-validation";

const TEMPORARY_PASSWORD = "andcheck@2025";

function userCanSelectAnyCompany(roleCodes: string[]) {
  return roleCodes.includes("SUPER_ADMIN");
}

function userIsCompanyAdmin(roleCodes: string[]) {
  return roleCodes.includes("ADMIN_EMPRESA");
}

async function resolveUserCompanyForWrite({
  companyId,
  access,
}: {
  companyId: string;
  access: NonNullable<Awaited<ReturnType<typeof getCurrentUserAccess>>>;
}) {
  if (!companyId) {
    throw new Error("Selecione a empresa do usuário.");
  }

  if (!userCanSelectAnyCompany(access.roleCodes) && companyId !== access.companyId) {
    throw new Error("Empresa fora do escopo permitido para este usuário.");
  }

  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      active: true,
    },
    select: { id: true, name: true },
  });

  if (!company) {
    throw new Error("Empresa inválida.");
  }

  return company;
}

function canManageTargetUserByCompany({
  actorRoleCodes,
  actorCompanyId,
  targetCompanyId,
}: {
  actorRoleCodes: string[];
  actorCompanyId: string;
  targetCompanyId: string;
}) {
  if (actorRoleCodes.includes("SUPER_ADMIN")) return true;
  if (actorRoleCodes.includes("ADMIN_EMPRESA")) {
    return targetCompanyId === actorCompanyId;
  }
  return false;
}

function parseUserStatus(value: FormDataEntryValue | null) {
  const status = String(value ?? "active").trim();
  if (!["active", "inactive"].includes(status)) {
    throw new Error("Status do usuário inválido.");
  }
  return status === "active";
}

const COMPANY_SCOPED_ROLE_SET = new Set<string>(COMPANY_SCOPED_ROLE_CODES);
const WORKSPACE_SCOPED_ROLE_SET = new Set<string>(WORKSPACE_SCOPED_ROLE_CODES);

function canAssignRoleCode(roleCode: string, actorRoleCodes: string[]) {
  if (actorRoleCodes.includes("SUPER_ADMIN")) return true;
  return COMPANY_SCOPED_ROLE_SET.has(roleCode);
}

export async function getUserManagementData() {
  await requireAnyPermission(["users.manage_company", "users.create"]);
  const access = await getCurrentUserAccess();
  if (!access) {
    throw new Error("Usuário não autenticado.");
  }
  const scope = await getDataScope();
  const canSelectAnyCompany = userCanSelectAnyCompany(access.roleCodes);
  const isCompanyAdmin = userIsCompanyAdmin(access.roleCodes);

  const [users, roles, companies] = await Promise.all([
    prisma.user.findMany({
      where: canSelectAnyCompany
        ? undefined
        : isCompanyAdmin
          ? { companyId: access.companyId }
          : dataScopeWhere(scope),
      orderBy: { name: "asc" },
      include: {
        roles: {
          include: { role: true },
          orderBy: { assigned_at: "asc" },
        },
      },
    }),
    prisma.role.findMany({
      where: canSelectAnyCompany
        ? undefined
        : { code: { in: [...COMPANY_SCOPED_ROLE_CODES] } },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: canSelectAnyCompany
        ? { active: true }
        : { id: access.companyId, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return { users, roles, companies, canSelectAnyCompany };
}

export async function createUser(formData: FormData) {
  await requirePermission("users.create");
  const access = await getCurrentUserAccess();
  if (!access) {
    throw new Error("Usuário não autenticado.");
  }
  const scope = await getDataScope();

  const name = requiredText(formData.get("name"), "Nome", 120);
  const email = requiredEmail(formData.get("email"));
  const companyId = String(formData.get("companyId") ?? "").trim();
  const registration = optionalText(formData.get("registration"), "Matricula", 80) ?? "";
  const department = optionalText(formData.get("department"), "Departamento", 120) ?? "";
  const position = optionalText(formData.get("position"), "Cargo", 120) ?? "";
  const roleId = requiredId(formData.get("role_id"), "Perfil");
  const isActive = parseUserStatus(formData.get("status"));

  const [passwordHash, role, selectedCompany] = await Promise.all([
    bcrypt.hash(TEMPORARY_PASSWORD, 12),
    prisma.role.findUnique({ where: { id: roleId } }),
    resolveUserCompanyForWrite({ companyId, access }),
  ]);

  if (!role) {
    throw new Error("Perfil selecionado não existe.");
  }
  if (!canAssignRoleCode(role.code, access.roleCodes)) {
    throw new Error("Perfil fora do escopo permitido para esta empresa.");
  }

  if (
    WORKSPACE_SCOPED_ROLE_SET.has(role.code) &&
    !access.roleCodes.includes("SUPER_ADMIN")
  ) {
    throw new Error("Somente Super Admin pode atribuir perfil de escopo workspace.");
  }

  if (
    role.code === "SUPER_ADMIN" &&
    !(await canCurrentUser("permissions.manage"))
  ) {
    throw new Error("Você não tem permissão para criar Super Admin.");
  }

  const legacyRole = role.code === "SUPER_ADMIN" ? "admin" : "inspector";
  const creationContext = {
    companyId: selectedCompany.id,
    workspaceId: scope.workspaceIds?.[0] ?? scope.actorWorkspaceId,
  };

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
      role: legacyRole,
      company: selectedCompany.name,
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
    description: `Usuário ${user.name} criado`,
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
  if (!currentAccess) {
    throw new Error("Usuário não autenticado.");
  }

  const userId = requiredId(formData.get("user_id"), "Usuário");
  const name = requiredText(formData.get("name"), "Nome", 120);
  const email = requiredEmail(formData.get("email"));
  const companyId = String(formData.get("companyId") ?? "").trim();
  const registration = optionalText(formData.get("registration"), "Matricula", 80) ?? "";
  const department = optionalText(formData.get("department"), "Departamento", 120) ?? "";
  const position = optionalText(formData.get("position"), "Cargo", 120) ?? "";
  const roleId = requiredId(formData.get("role_id"), "Perfil");
  const isActive = parseUserStatus(formData.get("status"));

  const [targetUser, role] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);

  if (!targetUser) {
    throw new Error("Usuário selecionado não existe.");
  }
  if (
    !canManageTargetUserByCompany({
      actorRoleCodes: currentAccess.roleCodes,
      actorCompanyId: currentAccess.companyId,
      targetCompanyId: targetUser.companyId,
    })
  ) {
    throw new Error("Usuário fora do escopo permitido para esta empresa.");
  }

  if (!role) {
    throw new Error("Perfil selecionado não existe.");
  }
  if (!canAssignRoleCode(role.code, currentAccess.roleCodes)) {
    throw new Error("Perfil fora do escopo permitido para esta empresa.");
  }

  if (
    WORKSPACE_SCOPED_ROLE_SET.has(role.code) &&
    !currentAccess.roleCodes.includes("SUPER_ADMIN")
  ) {
    throw new Error("Somente Super Admin pode atribuir perfil de escopo workspace.");
  }

  const targetIsSuperAdmin = targetUser.roles.some(
    (userRole) => userRole.role.code === "SUPER_ADMIN",
  );
  const canManagePermissions = await canCurrentUser("permissions.manage");

  if ((targetIsSuperAdmin || role.code === "SUPER_ADMIN") && !canManagePermissions) {
    throw new Error("Você não tem permissão para alterar Super Admin.");
  }

  if (!isActive && currentAccess?.userId === userId) {
    throw new Error("Você não pode desativar o próprio usuário.");
  }

  const legacyRole = role.code === "SUPER_ADMIN" ? "admin" : "inspector";
  const oldRoleCode = targetUser.roles[0]?.role.code ?? null;
  const selectedCompany = await resolveUserCompanyForWrite({
    companyId,
    access: currentAccess,
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role: legacyRole,
      company: selectedCompany.name,
      companyId: selectedCompany.id,
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
        ? `Perfil do usuário ${user.name} alterado de ${oldRoleCode ?? "-"} para ${role.code}`
        : `Usuário ${user.name} atualizado`,
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
  if (!currentAccess) {
    throw new Error("Usuário não autenticado.");
  }
  const parsedUserId = requiredId(userId, "Usuário");

  const targetUser = await prisma.user.findUnique({
    where: { id: parsedUserId },
    include: { roles: { include: { role: true } } },
  });

  const targetIsSuperAdmin = targetUser?.roles.some(
    (userRole: { role: { code: string } }) =>
      userRole.role.code === "SUPER_ADMIN",
  );

  if (!targetUser) {
    throw new Error("Usuário selecionado não existe.");
  }

  if (
    !canManageTargetUserByCompany({
      actorRoleCodes: currentAccess.roleCodes,
      actorCompanyId: currentAccess.companyId,
      targetCompanyId: targetUser.companyId,
    })
  ) {
    throw new Error("Usuário fora do escopo permitido para esta empresa.");
  }

  if (targetIsSuperAdmin && !(await canCurrentUser("permissions.manage"))) {
    throw new Error("Você não tem permissão para alterar Super Admin.");
  }

  if (!isActive && currentAccess?.userId === parsedUserId) {
    throw new Error("Você não pode desativar o próprio usuário.");
  }

  const user = await prisma.user.update({
    where: { id: parsedUserId },
    data: { is_active: isActive },
  });
  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: user.id,
    entityLabel: user.name,
    action: AuditAction.STATUS_CHANGE,
    description: `Usuário ${user.name} ${isActive ? "reativado" : "desativado"}`,
    oldValue: { is_active: targetUser?.is_active ?? null },
    newValue: { is_active: user.is_active },
    companyId: user.companyId,
    workspaceId: user.workspaceId,
  });

  revalidatePath("/usuarios");
}

export async function deleteUser(userId: string) {
  await requireAnyPermission([
    "permissions.manage",
    "users.manage_company",
    "users.deactivate",
  ]);
  const currentAccess = await getCurrentUserAccess();
  if (!currentAccess) {
    throw new Error("Usuário não autenticado.");
  }
  const parsedUserId = requiredId(userId, "Usuário");

  const targetUser = await prisma.user.findUnique({
    where: { id: parsedUserId },
    include: { roles: { include: { role: true } } },
  });

  if (!targetUser) {
    throw new Error("Usuário selecionado não existe.");
  }

  const actorIsSuperAdmin = currentAccess.roleCodes.includes("SUPER_ADMIN");
  const actorIsCompanyAdmin = currentAccess.roleCodes.includes("ADMIN_EMPRESA");
  const targetRoleCodes = targetUser.roles.map((userRole) => userRole.role.code);
  const targetUserIsSuperAdmin = targetRoleCodes.includes("SUPER_ADMIN");
  const auditBase = {
    actorUserId: currentAccess.userId,
    actorCompanyId: currentAccess.companyId,
    actorRoleCodes: currentAccess.roleCodes,
    targetUserId: targetUser.id,
    targetCompanyId: targetUser.companyId,
    targetRoleCodes,
  };

  if (currentAccess.userId === parsedUserId) {
    await createAuditLog({
      entityType: AuditEntityType.USER,
      entityId: targetUser.id,
      entityLabel: targetUser.name,
      action: AuditAction.DELETE,
      description: `Tentativa de autoexclusão do usuário ${targetUser.name} bloqueada`,
      oldValue: auditBase,
      newValue: { result: "denied", reason: "self_delete" },
      companyId: targetUser.companyId,
      workspaceId: targetUser.workspaceId,
    });
    throw new Error("Você não pode excluir a própria conta.");
  }

  if (!actorIsSuperAdmin && !actorIsCompanyAdmin) {
    await createAuditLog({
      entityType: AuditEntityType.USER,
      entityId: targetUser.id,
      entityLabel: targetUser.name,
      action: AuditAction.DELETE,
      description: `Tentativa de exclusão do usuário ${targetUser.name} bloqueada por permissão insuficiente`,
      oldValue: auditBase,
      newValue: { result: "denied", reason: "insufficient_permission" },
      companyId: targetUser.companyId,
      workspaceId: targetUser.workspaceId,
    });
    throw new Error("Você não tem permissão para excluir usuários.");
  }

  if (actorIsCompanyAdmin && targetUserIsSuperAdmin) {
    await createAuditLog({
      entityType: AuditEntityType.USER,
      entityId: targetUser.id,
      entityLabel: targetUser.name,
      action: AuditAction.DELETE,
      description: `Tentativa de exclusao do Super Admin ${targetUser.name} bloqueada`,
      oldValue: auditBase,
      newValue: { result: "denied", reason: "target_super_admin" },
      companyId: targetUser.companyId,
      workspaceId: targetUser.workspaceId,
    });
    throw new Error("Você não possui permissão para excluir um Super Admin.");
  }

  if (
    actorIsCompanyAdmin &&
    targetUser.companyId !== currentAccess.companyId
  ) {
    await createAuditLog({
      entityType: AuditEntityType.USER,
      entityId: targetUser.id,
      entityLabel: targetUser.name,
      action: AuditAction.DELETE,
      description: `Tentativa de exclusão do usuário ${targetUser.name} de outra empresa bloqueada`,
      oldValue: auditBase,
      newValue: { result: "denied", reason: "different_company" },
      companyId: targetUser.companyId,
      workspaceId: targetUser.workspaceId,
    });
    throw new Error("Este usuário pertence a outra empresa.");
  }

  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: targetUser.id,
    entityLabel: targetUser.name,
    action: AuditAction.DELETE,
    description: `Exclusão solicitada para usuário ${targetUser.name}`,
    oldValue: {
      ...auditBase,
      name: targetUser.name,
      email: targetUser.email,
      company: targetUser.company,
      is_active: targetUser.is_active,
    },
    newValue: { result: "requested" },
    companyId: targetUser.companyId,
    workspaceId: targetUser.workspaceId,
  });

  const historyCounts = await Promise.all([
    prisma.document.count({ where: { createdById: parsedUserId } }),
    prisma.nonConformity.count({
      where: {
        OR: [
          { responsibleUserId: parsedUserId },
          { createdById: parsedUserId },
        ],
      },
    }),
    prisma.nonConformityEvidence.count({
      where: { uploadedById: parsedUserId },
    }),
    prisma.nonConformityItemEvidence.count({
      where: { uploadedById: parsedUserId },
    }),
    prisma.nonConformityHistory.count({ where: { userId: parsedUserId } }),
    prisma.inspectionSignature.count({ where: { user_id: parsedUserId } }),
    prisma.notification.count({ where: { userId: parsedUserId } }),
    prisma.auditLog.count({ where: { userId: parsedUserId } }),
  ]);
  const hasOperationalHistory = historyCounts.some((count) => count > 0);

  if (hasOperationalHistory) {
    const user = await prisma.user.update({
      where: { id: parsedUserId },
      data: { is_active: false },
    });
    await createAuditLog({
      entityType: AuditEntityType.USER,
      entityId: user.id,
      entityLabel: user.name,
      action: AuditAction.STATUS_CHANGE,
      description: `Usuário ${user.name} desativado por possuir histórico operacional`,
      oldValue: {
        is_active: targetUser.is_active,
        historyCounts,
      },
      newValue: {
        is_active: user.is_active,
        result: "deactivated_instead_of_deleted",
      },
      companyId: user.companyId,
      workspaceId: user.workspaceId,
    });
    revalidatePath("/usuarios");
    return {
      mode: "deactivated" as const,
      message:
        "Este usuário possui histórico operacional e foi desativado em vez de excluído.",
    };
  }

  await prisma.user.delete({ where: { id: parsedUserId } });
  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: targetUser.id,
    entityLabel: targetUser.name,
    action: AuditAction.DELETE,
    description: `Usuário ${targetUser.name} excluído`,
    oldValue: {
      name: targetUser.name,
      email: targetUser.email,
      company: targetUser.company,
      companyId: targetUser.companyId,
      registration: targetUser.registration,
      department: targetUser.department,
      position: targetUser.position,
      is_active: targetUser.is_active,
      roles: targetRoleCodes,
    },
    newValue: { result: "deleted" },
    companyId: targetUser.companyId,
    workspaceId: targetUser.workspaceId,
  });

  revalidatePath("/usuarios");
  return {
    mode: "deleted" as const,
    message: "Usuário excluído.",
  };
}
