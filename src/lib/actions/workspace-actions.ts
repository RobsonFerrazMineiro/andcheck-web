"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import {
  getCurrentUserAccess,
  requireAnyPermission,
  requireRole,
} from "@/lib/authz";
import { WORKSPACE_CONTEXT_COOKIE } from "@/lib/data-scope";
import {
  enumValue,
  optionalNumber as parseOptionalNumber,
  optionalText,
  requiredId,
  requiredText,
} from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";

type WorkspaceSnapshot = {
  name: string;
  code: string;
  ownerCompanyId: string;
  city: string | null;
  state: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  active: boolean;
};

function workspaceSnapshot(workspace: WorkspaceSnapshot) {
  return {
    name: workspace.name,
    code: workspace.code,
    ownerCompanyId: workspace.ownerCompanyId,
    city: workspace.city,
    state: workspace.state,
    address: workspace.address,
    latitude: workspace.latitude,
    longitude: workspace.longitude,
    description: workspace.description,
    status: workspace.active ? "ACTIVE" : "INACTIVE",
  };
}

function normalizeCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 24);
}

async function generateWorkspaceCode(name: string) {
  const parts = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const base = parts
    .slice(0, 3)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join("-") || "WKS";

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const code = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const exists = await prisma.workspace.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }

  return crypto.randomUUID();
}

function parseWorkspaceForm(formData: FormData) {
  const name = requiredText(formData.get("name"), "Nome", 160);
  const requestedCode = normalizeCode(String(formData.get("code") ?? ""));
  const ownerCompanyId = requiredId(
    formData.get("ownerCompanyId"),
    "Empresa proprietaria",
  );
  const city = optionalText(formData.get("city"), "Cidade", 120);
  const state = optionalText(formData.get("state"), "Estado", 2)?.toUpperCase() ?? null;
  const address = optionalText(formData.get("address"), "Endereco", 240);
  const latitude = parseOptionalNumber(formData.get("latitude"), "Latitude", {
    min: -90,
    max: 90,
  });
  const longitude = parseOptionalNumber(formData.get("longitude"), "Longitude", {
    min: -180,
    max: 180,
  });
  const status = enumValue(
    formData.get("status") ?? "ACTIVE",
    ["ACTIVE", "INACTIVE"] as const,
    "Status do workspace",
  );
  const active = status === "ACTIVE";
  const description = optionalText(formData.get("description"), "Descrição", 500);

  if (state && state.length !== 2) {
    throw new Error("Estado deve usar a sigla com 2 caracteres.");
  }

  return {
    name,
    requestedCode,
    ownerCompanyId,
    city,
    state,
    address,
    latitude,
    longitude,
    active,
    description,
  };
}

async function assertOwnerCompany(ownerCompanyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: ownerCompanyId, active: true, type: "CLIENT" },
    select: { id: true },
  });
  if (!company) {
    throw new Error("Empresa proprietaria deve ser um cliente ativo.");
  }
}

async function assertWorkspaceCanBeDeactivated(id: string) {
  const [cookieStore, access] = await Promise.all([
    cookies(),
    getCurrentUserAccess(),
  ]);
  const selectedWorkspaceId =
    cookieStore.get(WORKSPACE_CONTEXT_COOKIE)?.value ?? access?.workspaceId;
  if (selectedWorkspaceId === id) {
    throw new Error(
      "Este workspace esta selecionado no contexto atual. Troque para outro workspace ativo antes de desativa-lo.",
    );
  }
}

export async function getWorkspaceManagementData() {
  await requireAnyPermission(["workspaces.manage", "workspaces.view"]);

  const [workspaces, ownerCompanies] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: { name: "asc" },
      include: {
        ownerCompany: { select: { id: true, name: true } },
        companyLinks: { where: { active: true }, select: { id: true } },
        _count: { select: { scaffolds: true } },
      },
    }),
    prisma.company.findMany({
      where: { active: true, type: "CLIENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { workspaces, ownerCompanies };
}

export async function getWorkspaceDetail(id: string) {
  await requireAnyPermission(["workspaces.manage", "workspaces.view"]);
  const workspaceId = requiredId(id, "Workspace");

  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      ownerCompany: { select: { id: true, name: true } },
      companyLinks: {
        where: { active: true },
        orderBy: [{ role: "asc" }, { company: { name: "asc" } }],
        select: {
          role: true,
          company: {
            select: { id: true, name: true, code: true, type: true, active: true },
          },
        },
      },
      _count: {
        select: {
          companyLinks: { where: { active: true } },
          users: true,
          scaffolds: true,
          inspections: true,
          nonConformities: true,
          scaffoldDocuments: true,
        },
      },
    },
  });
}

export async function createWorkspace(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const input = parseWorkspaceForm(formData);
  await assertOwnerCompany(input.ownerCompanyId);
  const code = input.requestedCode || (await generateWorkspaceCode(input.name));

  const workspace = await prisma.$transaction(async (transaction) => {
    const created = await transaction.workspace.create({
      data: {
        name: input.name,
        code,
        ownerCompanyId: input.ownerCompanyId,
        city: input.city,
        state: input.state,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        active: input.active,
        description: input.description,
      },
    });
    await transaction.companyWorkspace.create({
      data: {
        companyId: input.ownerCompanyId,
        workspaceId: created.id,
        role: "OWNER",
      },
    });
    return created;
  });

  await createAuditLog({
    entityType: AuditEntityType.WORKSPACE,
    entityId: workspace.id,
    entityLabel: workspace.name,
    action: AuditAction.WORKSPACE_CREATED,
    description: `Workspace ${workspace.name} criado`,
    newValue: workspaceSnapshot(workspace),
    companyId: workspace.ownerCompanyId,
    workspaceId: workspace.id,
  });

  revalidatePath("/workspaces");
  revalidatePath("/", "layout");
}

export async function updateWorkspace(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = requiredId(formData.get("workspaceId"), "Workspace");

  const input = parseWorkspaceForm(formData);
  await assertOwnerCompany(input.ownerCompanyId);
  const current = await prisma.workspace.findUnique({ where: { id } });
  if (!current) throw new Error("Workspace não encontrado.");
  if (current.active && !input.active) {
    await assertWorkspaceCanBeDeactivated(id);
  }

  const workspace = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.workspace.update({
      where: { id },
      data: {
        name: input.name,
        code: input.requestedCode || current.code,
        ownerCompanyId: input.ownerCompanyId,
        city: input.city,
        state: input.state,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        active: input.active,
        description: input.description,
      },
    });
    if (current.ownerCompanyId !== input.ownerCompanyId) {
      await transaction.companyWorkspace.updateMany({
        where: { workspaceId: id, role: "OWNER" },
        data: { active: false },
      });
    }
    await transaction.companyWorkspace.upsert({
      where: {
        companyId_workspaceId: {
          companyId: input.ownerCompanyId,
          workspaceId: id,
        },
      },
      update: { role: "OWNER", active: true },
      create: {
        companyId: input.ownerCompanyId,
        workspaceId: id,
        role: "OWNER",
      },
    });
    return updated;
  });

  const statusChanged = current.active !== workspace.active;
  await createAuditLog({
    entityType: AuditEntityType.WORKSPACE,
    entityId: workspace.id,
    entityLabel: workspace.name,
    action: statusChanged
      ? workspace.active
        ? AuditAction.WORKSPACE_ACTIVATED
        : AuditAction.WORKSPACE_DEACTIVATED
      : AuditAction.WORKSPACE_UPDATED,
    description: statusChanged
      ? `Workspace ${workspace.name} ${workspace.active ? "ativado" : "desativado"}`
      : `Workspace ${workspace.name} atualizado`,
    oldValue: workspaceSnapshot(current),
    newValue: workspaceSnapshot(workspace),
    companyId: workspace.ownerCompanyId,
    workspaceId: workspace.id,
  });

  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${workspace.id}`);
  revalidatePath("/", "layout");
}

export async function setWorkspaceActive(id: string, active: boolean) {
  await requireRole("SUPER_ADMIN");
  const workspaceId = requiredId(id, "Workspace");
  const current = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!current) throw new Error("Workspace não encontrado.");
  if (current.active === active) return;
  if (!active) await assertWorkspaceCanBeDeactivated(workspaceId);

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { active },
  });

  await createAuditLog({
    entityType: AuditEntityType.WORKSPACE,
    entityId: workspace.id,
    entityLabel: workspace.name,
    action: active
      ? AuditAction.WORKSPACE_ACTIVATED
      : AuditAction.WORKSPACE_DEACTIVATED,
    description: `Workspace ${workspace.name} ${active ? "ativado" : "desativado"}`,
    oldValue: workspaceSnapshot(current),
    newValue: workspaceSnapshot(workspace),
    companyId: workspace.ownerCompanyId,
    workspaceId: workspace.id,
  });

  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${workspace.id}`);
  revalidatePath("/", "layout");
}
