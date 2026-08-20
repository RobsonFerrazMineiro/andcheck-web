"use client";

import type { DocumentType } from "@prisma/client";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { DocumentStatusBadge } from "@/components/document/document-ui";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DocumentPreviewModal } from "@/components/shared/document-preview-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import {
  addScaffoldDocument,
  deleteScaffoldDocument,
} from "@/lib/actions/document-actions";
import {
  canNavigateAfterOfflineWrite,
  checkServerConnectivity,
} from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import { fileToDataUrl } from "@/lib/offline/offline-file-client";
import { createOfflineId } from "@/lib/offline/types";
import {
  downloadDocumentFile,
  getDocumentExtension,
  getDocumentViewUrl,
} from "@/lib/document-view";
import {
  DOCUMENT_TYPE_OPTIONS,
  getDocumentTypeLabel,
} from "@/lib/document-types";
import { SEMANTIC_TONE_CLASSES } from "@/lib/semantic-tones";
import { control, surface, typography } from "@/lib/design-system";
import { uploadFile } from "@/lib/upload-file";

function isStorageNotConfiguredError(error: unknown) {
  return (
    error instanceof Error &&
    /storage/i.test(error.message) &&
    /configur/i.test(error.message)
  );
}

// ── Tipos e constantes ────────────────────────────────────────────────────────

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export type ScaffoldDocumentMetadata = {
  id: string;
  scaffold_id: string;
  type: DocumentType;
  title: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  expires_at: Date | string | null;
  observation: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function docTypeLabel(type: string) {
  return getDocumentTypeLabel(type);
}

function statusOf(doc: ScaffoldDocumentMetadata): "anexado" | "vencido" {
  if (doc.expires_at && isPast(new Date(doc.expires_at))) return "vencido";
  return "anexado";
}

// ── Modal de adição ───────────────────────────────────────────────────────────
interface ModalProps {
  scaffoldId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddDocumentModal({ scaffoldId, onClose, onAdded }: ModalProps) {
  const router = useRouter();
  const [type, setType] = useState("ART");
  const [title, setTitle] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [observation, setObservation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, true, saving ? undefined : onClose);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Selecione um arquivo.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo 5 MB.");
      return;
    }
    if (!uploadedBy.trim()) {
      toast.error("Informe o responsável pelo upload.");
      return;
    }

    setSaving(true);
    try {
      // Comprime imagens antes de enviar; o banco recebe apenas a referência.
      const uploadBody = file.type.startsWith("image/")
        ? await import("@/lib/compress-image").then((mod) =>
            mod.compressImageBlob(file),
          )
        : file;

      if ((await checkServerConnectivity()) === "offline") {
        const offlineId = createOfflineId("scaffold_document");
        await localDb.syncQueue.enqueue({
          id: offlineId,
          action: "scaffold.document.add",
          entityType: "document",
          entityId: offlineId,
          payload: {
            scaffold_id: scaffoldId,
            type,
            title: title.trim() || docTypeLabel(type),
            file_url: await fileToDataUrl(uploadBody),
            file_name: file.name,
            file_size: uploadBody.size,
            mime_type: uploadBody.type || file.type || undefined,
            uploaded_by: uploadedBy.trim(),
            expires_at: expiresAt || undefined,
            observation: observation.trim() || undefined,
          },
        });

        toast.success("Documento salvo offline para sincronização.");
        onClose();
        if (canNavigateAfterOfflineWrite()) {
          router.push("/sincronizacao");
        }
        return;
      }

      let fileUrl: string;
      let fileSize = uploadBody.size;
      let mimeType = uploadBody.type || file.type || undefined;
      try {
        const uploaded = await uploadFile(uploadBody, {
          category: "scaffold-documents",
          fileName: file.name,
        });
        fileUrl = uploaded.reference;
        fileSize = uploaded.size;
        mimeType = uploaded.contentType;
      } catch (error) {
        if (!isStorageNotConfiguredError(error)) throw error;
        fileUrl = await fileToDataUrl(uploadBody);
      }

      await addScaffoldDocument({
        scaffold_id: scaffoldId,
        type: type as Parameters<typeof addScaffoldDocument>[0]["type"],
        title: title.trim() || docTypeLabel(type),
        file_url: fileUrl,
        file_name: file.name,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: uploadedBy.trim(),
        expires_at: expiresAt ? new Date(expiresAt) : undefined,
        observation: observation.trim() || undefined,
      });

      toast.success("Documento adicionado com sucesso!");
      onAdded();
      onClose();
    } catch {
      toast.error("Erro ao salvar documento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-document-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className={`w-full max-w-lg ${surface.dialog}`}>
        {/* Header do modal */}
        <div className={`flex items-center justify-between ${surface.panelHeaderWide}`}>
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p
              id="add-document-title"
              className={`${typography.panelTitle} text-foreground`}
            >
              Adicionar Documento Técnico
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar modal de documento"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <label
              htmlFor="document-type"
              className={`${typography.panelTitle} text-muted-foreground`}
            >
              Tipo de Documento *
            </label>
            <select
              id="document-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={control.nativeSelectSm}
            >
              {DOCUMENT_TYPE_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label
              htmlFor="document-title"
              className={`${typography.panelTitle} text-muted-foreground`}
            >
              Título / Nome (opcional)
            </label>
            <Input
              id="document-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ex: ${docTypeLabel(type)} - Andaime Área 5`}
            />
          </div>

          {/* Arquivo */}
          <div className="space-y-1.5">
            <label
              htmlFor="document-file"
              className={`${typography.panelTitle} text-muted-foreground`}
            >
              Arquivo *{" "}
              <span className="normal-case font-normal text-muted-foreground/60">
                (PDF, JPG, PNG, WEBP, DOC — máx. 5 MB)
              </span>
            </label>
            <div
              role="button"
              tabIndex={0}
              aria-controls="document-file"
              className={`cursor-pointer px-4 py-4 text-center ${surface.dashedActionBox}`}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileRef.current?.click();
                }
              }}
            >
              {file ? (
                <p className={`${typography.bodyStrong} truncate text-foreground`}>
                  {file.name}
                </p>
              ) : (
                <p className={`${typography.sectionDescription} text-muted-foreground`}>
                  Clique para selecionar o arquivo
                </p>
              )}
            </div>
            <input
              id="document-file"
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              required
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <label
              htmlFor="document-uploaded-by"
              className={`${typography.panelTitle} text-muted-foreground`}
            >
              Responsável pelo Upload *
            </label>
            <Input
              id="document-uploaded-by"
              type="text"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              placeholder="Nome do responsável"
              required
            />
          </div>

          {/* Validade */}
          <div className="space-y-1.5">
            <label
              htmlFor="document-expires-at"
              className={`${typography.panelTitle} text-muted-foreground`}
            >
              Validade / Revisão (opcional)
            </label>
            <Input
              id="document-expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <label
              htmlFor="document-observation"
              className={`${typography.panelTitle} text-muted-foreground`}
            >
              Observação (opcional)
            </label>
            <Textarea
              id="document-observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className={typography.action}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={typography.action}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export interface ScaffoldDocumentSectionProps {
  scaffoldId: string;
  initialDocuments: ScaffoldDocumentMetadata[];
  canAddDocument?: boolean;
  canDeleteDocument?: boolean;
}

export function ScaffoldDocumentSection({
  scaffoldId,
  initialDocuments,
  canAddDocument = false,
  canDeleteDocument = false,
}: ScaffoldDocumentSectionProps) {
  const router = useRouter();
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ScaffoldDocumentMetadata | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ScaffoldDocumentMetadata | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const docs = initialDocuments.filter(
    (document) => !removedDocumentIds.includes(document.id),
  );

  function handleAdded() {
    // Revalida a página para recarregar os documentos via server
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteScaffoldDocument(id, scaffoldId);
      setRemovedDocumentIds((current) => [...current, id]);
      toast.success("Documento removido.");
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Erro ao remover documento.");
    } finally {
      setDeleting(null);
    }
  }

  function handleView(doc: ScaffoldDocumentMetadata) {
    if (!getDocumentViewUrl(doc)) {
      toast.error("Arquivo indisponível ou URL inválida.");
      return;
    }
    setPreviewDoc(doc);
  }

  function handleDownload(doc: ScaffoldDocumentMetadata) {
    if (!downloadDocumentFile(doc)) {
      toast.error("Arquivo indisponível ou URL inválida.");
    }
  }

  return (
    <>
      {/* ── Seção ── */}
      <div className={surface.panel}>
        {/* Header */}
        <div className={`flex items-center justify-between ${surface.panelHeaderMuted}`}>
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className={`${typography.panelTitle} text-foreground`}>
              Documentação Técnica
            </p>
            <span className={`${typography.codeMuted} text-muted-foreground/50`}>
              {docs.length} doc(s)
            </span>
          </div>
          {canAddDocument && (
            <Button
              type="button"
              size="sm"
              onClick={() => setModalOpen(true)}
              className={typography.badge}
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Lista de documentos */}
        {docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento anexado"
            description='Clique em "Adicionar" para anexar o primeiro documento técnico.'
            className={surface.panelEmptyStatePadded}
          />
        ) : (
          <div className={surface.listDivider}>
            {/* Cabeçalho da tabela */}
            <div className={`hidden grid-cols-[1fr_auto_auto_auto] gap-4 sm:grid ${surface.panelHeaderCompact}`}>
              {["Documento", "Data / Validade", "Status", "Ações"].map((h) => (
                <p
                  key={h}
                  className={`${typography.sectionLabel} text-muted-foreground`}
                >
                  {h}
                </p>
              ))}
            </div>

            {docs.map((doc) => {
              const status = statusOf(doc);
              return (
                <div
                  key={doc.id}
                  className={`grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4 ${surface.rowInteractive}`}
                >
                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span className={`${typography.sectionLabel} text-accent`}>
                        {docTypeLabel(doc.type)}
                      </span>
                      <span className={`${typography.metaStrong} text-muted-foreground/60`}>
                        {getDocumentExtension(doc)}
                      </span>
                    </div>
                    <p className={`${typography.bodyStrong} truncate text-foreground`}>
                      {doc.title}
                    </p>
                    <p className={`truncate ${typography.bodyMuted} text-muted-foreground`}>
                      {doc.file_name} · {doc.uploaded_by} ·{" "}
                      {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {doc.observation && (
                      <p className={`mt-0.5 truncate italic ${typography.bodyMuted} text-muted-foreground/70`}>
                        {doc.observation}
                      </p>
                    )}
                  </div>

                  {/* Data validade */}
                  <div className="text-right hidden sm:block">
                    {doc.expires_at ? (
                      <>
                        <p className={`${typography.metaStrong} text-muted-foreground`}>
                          Válido até
                        </p>
                        <p
                          className={`${typography.bodyStrong} ${
                            status === "vencido"
                              ? SEMANTIC_TONE_CLASSES.critical.text
                              : "text-foreground"
                          }`}
                        >
                          {format(new Date(doc.expires_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </>
                    ) : (
                      <p className={`${typography.bodyMuted} text-muted-foreground/40`}>—</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="hidden sm:block">
                    <DocumentStatusBadge status={status} />
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleView(doc)}
                      title="Visualizar"
                      aria-label={`Visualizar documento ${doc.title}`}
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleDownload(doc)}
                      title="Baixar"
                      aria-label={`Baixar documento ${doc.title}`}
                    >
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    {canDeleteDocument && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(doc)}
                        disabled={deleting === doc.id}
                        title="Remover"
                        aria-label={`Remover documento ${doc.title}`}
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && canAddDocument && (
        <AddDocumentModal
          scaffoldId={scaffoldId}
          onClose={() => setModalOpen(false)}
          onAdded={handleAdded}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remover documento"
        description="Esta ação remove o documento anexado ao andaime."
        details={
          deleteTarget ? (
            <div className="space-y-1">
              <p className={`${typography.bodyStrong} text-foreground`}>
                {deleteTarget.title}
              </p>
              <p className={`${typography.bodyMuted} text-muted-foreground`}>
                {docTypeLabel(deleteTarget.type)}
              </p>
            </div>
          ) : null
        }
        confirmLabel="Remover documento"
        destructive
        pending={Boolean(deleting)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget.id);
        }}
      />
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
}
