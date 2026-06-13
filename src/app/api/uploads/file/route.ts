import { getCurrentUserAccess } from "@/lib/authz";
import { createStoredFileResponse } from "@/lib/file-response";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

const FILE_PERMISSIONS: PermissionCode[] = [
  "documents.view",
  "documents.create",
  "inspections.create",
  "inspections.finalize",
  "non_conformities.view",
  "non_conformities.add_evidence",
];

export async function GET(request: Request) {
  const access = await getCurrentUserAccess();
  const allowed = access?.roleCodes.some((roleCode) =>
    FILE_PERMISSIONS.some((permission) =>
      roleHasPermission(roleCode, permission),
    ),
  );
  if (!allowed) return new Response("Nao autorizado.", { status: 403 });

  const reference = new URL(request.url).searchParams.get("reference") ?? "";
  if (!reference.startsWith("vercel-blob:")) {
    return new Response("Referencia de arquivo invalida.", { status: 422 });
  }

  return createStoredFileResponse({
    fileUrl: reference,
    fileName: "arquivo",
  });
}
