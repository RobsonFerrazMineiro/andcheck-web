const ALLOWED_REFERENCE_PREFIXES = ["/uploads/", "vercel-blob:"];

export function isStoredFileReference(value: string) {
  const reference = value.trim();
  return (
    /^https?:\/\//i.test(reference) ||
    ALLOWED_REFERENCE_PREFIXES.some((prefix) => reference.startsWith(prefix))
  );
}

export function assertStoredFileReference(
  value: string | null | undefined,
  fieldName = "arquivo",
) {
  if (!value || !isStoredFileReference(value)) {
    throw new Error(
      `${fieldName} deve usar uma referencia de storage; dados Base64 nao sao aceitos.`,
    );
  }
}
