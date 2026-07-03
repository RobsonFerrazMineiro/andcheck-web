"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { getCurrentUserAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { requiredText } from "@/lib/input-validation";

export type PasswordChangeState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function getMyProfile() {
  const access = await getCurrentUserAccess();
  if (!access) throw new Error("Usuario nao autenticado.");

  const user = await prisma.user.findUnique({
    where: { id: access.userId },
    include: {
      tenantCompany: { select: { name: true } },
      workspace: { select: { name: true } },
      roles: {
        include: { role: true },
        orderBy: { assigned_at: "asc" },
      },
    },
  });
  if (!user || !user.is_active) throw new Error("Usuario nao encontrado.");

  const lastLogin = await prisma.auditLog.findFirst({
    where: {
      userId: user.id,
      action: AuditAction.LOGIN,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyName: user.tenantCompany.name,
    workspaceName: user.workspace.name,
    roleCodes: user.roles.map((userRole) => userRole.role.code),
    roleNames: user.roles.map((userRole) => userRole.role.name),
    isActive: user.is_active,
    createdAt: user.created_at,
    lastAccessAt: lastLogin?.createdAt ?? null,
  };
}

export async function changeMyPassword(
  _state: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const access = await getCurrentUserAccess();
  if (!access) {
    return { status: "error", message: "Sessao expirada. Entre novamente." };
  }

  let currentPassword: string;
  let newPassword: string;
  let confirmPassword: string;
  try {
    currentPassword = requiredText(
      formData.get("currentPassword"),
      "Senha atual",
      256,
    );
    newPassword = requiredText(formData.get("newPassword"), "Nova senha", 256);
    confirmPassword = requiredText(
      formData.get("confirmPassword"),
      "Confirmacao da senha",
      256,
    );
  } catch {
    return { status: "error", message: "Preencha todos os campos de senha." };
  }
  if (newPassword.length < 8) {
    return { status: "error", message: "A nova senha deve ter pelo menos 8 caracteres." };
  }
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return { status: "error", message: "A nova senha deve conter letras e numeros." };
  }
  if (newPassword !== confirmPassword) {
    return { status: "error", message: "A confirmacao nao confere com a nova senha." };
  }
  if (newPassword === currentPassword) {
    return { status: "error", message: "A nova senha deve ser diferente da atual." };
  }

  const user = await prisma.user.findUnique({
    where: { id: access.userId },
    select: {
      id: true,
      name: true,
      email: true,
      password_hash: true,
      companyId: true,
      workspaceId: true,
      is_active: true,
    },
  });
  if (!user || !user.is_active) {
    return { status: "error", message: "Usuario nao encontrado ou inativo." };
  }

  const currentPasswordMatches = await bcrypt.compare(
    currentPassword,
    user.password_hash,
  );
  if (!currentPasswordMatches) {
    return { status: "error", message: "Senha atual incorreta." };
  }

  const newPasswordMatchesCurrentHash = await bcrypt.compare(
    newPassword,
    user.password_hash,
  );
  if (newPasswordMatchesCurrentHash) {
    return { status: "error", message: "A nova senha deve ser diferente da atual." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: passwordHash },
  });

  await createAuditLog({
    entityType: AuditEntityType.USER,
    entityId: user.id,
    entityLabel: user.name,
    action: AuditAction.USER_PASSWORD_CHANGED,
    description: `Usuario ${user.name} alterou a propria senha`,
    newValue: { email: user.email },
    companyId: user.companyId,
    workspaceId: user.workspaceId,
  });

  revalidatePath("/perfil");

  return { status: "success", message: "Senha alterada com sucesso." };
}
