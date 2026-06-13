import { getCurrentUserAccess } from "@/lib/authz";
import { createStoredFileResponse } from "@/lib/file-response";
import { prisma } from "@/lib/prisma";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

const INSPECTION_PERMISSIONS: PermissionCode[] = [
  "read.all",
  "read.own_company",
  "inspections.create",
  "inspections.finalize",
  "pdf.generate",
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string; asset: string }> },
) {
  const access = await getCurrentUserAccess();
  const allowed = access?.roleCodes.some((roleCode) =>
    INSPECTION_PERMISSIONS.some((permission) =>
      roleHasPermission(roleCode, permission),
    ),
  );
  if (!allowed) return new Response("Nao autorizado.", { status: 403 });

  const { kind, id, asset } = await context.params;
  let fileUrl: string | null = null;
  let fileName = "arquivo";

  if (kind === "photo") {
    const index = Number(asset);
    const inspection = Number.isInteger(index)
      ? await prisma.inspection.findUnique({
          where: { id },
          select: { photos: true, scaffold_code: true },
        })
      : null;
    fileUrl = inspection?.photos[index] ?? null;
    fileName = `${inspection?.scaffold_code ?? "inspecao"}-foto-${index + 1}.jpg`;
  } else if (kind === "checklist") {
    const item = await prisma.checklistEntry.findUnique({
      where: { id },
      select: { photo: true, item_id: true },
    });
    fileUrl = item?.photo ?? null;
    fileName = `checklist-${item?.item_id ?? id}.jpg`;
  } else if (kind === "signature") {
    const inspection = await prisma.inspection.findUnique({
      where: { id },
      select: { signature: true, scaffold_code: true },
    });
    fileUrl = inspection?.signature ?? null;
    fileName = `${inspection?.scaffold_code ?? "inspecao"}-assinatura.png`;
  }

  if (!fileUrl) {
    return new Response("Arquivo da inspecao nao encontrado.", { status: 404 });
  }

  return createStoredFileResponse({ fileUrl, fileName });
}
