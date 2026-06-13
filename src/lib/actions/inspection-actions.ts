"use server";

import { prisma } from "@/lib/prisma";
import { sanitizeForLog } from "@/lib/safe-log";
import { getCurrentUserAccess, requireAnyPermission } from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { generateNextNonConformityCode } from "@/lib/non-conformity-code";
import { assertStoredFileReference } from "@/lib/file-storage-reference";
import {
  InspectionResult,
  NonConformityClassification,
  NonConformityStatus,
  Prisma,
} from "@prisma/client";
import { resolveInspectionSignaturePolicyForScaffold } from "./signature-policy-actions";

const NON_CONFORMING_CHECKLIST_VALUES = new Set(["CL_FAIL", "CL_WARN"]);

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

  return prisma.inspection.findMany({
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
      scaffold: { select: { code: true, location: true, area: true } },
      _count: { select: { checklist: true } },
    },
  });
}

// ── Buscar por ID ─────────────────────────────────────────────────────────────
export async function getInspectionById(id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);

  const inspection = await prisma.inspection.findUnique({
    where: { id },
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

  return prisma.inspection.findMany({
    where: { scaffold_id },
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
      companyId: scaffold.company,
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
          companyId: scaffold.company,
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
        companyId: scaffold.company,
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
  data.photos?.forEach((photo) =>
    assertStoredFileReference(photo, "Foto da inspecao"),
  );
  if (data.signature) {
    assertStoredFileReference(data.signature, "Assinatura da inspecao");
  }
  data.signatures?.forEach((signature) => {
    if (signature.signature_data) {
      assertStoredFileReference(signature.signature_data, "Assinatura");
    }
  });
  data.checklist.forEach((item) => {
    if (item.photo) {
      assertStoredFileReference(item.photo, "Foto do checklist");
    }
  });
  const currentAccess = await getCurrentUserAccess();

  const { checklist, signatures, ...inspectionData } = data;
  const oldScaffold = await prisma.scaffold.findUnique({
    where: { id: data.scaffold_id },
  });
  const policy = await resolveInspectionSignaturePolicyForScaffold(
    data.scaffold_id,
  );
  const requiredSignatures =
    policy?.requirements.filter((requirement) => requirement.is_required) ?? [];
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
      signatures: {
        create: providedSignatures.map((signature) => ({
          role_code: signature.role_code,
          signer_name: signature.signer_name.trim(),
          signer_company: signature.signer_company?.trim() || null,
          signer_position: signature.signer_position?.trim() || null,
          signature_data: signature.signature_data,
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
    data.validity_days > 0
      ? new Date(Date.now() + data.validity_days * 86_400_000)
      : null;

  // Se há item crítico reprovado → INTERDITADO; reprovado simples → REPROVADO; aprovado → LIBERADO
  const hasCriticalFail = checklist.some(
    (c) => c.critical && c.value === "CL_FAIL",
  );
  const newStatus =
    data.result === "reprovado"
      ? hasCriticalFail
        ? "interditado"
        : "reprovado"
      : "liberado";

  const scaffold = await prisma.scaffold.update({
    where: { id: data.scaffold_id },
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
    companyId: scaffold.company,
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
    companyId: scaffold.company,
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
      companyId: scaffold.company,
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
    companyId: scaffold.company,
  });

  return { id: inspection.id };
}

// ── Stats gerais ──────────────────────────────────────────────────────────────
export async function getInspectionStats() {
  await requireAnyPermission(["read.all", "read.own_company"]);

  const [total, aprovados, comRessalvas, reprovados] = await Promise.all([
    prisma.inspection.count(),
    prisma.inspection.count({ where: { result: "aprovado" } }),
    prisma.inspection.count({ where: { result: "aprovado_com_ressalvas" } }),
    prisma.inspection.count({ where: { result: "reprovado" } }),
  ]);
  return { total, aprovados, comRessalvas, reprovados };
}
