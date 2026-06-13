import { getCurrentUserAccess } from "@/lib/authz";
import { createStoredFileResponse } from "@/lib/file-response";
import { prisma } from "@/lib/prisma";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

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
  const allowed = access?.roleCodes.some((roleCode) =>
    DOCUMENT_PERMISSIONS.some((permission) =>
      roleHasPermission(roleCode, permission),
    ),
  );
  if (!allowed) return new Response("Nao autorizado.", { status: 403 });

  const { id } = await context.params;
  const document = await prisma.scaffoldDocument.findUnique({
    where: { id },
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
