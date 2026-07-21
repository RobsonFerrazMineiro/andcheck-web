const ALLOWED_REFERENCE_PREFIXES = ["/uploads/", "vercel-blob:"];
const INLINE_IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:png|jpeg|jpg|webp);base64,[a-z0-9+/=]+$/i;
const INLINE_FILE_DATA_URL_PATTERN =
  /^data:(?:image\/(?:png|jpeg|jpg|webp)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(?:wordprocessingml\.document|spreadsheetml\.sheet));base64,[a-z0-9+/=]+$/i;

export function isStoredFileReference(value: string) {
  const reference = value.trim();
  return ALLOWED_REFERENCE_PREFIXES.some((prefix) =>
    reference.startsWith(prefix),
  );
}

export function assertStoredFileReference(
  value: string | null | undefined,
  fieldName = "arquivo",
) {
  if (!value || !isStoredFileReference(value)) {
    throw new Error(
      `${fieldName} deve usar uma referência de storage; dados Base64 não são aceitos.`,
    );
  }
}

export function isStoredFileOrInlineImageReference(value: string) {
  const reference = value.trim();
  return (
    isStoredFileReference(reference) ||
    INLINE_IMAGE_DATA_URL_PATTERN.test(reference)
  );
}

export function isStoredFileOrInlineFileReference(value: string) {
  const reference = value.trim();
  return (
    isStoredFileReference(reference) ||
    INLINE_FILE_DATA_URL_PATTERN.test(reference)
  );
}

export function assertStoredFileOrInlineImageReference(
  value: string | null | undefined,
  fieldName = "arquivo",
) {
  if (!value || !isStoredFileOrInlineImageReference(value)) {
    throw new Error(
      `${fieldName} deve usar uma referência de storage ou uma imagem Base64 válida.`,
    );
  }
}

export function assertStoredFileOrInlineFileReference(
  value: string | null | undefined,
  fieldName = "arquivo",
) {
  if (!value || !isStoredFileOrInlineFileReference(value)) {
    throw new Error(
      `${fieldName} deve usar uma referência de storage ou um arquivo Base64 válido.`,
    );
  }
}
