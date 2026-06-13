import { getCurrentUserAccess } from "@/lib/authz";
import { createStoredFileResponse } from "@/lib/file-response";
import { prisma } from "@/lib/prisma";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

const NC_PERMISSIONS: PermissionCode[] = [
  "non_conformities.view",
  "non_conformities.create",
  "non_conformities.update",
  "non_conformities.close",
  "non_conformities.add_evidence",
];

function canAccessNonConformities(roleCodes: string[]) {
  return NC_PERMISSIONS.some((permission) =>
    roleCodes.some((roleCode) => roleHasPermission(roleCode, permission)),
  );
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/non-conformity-evidences/[kind]/[id]">,
) {
  const access = await getCurrentUserAccess();
  if (!access || !canAccessNonConformities(access.roleCodes)) {
    return new Response("Nao autorizado.", { status: 403 });
  }

  const { kind, id } = await context.params;
  const evidence =
    kind === "item"
      ? await prisma.nonConformityItemEvidence.findUnique({
          where: { id },
          select: { fileUrl: true, fileName: true, mimeType: true },
        })
      : kind === "general"
        ? await prisma.nonConformityEvidence.findUnique({
            where: { id },
            select: { fileUrl: true, fileName: true, mimeType: true },
          })
        : null;

  if (!evidence) {
    return new Response("Evidencia nao encontrada.", { status: 404 });
  }

  return createStoredFileResponse({
    fileUrl: evidence.fileUrl,
    fileName: evidence.fileName,
    mimeType: evidence.mimeType,
  });
}
