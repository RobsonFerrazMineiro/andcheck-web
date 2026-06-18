"use client";

import { format, parseISO } from "date-fns";
import {
  Archive,
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DocumentPreviewModal } from "@/components/shared/document-preview-modal";
import { Button } from "@/components/ui/button";
import { archiveDocument } from "@/lib/actions/document-actions";
import { downloadDocumentFile, getSafeOpenUrl } from "@/lib/document-view";

type DocumentDetail = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  category: string;
  categoryLabel: string;
  status: "ACTIVE" | "EXPIRED" | "ARCHIVED";
  issueDate: string | null;
  expiryDate: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
  workspace: { id: string; name: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
  fileUrl: string;
  downloadUrl: string;
};

type DetailData = {
  document: DocumentDetail;
  canUpdate: boolean;
  canArchive: boolean;
};

const STATUS_LABELS: Record<DocumentDetail["status"], string> = {
  ACTIVE: "Ativo",
  EXPIRED: "Vencido",
  ARCHIVED: "Arquivado",
};

const STATUS_STYLE: Record<DocumentDetail["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-400/60",
  EXPIRED: "bg-red-50 text-red-800 border-red-400/60",
  ARCHIVED: "bg-slate-100 text-slate-600 border-slate-400/60",
};

function formatDate(value: string | null) {
  return value ? format(parseISO(value), "dd/MM/yyyy") : "-";
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-background p-3">
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="text-[12px] font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function DocumentoDetalheClient({ data }: { data: DetailData }) {
  const [document, setDocument] = useState(data.document);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    const safeOpenUrl = getSafeOpenUrl(document);
    if (!safeOpenUrl) {
      toast.error("Arquivo indisponivel ou URL invalida.");
      return;
    }
    window.open(safeOpenUrl, "_blank", "noopener,noreferrer");
  }

  function handleDownload() {
    if (!downloadDocumentFile(document)) {
      toast.error("Arquivo indisponivel ou URL invalida.");
    }
  }

  function handleArchive() {
    if (!confirm(`Arquivar o documento "${document.title}"?`)) return;
    startTransition(async () => {
      try {
        await archiveDocument(document.id);
        setDocument((current) => ({ ...current, status: "ARCHIVED" }));
        toast.success("Documento arquivado.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao arquivar documento.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            AndCheck EHS · Gestao Documental
          </p>
          <h1 className="text-[18px] font-bold uppercase tracking-tight text-foreground">
            {document.title}
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {document.categoryLabel} · {document.fileName}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-none">
          <Link href="/documentos">
            <ArrowLeft data-icon="inline-start" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground/60" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                Dados Gerais
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Titulo" value={document.title} />
              <InfoItem label="Categoria" value={document.categoryLabel} />
              <InfoItem
                label="Empresa"
                value={document.company?.name ?? "-"}
              />
              <InfoItem
                label="Workspace"
                value={document.workspace?.name ?? "-"}
              />
              <InfoItem
                label="Criado por"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground/50" />
                    {document.createdBy?.name ?? "-"}
                  </span>
                }
              />
              <InfoItem
                label="Criado em"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground/50" />
                    {formatDate(document.createdAt)}
                  </span>
                }
              />
              <InfoItem label="Emissao" value={formatDate(document.issueDate)} />
              <InfoItem label="Validade" value={formatDate(document.expiryDate)} />
              <InfoItem
                label="Status"
                value={
                  <span
                    className={
                      "inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest " +
                      STATUS_STYLE[document.status]
                    }
                  >
                    {STATUS_LABELS[document.status]}
                  </span>
                }
              />
              <InfoItem label="Tamanho" value={formatBytes(document.fileSize)} />
            </div>
            {document.description && (
              <div className="mt-3 border border-border bg-background p-3">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Descricao
                </p>
                <p className="text-[12px] text-foreground">
                  {document.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground/60" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
              Arquivo
            </p>
          </div>
          <div className="mb-4 flex min-h-36 flex-col items-center justify-center border border-dashed border-border bg-muted/20 p-4 text-center">
            <FileText className="mb-2 size-9 text-muted-foreground/30" />
            <p className="max-w-full truncate text-[12px] font-semibold text-foreground">
              {document.fileName}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {document.mimeType ?? "tipo nao informado"} · {formatBytes(document.fileSize)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="rounded-none"
              onClick={() => setPreviewOpen(true)}
            >
              <FileText data-icon="inline-start" />
              Visualizar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={handleOpen}
            >
              <ExternalLink data-icon="inline-start" />
              Abrir em nova aba
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={handleDownload}
            >
              <Download data-icon="inline-start" />
              Baixar
            </Button>
            {data.canArchive && document.status !== "ARCHIVED" && (
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                disabled={isPending}
                onClick={handleArchive}
              >
                <Archive data-icon="inline-start" />
                Arquivar
              </Button>
            )}
          </div>
        </div>
      </div>

      {previewOpen && (
        <DocumentPreviewModal
          document={document}
          title={document.title}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
