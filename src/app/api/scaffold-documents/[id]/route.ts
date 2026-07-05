import { getCurrentUserAccess } from "@/lib/authz";
import { createStoredFileResponse } from "@/lib/file-response";
import { requiredId } from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";
import { dataScopeWhere, getDataScope } from "@/lib/data-scope";

const DOCUMENT_PERMISSIONS: PermissionCode[] = [
  "documents.view",
  "documents.create",
  "read.all",
  "read.own_company",
];

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await getCurrentUserAccess();
  const allowed = access?.roleCodes.some((roleCode: string) =>
    DOCUMENT_PERMISSIONS.some((permission) =>
      roleHasPermission(roleCode, permission),
    ),
  );
  if (!allowed) return new Response("Nao autorizado.", { status: 403 });
  const scope = await getDataScope();

  const { id: rawId } = await context.params;
  const id = requiredId(rawId, "Documento");
  const document = await prisma.scaffoldDocument.findFirst({
    where: { id, ...dataScopeWhere(scope) },
    select: { file_url: true, file_name: true, mime_type: true },
  });
  if (!document) {
    return new Response("Documento nao encontrado.", { status: 404 });
  }

  return createStoredFileResponse({
    fileUrl: document.file_url,
    fileName: document.file_name,
    mimeType: document.mime_type,
  });
}
