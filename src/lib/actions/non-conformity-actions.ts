"use server";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { requireAnyPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type NonConformityAuditValue = Prisma.InputJsonObject;

async function requireNonConformityAccess() {
  await requireAnyPermission([
    "non_conformities.view",
    "non_conformities.create",
    "non_conformities.update",
    "non_conformities.close",
    "non_conformities.add_evidence",
  ]);
}

function toAuditValue(value: {
  code?: string | null;
  title?: string | null;
  description?: string | null;
  classification?: string | null;
  status?: string | null;
  scaffoldId?: string | null;
  originInspectionId?: string | null;
  companyId?: string | null;
  responsibleUserId?: string | null;
  dueDate?: Date | string | null;
  closedAt?: Date | string | null;
}): NonConformityAuditValue {
  return {
    code: value.code ?? null,
    title: value.title ?? null,
    description: value.description ?? null,
    classification: value.classification ?? null,
    status: value.status ?? null,
    scaffoldId: value.scaffoldId ?? null,
    originInspectionId: value.originInspectionId ?? null,
    companyId: value.companyId ?? null,
    responsibleUserId: value.responsibleUserId ?? null,
    dueDate:
      value.dueDate instanceof Date
        ? value.dueDate.toISOString()
        : value.dueDate ?? null,
    closedAt:
      value.closedAt instanceof Date
        ? value.closedAt.toISOString()
        : value.closedAt ?? null,
  };
}

async function writeNonConformityAudit({
  id,
  action,
  description,
  oldValue,
  newValue,
}: {
  id: string;
  action: AuditAction;
  description: string;
  oldValue?: NonConformityAuditValue;
  newValue?: NonConformityAuditValue;
}) {
  try {
    const nc = await prisma.nonConformity.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        companyId: true,
      },
    });

    if (!nc) return;

    await Promise.all([
      prisma.nonConformityHistory.create({
        data: {
          nonConformityId: nc.id,
          action,
          description,
          oldValue: oldValue ?? Prisma.JsonNull,
          newValue: newValue ?? Prisma.JsonNull,
        },
      }),
      createAuditLog({
        entityType: AuditEntityType.NON_CONFORMITY,
        entityId: nc.id,
        entityLabel: nc.code,
        action,
        description,
        oldValue,
        newValue,
        companyId: nc.companyId,
      }),
    ]);
  } catch (error) {
    console.error("Non conformity audit log failed:", error);
  }
}

export async function logNonConformityCreated(id: string) {
  await requireNonConformityAccess();

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) return;

  await writeNonConformityAudit({
    id,
    action: AuditAction.CREATE,
    description: `Nao conformidade ${nc.code} criada`,
    newValue: toAuditValue(nc),
  });
}

export async function logNonConformityUpdated({
  id,
  oldValue,
  newValue,
}: {
  id: string;
  oldValue: NonConformityAuditValue;
  newValue: NonConformityAuditValue;
}) {
  await requireNonConformityAccess();

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) return;

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPDATE,
    description: `Nao conformidade ${nc.code} atualizada`,
    oldValue,
    newValue,
  });
}

export async function logNonConformityClosed({
  id,
  oldValue,
  newValue,
}: {
  id: string;
  oldValue: NonConformityAuditValue;
  newValue: NonConformityAuditValue;
}) {
  await requireNonConformityAccess();

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) return;

  await writeNonConformityAudit({
    id,
    action: AuditAction.COMPLETE,
    description: `Nao conformidade ${nc.code} encerrada`,
    oldValue,
    newValue,
  });
}

export async function logNonConformityStatusChanged({
  id,
  oldStatus,
  newStatus,
}: {
  id: string;
  oldStatus: string | null;
  newStatus: string | null;
}) {
  await requireNonConformityAccess();

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) return;

  await writeNonConformityAudit({
    id,
    action: AuditAction.STATUS_CHANGE,
    description: `Status da nao conformidade ${nc.code} alterado de ${oldStatus ?? "-"} para ${newStatus ?? "-"}`,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
  });
}

export async function logNonConformityEvidenceAdded({
  id,
  evidenceType,
  fileName,
}: {
  id: string;
  evidenceType: string;
  fileName: string;
}) {
  await requireNonConformityAccess();

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) return;

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPLOAD,
    description: `Evidencia ${fileName} anexada a nao conformidade ${nc.code}`,
    newValue: {
      evidenceType,
      fileName,
    },
  });
}

export async function logNonConformityResponsibleChanged({
  id,
  oldResponsibleUserId,
  newResponsibleUserId,
}: {
  id: string;
  oldResponsibleUserId: string | null;
  newResponsibleUserId: string | null;
}) {
  await requireNonConformityAccess();

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) return;

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPDATE,
    description: `Responsavel da nao conformidade ${nc.code} alterado`,
    oldValue: { responsibleUserId: oldResponsibleUserId },
    newValue: { responsibleUserId: newResponsibleUserId },
  });
}

export async function logNonConformityDueDateChanged({
  id,
  oldDueDate,
  newDueDate,
}: {
  id: string;
  oldDueDate: string | null;
  newDueDate: string | null;
}) {
  await requireNonConformityAccess();

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) return;

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPDATE,
    description: `Prazo da nao conformidade ${nc.code} alterado`,
    oldValue: { dueDate: oldDueDate },
    newValue: { dueDate: newDueDate },
  });
}

export async function getNonConformities() {
  await requireNonConformityAccess();

  return prisma.nonConformity.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      scaffold: {
        select: {
          id: true,
          code: true,
          area: true,
          location: true,
          company: true,
        },
      },
      originInspection: {
        select: {
          id: true,
          date: true,
          result: true,
          inspector_name: true,
        },
      },
      responsibleUser: {
        select: {
          id: true,
          name: true,
          company: true,
        },
      },
      _count: {
        select: {
          checklistItems: true,
          evidences: true,
          history: true,
        },
      },
    },
  });
}

export async function getNonConformityById(id: string) {
  await requireNonConformityAccess();

  return prisma.nonConformity.findUnique({
    where: { id },
    include: {
      scaffold: {
        select: {
          id: true,
          code: true,
          area: true,
          location: true,
          company: true,
          responsible: true,
        },
      },
      originInspection: {
        select: {
          id: true,
          date: true,
          result: true,
          inspector_name: true,
          scaffold_code: true,
        },
      },
      responsibleUser: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          department: true,
          position: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      checklistItems: {
        include: {
          checklistEntry: true,
        },
        orderBy: { createdAt: "asc" },
      },
      evidences: {
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      history: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
