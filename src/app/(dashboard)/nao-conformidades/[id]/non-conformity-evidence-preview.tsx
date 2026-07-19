"use client";

import { ChevronLeft, ChevronRight, FileText, XCircle } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { DocumentPreviewModal } from "@/components/shared/document-preview-modal";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import {
  getDocumentExtension,
  getDocumentFileName,
  getDocumentViewUrl,
  isImageDocument,
} from "@/lib/document-view";

type EvidencePreviewItem = {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  observation: string | null;
};

export type NonConformityEvidencePreviewProps = {
  id?: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  observation: string | null;
  galleryItems?: EvidencePreviewItem[];
};

export function NonConformityEvidencePreview({
  id,
  fileUrl,
  fileName,
  mimeType,
  observation,
  galleryItems,
}: NonConformityEvidencePreviewProps) {
  const [open, setOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const document = { fileUrl, fileName, mimeType };
  const viewUrl = getDocumentViewUrl(document);
  const isImage = isImageDocument(document);
  const extension = getDocumentExtension(document);
  const galleryImages =
    galleryItems?.filter((item) =>
      isImageDocument({
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        mimeType: item.mimeType,
      }),
    ) ?? [];
  const currentImageIndex = Math.max(
    0,
    galleryImages.findIndex((item) => item.id === id),
  );
  const activeImage = galleryImages[activeImageIndex] ?? {
    id: id ?? fileUrl,
    fileUrl,
    fileName,
    mimeType,
    observation,
  };
  const hasGalleryNavigation = galleryImages.length > 1;
  const previewTitleId = useId();
  const previewDialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus(previewDialogRef, open && isImage, () => setOpen(false));

  function openPreview() {
    if (!viewUrl) {
      toast.error("Arquivo indisponível ou URL inválida.");
      return;
    }
    if (isImage) {
      setActiveImageIndex(currentImageIndex);
    }
    setOpen(true);
  }

  function showPreviousImage() {
    setActiveImageIndex((current) =>
      current === 0 ? galleryImages.length - 1 : current - 1,
    );
  }

  function showNextImage() {
    setActiveImageIndex((current) =>
      current === galleryImages.length - 1 ? 0 : current + 1,
    );
  }

  if (!isImage) {
    return (
      <>
        <button
          type="button"
          onClick={openPreview}
          aria-label={`Abrir evidência ${fileName || extension}`}
          className="flex min-h-16 min-w-40 items-start gap-2 bg-transparent p-0 text-left hover:opacity-80 transition-opacity"
        >
          <span className="flex h-16 w-16 items-center justify-center border border-dashed border-border bg-muted/20">
            <span className="flex flex-col items-center gap-0.5">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                {extension}
              </span>
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground">
              {getDocumentFileName(document)}
            </p>
            {observation && (
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">
                {observation}
              </p>
            )}
          </div>
        </button>

        {open && (
          <DocumentPreviewModal
            document={document}
            title={getDocumentFileName(document)}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        aria-label={`Abrir evidência ${fileName || "imagem anexada"}`}
        className="flex min-h-16 items-start gap-2 bg-transparent p-0 text-left hover:opacity-80 transition-opacity"
      >
        <Image
          src={fileUrl}
          alt="Evidência anexada"
          width={64}
          height={64}
          unoptimized
          className="h-16 w-16 object-cover"
        />
        {observation && (
          <p className="text-[10px] text-muted-foreground line-clamp-3">
            {observation}
          </p>
        )}
      </button>

      {open && (
        <div
          ref={previewDialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={previewTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-5xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground">
              <p
                id={previewTitleId}
                className="text-[10px] font-bold uppercase tracking-widest"
              >
                Evidência
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar evidência"
                className="text-primary-foreground/70 hover:text-primary-foreground"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="relative p-4">
              {hasGalleryNavigation && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="absolute left-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-border bg-card/90 hover:bg-muted"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-border bg-card/90 hover:bg-muted"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <Image
                src={activeImage.fileUrl}
                alt={activeImage.fileName || "Evidência anexada"}
                width={1200}
                height={800}
                unoptimized
                className="mx-auto max-h-[72vh] w-auto max-w-full object-contain"
              />
              <div className="mt-3 flex items-start justify-between gap-3">
                {activeImage.observation ? (
                  <p className="text-[12px] text-muted-foreground">
                    {activeImage.observation}
                  </p>
                ) : (
                  <span />
                )}
                {hasGalleryNavigation && (
                  <p className="shrink-0 text-[10px] font-mono text-muted-foreground">
                    {activeImageIndex + 1}/{galleryImages.length}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
