"use client";

export function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Nao foi possivel preparar o arquivo offline."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Falha ao ler arquivo offline."));
    reader.readAsDataURL(file);
  });
}

export function isOfflineFileReference(value?: string | null) {
  return Boolean(value && /^data:[^;,]+;base64,/i.test(value));
}
