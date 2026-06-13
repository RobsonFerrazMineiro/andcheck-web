import "server-only";

import { get } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import path from "node:path";

function decodeDataUrl(fileUrl: string) {
  if (!fileUrl.startsWith("data:")) return null;

  const separatorIndex = fileUrl.indexOf(",");
  if (separatorIndex < 0) return null;

  const metadata = fileUrl.slice(5, separatorIndex);
  const payload = fileUrl.slice(separatorIndex + 1);
  const mimeType = metadata.split(";")[0] || "application/octet-stream";
  const buffer = metadata.toLowerCase().includes(";base64")
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");

  return { bytes: new Uint8Array(buffer), mimeType };
}

function responseHeaders(fileName: string, mimeType: string) {
  return {
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Content-Type": mimeType,
    "X-Content-Type-Options": "nosniff",
  };
}

export async function createStoredFileResponse(file: {
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
}) {
  if (file.fileUrl.startsWith("vercel-blob:")) {
    const stored = await get(file.fileUrl.slice("vercel-blob:".length), {
      access: "private",
    });
    if (!stored || stored.statusCode !== 200) {
      return new Response("Arquivo nao encontrado.", { status: 404 });
    }

    return new Response(stored.stream, {
      headers: responseHeaders(
        file.fileName,
        file.mimeType || stored.blob.contentType || "application/octet-stream",
      ),
    });
  }

  if (file.fileUrl.startsWith("/uploads/")) {
    const publicDirectory = path.resolve(process.cwd(), "public");
    const storedPath = path.resolve(
      publicDirectory,
      file.fileUrl.replace(/^\/+/, ""),
    );
    if (!storedPath.startsWith(`${publicDirectory}${path.sep}`)) {
      return new Response("Caminho de arquivo invalido.", { status: 422 });
    }

    try {
      const bytes = await readFile(storedPath);
      return new Response(bytes, {
        headers: responseHeaders(
          file.fileName,
          file.mimeType || "application/octet-stream",
        ),
      });
    } catch {
      return new Response("Arquivo nao encontrado.", { status: 404 });
    }
  }

  if (/^https?:\/\//i.test(file.fileUrl)) {
    return Response.redirect(file.fileUrl, 302);
  }

  const decoded = decodeDataUrl(file.fileUrl);
  if (!decoded) {
    return new Response("Conteudo do arquivo invalido.", { status: 422 });
  }

  return new Response(decoded.bytes, {
    headers: responseHeaders(file.fileName, file.mimeType || decoded.mimeType),
  });
}
