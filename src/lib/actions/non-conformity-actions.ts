"use server";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import {
  getCurrentUserAccess,
  requireAnyPermission,
  requirePermission,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertStoredFileReference } from "@/lib/file-storage-reference";
import { sanitizeForLog } from "@/lib/safe-log";
import {
  NonConformityEvidenceType,
  NonConformityStatus,
  Prisma,
  ScaffoldStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

type NonConformityAuditValue = Prisma.InputJsonObject;

const RESPONSIBLE_ROLE_CODES = ["PLANEJAMENTO", "SUPERVISOR_ENCARREGADO"];
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
      (roleCode) => roleCode === "SUPER_ADMIN" || roles.includes(roleCode),
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
    const [nc, access] = await Promise.all([
      prisma.nonConformity.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        companyId: true,
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
    description: `Nao conformidade ${ncCode} encerrada. Andaime ${updatedScaffold.code} retornou para pendente de liberacao.`,
    oldValue: {
      status: scaffold.status,
      nonConformityCode: ncCode,
    },
    newValue: {
      status: updatedScaffold.status,
      nonConformityCode: ncCode,
      requiresNewInspection: true,
    },
    companyId: updatedScaffold.company,
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
      `Transicao nao permitida: ${currentStatus} para ${nextStatus}.`,
    );
  }
}

function parseEvidenceType(value: string) {
  if (
    Object.values(NonConformityEvidenceType).includes(
      value as NonConformityEvidenceType,
    )
  ) {
    return value as NonConformityEvidenceType;
  }

  return NonConformityEvidenceType.OTHER;
}

function statusDescription(
  code: string,
  currentStatus: NonConformityStatus,
  nextStatus: NonConformityStatus,
) {
  if (currentStatus === "OPEN" && nextStatus === "ASSIGNED") {
    return `Responsavel atribuido e NC ${code} movida para Em Correcao`;
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

export async function getNonConformityResponsibleOptions() {
  await requireAnyPermission([
    "non_conformities.view",
    "non_conformities.update",
    "non_conformities.close",
  ]);

  return prisma.user.findMany({
    where: {
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
  const id = String(formData.get("id") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  if (!id || !nextStatus) {
    throw new Error("Nao conformidade e novo status sao obrigatorios.");
  }

  if (
    !Object.values(NonConformityStatus).includes(
      nextStatus as NonConformityStatus,
    )
  ) {
    throw new Error("Status informado e invalido.");
  }

  const parsedNextStatus = nextStatus as NonConformityStatus;

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
          tag: true,
        },
      },
      _count: { select: { evidences: true } },
    },
  });

  if (!nc) throw new Error("Nao conformidade nao encontrada.");

  assertAllowedTransition(nc.status, parsedNextStatus);

  if (parsedNextStatus === NonConformityStatus.PENDING_VERIFICATION) {
    await requireWorkflowRole(
      RESPONSIBLE_ROLE_CODES,
      "Somente Planejamento ou Supervisor/Encarregado podem solicitar verificacao.",
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
        "A NC so pode ser encerrada quando estiver Aguardando Verificacao.",
      );
    }
    if (nc._count.evidences + itemEvidenceCount === 0) {
      throw new Error(
        "Anexe pelo menos uma evidencia por item antes de encerrar a NC.",
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
    throw new Error("Atribua um responsavel antes de solicitar verificacao.");
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

  if (scaffoldReturnedToPendingRelease && nc.scaffold) {
    revalidatePath(`/qr/${nc.scaffold.tag ?? nc.scaffold.code}`);
  }

  return { scaffoldReturnedToPendingRelease };
}

export async function updateNonConformityResponsible(formData: FormData) {
  await requirePermission("non_conformities.update");

  const id = String(formData.get("id") ?? "").trim();
  const responsibleUserIdRaw = String(
    formData.get("responsibleUserId") ?? "",
  ).trim();
  const responsibleUserId =
    responsibleUserIdRaw === "none" ? "" : responsibleUserIdRaw;

  if (!id) throw new Error("Nao conformidade e obrigatoria.");

  const [nc, responsible] = await Promise.all([
    prisma.nonConformity.findUnique({
      where: { id },
      include: { responsibleUser: true },
    }),
    responsibleUserId
      ? prisma.user.findUnique({ where: { id: responsibleUserId } })
      : Promise.resolve(null),
  ]);

  if (!nc) throw new Error("Nao conformidade nao encontrada.");
  if (FINAL_STATUSES.includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }
  if (responsibleUserId && !responsible) {
    throw new Error("Responsavel selecionado nao existe.");
  }
  if (!responsibleUserId) {
    throw new Error("Selecione um responsavel para iniciar a correcao.");
  }

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
      "Responsavel deve ter perfil Planejamento ou Supervisor/Encarregado.",
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
        ? `Responsavel atribuido e correcao iniciada na NC ${nc.code}`
        : `Responsavel da nao conformidade ${nc.code} alterado`,
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
}

export async function updateNonConformityDueDate(formData: FormData) {
  await requireWorkflowRole(
    HSE_ROLE_CODES,
    "Somente HSE pode alterar o prazo da NC.",
  );

  const id = String(formData.get("id") ?? "").trim();
  const dueDateValue = String(formData.get("dueDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!id || !dueDateValue) {
    throw new Error("Nao conformidade e nova data limite sao obrigatorias.");
  }
  if (!reason) throw new Error("Informe o motivo da alteracao de prazo.");

  const dueDate = new Date(`${dueDateValue}T12:00:00`);
  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Data limite invalida.");
  }

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) throw new Error("Nao conformidade nao encontrada.");
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
    description: `Prazo da nao conformidade ${nc.code} alterado`,
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

  const id = String(formData.get("id") ?? "").trim();
  const evidenceType = parseEvidenceType(
    String(formData.get("evidenceType") ?? "").trim(),
  );
  const title = String(formData.get("title") ?? "").trim();
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "").trim();
  const fileSize = Number(String(formData.get("fileSize") ?? "0"));
  const mimeType = String(formData.get("mimeType") ?? "").trim();
  const observation = String(formData.get("observation") ?? "").trim();

  if (!id || !title || !fileUrl || !fileName) {
    throw new Error("Titulo e arquivo da evidencia sao obrigatorios.");
  }
  assertStoredFileReference(fileUrl, "Evidencia");

  const [nc, access] = await Promise.all([
    prisma.nonConformity.findUnique({ where: { id } }),
    getCurrentUserAccess(),
  ]);
  if (!nc) throw new Error("Nao conformidade nao encontrada.");
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
      fileSize: Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
      mimeType: mimeType || null,
      observation: observation || null,
      uploadedById: access?.userId ?? null,
    },
  });

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPLOAD,
    description: `Evidencia ${evidence.fileName} anexada a nao conformidade ${nc.code}`,
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
    "Somente Planejamento ou Supervisor/Encarregado podem anexar evidencias de correcao.",
  );

  const id = String(formData.get("id") ?? "").trim();
  const nonConformityItemId = String(
    formData.get("nonConformityItemId") ?? "",
  ).trim();
  const evidenceType = parseEvidenceType(
    String(formData.get("evidenceType") ?? "").trim(),
  );
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || fileName;
  const fileSize = Number(String(formData.get("fileSize") ?? "0"));
  const mimeType = String(formData.get("mimeType") ?? "").trim();
  const observation = String(formData.get("observation") ?? "").trim();

  if (!id || !nonConformityItemId || !fileUrl || !fileName) {
    throw new Error("Item e arquivo da evidencia sao obrigatorios.");
  }
  assertStoredFileReference(fileUrl, "Evidencia");

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

  if (!nc) throw new Error("Nao conformidade nao encontrada.");
  if (!item) throw new Error("Item de checklist nao encontrado para esta NC.");
  if (FINAL_STATUSES.includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }
  const correctionStatuses: NonConformityStatus[] = [
    NonConformityStatus.ASSIGNED,
    NonConformityStatus.IN_PROGRESS,
    NonConformityStatus.REJECTED,
  ];
  if (!correctionStatuses.includes(nc.status)) {
    throw new Error("Evidencias de correcao so podem ser anexadas em correcao.");
  }

  const evidence = await prisma.nonConformityItemEvidence.create({
    data: {
      nonConformityItemId,
      type: evidenceType,
      title,
      fileUrl,
      fileName,
      fileSize: Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
      mimeType: mimeType || null,
      observation: observation || null,
      uploadedById: access?.userId ?? null,
    },
  });

  await writeNonConformityAudit({
    id,
    action: AuditAction.UPLOAD,
    description: `Evidencia ${evidence.fileName} anexada ao item ${item.checklistEntry.item_label} da NC ${nc.code}`,
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
  const id = String(formData.get("id") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  if (!id || !comment) {
    throw new Error("Comentario e obrigatorio.");
  }

  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) throw new Error("Nao conformidade nao encontrada.");
  if (FINAL_STATUSES.includes(nc.status)) {
    throw new Error("NC encerrada ou cancelada fica somente leitura.");
  }

  const access = await getCurrentUserAccess();
  if (
    !hasAnyRole(access, [...RESPONSIBLE_ROLE_CODES, ...HSE_ROLE_CODES])
  ) {
    throw new Error("Voce nao tem permissao para comentar nesta NC.");
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

  const nc = await prisma.nonConformity.findUnique({
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
