"use client";

import { format, parseISO } from "date-fns";
import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { DocumentPreviewModal } from "@/components/shared/document-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { archiveDocument } from "@/lib/actions/document-actions";
import {
  downloadDocumentFile,
  getSafeOpenUrl,
} from "@/lib/document-view";

type DocumentRow = {
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
  fileUrl: string;
  downloadUrl: string;
};

type DocumentManagementData = {
  documents: DocumentRow[];
  companies: { id: string; name: string }[];
  workspaces: { id: string; name: string }[];
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
};

const STATUS_LABELS = {
  ACTIVE: "Ativo",
  EXPIRED: "Vencido",
  ARCHIVED: "Arquivado",
} as const;

const STATUS_STYLE: Record<DocumentRow["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-400/60",
  EXPIRED: "bg-red-50 text-red-800 border-red-400/60",
  ARCHIVED: "bg-slate-100 text-slate-600 border-slate-400/60",
};

function StatusBadge({ status }: { status: DocumentRow["status"] }) {
  return (
    <span
      className={
        "inline-flex items-center border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest " +
        STATUS_STYLE[status]
      }
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(value: string | null) {
  return value ? format(parseISO(value), "dd/MM/yyyy") : "-";
}

export function DocumentosClient({
  initialData,
}: {
  initialData: DocumentManagementData;
}) {
  const [documents, setDocuments] = useState(initialData.documents);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          documents.map((document) => [
            document.category,
            document.categoryLabel,
          ]),
        ),
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [documents],
  );

  const filtered = documents.filter((document) => {
    const text = [
      document.title,
      document.description,
      document.fileName,
      document.categoryLabel,
      document.company?.name,
      document.workspace?.name,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!search || text.includes(search.toLowerCase())) &&
      (categoryFilter === "all" || document.category === categoryFilter) &&
      (statusFilter === "all" || document.status === statusFilter) &&
      (companyFilter === "all" || document.company?.id === companyFilter) &&
      (workspaceFilter === "all" || document.workspace?.id === workspaceFilter)
    );
  });

  const total = documents.length;
  const active = documents.filter((doc) => doc.status === "ACTIVE").length;
  const expired = documents.filter((doc) => doc.status === "EXPIRED").length;
  const archived = documents.filter((doc) => doc.status === "ARCHIVED").length;

  function handleDownload(document: DocumentRow) {
    if (!downloadDocumentFile(document)) {
      toast.error("Arquivo indisponivel ou URL invalida.");
    }
  }

  function handleOpen(document: DocumentRow) {
    const safeOpenUrl = getSafeOpenUrl(document);
    if (!safeOpenUrl) {
      toast.error("Arquivo indisponivel ou URL invalida.");
      return;
    }
    window.open(safeOpenUrl, "_blank", "noopener,noreferrer");
  }

  function handleArchive(document: DocumentRow) {
    if (!confirm(`Arquivar o documento "${document.title}"?`)) return;
    startTransition(async () => {
      try {
        await archiveDocument(document.id);
        setDocuments((current) =>
          current.map((item) =>
            item.id === document.id ? { ...item, status: "ARCHIVED" } : item,
          ),
        );
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
            AndCheck EHS · Biblioteca Corporativa
          </p>
          <h1 className="text-[18px] font-bold uppercase tracking-tight text-foreground">
            Gestao Documental
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Biblioteca corporativa de documentos.
          </p>
        </div>
        {initialData.canCreate && (
          <Button asChild className="rounded-none">
            <Link href="/documentos/novo">
              <Plus data-icon="inline-start" />
              Novo Documento
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Documentos", total, "bg-slate-50 border-slate-300 border-l-slate-700 text-slate-800"],
          ["Ativos", active, "bg-emerald-50 border-emerald-200 border-l-emerald-600 text-emerald-700"],
          ["Vencidos", expired, "bg-red-50 border-red-200 border-l-red-700 text-red-700"],
          ["Arquivados", archived, "bg-zinc-50 border-zinc-300 border-l-zinc-600 text-zinc-700"],
        ].map(([label, value, classes]) => (
          <div key={label} className={"border border-l-4 p-3 text-center " + classes}>
            <p className="font-mono text-[26px] font-black">{value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 border border-border bg-card p-3 shadow-sm lg:grid-cols-[1.4fr_170px_150px_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por titulo, arquivo, empresa ou workspace..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 rounded-none border-border pl-9 text-[11px]"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 rounded-none text-[11px]">
            <Filter className="mr-1.5 size-3.5 text-muted-foreground/50" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 rounded-none text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="h-8 rounded-none text-[11px]">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas empresas</SelectItem>
            {initialData.companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
          <SelectTrigger className="h-8 rounded-none text-[11px]">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos workspaces</SelectItem>
            {initialData.workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden border border-border bg-card shadow-sm">
        <div className="hidden grid-cols-12 gap-4 border-b border-border bg-primary px-4 py-2.5 xl:grid">
          {["Titulo", "Categoria", "Empresa", "Workspace", "Validade", "Status", "Acoes"].map((heading, index) => (
            <p
              key={heading}
              className={
                "text-[9px] font-bold uppercase tracking-widest text-primary-foreground/60 " +
                (index === 0 ? "col-span-3" : index === 3 ? "col-span-2" : "col-span-1")
              }
            >
              {heading}
            </p>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="p-14 text-center">
            <FileText className="mx-auto mb-3 size-10 text-muted-foreground/20" />
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Nenhum documento encontrado
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              Ajuste os filtros ou cadastre o primeiro documento corporativo.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((document, index) => (
              <div
                key={document.id}
                className={
                  "grid gap-3 px-4 py-3 transition-colors hover:bg-primary/5 xl:grid-cols-12 xl:items-center xl:gap-4 " +
                  (index % 2 === 1 ? "bg-muted/20" : "bg-card")
                }
              >
                <Link href={`/documentos/${document.id}`} className="min-w-0 xl:col-span-3">
                  <p className="truncate text-[11px] font-bold text-foreground">
                    {document.title}
                  </p>
                  <p className="truncate text-[9px] text-muted-foreground">
                    {document.fileName}
                  </p>
                </Link>
                <p className="text-[11px] text-muted-foreground xl:col-span-1">
                  {document.categoryLabel}
                </p>
                <p className="truncate text-[11px] text-muted-foreground xl:col-span-1">
                  {document.company?.name ?? "-"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground xl:col-span-2">
                  {document.workspace?.name ?? "-"}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground xl:col-span-1">
                  {formatDate(document.expiryDate)}
                </p>
                <div className="xl:col-span-1">
                  <StatusBadge status={document.status} />
                </div>
                <div className="flex items-center gap-1.5 xl:col-span-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="rounded-none"
                    title="Visualizar"
                    onClick={() => setPreviewDoc(document)}
                  >
                    <FileText />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="rounded-none"
                    title="Abrir em nova aba"
                    onClick={() => handleOpen(document)}
                  >
                    <ExternalLink />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="rounded-none"
                    title="Baixar"
                    onClick={() => handleDownload(document)}
                  >
                    <Download />
                  </Button>
                  {initialData.canArchive && document.status !== "ARCHIVED" && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="rounded-none"
                      title="Arquivar"
                      disabled={isPending}
                      onClick={() => handleArchive(document)}
                    >
                      <Archive />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-border bg-muted/30 px-4 py-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40">
            {filtered.length} registro(s) · Gestao documental · AndCheck EHS
          </p>
        </div>
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
