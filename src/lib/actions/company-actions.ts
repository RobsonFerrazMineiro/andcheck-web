"use server";

import { revalidatePath } from "next/cache";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { getCurrentUserAccess, requireAnyPermission, requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CompanyType } from "@prisma/client";

const COMPANY_TYPES = new Set<CompanyType>([
  CompanyType.CLIENT,
  CompanyType.HSE_MANAGER,
  CompanyType.SCAFFOLD_COMPANY,
]);

function companySnapshot(company: {
  name: string;
  code: string;
  type: CompanyType;
  active: boolean;
  description: string | null;
  logoUrl: string | null;
  workspaceId: string;
}) {
  return {
    name: company.name,
    code: company.code,
    type: company.type,
    status: company.active ? "ACTIVE" : "INACTIVE",
    description: company.description,
    logoUrl: company.logoUrl,
    workspaceId: company.workspaceId,
  };
}

function normalizeCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12);
}

async function generateCompanyCode(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = normalizeCode(words.map((word) => word[0]).join(""));
  const base = (initials.length >= 3 ? initials : normalizeCode(name)).slice(0, 6) || "EMP";

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const code = suffix === 0 ? base : `${base}${suffix + 1}`;
    const exists = await prisma.company.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }

  return crypto.randomUUID();
}

function parseCompanyForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const requestedCode = normalizeCode(String(formData.get("code") ?? ""));
  const type = String(formData.get("type") ?? "") as CompanyType;
  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const active = String(formData.get("status") ?? "ACTIVE") === "ACTIVE";
  const description = String(formData.get("description") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;

  if (!name || !workspaceId || !COMPANY_TYPES.has(type)) {
    throw new Error("Nome, tipo e workspace sao obrigatorios.");
  }

  return { name, requestedCode, type, workspaceId, active, description, logoUrl };
}

async function assertWorkspace(workspaceId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, active: true },
    select: { id: true },
  });
  if (!workspace) throw new Error("Workspace selecionado nao esta disponivel.");
}

export async function getCompanyManagementData() {
  await requireAnyPermission(["companies.manage", "companies.view"]);

  const [companies, workspaces] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        workspace: { select: { id: true, name: true } },
        _count: { select: { users: true, scaffolds: true } },
      },
    }),
    prisma.workspace.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { companies, workspaces };
}

export async function getCompanyDetail(id: string) {
  await requireAnyPermission(["companies.manage", "companies.view"]);

  return prisma.company.findUnique({
    where: { id },
    include: {
      workspace: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          users: true,
          scaffolds: true,
          inspections: true,
          nonConformities: true,
        },
      },
    },
  });
}

export async function createCompany(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const input = parseCompanyForm(formData);
  await assertWorkspace(input.workspaceId);
  const code = input.requestedCode || (await generateCompanyCode(input.name));

  const company = await prisma.company.create({
    data: {
      name: input.name,
      code,
      type: input.type,
      workspaceId: input.workspaceId,
      active: input.active,
      description: input.description,
      logoUrl: input.logoUrl,
    },
  });

  await createAuditLog({
    entityType: AuditEntityType.COMPANY,
    entityId: company.id,
    entityLabel: company.name,
    action: AuditAction.COMPANY_CREATED,
    description: `Empresa ${company.name} criada`,
    newValue: companySnapshot(company),
    companyId: company.id,
    workspaceId: company.workspaceId,
  });

  revalidatePath("/empresas");
  revalidatePath("/", "layout");
}

export async function updateCompany(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const actor = await getCurrentUserAccess();
  const id = String(formData.get("companyId") ?? "").trim();
  if (!id) throw new Error("Empresa nao informada.");

  const input = parseCompanyForm(formData);
  await assertWorkspace(input.workspaceId);
  const current = await prisma.company.findUnique({ where: { id } });
  if (!current) throw new Error("Empresa nao encontrada.");
  if (!input.active && current.active && actor?.companyId === id) {
    throw new Error("Nao e permitido desativar a empresa do usuario atual.");
  }
  const code = input.requestedCode || current.code;

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: input.name,
      code,
      type: input.type,
      workspaceId: input.workspaceId,
      active: input.active,
      description: input.description,
      logoUrl: input.logoUrl,
    },
  });

  await createAuditLog({
    entityType: AuditEntityType.COMPANY,
    entityId: company.id,
    entityLabel: company.name,
    action:
      current.active === company.active
        ? AuditAction.COMPANY_UPDATED
        : company.active
          ? AuditAction.COMPANY_ACTIVATED
          : AuditAction.COMPANY_DEACTIVATED,
    description:
      current.active === company.active
        ? `Empresa ${company.name} atualizada`
        : `Empresa ${company.name} ${company.active ? "ativada" : "desativada"}`,
    oldValue: companySnapshot(current),
    newValue: companySnapshot(company),
    companyId: company.id,
    workspaceId: company.workspaceId,
  });

  revalidatePath("/empresas");
  revalidatePath(`/empresas/${company.id}`);
  revalidatePath("/", "layout");
}

export async function setCompanyActive(id: string, active: boolean) {
  await requireRole("SUPER_ADMIN");
  const actor = await getCurrentUserAccess();
  const current = await prisma.company.findUnique({ where: { id } });
  if (!current) throw new Error("Empresa nao encontrada.");
  if (!active && actor?.companyId === id) {
    throw new Error("Nao e permitido desativar a empresa do usuario atual.");
  }
  if (current.active === active) return;

  const company = await prisma.company.update({
    where: { id },
    data: { active },
  });

  await createAuditLog({
    entityType: AuditEntityType.COMPANY,
    entityId: company.id,
    entityLabel: company.name,
    action: active
      ? AuditAction.COMPANY_ACTIVATED
      : AuditAction.COMPANY_DEACTIVATED,
    description: `Empresa ${company.name} ${active ? "ativada" : "desativada"}`,
    oldValue: companySnapshot(current),
    newValue: companySnapshot(company),
    companyId: company.id,
    workspaceId: company.workspaceId,
  });

  revalidatePath("/empresas");
  revalidatePath(`/empresas/${company.id}`);
  revalidatePath("/", "layout");
}
