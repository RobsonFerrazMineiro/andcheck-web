"use server";

import { AuditAction, AuditEntityType, createAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";

export async function logInspectionPdfGenerated(inspectionId: string) {
  await requirePermission("pdf.generate");
  const scope = await getDataScope();

  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, ...dataScopeWhere(scope) },
    select: {
      id: true,
      scaffold_code: true,
      result: true,
      companyId: true,
      workspaceId: true,
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
    companyId: inspection.companyId,
    workspaceId: inspection.workspaceId,
  });
}
