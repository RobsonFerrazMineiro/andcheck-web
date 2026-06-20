"use client";

import { Download, ExternalLink, FileText, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import {
  downloadDocumentFile,
  getDocumentFileName,
  getDocumentViewUrl,
  getSafeOpenUrl,
  isBrowserViewableDocument,
  isImageDocument,
  isPdfDocument,
} from "@/lib/document-view";

type PreviewDocument = {
  title?: string | null;
  fileUrl?: string | null;
  file_url?: string | null;
  fileName?: string | null;
  file_name?: string | null;
  mimeType?: string | null;
  mime_type?: string | null;
};

type DocumentPreviewModalProps = {
  document: PreviewDocument;
  title?: string;
  onClose: () => void;
};

export function DocumentPreviewModal({
  document,
  title,
  onClose,
}: DocumentPreviewModalProps) {
  const modalTitle =
    title ?? document.title ?? getDocumentFileName(document) ?? "Documento";
  const viewUrl = getDocumentViewUrl(document);
  const safeOpenUrl = getSafeOpenUrl(document);
  const isImage = isImageDocument(document);
  const isPdf = isPdfDocument(document);
  const canOpenInTab = isBrowserViewableDocument(document) && Boolean(safeOpenUrl);

  function handleDownload() {
    if (!downloadDocumentFile(document)) {
      toast.error("Arquivo indisponÃ­vel ou URL invÃ¡lida.");
    }
  }

  function handleOpenInTab() {
    if (!safeOpenUrl) {
      toast.error("Arquivo indisponÃ­vel ou URL invÃ¡lida.");
      return;
    }
    window.open(safeOpenUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-border bg-muted/40">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground/70" />
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-foreground">
              {modalTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 transition-colors hover:bg-muted"
            aria-label="Fechar visualizador"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {isImage && viewUrl && (
            <Image
              src={viewUrl}
              alt={modalTitle}
              width={1200}
              height={800}
              unoptimized
              className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            />
          )}

          {isPdf && safeOpenUrl && (
            <iframe
              src={safeOpenUrl}
              title={modalTitle}
              className="h-[70vh] w-full border border-border"
            />
          )}

          {!isImage && !isPdf && (
            <div className="flex items-start gap-3 border border-dashed border-border bg-muted/20 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center border border-border bg-background">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-foreground">
                  {getDocumentFileName(document)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Este formato deve ser baixado para visualizaÃ§Ã£o.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-8 items-center gap-1.5 border border-border px-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" /> Baixar
            </button>
            {canOpenInTab && (
              <button
                type="button"
                onClick={handleOpenInTab}
                className="inline-flex h-8 items-center gap-1.5 bg-accent px-3 text-[10px] font-bold uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova guia
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
