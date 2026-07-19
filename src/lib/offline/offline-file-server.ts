import "server-only";

const MAX_OFFLINE_FILE_BYTES = 8 * 1024 * 1024;

export function isOfflineFileReference(value?: string | null) {
  return Boolean(value && /^data:[^;,]+;base64,/i.test(value));
}

export function dataUrlToFile(dataUrl: string, fileName: string) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error("Arquivo offline inválido.");
  }

  const [, mimeType, payload] = match;
  const bytes = Buffer.from(payload, "base64");

  if (bytes.byteLength === 0) {
    throw new Error("Arquivo offline vazio.");
  }

  if (bytes.byteLength > MAX_OFFLINE_FILE_BYTES) {
    throw new Error("Arquivo offline excede o tamanho permitido.");
  }

  return new File([bytes], fileName, { type: mimeType });
}
