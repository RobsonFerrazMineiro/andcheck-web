"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAnyPermission,
  requirePermission,
  requireRole,
} from "@/lib/authz";
import {
  AuditAction,
  AuditEntityType,
  createAuditLog,
  logScaffoldStatusConsultation,
} from "@/lib/audit";
import { generateNextScaffoldTag } from "@/lib/scaffold-code";
import {
  assertRecordInDataScope,
  dataScopeWhere,
  getDataScope,
  getOwnedCreationContext,
} from "@/lib/data-scope";
import { ScaffoldStatus, ScaffoldType } from "@prisma/client";

// ── Listar todos ──────────────────────────────────────────────────────────────
export async function getScaffolds() {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  return prisma.scaffold.findMany({
    where: dataScopeWhere(scope),
    orderBy: { code: "asc" },
    include: {
      tenantCompany: { select: { id: true, name: true } },
      _count: { select: { inspections: true } },
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true },
      },
    },
  });
}

// ── Buscar por ID ─────────────────────────────────────────────────────────────
export async function getScaffoldById(id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  return prisma.scaffold.findFirst({
    where: { id, ...dataScopeWhere(scope) },
    include: {
      inspections: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          inspector_name: true,
          result: true,
          validity_days: true,
        },
      },
      nonConformities: {
        orderBy: { createdAt: "desc" },
        include: {
          responsibleUser: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      },
    },
  });
}

// ── Buscar por tag (QR) ───────────────────────────────────────────────────────
export async function getScaffoldByTag(tag: string) {
  const scaffold = await prisma.scaffold.findFirst({
    where: { OR: [{ tag }, { code: tag }, { id: tag }] },
    include: {
      inspections: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true, result: true, inspector_name: true },
      },
    },
  });
  if (scaffold) {
    await logScaffoldStatusConsultation(scaffold);
  }
  return scaffold;
}

// ── Criar ─────────────────────────────────────────────────────────────────────
export async function createScaffold(
  data: {
    type: ScaffoldType;
    location: string;
    area: string;
    height: number;
    width?: number;
    length?: number;
    max_load?: number;
    responsible: string;
    company?: string;
    notes?: string;
    latitude?: number;
    longitude?: number;
    location_description?: string;
  },
  attempt = 0,
): Promise<Awaited<ReturnType<typeof prisma.scaffold.create>>> {
  await requirePermission("scaffolds.create");
  const scope = await getDataScope();
  const requestedCompany = data.company?.trim();
  const selectedCompany =
    scope.isGlobal && requestedCompany
      ? await prisma.company.findFirst({
          where: {
            OR: [
              { id: requestedCompany },
              { name: { equals: requestedCompany, mode: "insensitive" } },
              {
                tradeName: {
                  equals: requestedCompany,
                  mode: "insensitive",
                },
              },
            ],
          },
          select: { id: true, name: true },
        })
      : null;
  const creationContext = scope.isGlobal
    ? {
        companyId: selectedCompany?.id ?? scope.actorCompanyId,
        workspaceId: scope.actorWorkspaceId,
      }
    : getOwnedCreationContext(scope);
  const tenantCompany =
    selectedCompany ??
    (await prisma.company.findUnique({
      where: { id: creationContext.companyId },
      select: { name: true },
    }));

  const code = await generateNextScaffoldTag(attempt);
  try {
    const scaffold = await prisma.scaffold.create({
      data: {
        ...data,
        ...creationContext,
        company: tenantCompany?.name ?? data.company,
        code,
        tag: code, // QR Code usa o mesmo código fixo e legível
        status: "em_montagem",
      },
    });
    await createAuditLog({
      entityType: AuditEntityType.SCAFFOLD,
      entityId: scaffold.id,
      entityLabel: scaffold.code,
      action: AuditAction.CREATE,
      description: `Andaime ${scaffold.code} criado`,
      newValue: {
        code: scaffold.code,
        status: scaffold.status,
        type: scaffold.type,
        location: scaffold.location,
        area: scaffold.area,
        company: scaffold.company,
        latitude: scaffold.latitude,
        longitude: scaffold.longitude,
      },
      companyId: scaffold.companyId,
      workspaceId: scaffold.workspaceId,
    });
    return scaffold;
  } catch (err: unknown) {
    // Conflito de unique constraint por concorrência → tenta novamente
    const isUniqueViolation =
      err instanceof Error && err.message.includes("Unique constraint");
    if (isUniqueViolation) {
      return createScaffold(data, attempt + 1);
    }
    throw err;
  }
}

// ── Atualizar status ──────────────────────────────────────────────────────────
export async function updateScaffoldStatus(id: string, status: ScaffoldStatus) {
  await requirePermission("scaffolds.update");
  const scope = await getDataScope();
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id } });
  assertRecordInDataScope(scope, oldScaffold);
  const scaffold = await prisma.scaffold.update({ where: { id }, data: { status } });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.STATUS_CHANGE,
    description: `Status do andaime ${scaffold.code} alterado de ${oldScaffold?.status ?? "-"} para ${scaffold.status}`,
    oldValue: { status: oldScaffold?.status ?? null },
    newValue: { status: scaffold.status },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  return scaffold;
}

// ── Concluir montagem → PENDENTE_LIBERACAO ────────────────────────────────────
export async function completeAssembly(id: string) {
  await requirePermission("scaffolds.complete_assembly");
  const scope = await getDataScope();
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id } });
  assertRecordInDataScope(scope, oldScaffold);
  const scaffold = await prisma.scaffold.update({
    where: { id },
    data: {
      status: "pendente_liberacao",
      assembly_completed_at: new Date(),
    },
  });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.COMPLETE,
    description: `Montagem do andaime ${scaffold.code} concluida`,
    oldValue: { status: oldScaffold?.status ?? null },
    newValue: {
      status: scaffold.status,
      assembly_completed_at: scaffold.assembly_completed_at?.toISOString(),
    },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  return scaffold;
}

// ── Desmontar → DESMONTADO ────────────────────────────────────────────────────
export async function dismantleScaffold(id: string) {
  await requirePermission("scaffolds.dismantle");
  const scope = await getDataScope();
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id } });
  assertRecordInDataScope(scope, oldScaffold);
  const scaffold = await prisma.scaffold.update({
    where: { id },
    data: {
      status: "desmontado",
      dismantled_at: new Date(),
    },
  });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.STATUS_CHANGE,
    description: `Andaime ${scaffold.code} desmontado`,
    oldValue: { status: oldScaffold?.status ?? null },
    newValue: {
      status: scaffold.status,
      dismantled_at: scaffold.dismantled_at?.toISOString(),
    },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  return scaffold;
}

// ── Deletar ───────────────────────────────────────────────────────────────────
export async function deleteScaffold(id: string) {
  await requireRole("SUPER_ADMIN");
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id } });
  const scaffold = await prisma.scaffold.delete({ where: { id } });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.DELETE,
    description: `Andaime ${scaffold.code} excluido`,
    oldValue: oldScaffold
      ? {
          code: oldScaffold.code,
          status: oldScaffold.status,
          type: oldScaffold.type,
          location: oldScaffold.location,
          area: oldScaffold.area,
          company: oldScaffold.company,
        }
      : undefined,
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });
  return scaffold;
}
