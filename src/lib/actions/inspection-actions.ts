"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/authz";
import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { InspectionResult } from "@prisma/client";
import { resolveInspectionSignaturePolicyForScaffold } from "./signature-policy-actions";

// ── Listar todas ──────────────────────────────────────────────────────────────
export async function getInspections() {
  await requireAnyPermission(["read.all", "read.own_company"]);

  return prisma.inspection.findMany({
    orderBy: { date: "desc" },
    include: {
      scaffold: { select: { code: true, location: true, area: true } },
      _count: { select: { checklist: true } },
    },
  });
}

// ── Buscar por ID ─────────────────────────────────────────────────────────────
export async function getInspectionById(id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);

  return prisma.inspection.findUnique({
    where: { id },
    include: {
      scaffold: true,
      checklist: { orderBy: { category: "asc" } },
      signatures: {
        include: { role: true },
        orderBy: { signed_at: "asc" },
      },
    },
  });
}

// ── Listar por andaime ────────────────────────────────────────────────────────
export async function getInspectionsByScaffold(scaffold_id: string) {
  await requireAnyPermission(["read.all", "read.own_company"]);

  return prisma.inspection.findMany({
    where: { scaffold_id },
    orderBy: { date: "desc" },
    include: { checklist: true },
  });
}

// ── Criar ─────────────────────────────────────────────────────────────────────
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
    include: { checklist: true },
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

  return inspection;
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
