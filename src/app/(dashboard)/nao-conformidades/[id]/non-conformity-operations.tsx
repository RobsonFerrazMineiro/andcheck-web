"use client";

import {
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  Plus,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
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
  canNavigateAfterOfflineWrite,
  checkServerConnectivity,
} from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import { fileToDataUrl } from "@/lib/offline/offline-file-client";
import { createOfflineId } from "@/lib/offline/types";
import { useOfflineSnapshotCache } from "@/lib/offline/use-offline-snapshot-cache";
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

type Modal =
  | "responsible"
  | "dueDate"
  | "comment"
  | "accept"
  | "reject"
  | "cancel"
  | null;

type CachedNonConformity = Record<string, unknown> & {
  id: string;
  _count?: Record<string, number>;
};

function evidenceTypeFromFile(file: File) {
  if (file.type.startsWith("image/")) return "PHOTO";
  if (file.type === "application/pdf") return "PDF";
  return "DOCUMENT";
}

async function updateCachedNonConformity(
  id: string,
  patch:
    | Partial<CachedNonConformity>
    | ((current: CachedNonConformity) => Partial<CachedNonConformity>),
) {
  const current = await localDb.nonConformities.get(id);
  if (!current) return;

  const cached = current as CachedNonConformity;
  const nextPatch = typeof patch === "function" ? patch(cached) : patch;
  await localDb.nonConformities.put({
    ...cached,
    ...nextPatch,
    syncStatus: "pending",
  });
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, true, onClose);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-lg bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <p
            id={titleId}
            className="text-[10px] font-bold uppercase tracking-widest"
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Fechar ${title}`}
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
  const { data: cachedResponsibleOptions } = useOfflineSnapshotCache({
    cacheKey: "nonConformity:responsibleOptions",
    initialData: responsibleOptions,
  });

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
        setError(err instanceof Error ? err.message : "Não foi possível executar a ação.");
      }
    });
  }

  function enqueueOfflineAction({
    action,
    payload,
    successMessage,
    replaceLatest = false,
  }: {
    action: string;
    payload: Record<string, unknown>;
    successMessage: string;
    replaceLatest?: boolean;
  }) {
    setError(null);
    startTransition(async () => {
      try {
        const queueInput = {
          action,
          entityType: "nonConformity",
          entityId: id,
          payload,
          id: createOfflineId("nc"),
        };
        if (replaceLatest) {
          await localDb.syncQueue.upsertLatest(queueInput);
        } else {
          await localDb.syncQueue.enqueue(queueInput);
        }
        toast.success(successMessage);
        setModal(null);
        if (canNavigateAfterOfflineWrite()) {
          router.push("/sincronizacao");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível salvar a ação offline.",
        );
      }
    });
  }

  async function submitStatus(nextStatus: string, comment = "") {
    if ((await checkServerConnectivity()) === "offline") {
      await updateCachedNonConformity(id, {
        status: nextStatus,
        closedAt: nextStatus === "CLOSED" ? new Date().toISOString() : null,
      });
      enqueueOfflineAction({
        action: "nonConformity.status.update",
        payload: {
          id,
          status: nextStatus,
          comment: comment.trim() || undefined,
        },
        successMessage: "Alteração de status salva offline para sincronização.",
        replaceLatest: true,
      });
      return;
    }

    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", nextStatus);
    formData.set("comment", comment);
    runAction(updateNonConformityStatus, formData);
  }

  async function submitComment(formData: FormData) {
    const comment = String(formData.get("comment") ?? "").trim();

    if ((await checkServerConnectivity()) === "offline") {
      enqueueOfflineAction({
        action: "nonConformity.comment.add",
        payload: { id, comment },
        successMessage: "Comentário salvo offline para sincronização.",
      });
      return;
    }

    formData.set("id", id);
    runAction(addNonConformityComment, formData);
  }

  async function submitResponsible(formData: FormData) {
    const responsibleUserId = String(
      formData.get("responsibleUserId") ?? "",
    ).trim();

    if ((await checkServerConnectivity()) === "offline") {
      const responsible = cachedResponsibleOptions.find(
        (option) => option.id === responsibleUserId,
      );
      await updateCachedNonConformity(id, {
        responsibleUserId,
        responsibleUser: responsible
          ? {
              id: responsible.id,
              name: responsible.name,
              company: responsible.company,
            }
          : null,
      });
      enqueueOfflineAction({
        action: "nonConformity.responsible.update",
        payload: { id, responsibleUserId },
        successMessage: "Responsável salvo offline para sincronização.",
        replaceLatest: true,
      });
      return;
    }

    formData.set("id", id);
    runAction(updateNonConformityResponsible, formData);
  }

  async function submitDueDate(formData: FormData) {
    const dueDate = String(formData.get("dueDate") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();

    if ((await checkServerConnectivity()) === "offline") {
      await updateCachedNonConformity(id, { dueDate });
      enqueueOfflineAction({
        action: "nonConformity.dueDate.update",
        payload: { id, dueDate, reason },
        successMessage: "Prazo salvo offline para sincronização.",
        replaceLatest: true,
      });
      return;
    }

    formData.set("id", id);
    runAction(updateNonConformityDueDate, formData);
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
            <MessageSquare className="w-3.5 h-3.5" /> Comentário
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
            onClick={() => void submitStatus("PENDING_VERIFICATION")}
          >
            <Send className="w-3.5 h-3.5" /> Solicitar Verificação
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
              <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar Correção
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={() => setModal("reject")}
            >
              <XCircle className="w-3.5 h-3.5" /> Rejeitar Correção
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
              void submitResponsible(formData);
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
                {cachedResponsibleOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} {user.company ? "- " + user.company : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModal(null)}
              >
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
              void submitDueDate(formData);
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nc-due-date">Novo prazo *</Label>
              <Input
                id="nc-due-date"
                name="dueDate"
                type="date"
                defaultValue={dueDate ? dueDate.slice(0, 10) : ""}
                className="rounded-md"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-due-date-reason">
                Motivo da alteração *
              </Label>
              <Textarea
                id="nc-due-date-reason"
                name="reason"
                placeholder="Motivo da alteração"
                className="rounded-md text-[12px]"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>Salvar</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "comment" && (
        <ModalShell title="Adicionar Comentário" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              void submitComment(formData);
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nc-comment">Comentário *</Label>
              <Textarea
                id="nc-comment"
                name="comment"
                placeholder="Comentário operacional"
                className="rounded-md text-[12px]"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>Salvar</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "accept" && (
        <ModalShell title="Aceitar Correção" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              void submitStatus("CLOSED", String(formData.get("comment") ?? ""));
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nc-accept-comment">
                Comentário de encerramento *
              </Label>
              <Textarea
                id="nc-accept-comment"
                name="comment"
                placeholder="Comentário de encerramento"
                className="rounded-md text-[12px]"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModal(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>Aceitar e Encerrar</Button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "reject" && (
        <ModalShell title="Rejeitar Correção" onClose={() => setModal(null)}>
          <form
            action={(formData) => {
              void submitStatus("REJECTED", String(formData.get("comment") ?? ""));
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nc-reject-comment">Motivo da rejeição *</Label>
              <Textarea
                id="nc-reject-comment"
                name="comment"
                placeholder="Motivo da rejeição"
                className="rounded-md text-[12px]"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModal(null)}
              >
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
              void submitStatus("CANCELLED", String(formData.get("comment") ?? ""));
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="nc-cancel-comment">
                Motivo do cancelamento *
              </Label>
              <Textarea
                id="nc-cancel-comment"
                name="comment"
                placeholder="Motivo do cancelamento"
                className="rounded-md text-[12px]"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setModal(null)}
              >
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
      setError("Selecione um arquivo de evidência.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const toastId = toast.loading("Preparando evidência...");
      try {
        const evidenceType = evidenceTypeFromFile(file);
        const observation = String(formData.get("observation") ?? "").trim();

        if ((await checkServerConnectivity()) === "offline") {
          const offlineFile = await fileToDataUrl(file);
          await updateCachedNonConformity(id, (current) => ({
            _count: {
              ...current._count,
              evidences: (current._count?.evidences ?? 0) + 1,
            },
          }));
          await localDb.syncQueue.enqueue({
            action: "nonConformity.itemEvidence.add",
            entityType: "nonConformity",
            entityId: id,
            payload: {
              id,
              nonConformityItemId: itemId,
              fileUrl: offlineFile,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || undefined,
              evidenceType,
              observation: observation || undefined,
            },
            id: createOfflineId("nc_evidence"),
          });

          toast.success("Evidência salva offline para sincronização.", {
            id: toastId,
          });
          setOpen(false);
          if (canNavigateAfterOfflineWrite()) {
            router.push("/sincronizacao");
          }
          return;
        }

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
        formData.set("evidenceType", evidenceType);

        await addNonConformityItemEvidence(formData);
        toast.success("Evidência anexada com sucesso.", { id: toastId });
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Não foi possível anexar a evidência.",
          { id: toastId },
        );
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível anexar a evidência.",
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
        aria-label="Anexar evidência"
        title="Anexar evidência"
        className="h-16 w-16 border-dashed bg-transparent p-0 hover:bg-muted/20"
      >
        <Plus className="w-5 h-5" />
      </Button>

      {open && (
        <ModalShell title="Anexar Evidência" onClose={() => setOpen(false)}>
          <form action={submitEvidence} className="space-y-3">
            {error && (
              <p className="text-[11px] font-medium text-red-700">{error}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="nc-evidence-file">Arquivo *</Label>
              <Input
                id="nc-evidence-file"
                name="file"
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="rounded-md"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-evidence-observation">
                Comentário opcional
              </Label>
              <Textarea
                id="nc-evidence-observation"
                name="observation"
                placeholder="Comentário opcional"
                className="rounded-md text-[12px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
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

