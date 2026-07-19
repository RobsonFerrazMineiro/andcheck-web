"use client";

export const MAX_OFFLINE_FILE_BYTES = 8 * 1024 * 1024;

export function fileToDataUrl(file: Blob) {
  if (file.size === 0) {
    return Promise.reject(new Error("Arquivo offline vazio."));
  }

  if (file.size > MAX_OFFLINE_FILE_BYTES) {
    return Promise.reject(
      new Error("Arquivo offline excede o limite de 8 MB."),
    );
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Não foi possível preparar o arquivo offline."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Falha ao ler arquivo offline."));
    reader.readAsDataURL(file);
  });
}

export function isOfflineFileReference(value?: string | null) {
  return Boolean(value && /^data:[^;,]+;base64,/i.test(value));
}
