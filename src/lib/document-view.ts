type DocumentLike = {
  fileUrl?: string | null;
  file_url?: string | null;
  downloadUrl?: string | null;
  download_url?: string | null;
  fileName?: string | null;
  file_name?: string | null;
  mimeType?: string | null;
  mime_type?: string | null;
};

export function getDocumentFileUrl(document: DocumentLike) {
  return (document.fileUrl ?? document.file_url ?? "").trim();
}

export function getDocumentFileName(document: DocumentLike) {
  return (document.fileName ?? document.file_name ?? "documento").trim();
}

export function getDocumentMimeType(document: DocumentLike) {
  const mimeType = (document.mimeType ?? document.mime_type ?? "").trim();
  if (mimeType) return mimeType;

  const fileUrl = getDocumentFileUrl(document);
  const dataMatch = /^data:([^;,]+)/i.exec(fileUrl);
  if (dataMatch?.[1]) return dataMatch[1];

  const fileName = getDocumentFileName(document).toLowerCase();
  if (fileName.endsWith(".pdf")) return "application/pdf";
  if (/\.(jpe?g)$/.test(fileName)) return "image/jpeg";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".webp")) return "image/webp";
  if (fileName.endsWith(".doc")) return "application/msword";
  if (fileName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (fileName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "";
}

export function getDocumentExtension(document: DocumentLike) {
  const fileName = getDocumentFileName(document);
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  if (match?.[1]) return match[1].toUpperCase();

  const mimeType = getDocumentMimeType(document);
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return mimeType.split("/")[1]?.toUpperCase() ?? "IMG";
  return "DOC";
}

export function isValidDocumentUrl(fileUrl: string) {
  return /^(https?:\/\/|blob:|data:[^;,]+[;,]|\/(?!\/))/i.test(fileUrl.trim());
}

export function getDocumentViewUrl(document: DocumentLike) {
  const fileUrl = getDocumentFileUrl(document);
  if (!fileUrl || !isValidDocumentUrl(fileUrl)) return null;
  return fileUrl;
}

export function isImageDocument(document: DocumentLike) {
  const fileUrl = getDocumentFileUrl(document);
  const mimeType = getDocumentMimeType(document);
  return mimeType.startsWith("image/") || fileUrl.startsWith("data:image/");
}

export function isPdfDocument(document: DocumentLike) {
  const fileUrl = getDocumentFileUrl(document);
  const mimeType = getDocumentMimeType(document);
  return mimeType === "application/pdf" || fileUrl.startsWith("data:application/pdf");
}

export function isBrowserViewableDocument(document: DocumentLike) {
  return isImageDocument(document) || isPdfDocument(document);
}

export function dataUrlToBlobUrl(dataUrl: string) {
  const [metadata, payload] = dataUrl.split(",");
  if (!metadata || !payload) return null;

  const mimeType = /^data:([^;,]+)/i.exec(metadata)?.[1] ?? "application/octet-stream";
  const isBase64 = /;base64/i.test(metadata);
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export function getSafeOpenUrl(document: DocumentLike) {
  const viewUrl = getDocumentViewUrl(document);
  if (!viewUrl) return null;
  if (viewUrl.startsWith("data:")) return dataUrlToBlobUrl(viewUrl);
  return viewUrl;
}

export function downloadDocumentFile(document: DocumentLike) {
  const viewUrl =
    (document.downloadUrl ?? document.download_url ?? "").trim() ||
    getDocumentViewUrl(document);
  if (!viewUrl) return false;

  const anchor = window.document.createElement("a");
  anchor.href = viewUrl;
  anchor.download = getDocumentFileName(document);
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}
