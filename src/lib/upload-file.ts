import type { UploadCategory } from "@/lib/file-storage";

export async function uploadFile(
  file: Blob,
  options: { category: UploadCategory; fileName: string },
) {
  const formData = new FormData();
  formData.set("file", file, options.fileName);

  const response = await fetch(`/api/uploads/${options.category}`, {
    method: "POST",
    body: formData,
  });
  const result = (await response.json()) as {
    reference?: string;
    size?: number;
    contentType?: string;
    error?: string;
  };

  if (!response.ok || !result.reference) {
    throw new Error(result.error || "Nao foi possivel enviar o arquivo.");
  }

  return {
    reference: result.reference,
    size: result.size ?? file.size,
    contentType: result.contentType ?? file.type,
  };
}

export function getUploadedFilePreviewUrl(reference: string) {
  if (!reference.startsWith("vercel-blob:")) return reference;
  return `/api/uploads/file?reference=${encodeURIComponent(reference)}`;
}
