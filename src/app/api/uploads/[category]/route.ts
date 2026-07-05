import { getCurrentUserAccess } from "@/lib/authz";
import {
  storeUploadedFile,
  UPLOAD_CATEGORIES,
  type UploadCategory,
} from "@/lib/file-storage";
import {
  checkRequestRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";
import { validateUploadedFile } from "@/lib/upload-security";

const MAX_FILE_SIZE: Record<UploadCategory, number> = {
  "company-logo": 2 * 1024 * 1024,
  documents: 25 * 1024 * 1024,
  "scaffold-documents": 5 * 1024 * 1024,
  "inspection-photos": 8 * 1024 * 1024,
  "checklist-photos": 8 * 1024 * 1024,
  "inspection-signatures": 2 * 1024 * 1024,
  "non-conformity-evidence": 10 * 1024 * 1024,
};

const CATEGORY_PERMISSIONS: Record<UploadCategory, PermissionCode[]> = {
  "company-logo": ["companies.manage"],
  documents: ["documents.create"],
  "scaffold-documents": ["documents.create"],
  "inspection-photos": ["inspections.create", "inspections.finalize"],
  "checklist-photos": ["inspections.create", "inspections.finalize"],
  "inspection-signatures": ["inspections.create", "inspections.finalize"],
  "non-conformity-evidence": ["non_conformities.add_evidence"],
};

function isUploadCategory(value: string): value is UploadCategory {
  return UPLOAD_CATEGORIES.includes(value as UploadCategory);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ category: string }> },
) {
  const { category } = await context.params;
  if (!isUploadCategory(category)) {
    return Response.json({ error: "Categoria de upload invalida." }, { status: 404 });
  }

  const access = await getCurrentUserAccess();
  const allowed = access?.roleCodes.some((roleCode: string) =>
    CATEGORY_PERMISSIONS[category].some((permission) =>
      roleHasPermission(roleCode, permission),
    ),
  );
  if (!allowed) {
    return Response.json({ error: "Nao autorizado." }, { status: 403 });
  }
  const limit = checkRequestRateLimit(request, {
    key: `upload:${category}`,
    limit: 30,
    windowMs: 10 * 60 * 1_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Arquivo obrigatorio." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE[category]) {
    return Response.json({ error: "Arquivo excede o tamanho permitido." }, { status: 413 });
  }

  const validation = await validateUploadedFile(file, category);
  if (!validation.ok) {
    return Response.json({ error: validation.message }, { status: 415 });
  }

  try {
    const stored = await storeUploadedFile(file, category);
    return Response.json(stored, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel armazenar o arquivo.",
      },
      { status: 500 },
    );
  }
}
