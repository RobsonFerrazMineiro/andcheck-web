"use server";

import { prisma } from "@/lib/prisma";
import {
  requireAnyPermission,
  requirePermission,
  requireRole,
} from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { generateNextScaffoldTag } from "@/lib/scaffold-code";
import { ScaffoldStatus, ScaffoldType } from "@prisma/client";

// ── Listar todos ──────────────────────────────────────────────────────────────
export async function getScaffolds() {
  await requireAnyPermission(["read.all", "read.own_company"]);

  return prisma.scaffold.findMany({
    orderBy: { code: "asc" },
    include: {
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

  return prisma.scaffold.findUnique({
    where: { id },
    include: {
      inspections: {
        orderBy: { date: "desc" },
        include: { checklist: true },
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
    await createAuditLog({
      entityType: AuditEntityType.QR_CODE,
      entityId: scaffold.id,
      entityLabel: scaffold.code,
      action: AuditAction.VIEW_QR,
      description: `QR Code do andaime ${scaffold.code} consultado`,
      newValue: {
        tag,
        code: scaffold.code,
        status: scaffold.status,
      },
      companyId: scaffold.company,
    });
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

  const code = await generateNextScaffoldTag(attempt);
  try {
    const scaffold = await prisma.scaffold.create({
      data: {
        ...data,
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
      companyId: scaffold.company,
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
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id } });
  const scaffold = await prisma.scaffold.update({ where: { id }, data: { status } });
  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.STATUS_CHANGE,
    description: `Status do andaime ${scaffold.code} alterado de ${oldScaffold?.status ?? "-"} para ${scaffold.status}`,
    oldValue: { status: oldScaffold?.status ?? null },
    newValue: { status: scaffold.status },
    companyId: scaffold.company,
  });
  return scaffold;
}

// ── Concluir montagem → PENDENTE_LIBERACAO ────────────────────────────────────
export async function completeAssembly(id: string) {
  await requirePermission("scaffolds.complete_assembly");
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id } });
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
    companyId: scaffold.company,
  });
  return scaffold;
}

// ── Desmontar → DESMONTADO ────────────────────────────────────────────────────
export async function dismantleScaffold(id: string) {
  await requirePermission("scaffolds.dismantle");
  const oldScaffold = await prisma.scaffold.findUnique({ where: { id } });
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
    companyId: scaffold.company,
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
    companyId: scaffold.company,
  });
  return scaffold;
}
