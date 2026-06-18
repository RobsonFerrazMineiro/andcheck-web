"use client";

import { format, parseISO } from "date-fns";
import {
  Archive,
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  MapPinned,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  DocumentFileIcon,
  DocumentStatusBadge,
  formatDocumentFileSize,
  getDocumentExtensionLabel,
  type CorporateDocumentStatus,
} from "@/components/document/document-ui";
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
  status: CorporateDocumentStatus;
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

function formatDate(value: string | null) {
  return value ? format(parseISO(value), "dd/MM/yyyy") : "-";
}

function DetailCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground/60" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
          {title}
        </p>
      </div>
      {children}
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="max-w-[65%] text-right text-[12px] font-semibold text-foreground">
        {value}
      </div>
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
        <div className="min-w-0">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            AndCheck EHS - Gestao Documental
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="max-w-3xl truncate text-[18px] font-bold uppercase tracking-tight text-foreground">
              {document.title}
            </h1>
            <span className="border border-border bg-muted/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {document.categoryLabel}
            </span>
            <DocumentStatusBadge status={document.status} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {document.fileName}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-none">
          <Link href="/documentos">
            <ArrowLeft data-icon="inline-start" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailCard icon={Building2} title="Empresa">
            <InfoLine label="Empresa" value={document.company?.name ?? "-"} />
            <InfoLine label="Categoria" value={document.categoryLabel} />
          </DetailCard>

          <DetailCard icon={MapPinned} title="Workspace">
            <InfoLine label="Workspace" value={document.workspace?.name ?? "-"} />
            <InfoLine label="Status" value={<DocumentStatusBadge status={document.status} />} />
          </DetailCard>

          <DetailCard icon={Calendar} title="Datas">
            <InfoLine label="Emissao" value={formatDate(document.issueDate)} />
            <InfoLine label="Validade" value={formatDate(document.expiryDate)} />
            <InfoLine label="Criado em" value={formatDate(document.createdAt)} />
          </DetailCard>

          <DetailCard icon={User} title="Criado por">
            <InfoLine label="Nome" value={document.createdBy?.name ?? "-"} />
            <InfoLine label="Email" value={document.createdBy?.email ?? "-"} />
          </DetailCard>

          {document.description && (
            <div className="sm:col-span-2">
              <DetailCard icon={FileText} title="Descricao">
                <p className="text-[12px] leading-relaxed text-foreground">
                  {document.description}
                </p>
              </DetailCard>
            </div>
          )}
        </div>

        <DetailCard icon={FileText} title="Arquivo">
          <div className="mb-4 flex min-h-40 flex-col items-center justify-center border border-dashed border-border bg-muted/20 p-4 text-center">
            <DocumentFileIcon
              fileName={document.fileName}
              mimeType={document.mimeType}
              className="mb-2 size-9 text-muted-foreground/40"
            />
            <p className="max-w-full truncate text-[12px] font-semibold text-foreground">
              {document.fileName}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {getDocumentExtensionLabel(document.fileName)} -{" "}
              {formatDocumentFileSize(document.fileSize)}
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
        </DetailCard>
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
