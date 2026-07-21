"use server";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import {
  getCurrentUserAccess,
  requireAnyPermission,
  requirePermission,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertStoredFileOrInlineFileReference } from "@/lib/file-storage-reference";
import {
  enumValue,
  optionalDate,
  optionalNumber,
  optionalText,
  requiredId,
  requiredText,
} from "@/lib/input-validation";
import { sanitizeForLog } from "@/lib/safe-log";
import {
  assertRecordInDataScope,
  dataScopeWhere,
  getDataScope,
} from "@/lib/data-scope";
import {
  NonConformityEvidenceType,
  NonConformityStatus,
  Prisma,
  ScaffoldStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications/service";

type NonConformityAuditValue = Prisma.InputJsonObject;

const RESPONSIBLE_ROLE_CODES = [
  "PLANEJAMENTO",
  "SUPERVISOR",
  "ENCARREGADO",
  "SUPERVISOR_ENCARREGADO",
];
const INLINE_EVIDENCE_REFERENCE_MAX_LENGTH = 15 * 1024 * 1024;
const HSE_ROLE_CODES = ["HSE_HYDRO", "HSE_GERENCIADORA", "HSE_EMPRESA"];
const FINAL_STATUSES = ["CLOSED", "CANCELLED"];
const NC_BLOCKED_SCAFFOLD_STATUSES: ScaffoldStatus[] = [
  ScaffoldStatus.reprovado,
  ScaffoldStatus.interditado,
];

function hasAnyRole(
  access: Awaited<ReturnType<typeof getCurrentUserAccess>>,
  roles: string[],
) {
  return Boolean(
    access?.roleCodes.some(
      (roleCode: string) =>
        roleCode === "SUPER_ADMIN" || roles.includes(roleCode),
    ),
  );
}

async function requireWorkflowRole(roles: string[], message: string) {
  const access = await getCurrentUserAccess();
  if (hasAnyRole(access, roles)) return access;
  throw new Error(message);
}

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
    const scope = await getDataScope();
    const [nc, access] = await Promise.all([
      prisma.nonConformity.findFirst({
      where: { id, ...dataScopeWhere(scope) },
      select: {
        id: true,
        code: true,
        companyId: true,
        workspaceId: true,
        scaffoldId: true,
        originInspectionId: true,
      },
      }),
      getCurrentUserAccess(),
    ]);

    if (!nc) return;

    await Promise.all([
      prisma.nonConformityHistory.create({
        data: {
          nonConformityId: nc.id,
          action,
          description,
          oldValue: oldValue ?? Prisma.JsonNull,
          newValue: newValue ?? Prisma.JsonNull,
          userId: access?.userId ?? null,
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
        workspaceId: nc.workspaceId,
      }),
    ]);

    revalidatePath("/nao-conformidades");
    revalidatePath(`/nao-conformidades/${nc.id}`);
    revalidatePath(`/andaimes/${nc.scaffoldId}`);
    revalidatePath(`/inspecoes/${nc.originInspectionId}`);
  } catch (error) {
    console.error(
      "Non conformity audit log failed:",
      sanitizeForLog(error),
    );
  }
}

async function returnScaffoldToPendingReleaseAfterClosure({
  ncCode,
  scaffold,
}: {
  ncCode: string;
  scaffold: {
    id: string;
    code: string;
    status: ScaffoldStatus;
    company: string | null;
    companyId: string;
    workspaceId: string;
    tag: string | null;
  } | null;
}) {
  if (!scaffold || !NC_BLOCKED_SCAFFOLD_STATUSES.includes(scaffold.status)) {
    return false;
  }

  const activeNonConformities = await prisma.nonConformity.count({
    where: {
      scaffoldId: scaffold.id,
      status: {
        notIn: [
          NonConformityStatus.CLOSED,
          NonConformityStatus.CANCELLED,
        ],
      },
    },
  });
  if (activeNonConformities > 0) return false;

  const updatedScaffold = await prisma.scaffold.update({
    where: { id: scaffold.id },
    data: { status: ScaffoldStatus.pendente_liberacao },
  });

  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: updatedScaffold.id,
    entityLabel: updatedScaffold.code,
    action: AuditAction.STATUS_CHANGE,
    description: `Não conformidade ${ncCode} encerrada. Andaime ${updatedScaffold.code} retornou para pendente de liberação.`,
    oldValue: {
      status: scaffold.status,
      nonConformityCode: ncCode,
    },
    newValue: {
      status: updatedScaffold.status,
      nonConformityCode: ncCode,
      requiresNewInspection: true,
    },
    companyId: updatedScaffold.companyId,
    workspaceId: updatedScaffold.workspaceId,
  });

  revalidatePath("/andaimes");
  revalidatePath(`/andaimes/${updatedScaffold.id}`);
  revalidatePath("/mapa");
  revalidatePath(`/qr/${updatedScaffold.tag ?? updatedScaffold.code}`);

  return true;
}

function assertAllowedTransition(
  currentStatus: NonConformityStatus,
  nextStatus: NonConformityStatus,
) {
  const allowed: Record<NonConformityStatus, NonConformityStatus[]> = {
    OPEN: [NonConformityStatus.ASSIGNED, NonConformityStatus.CANCELLED],
    ASSIGNED: [
      NonConformityStatus.PENDING_VERIFICATION,
      NonConformityStatus.CANCELLED,
    ],
    IN_PROGRESS: [
      NonConformityStatus.PENDING_VERIFICATION,
      NonConformityStatus.CANCELLED,
    ],
    PENDING_VERIFICATION: [
      NonConformityStatus.CLOSED,
      NonConformityStatus.REJECTED,
    ],
    REJECTED: [
      NonConformityStatus.PENDING_VERIFICATION,
      NonConformityStatus.CANCELLED,
    ],
    CLOSED: [],
    CANCELLED: [],
  };

  if (!allowed[currentStatus]?.includes(nextStatus)) {
    throw new Error(
      `Transição não permitida: ${currentStatus} para ${nextStatus}.`,
    );
  }
}

function statusDescription(
  code: string,
  currentStatus: NonConformityStatus,
  nextStatus: NonConformityStatus,
) {
  if (currentStatus === "OPEN" && nextStatus === "ASSIGNED") {
    return `Responsável atribuído e NC ${code} movida para Em Correção`;
  }
  if (
    ["ASSIGNED", "IN_PROGRESS", "REJECTED"].includes(currentStatus) &&
    nextStatus === "PENDING_VERIFICATION"
  ) {
    return `Solicitacao de verificacao registrada para a NC ${code}`;
  }
  if (nextStatus === "CLOSED") return `Correcao da NC ${code} aceita e encerrada`;
  if (nextStatus === "REJECTED") return `Correcao da NC ${code} rejeitada`;
  if (nextStatus === "CANCELLED") return `NC ${code} cancelada`;
  return `Status da NC ${code} alterado`;
}

export async function logNonConformityCreated(id: string) {
  await requireNonConformityAccess();
  const nonConformityId = requiredId(id, "Não conformidade");

  const nc = await prisma.nonConformity.findUnique({
    where: { id: nonConformityId },
    include: { scaffold: { select: { code: true, area: true } } },
  });
  if (!nc) return;

  await writeNonConformityAudit({
    id: nonConformityId,
    action: AuditAction.CREATE,
    description: `Não conformidade ${nc.code} criada`,
    newValue: toAuditValue(nc),
  });
  await createNotification({
    companyId: nc.companyId,
    workspaceId: nc.workspaceId,
    userId: nc.responsibleUserId,
    type: "NONCONFORMITY_OPENED",
    severity: "WARNING",
    title: `NC ${nc.code} aberta`,
    message: `A não conformidade ${nc.code} foi aberta no andaime ${nc.scaffold.code}.`,
    entityType: "NONCONFORMITY",
    entityId: nc.id,
    channels: ["INTERNAL", "EMAIL"],
    metadata: {
      entityLabel: nc.code,
      status: nc.status,
      scaffoldCode: nc.scaffold.code,
      area: nc.scaffold.area,
    },
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
  const nonConformityId = requiredId(id, "Não conformidade");

  const nc = await prisma.nonConformity.findUnique({
    where: { id: nonConformityId },
  });
  if (!nc) return;

  await writeNonConformityAudit({
    id: nonConformityId,
    action: AuditAction.UPDATE,
    description: `Não conformidade ${nc.code} atualizada`,
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
  const nonConformityId = requiredId(id, "Não conformidade");

  const nc = await prisma.nonConformity.findUnique({
    where: { id: nonConformityId },
  });
  if (!nc) return;

  await writeNonConformityAudit({
    id: nonConformityId,
    action: AuditAction.COMPLETE,
    description: `Não conformidade ${nc.code} encerrada`,
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
  const nonConformityId = requiredId(id, "Não conformidade");

  const nc = await prisma.nonConformity.findUnique({
    where: { id: nonConformityId },
  });
  if (!nc) return;

  await writeNonConformityAudit({
    id: nonConformityId,
    action: AuditAction.STATUS_CHANGE,
    description: `Status da não conformidade ${nc.code} alterado de ${oldStatus ?? "-"} para ${newStatus ?? "-"}`,
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
  const nonConformityId = requiredId(id, "Não conformidade");
  const safeFileName = requiredText(fileName, "Nome do arquivo", 240);

  const nc = await prisma.nonConformity.findUnique({
    where: { id: nonConformityId },
  });
  if (!nc) return;

  await writeNonConformityAudit({
    id: nonConformityId,
    action: AuditAction.UPLOAD,
    description: `Evidência ${safeFileName} anexada à não conformidade ${nc.code}`,
    newValue: {
      evidenceType,
      fileName: safeFileName,
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
  const nonConformityId = requiredId(id, "Não conformidade");

  const nc = await prisma.nonConformity.findUnique({
    where: { id: nonConformityId },
  });
  if (!nc) return;

  await writeNonConformityAudit({
    id: nonConformityId,
    action: AuditAction.UPDATE,
    description: `Responsável da não conformidade ${nc.code} alterado`,
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
  const nonConformityId = requiredId(id, "Não conformidade");

  const nc = await prisma.nonConformity.findUnique({
    where: { id: nonConformityId },
  });
  if (!nc) return;

  await writeNonConformityAudit({
    id: nonConformityId,
    action: AuditAction.UPDATE,
    description: `Prazo da não conformidade ${nc.code} alterado`,
    oldValue: { dueDate: oldDueDate },
    newValue: { dueDate: newDueDate },
  });
}

export async function getNonConformityResponsibleOptions() {
  await requireAnyPermission([
    "non_conformities.view",
    "non_conformities.update",
    "non_conformities.close",
  ]);
  const scope = await getDataScope();

  return prisma.user.findMany({
    where: {
      ...dataScopeWhere(scope),
      is_active: true,
      roles: {
        some: {
          role: {
            code: { in: RESPONSIBLE_ROLE_CODES },
          },
        },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      department: true,
      position: true,
    },
  });
}

export async function updateNonConformityStatus(formData: FormData) {
  const scope = await getDataScope();
  const id = requiredId(formData.get("id"), "Não conformidade");
  const parsedNextStatus = enumValue(
    formData.get("status"),
    Object.values(NonConformityStatus),
    "Status informado",
  );
  const comment = optionalText(formData.get("comment"), "Comentario", 1000) ?? "";

  const nc = await prisma.nonConformity.findUnique({
    where: { id },
    include: {
      checklistItems: {
        include: {
          _count: { select: { evidences: true } },
        },
      },
      scaffold: {
        select: {
          id: true,
          code: true,
          status: true,
          company: true,
          companyId: true,
          workspaceId: true,
          tag: true,
        },
      },
      _count: { select: { evidences: true } },
    },
  });

  if (!nc) throw new Error("Não conformidade não encontrada.");
  assertRecordInDataScope(scope, nc);

  assertAllowedTransition(nc.status, parsedNextStatus);

  if (parsedNextStatus === NonConformityStatus.PENDING_VERIFICATION) {
    await requireWorkflowRole(
      RESPONSIBLE_ROLE_CODES,
      "Somente Planejamento, Supervisor ou Encarregado podem solicitar verificacao.",
    );
  } else if (
    parsedNextStatus === NonConformityStatus.CLOSED ||
    parsedNextStatus === NonConformityStatus.REJECTED ||
    parsedNextStatus === NonConformityStatus.CANCELLED
  ) {
    await requireWorkflowRole(
      HSE_ROLE_CODES,
      "Somente HSE pode avaliar, encerrar, rejeitar ou cancelar uma NC.",
    );
  } else {
    await requirePermission("non_conformities.update");
  }

  const itemEvidenceCount = nc.checklistItems.reduce(
    (total, item) => total + item._count.evidences,
    0,
  );

  if (parsedNextStatus === NonConformityStatus.CLOSED) {
    if (nc.status !== NonConformityStatus.PENDING_VERIFICATION) {
      throw new Error(
        "A NC só pode ser encerrada quando estiver Aguardando Verificação.",
      );
    }
    if (nc._count.evidences + itemEvidenceCount === 0) {
      throw new Error(
        "Anexe pelo menos uma evidência por item antes de encerrar a NC.",
      );
    }
    if (!comment) {
      throw new Error("Informe o comentario de encerramento.");
    }
  }

  if (parsedNextStatus === NonConformityStatus.REJECTED && !comment) {
    throw new Error("Informe o motivo da rejeicao.");
  }

  if (parsedNextStatus === NonConformityStatus.CANCELLED && !comment) {
    throw new Error("Informe o motivo do cancelamento.");
  }

  if (
    parsedNextStatus === NonConformityStatus.PENDING_VERIFICATION &&
    !nc.responsibleUserId
  ) {
    throw new Error("Atribua um responsável antes de solicitar verificação.");
  }

  const updated = await prisma.nonConformity.update({
    where: { id },
    data: {
      status: parsedNextStatus,
      closedAt:
        parsedNextStatus === NonConformityStatus.CLOSED ? new Date() : null,
    },
  });

  const scaffoldReturnedToPendingRelease =
    parsedNextStatus === NonConformityStatus.CLOSED
      ? await returnScaffoldToPendingReleaseAfterClosure({
          ncCode: nc.code,
          scaffold: nc.scaffold,
        })
      : false;

  await writeNonConformityAudit({
    id,
    action:
      parsedNextStatus === NonConformityStatus.CLOSED
        ? AuditAction.COMPLETE
        : AuditAction.STATUS_CHANGE,
    description: statusDescription(nc.code, nc.status, parsedNextStatus),
    oldValue: toAuditValue(nc),
    newValue: {
      ...toAuditValue(updated),
      comment: comment || null,
      scaffoldReturnedToPendingRelease,
      requiresNewInspection: scaffoldReturnedToPendingRelease || undefined,
    },
  });

  if (parsedNextStatus === NonConformityStatus.CLOSED) {
    await createNotification({
      companyId: updated.companyId,
      workspaceId: updated.workspaceId,
      userId: updated.responsibleUserId,
      type: "NONCONFORMITY_CLOSED",
      severity: "SUCCESS",
      title: `NC ${nc.code} encerrada`,
      message: `A não conformidade ${nc.code} foi encerrada.`,
      entityType: "NONCONFORMITY",
      entityId: nc.id,
      channels: ["INTERNAL"],
      metadata: {
        entityLabel: nc.code,
        status: updated.status,
        scaffoldCode: nc.scaffold.code,
      },
    });
  } else if (parsedNextStatus === NonConformityStatus.PENDING_VERIFICATION) {
    await createNotification({
      companyId: updated.companyId,
      workspaceId: updated.workspaceId,
      userId: updated.responsibleUserId,
      type: "NONCONFORMITY_CORRECTED",
      severity: "SUCCESS",
      title: `NC ${nc.code} corrigida`,
      message: `A não conformidade ${nc.code} foi enviada para verificação.`,
      entityType: "NONCONFORMITY",
      entityId: nc.id,
      channels: ["INTERNAL"],
      metadata: {
        entityLabel: nc.code,
        status: updated.status,
        scaffoldCode: nc.scaffold.code,
      },
    });
  }

  if (scaffoldReturnedToPendingRelease && nc.scaffold) {
    revalidatePath(`/qr/${nc.scaffold.tag ?? nc.scaffold.code}`);
  }

  return { scaffoldReturnedToPendingRelease };
}

export async function updateNonConformityResponsible(formData: FormData) {
  await requirePermission("non_conformities.update");
  const scope = await getDataScope();

  const id = requiredId(formData.get("id"), "Não conformidade");
  const responsibleUserId =
    requiredId(formData.get("responsibleUserId"), "Responsável");

  const [nc, responsible] = await Promise.all([
    prisma.nonConformity.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        classification: true,
        status: true,
        scaffoldId: true,
        originInspectionId: true,
        companyId: true,
        workspaceId: true,
        responsibleUserId: true,
        dueDate: true,
        closedAt: true,
        responsibleUser: { select: { name: true } },
      },
    }),
    prisma.user.findUnique({
          where: { id: responsibleUserId },
          select: {
            id: true,
            name: true,
            companyId: true,
            workspaceId: true,
            company: true,
          },
        }),
  ]);

  if (!nc) throw new Error("Não conformidade não encontrada.");
  assertRecordInDataScope(scope, nc);
  if (FINAL_STATUSES.includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }
  if (responsibleUserId && !responsible) {
    throw new Error("Responsável selecionado não existe.");
  }
  if (responsible) assertRecordInDataScope(scope, responsible);
  const responsibleWithRole = await prisma.user.findFirst({
    where: {
      id: responsibleUserId,
      roles: {
        some: {
          role: { code: { in: RESPONSIBLE_ROLE_CODES } },
        },
      },
    },
    select: { id: true },
  });

  if (!responsibleWithRole) {
    throw new Error(
      "Responsável deve ter perfil Planejamento, Supervisor ou Encarregado.",
    );
  }

  const updated = await prisma.nonConformity.update({
    where: { id },
    data: {
      responsibleUserId,
      status:
        nc.status === NonConformityStatus.OPEN
          ? NonConformityStatus.ASSIGNED
          : nc.status,
    },
  });

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPDATE,
    description:
      nc.status === NonConformityStatus.OPEN
        ? `Responsável atribuído e correção iniciada na NC ${nc.code}`
        : `Responsável da não conformidade ${nc.code} alterado`,
    oldValue: {
      responsibleUserId: nc.responsibleUserId,
      responsibleName: nc.responsibleUser?.name ?? null,
    },
    newValue: {
      responsibleUserId: updated.responsibleUserId,
      responsibleName: responsible?.name ?? null,
      status: updated.status,
    },
  });

  if (nc.status === NonConformityStatus.OPEN) {
    await createNotification({
      companyId: updated.companyId,
      workspaceId: updated.workspaceId,
      userId: updated.responsibleUserId,
      type: "NONCONFORMITY_IN_PROGRESS",
      severity: "INFO",
      title: `NC ${nc.code} em tratamento`,
      message: `A não conformidade ${nc.code} foi atribuída para tratamento.`,
      entityType: "NONCONFORMITY",
      entityId: nc.id,
      channels: ["INTERNAL"],
      metadata: {
        entityLabel: nc.code,
        status: updated.status,
        responsibleName: responsible?.name ?? null,
      },
    });
  }
}

export async function updateNonConformityDueDate(formData: FormData) {
  await requireWorkflowRole(
    HSE_ROLE_CODES,
    "Somente HSE pode alterar o prazo da NC.",
  );
  const scope = await getDataScope();

  const id = requiredId(formData.get("id"), "Não conformidade");
  const dueDate = optionalDate(formData.get("dueDate"), "Data limite");
  const reason = requiredText(formData.get("reason"), "Motivo", 500);
  if (!dueDate) throw new Error("Nova data limite e obrigatoria.");

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) throw new Error("Não conformidade não encontrada.");
  assertRecordInDataScope(scope, nc);
  if (FINAL_STATUSES.includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }

  const updated = await prisma.nonConformity.update({
    where: { id },
    data: { dueDate },
  });

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPDATE,
    description: `Prazo da não conformidade ${nc.code} alterado`,
    oldValue: {
      dueDate: nc.dueDate?.toISOString() ?? null,
    },
    newValue: {
      dueDate: updated.dueDate?.toISOString() ?? null,
      reason,
    },
  });
}

export async function addNonConformityEvidence(formData: FormData) {
  await requirePermission("non_conformities.add_evidence");
  const scope = await getDataScope();

  const id = requiredId(formData.get("id"), "Não conformidade");
  const evidenceType = enumValue(
    formData.get("evidenceType") ?? NonConformityEvidenceType.OTHER,
    Object.values(NonConformityEvidenceType),
    "Tipo da evidência",
  );
  const title = requiredText(formData.get("title"), "Titulo", 180);
  const fileUrl = requiredText(
    formData.get("fileUrl"),
    "Arquivo",
    INLINE_EVIDENCE_REFERENCE_MAX_LENGTH,
  );
  const fileName = requiredText(formData.get("fileName"), "Nome do arquivo", 240);
  const fileSize = optionalNumber(formData.get("fileSize"), "Tamanho do arquivo", {
    min: 0,
    max: 50 * 1024 * 1024,
  });
  const mimeType = optionalText(formData.get("mimeType"), "Tipo do arquivo", 160);
  const observation = optionalText(formData.get("observation"), "Observacao", 1000);
  assertStoredFileOrInlineFileReference(fileUrl, "Evidência");

  const [nc, access] = await Promise.all([
    prisma.nonConformity.findUnique({ where: { id } }),
    getCurrentUserAccess(),
  ]);
  if (!nc) throw new Error("Não conformidade não encontrada.");
  assertRecordInDataScope(scope, nc);
  if (["CLOSED", "CANCELLED"].includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }

  const evidence = await prisma.nonConformityEvidence.create({
    data: {
      nonConformityId: id,
      type: evidenceType,
      title,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      observation,
      uploadedById: access?.userId ?? null,
      companyId: nc.companyId,
      workspaceId: nc.workspaceId,
    },
  });

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPLOAD,
    description: `Evidência ${evidence.fileName} anexada à não conformidade ${nc.code}`,
    newValue: {
      evidenceId: evidence.id,
      evidenceType: evidence.type,
      title: evidence.title,
      fileName: evidence.fileName,
      fileSize: evidence.fileSize,
      mimeType: evidence.mimeType,
      observation: evidence.observation,
    },
  });
}

export async function addNonConformityItemEvidence(formData: FormData) {
  await requireWorkflowRole(
    RESPONSIBLE_ROLE_CODES,
    "Somente Planejamento, Supervisor ou Encarregado podem anexar evidências de correção.",
  );
  const scope = await getDataScope();

  const id = requiredId(formData.get("id"), "Não conformidade");
  const nonConformityItemId = requiredId(
    formData.get("nonConformityItemId"),
    "Item de checklist",
  );
  const evidenceType = enumValue(
    formData.get("evidenceType") ?? NonConformityEvidenceType.OTHER,
    Object.values(NonConformityEvidenceType),
    "Tipo da evidência",
  );
  const fileUrl = requiredText(
    formData.get("fileUrl"),
    "Arquivo",
    INLINE_EVIDENCE_REFERENCE_MAX_LENGTH,
  );
  const fileName = requiredText(formData.get("fileName"), "Nome do arquivo", 240);
  const title =
    optionalText(formData.get("title"), "Titulo", 180) ?? fileName;
  const fileSize = optionalNumber(formData.get("fileSize"), "Tamanho do arquivo", {
    min: 0,
    max: 50 * 1024 * 1024,
  });
  const mimeType = optionalText(formData.get("mimeType"), "Tipo do arquivo", 160);
  const observation = optionalText(formData.get("observation"), "Observacao", 1000);
  assertStoredFileOrInlineFileReference(fileUrl, "Evidência");

  const [nc, item, access] = await Promise.all([
    prisma.nonConformity.findUnique({ where: { id } }),
    prisma.nonConformityChecklistItem.findFirst({
      where: { id: nonConformityItemId, nonConformityId: id },
      include: {
        checklistEntry: {
          select: { item_label: true },
        },
      },
    }),
    getCurrentUserAccess(),
  ]);

  if (!nc) throw new Error("Não conformidade não encontrada.");
  assertRecordInDataScope(scope, nc);
  if (!item) throw new Error("Item de checklist não encontrado para esta NC.");
  if (FINAL_STATUSES.includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }
  const correctionStatuses: NonConformityStatus[] = [
    NonConformityStatus.ASSIGNED,
    NonConformityStatus.IN_PROGRESS,
    NonConformityStatus.REJECTED,
  ];
  if (!correctionStatuses.includes(nc.status)) {
    throw new Error("Evidências de correção só podem ser anexadas em correção.");
  }

  const evidence = await prisma.nonConformityItemEvidence.create({
    data: {
      nonConformityItemId,
      type: evidenceType,
      title,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      observation,
      uploadedById: access?.userId ?? null,
      companyId: nc.companyId,
      workspaceId: nc.workspaceId,
    },
  });

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPLOAD,
    description: `Evidência ${evidence.fileName} anexada ao item ${item.checklistEntry.item_label} da NC ${nc.code}`,
    newValue: {
      evidenceId: evidence.id,
      nonConformityItemId,
      checklistEntryId: item.checklistEntryId,
      checklistItem: item.checklistEntry.item_label,
      evidenceType: evidence.type,
      title: evidence.title,
      fileName: evidence.fileName,
      fileSize: evidence.fileSize,
      mimeType: evidence.mimeType,
      observation: evidence.observation,
    },
  });
}

export async function addNonConformityComment(formData: FormData) {
  const scope = await getDataScope();
  const id = requiredId(formData.get("id"), "Não conformidade");
  const comment = requiredText(formData.get("comment"), "Comentario", 1000);

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) throw new Error("Não conformidade não encontrada.");
  assertRecordInDataScope(scope, nc);
  if (FINAL_STATUSES.includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }

  const access = await getCurrentUserAccess();
  if (
    !hasAnyRole(access, [...RESPONSIBLE_ROLE_CODES, ...HSE_ROLE_CODES])
  ) {
    throw new Error("Você não tem permissão para comentar nesta NC.");
  }

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPDATE,
    description: `Comentario adicionado na NC ${nc.code}`,
    newValue: {
      comment,
      status: nc.status,
    },
  });
}

export async function getNonConformities() {
  await requireNonConformityAccess();
  const scope = await getDataScope();

  return prisma.nonConformity.findMany({
    where: dataScopeWhere(scope),
    orderBy: [{ createdAt: "desc" }],
    include: {
      tenantCompany: { select: { name: true } },
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
  const scope = await getDataScope();

  const nc = await prisma.nonConformity.findFirst({
    where: { id, ...dataScopeWhere(scope) },
    include: {
      tenantCompany: { select: { name: true } },
      scaffold: {
        select: {
          id: true,
          code: true,
          area: true,
          location: true,
          company: true,
          responsible: true,
          status: true,
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
          checklistEntry: {
            select: {
              id: true,
              item_label: true,
              category: true,
              value: true,
              critical: true,
              observation: true,
            },
          },
          evidences: {
            select: {
              id: true,
              type: true,
              title: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              observation: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      evidences: {
        select: {
          id: true,
          type: true,
          title: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          observation: true,
          createdAt: true,
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

  if (!nc) return null;

  return {
    ...nc,
    checklistItems: nc.checklistItems.map((item) => ({
      ...item,
      evidences: item.evidences.map((evidence) => ({
        ...evidence,
        fileUrl: `/api/non-conformity-evidences/item/${evidence.id}`,
      })),
    })),
    evidences: nc.evidences.map((evidence) => ({
      ...evidence,
      fileUrl: `/api/non-conformity-evidences/general/${evidence.id}`,
    })),
  };
}
