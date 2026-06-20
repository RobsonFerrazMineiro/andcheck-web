"use client";

import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
  Plus,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DocumentPreviewModal } from "@/components/shared/document-preview-modal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addNonConformityComment,
  addNonConformityItemEvidence,
  updateNonConformityDueDate,
  updateNonConformityResponsible,
  updateNonConformityStatus,
} from "@/lib/actions/non-conformity-actions";
import {
  getDocumentExtension,
  getDocumentFileName,
  getDocumentViewUrl,
  isImageDocument,
} from "@/lib/document-view";
import { uploadFile } from "@/lib/upload-file";
import { toast } from "sonner";

type ResponsibleOption = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  department: string | null;
  position: string | null;
};

type Props = {
  id: string;
  responsibleUserId: string | null;
  dueDate: string | null;
  responsibleOptions: ResponsibleOption[];
  canAssign: boolean;
  canRequestVerification: boolean;
  canReview: boolean;
  canChangeDueDate: boolean;
  canComment: boolean;
  canCancel: boolean;
};

type EvidencePreviewItem = {
  id: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  observation: string | null;
};

type Modal =
  | "responsible"
  | "dueDate"
  | "comment"
  | "accept"
  | "reject"
  | "cancel"
  | null;

function evidenceTypeFromFile(file: File) {
  if (file.type.startsWith("image/")) return "PHOTO";
  if (file.type === "application/pdf") return "PDF";
  return "DOCUMENT";
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <p className="text-[10px] font-bold uppercase tracking-widest">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-primary-foreground/70 hover:text-primary-foreground"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function NonConformityOperations({
  id,
  responsibleUserId,
  dueDate,
  responsibleOptions,
  canAssign,
  canRequestVerification,
  canReview,
  canChangeDueDate,
  canComment,
  canCancel,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: (formData: FormData) => Promise<unknown>, formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (
          result &&
          typeof result === "object" &&
          "scaffoldReturnedToPendingRelease" in result &&
          result.scaffoldReturnedToPendingRelease
        ) {
          toast.success("NC encerrada. Andaime retornou para pendente de liberação.");
        }
        setModal(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível executar a acao.");
      }
    });
  }

  function submitStatus(nextStatus: string, comment = "") {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", nextStatus);
    formData.set("comment", comment);
    runAction(updateNonConformityStatus, formData);
  }

  const hasActions =
    canAssign ||
    canRequestVerification ||
    canReview ||
    canChangeDueDate ||
    canComment ||
    canCancel;

  if (!hasActions) return null;

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        {error && (
          <p className="basis-full text-right text-[11px] font-medium text-red-700">
            {error}
          </p>
        )}

        {canAssign && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setModal("responsible")}
          >
            <UserRound className="w-3.5 h-3.5" /> Atribuir Responsável
          </Button>
        )}
        {canComment && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setModal("comment")}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Comentario
          </Button>
        )}
        {canChangeDueDate && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setModal("dueDate")}
          >
            <CalendarClock className="w-3.5 h-3.5" /> Prazo
          </Button>
        )}
        {canRequestVerification && (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => submitStatus("PENDING_VERIFICATION")}
          >
            <Send className="w-3.5 h-3.5" /> Solicitar Verificacao
          </Button>
        )}
        {canReview && (
          <>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => setModal("accept")}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar Correcao
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => setModal("reject")}
            >
              <XCircle className="w-3.5 h-3.5" /> Rejeitar Correcao
            </Button>
          </>
        )}
        {canCancel && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => setModal("cancel")}
          >
            <XCircle className="w-3.5 h-3.5" /> Cancelar
          </Button>
        )}
      </div>

      {modal === "responsible" && (
        <ModalShell title="Atribuir Responsável" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              formData.set("id", id);
              runAction(updateNonConformityResponsible, formData);
            }}
            className="space-y-3"
          >
            <Select
              name="responsibleUserId"
              defaultValue={responsibleUserId ?? undefined}
            >
              <SelectTrigger className="w-full rounded-md">
                <SelectValue placeholder="Planejamento, Supervisor ou Encarregado" />
              </SelectTrigger>
              <SelectContent>
                {responsibleOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} {user.company ? "- " + user.company : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>Salvar</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "dueDate" && (
        <ModalShell title="Alterar Prazo" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              formData.set("id", id);
              runAction(updateNonConformityDueDate, formData);
            }}
            className="space-y-3"
          >
            <Input
              name="dueDate"
              type="date"
              defaultValue={dueDate ? dueDate.slice(0, 10) : ""}
              className="rounded-md"
              required
            />
            <Textarea
              name="reason"
              placeholder="Motivo da alteracao"
              className="rounded-md text-[12px]"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>Salvar</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "comment" && (
        <ModalShell title="Adicionar Comentario" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              formData.set("id", id);
              runAction(addNonConformityComment, formData);
            }}
            className="space-y-3"
          >
            <Textarea
              name="comment"
              placeholder="Comentario operacional"
              className="rounded-md text-[12px]"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>Salvar</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "accept" && (
        <ModalShell title="Aceitar Correcao" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              submitStatus("CLOSED", String(formData.get("comment") ?? ""));
            }}
            className="space-y-3"
          >
            <Textarea
              name="comment"
              placeholder="Comentario de encerramento"
              className="rounded-md text-[12px]"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>Aceitar e Encerrar</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "reject" && (
        <ModalShell title="Rejeitar Correcao" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              submitStatus("REJECTED", String(formData.get("comment") ?? ""));
            }}
            className="space-y-3"
          >
            <Textarea
              name="comment"
              placeholder="Motivo da rejeicao"
              className="rounded-md text-[12px]"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Voltar
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                Rejeitar
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "cancel" && (
        <ModalShell title="Cancelar NC" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              submitStatus("CANCELLED", String(formData.get("comment") ?? ""));
            }}
            className="space-y-3"
          >
            <Textarea
              name="comment"
              placeholder="Motivo do cancelamento"
              className="rounded-md text-[12px]"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>
                Voltar
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                Cancelar NC
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

export function NonConformityItemEvidenceButton({
  id,
  itemId,
  disabled = false,
}: {
  id: string;
  itemId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function submitEvidence(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name) {
      setError("Selecione um arquivo de evidencia.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const uploaded = await uploadFile(file, {
          category: "non-conformity-evidence",
          fileName: file.name,
        });
        formData.delete("file");
        formData.set("id", id);
        formData.set("nonConformityItemId", itemId);
        formData.set("fileUrl", uploaded.reference);
        formData.set("fileName", file.name);
        formData.set("fileSize", String(uploaded.size));
        formData.set("mimeType", uploaded.contentType);
        formData.set("evidenceType", evidenceTypeFromFile(file));

        await addNonConformityItemEvidence(formData);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível anexar a evidencia.",
        );
      }
    });
  }

  if (disabled) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => setOpen(true)}
        aria-label="Anexar evidencia"
        title="Anexar evidencia"
        className="h-16 w-16 border-dashed bg-transparent p-0 hover:bg-muted/20"
      >
        <Plus className="w-5 h-5" />
      </Button>

      {open && (
        <ModalShell title="Anexar Evidencia" onClose={() => setOpen(false)}>
          <form action={submitEvidence} className="space-y-3">
            {error && (
              <p className="text-[11px] font-medium text-red-700">{error}</p>
            )}
            <Input
              name="file"
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="rounded-md"
              required
            />
            <Textarea
              name="observation"
              placeholder="Comentario opcional"
              className="rounded-md text-[12px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                Anexar
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}

export function NonConformityEvidencePreview({
  id,
  fileUrl,
  fileName,
  mimeType,
  observation,
  galleryItems,
}: {
  id?: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  observation: string | null;
  galleryItems?: EvidencePreviewItem[];
}) {
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
        className="flex min-h-16 items-start gap-2 bg-transparent p-0 text-left hover:opacity-80 transition-opacity"
      >
        <Image
          src={fileUrl}
          alt="Evidencia anexada"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl bg-card border border-border shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Evidencia
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                    aria-label="Proxima imagem"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <Image
                src={activeImage.fileUrl}
                alt={activeImage.fileName || "Evidencia anexada"}
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

