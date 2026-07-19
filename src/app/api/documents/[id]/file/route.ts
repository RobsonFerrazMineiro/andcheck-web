import {
  assertCanReadDocumentFile,
  logDocumentFileAccess,
} from "@/lib/actions/document-actions";
import { createStoredFileResponse } from "@/lib/file-response";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const document = await assertCanReadDocumentFile(id);
  if (!document) return new Response("Documento não encontrado.", { status: 404 });

  const disposition =
    new URL(request.url).searchParams.get("disposition") === "attachment"
      ? "attachment"
      : "inline";

  await logDocumentFileAccess(
    {
      id: document.id,
      title: document.title,
      fileName: document.fileName,
      companyId: document.companyId,
      workspaceId: document.workspaceId,
    },
    disposition === "attachment" ? "download" : "view",
  );

  return createStoredFileResponse({
    fileUrl: document.fileUrl,
    fileName: document.fileName,
    mimeType: document.mimeType,
    disposition,
  });
}
