"use client";

import type { DocumentType } from "@prisma/client";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  addScaffoldDocument,
  deleteScaffoldDocument,
} from "@/lib/actions/document-actions";
import { compressImageBlob } from "@/lib/compress-image";
import {
  downloadDocumentFile,
  getDocumentExtension,
  getDocumentFileName,
  getDocumentViewUrl,
  getSafeOpenUrl,
  isBrowserViewableDocument,
  isImageDocument,
  isPdfDocument,
} from "@/lib/document-view";
import { uploadFile } from "@/lib/upload-file";

// ── Tipos e constantes ────────────────────────────────────────────────────────

const DOC_TYPES = [
  {
    value: "ART",
    label: "ART — Anotação de Responsabilidade Técnica",
    priority: true,
  },
  {
    value: "RRT",
    label: "RRT — Registro de Responsabilidade Técnica",
    priority: true,
  },
  { value: "MEMORIAL_CALCULO", label: "Memorial de Cálculo", priority: true },
  { value: "CROQUI", label: "Croqui", priority: true },
  { value: "PROJETO", label: "Projeto Estrutural", priority: false },
  { value: "PROCEDIMENTO", label: "Procedimento de Montagem", priority: false },
  { value: "CERTIFICADO", label: "Certificado", priority: false },
  { value: "OUTRO", label: "Outro", priority: false },
] as const;

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

type ScaffoldDocumentMetadata = {
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
  return DOC_TYPES.find((d) => d.value === type)?.label.split(" — ")[0] ?? type;
}

function statusOf(doc: ScaffoldDocumentMetadata): "anexado" | "vencido" {
  if (doc.expires_at && isPast(new Date(doc.expires_at))) return "vencido";
  return "anexado";
}

function DocumentPreviewModal({
  doc,
  onClose,
}: {
  doc: ScaffoldDocumentMetadata;
  onClose: () => void;
}) {
  const viewUrl = getDocumentViewUrl(doc);
  const safeOpenUrl = getSafeOpenUrl(doc);
  const isImage = isImageDocument(doc);
  const isPdf = isPdfDocument(doc);
  const canOpenInTab = isBrowserViewableDocument(doc) && Boolean(safeOpenUrl);

  function handleDownload() {
    if (!downloadDocumentFile(doc)) {
      toast.error("Arquivo indisponível ou URL inválida.");
    }
  }

  function handleOpenInTab() {
    if (!safeOpenUrl) {
      toast.error("Arquivo indisponível ou URL inválida.");
      return;
    }
    window.open(safeOpenUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-border bg-muted/40">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-muted-foreground/70 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground truncate">
              {doc.title}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isImage && viewUrl && (
            <Image
              src={viewUrl}
              alt={doc.title}
              width={1200}
              height={800}
              unoptimized
              className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            />
          )}

          {isPdf && safeOpenUrl && (
            <iframe
              src={safeOpenUrl}
              title={doc.title}
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
                  {getDocumentFileName(doc)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Este formato deve ser baixado para visualização.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="h-8 px-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Baixar
            </button>
            {canOpenInTab && (
              <button
                type="button"
                onClick={handleOpenInTab}
                className="h-8 px-3 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-accent/90 transition-colors inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir em nova guia
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente: badge de status ──────────────────────────────────────────
function StatusBadge({
  status,
}: {
  status: "anexado" | "pendente" | "vencido";
}) {
  const cfg = {
    anexado: "bg-green-100 text-green-700 border-green-300",
    pendente: "bg-amber-50  text-amber-600  border-amber-300",
    vencido: "bg-red-50    text-red-600    border-red-300",
  }[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${cfg}`}
    >
      {status}
    </span>
  );
}

// ── Modal de adição ───────────────────────────────────────────────────────────
interface ModalProps {
  scaffoldId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddDocumentModal({ scaffoldId, onClose, onAdded }: ModalProps) {
  const [type, setType] = useState("ART");
  const [title, setTitle] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [observation, setObservation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      // Comprime imagens antes de enviar; o banco recebe apenas a referencia.
      const uploadBody = file.type.startsWith("image/")
        ? await compressImageBlob(file)
        : file;
      const uploaded = await uploadFile(uploadBody, {
        category: "scaffold-documents",
        fileName: file.name,
      });

      await addScaffoldDocument({
        scaffold_id: scaffoldId,
        type: type as Parameters<typeof addScaffoldDocument>[0]["type"],
        title: title.trim() || docTypeLabel(type),
        file_url: uploaded.reference,
        file_name: file.name,
        file_size: uploaded.size,
        mime_type: uploaded.contentType,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border shadow-xl w-full max-w-lg">
        {/* Header do modal */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Adicionar Documento Técnico
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tipo de Documento *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-9 px-3 border border-border bg-background text-[12px] focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Título / Nome (opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Ex: ${docTypeLabel(type)} - Andaime Área 5`}
              className="w-full h-9 px-3 border border-border bg-background text-[12px] focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Arquivo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Arquivo *{" "}
              <span className="normal-case font-normal text-muted-foreground/60">
                (PDF, JPG, PNG, WEBP, DOC — máx. 5 MB)
              </span>
            </label>
            <div
              className="border border-dashed border-border bg-muted/20 px-4 py-4 cursor-pointer hover:bg-muted/40 transition-colors text-center"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <p className="text-[11px] text-foreground font-semibold truncate">
                  {file.name}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Clique para selecionar o arquivo
                </p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Responsável pelo Upload *
            </label>
            <input
              type="text"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              placeholder="Nome do responsável"
              required
              className="w-full h-9 px-3 border border-border bg-background text-[12px] focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Validade */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Validade / Revisão (opcional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full h-9 px-3 border border-border bg-background text-[12px] focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Observação (opcional)
            </label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border bg-background text-[12px] resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 border border-border text-[11px] font-bold uppercase tracking-widest hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 bg-accent text-accent-foreground text-[11px] font-bold uppercase tracking-widest hover:bg-accent/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {saving ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props {
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
}: Props) {
  const router = useRouter();
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ScaffoldDocumentMetadata | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const docs = initialDocuments.filter(
    (document) => !removedDocumentIds.includes(document.id),
  );

  function handleAdded() {
    // Revalida a página para recarregar os documentos via server
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este documento?")) return;
    setDeleting(id);
    try {
      await deleteScaffoldDocument(id, scaffoldId);
      setRemovedDocumentIds((current) => [...current, id]);
      toast.success("Documento removido.");
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
      <div className="bg-card border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b-2 border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Documentação Técnica
            </p>
            <span className="text-[9px] font-mono text-muted-foreground/50">
              {docs.length} doc(s)
            </span>
          </div>
          {canAddDocument && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 h-7 px-3 bg-accent text-accent-foreground text-[9px] font-bold uppercase tracking-widest hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </button>
          )}
        </div>

        {/* Lista de documentos */}
        {docs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-7 h-7 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground">
              Nenhum documento anexado
            </p>
            <p className="text-[9px] text-muted-foreground/50 mt-0.5">
              Clique em &quot;Adicionar&quot; para anexar o primeiro documento
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Cabeçalho da tabela */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-muted/30">
              {["Documento", "Data / Validade", "Status", "Ações"].map((h) => (
                <p
                  key={h}
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
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
                  className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:gap-4 items-center px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-accent">
                        {docTypeLabel(doc.type)}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        {getDocumentExtension(doc)}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-foreground truncate">
                      {doc.title}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate">
                      {doc.file_name} · {doc.uploaded_by} ·{" "}
                      {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {doc.observation && (
                      <p className="text-[9px] text-muted-foreground/70 italic mt-0.5 truncate">
                        {doc.observation}
                      </p>
                    )}
                  </div>

                  {/* Data validade */}
                  <div className="text-right hidden sm:block">
                    {doc.expires_at ? (
                      <>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          Válido até
                        </p>
                        <p
                          className={`text-[11px] font-semibold ${status === "vencido" ? "text-red-600" : "text-foreground"}`}
                        >
                          {format(new Date(doc.expires_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </>
                    ) : (
                      <p className="text-[9px] text-muted-foreground/40">—</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="hidden sm:block">
                    <StatusBadge status={status} />
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleView(doc)}
                      title="Visualizar"
                      className="w-7 h-7 flex items-center justify-center border border-border hover:bg-muted transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      title="Baixar"
                      className="w-7 h-7 flex items-center justify-center border border-border hover:bg-muted transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    {canDeleteDocument && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        title="Remover"
                        className="w-7 h-7 flex items-center justify-center border border-border hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-40"
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-600" />
                        )}
                      </button>
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
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
}
