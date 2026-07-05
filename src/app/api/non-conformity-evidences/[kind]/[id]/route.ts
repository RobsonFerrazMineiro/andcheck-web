import { getCurrentUserAccess } from "@/lib/authz";
import { createStoredFileResponse } from "@/lib/file-response";
import { enumValue, requiredId } from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";

const NC_PERMISSIONS: PermissionCode[] = [
  "non_conformities.view",
  "non_conformities.create",
  "non_conformities.update",
  "non_conformities.close",
  "non_conformities.add_evidence",
];

function canAccessNonConformities(roleCodes: string[]) {
  return NC_PERMISSIONS.some((permission) =>
    roleCodes.some((roleCode: string) =>
      roleHasPermission(roleCode, permission),
    ),
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
  const scope = await getDataScope();

  const { kind: rawKind, id: rawId } = await context.params;
  const kind = enumValue(
    rawKind,
    ["item", "general"] as const,
    "Tipo de evidencia",
  );
  const id = requiredId(rawId, "Evidencia");
  const evidence =
    kind === "item"
      ? await prisma.nonConformityItemEvidence.findFirst({
          where: { id, ...dataScopeWhere(scope) },
          select: { fileUrl: true, fileName: true, mimeType: true },
        })
      : kind === "general"
        ? await prisma.nonConformityEvidence.findFirst({
            where: { id, ...dataScopeWhere(scope) },
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
