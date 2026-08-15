"use client";

import { ChevronLeft, ChevronRight, FileText, X, XCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { DocumentPreviewModal } from "@/components/shared/document-preview-modal";
import { Button } from "@/components/ui/button";
import {
  deleteNonConformityEvidence,
  deleteNonConformityItemEvidence,
} from "@/lib/actions/non-conformity-actions";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import {
  getDocumentExtension,
  getDocumentFileName,
  getDocumentViewUrl,
  isImageDocument,
} from "@/lib/document-view";
import { typography } from "@/lib/design-system";

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
  canDelete?: boolean;
  evidenceKind?: "item" | "general";
};

export function NonConformityEvidencePreview({
  id,
  fileUrl,
  fileName,
  mimeType,
  observation,
  galleryItems,
  canDelete = false,
  evidenceKind = "item",
}: NonConformityEvidencePreviewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showFullName, setShowFullName] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDeleting, startDeleteTransition] = useTransition();
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

  function deleteEvidence() {
    if (!id || isDeleting) return;
    const confirmed = window.confirm(
      "Remover esta evidência da tratativa da NC?",
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("evidenceId", id);
    const action =
      evidenceKind === "general"
        ? deleteNonConformityEvidence
        : deleteNonConformityItemEvidence;

    startDeleteTransition(async () => {
      try {
        await action(formData);
        toast.success("Evidência removida.");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Não foi possível remover a evidência.",
        );
      }
    });
  }

  const deleteButton =
    canDelete && id ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={deleteEvidence}
        disabled={isDeleting}
        aria-label={`Remover evidência ${fileName}`}
        title="Remover evidência"
        className="absolute right-0 top-0 z-10 size-4 bg-transparent text-destructive hover:bg-transparent hover:text-destructive/80"
      >
        <X className="size-3" />
      </Button>
    ) : null;

  if (!isImage) {
    return (
      <div className="inline-flex w-16 flex-col items-start gap-1">
        <span className="relative h-16 w-16">
          <Button
            type="button"
            variant="ghost"
            onClick={openPreview}
            aria-label={`Abrir evidência ${fileName || extension}`}
            className="h-16 w-16 border border-dashed border-border bg-muted/20 p-0 hover:bg-muted/20 hover:opacity-80"
          >
            <span className="flex flex-col items-center gap-0.5">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <span className={`${typography.metaStrong} text-muted-foreground`}>
                {extension}
              </span>
            </span>
          </Button>
          {deleteButton}
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowFullName((current) => !current)}
          aria-label={`Exibir nome do arquivo ${fileName}`}
          title={getDocumentFileName(document)}
          className="h-auto w-16 justify-start bg-transparent p-0 text-left hover:bg-transparent"
        >
          <p
            className={`text-[9px] font-medium leading-tight text-muted-foreground ${
              showFullName ? "break-words" : "truncate"
            }`}
          >
            {getDocumentFileName(document)}
          </p>
          {observation && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">
              {observation}
            </p>
          )}
        </Button>

        {open && (
          <DocumentPreviewModal
            document={document}
            title={getDocumentFileName(document)}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex w-16 flex-col items-start gap-1">
      <span className="relative h-16 w-16">
        <Button
          type="button"
          variant="ghost"
          onClick={openPreview}
          aria-label={`Abrir evidência ${fileName || "imagem anexada"}`}
          className="block h-16 w-16 bg-transparent p-0 hover:bg-transparent hover:opacity-80"
        >
          <Image
            src={fileUrl}
            alt="Evidência anexada"
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 object-cover"
          />
        </Button>
        {deleteButton}
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShowFullName((current) => !current)}
        aria-label={`Exibir nome do arquivo ${fileName}`}
        title={getDocumentFileName(document)}
        className="h-auto w-16 justify-start bg-transparent p-0 text-left hover:bg-transparent"
      >
        <p
          className={`text-[9px] font-medium leading-tight text-muted-foreground ${
            showFullName ? "break-words" : "truncate"
          }`}
        >
          {getDocumentFileName(document)}
        </p>
        {observation && (
          <p className="mt-0.5 line-clamp-2 text-[9px] text-muted-foreground">
            {observation}
          </p>
        )}
      </Button>

      {open && (
        <div
          ref={previewDialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={previewTitleId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-5xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground">
              <p
                id={previewTitleId}
                className={typography.panelTitle}
              >
                Evidência
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="Fechar evidência"
                className="text-primary-foreground/70 hover:text-primary-foreground"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative p-4">
              {hasGalleryNavigation && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    onClick={showPreviousImage}
                    className="absolute left-4 top-1/2 z-10 -translate-y-1/2 bg-card/90 hover:bg-muted"
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    onClick={showNextImage}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 bg-card/90 hover:bg-muted"
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
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
    </div>
  );
}
