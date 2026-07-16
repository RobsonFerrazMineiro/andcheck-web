"use server";

import { prisma } from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/safe-log";
import {
  assertActiveCompanyForCreation,
  getCurrentUserAccess,
  requireAnyPermission,
} from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { generateNextNonConformityCode } from "@/lib/non-conformity-code";
import { assertStoredFileOrInlineImageReference } from "@/lib/file-storage-reference";
import { ACTIVE_NON_CONFORMITY_STATUSES } from "@/lib/non-conformity-status";
import {
  enumValue,
  optionalText,
  requiredId,
  requiredNumber,
  requiredText,
} from "@/lib/input-validation";
import {
  assertRecordInDataScope,
  dataScopeWhere,
  getDataScope,
} from "@/lib/data-scope";
import {
  calculateInspectionResult,
  calculateScaffoldStatus,
  hasCriticalChecklistFailure,
} from "@/lib/inspection-outcome";
import {
  ChecklistValue,
  InspectionResult,
  NonConformityClassification,
  NonConformityStatus,
  Prisma,
  type NotificationChannel,
  type NotificationSeverity,
  type NotificationType,
} from "@prisma/client";
import { resolveInspectionSignaturePolicyForScaffold } from "./signature-policy-actions";
import { createNotification } from "@/lib/notifications/service";

const NON_CONFORMING_CHECKLIST_VALUES = new Set(["CL_FAIL", "CL_WARN"]);
const CHECKLIST_VALUES = Object.values(ChecklistValue);
const INSPECTION_RESULTS = Object.values(InspectionResult);
const MAX_SIGNATURE_DATA_LENGTH = 350_000;
const MAX_INLINE_IMAGE_DATA_LENGTH = 1_500_000;

function parseInspectionInput(data: {
  scaffold_id: string;
  scaffold_code: string;
  inspector_name: string;
  result: InspectionResult;
  validity_days: number;
  notes?: string;
  photos?: string[];
  signature?: string;
  signatures?: {
    role_code: string;
    signer_name: string;
    signer_company?: string;
    signer_position?: string;
    signature_data?: string;
  }[];
  checklist: {
    item_id: string;
    item_label: string;
    category: string;
    value: "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA";
    critical: boolean;
    observation?: string;
    photo?: string;
  }[];
}) {
  if (!Array.isArray(data.checklist) || data.checklist.length === 0) {
    throw new Error("Checklist da inspecao e obrigatorio.");
  }
  if (data.checklist.length > 250) {
    throw new Error("Checklist da inspecao excede o limite permitido.");
  }
  if ((data.photos?.length ?? 0) > 30) {
    throw new Error("Quantidade de fotos da inspecao excede o limite permitido.");
  }
  if ((data.signatures?.length ?? 0) > 20) {
    throw new Error("Quantidade de assinaturas excede o limite permitido.");
  }

  return {
    scaffold_id: requiredId(data.scaffold_id, "Andaime"),
    scaffold_code: requiredText(data.scaffold_code, "Codigo do andaime", 80),
    inspector_name: requiredText(data.inspector_name, "Inspetor", 140),
    result: enumValue(data.result, INSPECTION_RESULTS, "Resultado da inspecao"),
    validity_days: requiredNumber(data.validity_days, "Validade", {
      min: 0,
      max: 365,
    }),
    notes: optionalText(data.notes, "Observacoes", 2000) ?? undefined,
    photos: (data.photos ?? []).map((photo) =>
      requiredText(photo, "Foto da inspecao", MAX_INLINE_IMAGE_DATA_LENGTH),
    ),
    signature:
      optionalText(
        data.signature,
        "Assinatura da inspecao",
        MAX_SIGNATURE_DATA_LENGTH,
      ) ?? undefined,
    signatures: (data.signatures ?? []).map((signature) => ({
      role_code: requiredId(signature.role_code, "Perfil da assinatura"),
      signer_name: requiredText(signature.signer_name, "Nome do assinante", 140),
      signer_company:
        optionalText(signature.signer_company, "Empresa do assinante", 160) ??
        undefined,
      signer_position:
        optionalText(signature.signer_position, "Cargo do assinante", 120) ??
        undefined,
      signature_data:
        optionalText(
          signature.signature_data,
          "Assinatura",
          MAX_SIGNATURE_DATA_LENGTH,
        ) ?? undefined,
    })),
    checklist: data.checklist.map((item) => ({
      item_id: requiredId(item.item_id, "Item do checklist"),
      item_label: requiredText(item.item_label, "Descricao do item", 240),
      category: requiredText(item.category, "Categoria do item", 120),
      value: enumValue(item.value, CHECKLIST_VALUES, "Valor do checklist"),
      critical: Boolean(item.critical),
      observation: optionalText(item.observation, "Observacao do item", 1000) ?? undefined,
      photo:
        optionalText(
          item.photo,
          "Foto do checklist",
          MAX_INLINE_IMAGE_DATA_LENGTH,
        ) ?? undefined,
    })),
  };
}

const INSPECTION_RESULT_NOTIFICATION: Record<
  InspectionResult,
  {
    type: NotificationType;
    severity: NotificationSeverity;
    label: string;
    channels: NotificationChannel[];
  }
> = {
  aprovado: {
    type: "INSPECTION_APPROVED",
    severity: "SUCCESS",
    label: "aprovada",
    channels: ["INTERNAL"],
  },
  aprovado_com_ressalvas: {
    type: "INSPECTION_WITH_REMARKS",
    severity: "WARNING",
    label: "aprovada com ressalvas",
    channels: ["INTERNAL", "EMAIL"],
  },
  reprovado: {
    type: "INSPECTION_REJECTED",
    severity: "CRITICAL",
    label: "reprovada",
    channels: ["INTERNAL", "EMAIL"],
  },
};

async function findActiveNonConformity(scaffoldId: string) {
  return prisma.nonConformity.findFirst({
    where: {
      scaffoldId,
      status: { in: [...ACTIVE_NON_CONFORMITY_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      scaffoldId: true,
      status: true,
    },
  });
}

export async function getActiveNonConformitiesForInspection() {
  await requireAnyPermission(["inspections.create", "inspections.finalize"]);
  const scope = await getDataScope();

  return prisma.nonConformity.findMany({
    where: {
      status: { in: [...ACTIVE_NON_CONFORMITY_STATUSES] },
      ...dataScopeWhere(scope),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      scaffoldId: true,
      status: true,
    },
  });
}

function resolveNonConformityClassification({
  hasCriticalFail,
  inspectionResult,
}: {
  hasCriticalFail: boolean;
  inspectionResult: InspectionResult;
}) {
  if (hasCriticalFail) return NonConformityClassification.CRITICAL;
  if (inspectionResult === "reprovado") return NonConformityClassification.HIGH;
  return NonConformityClassification.MEDIUM;
}

function resolveNonConformityDueDate(
  classification: NonConformityClassification,
) {
  const days =
    classification === NonConformityClassification.CRITICAL
      ? 1
      : classification === NonConformityClassification.HIGH
        ? 3
        : 7;

  return new Date(Date.now() + days * 86_400_000);
}

// ── Listar todas ──────────────────────────────────────────────────────────────
export async function getInspections() {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();

  return prisma.inspection.findMany({
    where: dataScopeWhere(scope),
    orderBy: { date: "desc" },
    select: {
      id: true,
      scaffold_id: true,
      scaffold_code: true,
      date: true,
      inspector_name: true,
      result: true,
      validity_days: true,
      notes: true,
      scaffold: {
        select: {
          code: true,
          location: true,
          area: true,
          tenantCompany: { select: { id: true, name: true } },
        },
      },
      _count: { select: { checklist: true } },
    },
  });
}

// ── Buscar por ID ─────────────────────────────────────────────────────────────
export async function getInspectionById(id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();
  const inspectionId = requiredId(id, "Inspecao");

  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, ...dataScopeWhere(scope) },
    select: {
      id: true,
      scaffold_id: true,
      scaffold_code: true,
      date: true,
      inspector_name: true,
      result: true,
      validity_days: true,
      notes: true,
      photos: true,
      signature: true,
      created_at: true,
      updated_at: true,
      scaffold: true,
      checklist: {
        orderBy: { category: "asc" },
        select: {
          id: true,
          inspection_id: true,
          item_id: true,
          item_label: true,
          category: true,
          value: true,
          critical: true,
          observation: true,
          photo: true,
        },
      },
      signatures: {
        select: {
          id: true,
          inspection_id: true,
          user_id: true,
          role_code: true,
          signer_name: true,
          signer_company: true,
          signer_position: true,
          signed_at: true,
          created_at: true,
          role: true,
        },
        orderBy: { signed_at: "asc" },
      },
      nonConformities: {
        orderBy: { createdAt: "desc" },
        include: {
          responsibleUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!inspection) return null;

  return {
    ...inspection,
    photos: inspection.photos.map(
      (_photo, index) => `/api/inspection-assets/photo/${inspection.id}/${index}`,
    ),
    signature: inspection.signature
      ? `/api/inspection-assets/signature/${inspection.id}/main`
      : null,
    checklist: inspection.checklist.map((item) => ({
      ...item,
      photo: item.photo
        ? `/api/inspection-assets/checklist/${item.id}/photo`
        : null,
    })),
  };
}

// ── Listar por andaime ────────────────────────────────────────────────────────
export async function getInspectionsByScaffold(scaffold_id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();
  const scaffoldId = requiredId(scaffold_id, "Andaime");

  return prisma.inspection.findMany({
    where: { scaffold_id: scaffoldId, ...dataScopeWhere(scope) },
    orderBy: { date: "desc" },
    select: {
      id: true,
      scaffold_id: true,
      scaffold_code: true,
      date: true,
      inspector_name: true,
      result: true,
      validity_days: true,
      notes: true,
      checklist: {
        select: {
          id: true,
          item_id: true,
          item_label: true,
          category: true,
          value: true,
          critical: true,
          observation: true,
        },
      },
    },
  });
}

// ── Criar ─────────────────────────────────────────────────────────────────────
type NonConformingChecklistItem = {
  id: string;
  item_label: string;
  category: string;
  value: string;
  critical: boolean;
  observation: string | null;
};

async function createNonConformityFromInspection({
  inspection,
  scaffold,
  failedItems,
  hasCriticalFail,
  currentUserId,
}: {
  inspection: {
    id: string;
    scaffold_code: string;
    result: InspectionResult;
  };
  scaffold: {
    id: string;
    code: string;
    company: string | null;
    companyId: string;
    workspaceId: string;
  };
  failedItems: NonConformingChecklistItem[];
  hasCriticalFail: boolean;
  currentUserId?: string | null;
}) {
  if (failedItems.length === 0) return;

  const classification = resolveNonConformityClassification({
    hasCriticalFail,
    inspectionResult: inspection.result,
  });
  const dueDate = resolveNonConformityDueDate(classification);
  const itemSummary = failedItems
    .slice(0, 5)
    .map((item) => item.item_label)
    .join("; ");
  const extraItems =
    failedItems.length > 5 ? `; +${failedItems.length - 5} item(ns)` : "";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await generateNextNonConformityCode();
    const title = `Tratativa da inspecao ${inspection.id.slice(-6)} - ${scaffold.code}`;
    const description =
      `${failedItems.length} item(ns) nao conforme(s) identificados na ` +
      `inspecao do andaime ${scaffold.code}: ${itemSummary}${extraItems}`;
    const newValue: Prisma.InputJsonObject = {
      code,
      title,
      description,
      classification,
      status: NonConformityStatus.OPEN,
      scaffoldId: scaffold.id,
      originInspectionId: inspection.id,
      companyId: scaffold.companyId,
      dueDate: dueDate.toISOString(),
      checklistItems: failedItems.map((item) => ({
        id: item.id,
        item_label: item.item_label,
        category: item.category,
        value: item.value,
        critical: item.critical,
        observation: item.observation,
      })),
    };

    try {
      const nonConformity = await prisma.nonConformity.create({
        data: {
          code,
          title,
          description,
          classification,
          status: NonConformityStatus.OPEN,
          originInspectionId: inspection.id,
          scaffoldId: scaffold.id,
          companyId: scaffold.companyId,
          workspaceId: scaffold.workspaceId,
          dueDate,
          createdById: currentUserId ?? null,
          checklistItems: {
            create: failedItems.map((item) => ({
              checklistEntryId: item.id,
            })),
          },
          history: {
            create: {
              action: AuditAction.CREATE,
              description: `Nao conformidade ${code} criada a partir da inspecao ${inspection.id}`,
              oldValue: Prisma.JsonNull,
              newValue,
              userId: currentUserId ?? null,
            },
          },
        },
      });

      await createAuditLog({
        entityType: AuditEntityType.NON_CONFORMITY,
        entityId: nonConformity.id,
        entityLabel: nonConformity.code,
        action: AuditAction.CREATE,
        description: `Nao conformidade ${nonConformity.code} criada a partir da inspecao do andaime ${scaffold.code}`,
        newValue,
        companyId: scaffold.companyId,
        workspaceId: scaffold.workspaceId,
      });

      return;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 4
      ) {
        continue;
      }

      console.error(
        "Non conformity creation from inspection failed:",
        sanitizeForLog(error),
      );
      return;
    }
  }
}

export async function createInspection(data: {
  scaffold_id: string;
  scaffold_code: string;
  inspector_name: string;
  result: InspectionResult;
  validity_days: number;
  notes?: string;
  photos?: string[];
  signature?: string;
  signatures?: {
    role_code: string;
    signer_name: string;
    signer_company?: string;
    signer_position?: string;
    signature_data?: string;
  }[];
  checklist: {
    item_id: string;
    item_label: string;
    category: string;
    value: "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA";
    critical: boolean;
    observation?: string;
    photo?: string;
  }[];
}) {
  await requireAnyPermission(["inspections.create", "inspections.finalize"]);
  await assertActiveCompanyForCreation("inspections.create");
  const scope = await getDataScope();
  const input = parseInspectionInput(data);
  const oldScaffold = await prisma.scaffold.findUnique({
    where: { id: input.scaffold_id },
  });
  assertRecordInDataScope(scope, oldScaffold);

  const activeNonConformity = await findActiveNonConformity(input.scaffold_id);
  if (activeNonConformity) {
    throw new Error(
      "Não é possível iniciar nova inspeção enquanto houver não conformidade ativa para este andaime.",
    );
  }

  input.photos?.forEach((photo) =>
    assertStoredFileOrInlineImageReference(photo, "Foto da inspecao"),
  );
  if (input.signature) {
    assertStoredFileOrInlineImageReference(
      input.signature,
      "Assinatura da inspecao",
    );
  }
  input.signatures?.forEach((signature) => {
    if (signature.signature_data) {
      assertStoredFileOrInlineImageReference(
        signature.signature_data,
        "Assinatura",
      );
    }
  });
  input.checklist.forEach((item) => {
    if (item.photo) {
      assertStoredFileOrInlineImageReference(item.photo, "Foto do checklist");
    }
  });
  const currentAccess = await getCurrentUserAccess();

  const { checklist, signatures, ...inspectionData } = input;
  const calculatedResult = calculateInspectionResult(checklist);
  const policy = await resolveInspectionSignaturePolicyForScaffold(
    input.scaffold_id,
  );
  const requiredSignatures =
    policy?.requirements.filter(
      (requirement: { is_required: boolean }) => requirement.is_required,
    ) ?? [];
  const providedSignatures = (signatures ?? []).filter(
    (signature) => signature.signer_name.trim() && signature.signature_data,
  );
  const pendingSignatures = requiredSignatures.filter((requirement) => {
    const signedCount = providedSignatures.filter(
      (signature) => signature.role_code === requirement.role_code,
    ).length;
    return signedCount < requirement.min_count;
  });

  if (pendingSignatures.length > 0) {
    const pendingLabels = pendingSignatures.map(
      (requirement) => requirement.label ?? requirement.role.name,
    );
    throw new Error(
      "Nao e possivel finalizar a inspecao. Assinaturas pendentes: " +
        pendingLabels.join(", ") +
        ".",
    );
  }

  const inspection = await prisma.inspection.create({
    data: {
      ...inspectionData,
      companyId: oldScaffold?.companyId,
      workspaceId: oldScaffold?.workspaceId,
      result: calculatedResult,
      validity_days:
        calculatedResult === "reprovado" ? 0 : input.validity_days,
      signatures: {
        create: providedSignatures.map((signature) => ({
          role_code: signature.role_code,
          signer_name: signature.signer_name.trim(),
          signer_company: signature.signer_company?.trim() || null,
          signer_position: signature.signer_position?.trim() || null,
          signature_data: signature.signature_data,
          companyId: oldScaffold?.companyId,
          workspaceId: oldScaffold?.workspaceId,
        })),
      },
      checklist: { create: checklist },
    },
    select: {
      id: true,
      scaffold_id: true,
      scaffold_code: true,
      inspector_name: true,
      result: true,
      validity_days: true,
      checklist: {
        select: {
          id: true,
          item_label: true,
          category: true,
          value: true,
          critical: true,
          observation: true,
        },
      },
    },
  });

  // Atualizar status e validade do andaime conforme resultado
  const validityDate =
    calculatedResult !== "reprovado" && input.validity_days > 0
      ? new Date(Date.now() + input.validity_days * 86_400_000)
      : null;

  // Se há item crítico reprovado → INTERDITADO; reprovado simples → REPROVADO; aprovado → LIBERADO
  const hasCriticalFail = hasCriticalChecklistFailure(checklist);
  const newStatus = calculateScaffoldStatus(calculatedResult, checklist);

  const scaffold = await prisma.scaffold.update({
    where: { id: input.scaffold_id },
    data: {
      status: newStatus,
      validity_date: validityDate,
      released_at: newStatus === "liberado" ? new Date() : undefined,
    },
  });

  const nonConformingItems = inspection.checklist.filter((item) =>
    NON_CONFORMING_CHECKLIST_VALUES.has(item.value),
  );

  await createNonConformityFromInspection({
    inspection,
    scaffold,
    failedItems: nonConformingItems,
    hasCriticalFail,
    currentUserId: currentAccess?.userId,
  });

  await createAuditLog({
    entityType: AuditEntityType.INSPECTION,
    entityId: inspection.id,
    entityLabel: `${inspection.scaffold_code}-${inspection.id.slice(-6)}`,
    action: AuditAction.CREATE,
    description: `Inspecao ${inspection.id} criada para o andaime ${inspection.scaffold_code}`,
    newValue: {
      scaffold_id: inspection.scaffold_id,
      scaffold_code: inspection.scaffold_code,
      inspector_name: inspection.inspector_name,
      result: inspection.result,
      validity_days: inspection.validity_days,
      checklist_items: checklist.length,
      signatures: providedSignatures.map((signature) => ({
        role_code: signature.role_code,
        signer_name: signature.signer_name,
        signer_company: signature.signer_company,
        signer_position: signature.signer_position,
      })),
    },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });

  await createAuditLog({
    entityType: AuditEntityType.INSPECTION,
    entityId: inspection.id,
    entityLabel: `${inspection.scaffold_code}-${inspection.id.slice(-6)}`,
    action: AuditAction.COMPLETE,
    description: `Checklist da inspecao ${inspection.id} finalizado`,
    newValue: {
      checklist_items: checklist.length,
      failed_items: checklist.filter((item) => item.value === "CL_FAIL").length,
      warning_items: checklist.filter((item) => item.value === "CL_WARN").length,
    },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });

  for (const signature of providedSignatures) {
    await createAuditLog({
      entityType: AuditEntityType.SIGNATURE,
      entityId: inspection.id,
      entityLabel: `${inspection.scaffold_code}-${signature.role_code}`,
      action: AuditAction.SIGN,
      description: `Assinatura ${signature.role_code} adicionada na inspecao ${inspection.id}`,
      newValue: {
        role_code: signature.role_code,
        signer_name: signature.signer_name,
        signer_company: signature.signer_company,
        signer_position: signature.signer_position,
      },
      companyId: scaffold.companyId,
      workspaceId: scaffold.workspaceId,
    });
  }

  await createAuditLog({
    entityType: AuditEntityType.SCAFFOLD,
    entityId: scaffold.id,
    entityLabel: scaffold.code,
    action: AuditAction.STATUS_CHANGE,
    description: `Inspecao ${inspection.id} alterou o status do andaime ${scaffold.code} para ${scaffold.status}`,
    oldValue: {
      status: oldScaffold?.status ?? null,
      validity_date: oldScaffold?.validity_date?.toISOString() ?? null,
    },
    newValue: {
      status: scaffold.status,
      validity_date: scaffold.validity_date?.toISOString() ?? null,
      released_at: scaffold.released_at?.toISOString() ?? null,
      inspection_result: inspection.result,
    },
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
  });

  await createNotification({
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
    type: "INSPECTION_COMPLETED",
    severity: "INFO",
    title: `Inspecao do andaime ${inspection.scaffold_code} realizada`,
    message: `A inspecao do andaime ${inspection.scaffold_code} foi realizada por ${inspection.inspector_name}.`,
    entityType: "INSPECTION",
    entityId: inspection.id,
    channels: ["INTERNAL"],
    metadata: {
      entityLabel: inspection.scaffold_code,
      status: inspection.result,
      inspectorName: inspection.inspector_name,
    },
  });

  if (newStatus === "liberado" || newStatus === "reprovado") {
    await createNotification({
      companyId: scaffold.companyId,
      workspaceId: scaffold.workspaceId,
      type:
        newStatus === "liberado"
          ? "SCAFFOLD_RELEASED"
          : "SCAFFOLD_REJECTED",
      severity:
        newStatus === "liberado"
          ? "SUCCESS"
          : "WARNING",
      title: `Andaime ${scaffold.code} ${newStatus}`,
      message: `O andaime ${scaffold.code} foi ${newStatus} apos inspecao.`,
      entityType: "SCAFFOLD",
      entityId: scaffold.id,
      channels:
        newStatus === "liberado"
          ? ["INTERNAL"]
          : ["INTERNAL", "EMAIL"],
      metadata: {
        entityLabel: scaffold.code,
        status: scaffold.status,
        inspectionId: inspection.id,
      },
    });
  }

  const resultNotification = INSPECTION_RESULT_NOTIFICATION[inspection.result];
  await createNotification({
    companyId: scaffold.companyId,
    workspaceId: scaffold.workspaceId,
    type: resultNotification.type,
    severity: resultNotification.severity,
    title: `Inspecao ${resultNotification.label}: ${inspection.scaffold_code}`,
    message: `A inspecao do andaime ${inspection.scaffold_code} foi ${resultNotification.label}.`,
    entityType: "INSPECTION",
    entityId: inspection.id,
    channels: resultNotification.channels,
    metadata: {
      entityLabel: inspection.scaffold_code,
      status: inspection.result,
      inspectorName: inspection.inspector_name,
    },
  });

  return { id: inspection.id };
}

// ── Stats gerais ──────────────────────────────────────────────────────────────
export async function getInspectionStats() {
  await requireAnyPermission(["read.all", "read.own_company"]);
  const scope = await getDataScope();
  const where = dataScopeWhere(scope);

  const [total, aprovados, comRessalvas, reprovados] = await Promise.all([
    prisma.inspection.count({ where }),
    prisma.inspection.count({ where: { ...where, result: "aprovado" } }),
    prisma.inspection.count({
      where: { ...where, result: "aprovado_com_ressalvas" },
    }),
    prisma.inspection.count({ where: { ...where, result: "reprovado" } }),
  ]);
  return { total, aprovados, comRessalvas, reprovados };
}
