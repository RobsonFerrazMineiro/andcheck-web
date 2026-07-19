import { getCurrentUserAccess } from "@/lib/authz";
import { createStoredFileResponse } from "@/lib/file-response";
import {
  checkRequestRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { UPLOAD_CATEGORIES } from "@/lib/file-storage";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

const FILE_PERMISSIONS: PermissionCode[] = [
  "read.all",
  "read.own_company",
  "companies.view",
  "companies.manage",
  "documents.view",
  "documents.create",
  "inspections.create",
  "inspections.finalize",
  "non_conformities.view",
  "non_conformities.add_evidence",
];
const ALLOWED_BLOB_PREFIXES = UPLOAD_CATEGORIES.map(
  (category) => `vercel-blob:${category}/`,
);

export async function GET(request: Request) {
  const access = await getCurrentUserAccess();
  const allowed = access?.roleCodes.some((roleCode: string) =>
    FILE_PERMISSIONS.some((permission) =>
      roleHasPermission(roleCode, permission),
    ),
  );
  if (!allowed) return new Response("Não autorizado.", { status: 403 });
  const limit = checkRequestRateLimit(request, {
    key: "upload-file-read",
    limit: 180,
    windowMs: 60 * 1_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const reference = new URL(request.url).searchParams.get("reference") ?? "";
  if (
    reference.length > 512 ||
    !ALLOWED_BLOB_PREFIXES.some((prefix) => reference.startsWith(prefix))
  ) {
    return new Response("Referência de arquivo inválida.", { status: 422 });
  }

  return createStoredFileResponse({
    fileUrl: reference,
    fileName: "arquivo",
  });
}
