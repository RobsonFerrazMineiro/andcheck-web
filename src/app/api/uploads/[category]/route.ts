import { getCurrentUserAccess } from "@/lib/authz";
import {
  storeUploadedFile,
  UPLOAD_CATEGORIES,
  type UploadCategory,
} from "@/lib/file-storage";
import { roleHasPermission, type PermissionCode } from "@/lib/rbac";

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
  const allowed = access?.roleCodes.some((roleCode) =>
    CATEGORY_PERMISSIONS[category].some((permission) =>
      roleHasPermission(roleCode, permission),
    ),
  );
  if (!allowed) {
    return Response.json({ error: "Nao autorizado." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Arquivo obrigatorio." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE[category]) {
    return Response.json({ error: "Arquivo excede o tamanho permitido." }, { status: 413 });
  }
  if (category === "company-logo") {
    const allowedTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
    ]);
    if (!allowedTypes.has(file.type)) {
      return Response.json(
        { error: "Formato de logo invalido. Use PNG, JPG ou WEBP." },
        { status: 415 },
      );
    }
  }
  if (category === "documents") {
    const allowedTypes = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
      "image/webp",
    ]);
    if (!allowedTypes.has(file.type)) {
      return Response.json(
        { error: "Formato invalido. Use PDF, DOCX, XLSX, PNG, JPG ou WEBP." },
        { status: 415 },
      );
    }
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
