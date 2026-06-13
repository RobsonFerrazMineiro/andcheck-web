"use server";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function logInspectionPdfGenerated(inspectionId: string) {
  await requirePermission("pdf.generate");

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: {
      id: true,
      scaffold_code: true,
      result: true,
      scaffold: { select: { company: true } },
    },
  });

  if (!inspection) return;

  await createAuditLog({
    entityType: AuditEntityType.PDF,
    entityId: inspection.id,
    entityLabel: inspection.scaffold_code,
    action: AuditAction.GENERATE_PDF,
    description: `PDF da inspecao ${inspection.id} gerado`,
    newValue: {
      inspection_id: inspection.id,
      scaffold_code: inspection.scaffold_code,
      result: inspection.result,
    },
    companyId: inspection.scaffold?.company,
  });
}
