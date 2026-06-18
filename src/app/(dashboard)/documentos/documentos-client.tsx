"use client";

import { format, parseISO } from "date-fns";
import {
  Archive,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Package,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  DocumentFileIcon,
  DocumentStatusBadge,
  type CorporateDocumentStatus,
} from "@/components/document/document-ui";
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
import { downloadDocumentFile, getSafeOpenUrl } from "@/lib/document-view";

type DocumentRow = {
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

const STATUS_LABELS: Record<CorporateDocumentStatus, string> = {
  ACTIVE: "Ativo",
  EXPIRED: "Vencido",
  ARCHIVED: "Arquivado",
};

const CATEGORY_FILTERS = [
  { value: "all", label: "Todos", categories: null },
  { value: "ART", label: "ART", categories: ["ART"] },
  { value: "RRT", label: "RRT", categories: ["RRT"] },
  {
    value: "PROJETOS",
    label: "Projetos",
    categories: ["PROJETO_ESTRUTURAL"],
  },
  {
    value: "MEMORIAIS",
    label: "Memoriais",
    categories: ["MEMORIAL_CALCULO"],
  },
  { value: "CROQUIS", label: "Croquis", categories: ["CROQUI"] },
  {
    value: "PROCEDIMENTOS",
    label: "Procedimentos",
    categories: ["PROCEDIMENTO"],
  },
  {
    value: "CERTIFICADOS",
    label: "Certificados",
    categories: ["CERTIFICADO"],
  },
  { value: "LICENCAS", label: "Licencas", categories: ["LICENCA"] },
  {
    value: "TREINAMENTOS",
    label: "Treinamentos",
    categories: ["TREINAMENTO"],
  },
  { value: "OUTROS", label: "Outros", categories: ["OUTRO"] },
] as const;

function formatDate(value: string | null) {
  return value ? format(parseISO(value), "dd/MM/yyyy") : "-";
}

function categoryMatches(
  categories: readonly string[] | null,
  category: string,
) {
  return categories ? categories.includes(category) : category === "all";
}

function Kpi({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`border border-l-4 bg-card p-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {value}
          </p>
        </div>
        <Icon className="size-5 text-muted-foreground" />
      </div>
    </div>
  );
}

function CategoryFilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`font-mono text-[9px] ${
          active ? "text-primary-foreground/70" : "text-muted-foreground/60"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export function DocumentosClient({
  initialData,
}: {
  initialData: DocumentManagementData;
}) {
  const router = useRouter();
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

  const categoryCounts = useMemo(() => {
    return CATEGORY_FILTERS.reduce<Record<string, number>>((counts, filter) => {
      counts[filter.value] = filter.categories
        ? documents.filter((document) =>
            categoryMatches(filter.categories, document.category),
          ).length
        : documents.length;
      return counts;
    }, {});
  }, [documents]);

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

  function openDetail(documentId: string) {
    router.push(`/documentos/${documentId}`);
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    documentId: string,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(documentId);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            AndCheck EHS - Biblioteca Corporativa
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
        <Kpi
          icon={FileText}
          label="Total Documentos"
          value={total}
          className="border-slate-200 border-l-slate-500"
        />
        <Kpi
          icon={CheckCircle2}
          label="Ativos"
          value={active}
          className="border-green-200 border-l-green-500 bg-green-50"
        />
        <Kpi
          icon={TriangleAlert}
          label="Vencidos"
          value={expired}
          className="border-red-200 border-l-red-500 bg-red-50"
        />
        <Kpi
          icon={Package}
          label="Arquivados"
          value={archived}
          className="border-slate-200 border-l-slate-500 bg-slate-50"
        />
      </div>

      <div className="flex flex-col gap-3 border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap gap-2" aria-label="Filtros rapidos por categoria">
          {CATEGORY_FILTERS.map((filter) => (
            <CategoryFilterButton
              key={filter.value}
              active={
                filter.categories
                  ? categoryMatches(filter.categories, categoryFilter)
                  : categoryFilter === "all"
              }
              label={filter.label}
              count={categoryCounts[filter.value] ?? 0}
              onClick={() =>
                setCategoryFilter(
                  filter.categories?.length === 1
                    ? filter.categories[0]
                    : filter.value,
                )
              }
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1.4fr_170px_150px_180px_180px]">
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
      </div>

      <div className="overflow-hidden border border-border bg-card shadow-sm">
        <div className="hidden grid-cols-12 gap-4 border-b bg-muted/40 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground xl:grid">
          <span className="col-span-3">Titulo</span>
          <span className="col-span-1">Categoria</span>
          <span className="col-span-2">Empresa</span>
          <span className="col-span-2">Workspace</span>
          <span className="col-span-1">Validade</span>
          <span className="col-span-1">Status</span>
          <span className="col-span-2 text-right">Acoes</span>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center">
            <div className="mb-3 flex size-12 items-center justify-center border border-border bg-muted/30">
              <FileText className="size-6 text-muted-foreground/40" />
            </div>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-foreground">
              Nenhum documento cadastrado
            </p>
            <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
              Clique em &quot;Novo Documento&quot; para iniciar sua biblioteca
              documental.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((document, index) => (
              <div
                key={document.id}
                role="link"
                tabIndex={0}
                onClick={() => openDetail(document.id)}
                onKeyDown={(event) => handleRowKeyDown(event, document.id)}
                className={`grid cursor-pointer gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 xl:grid-cols-12 xl:items-center xl:gap-4 ${
                  index % 2 ? "bg-muted/20" : "bg-card"
                }`}
              >
                <div className="min-w-0 xl:col-span-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <DocumentFileIcon
                      fileName={document.fileName}
                      mimeType={document.mimeType}
                      className="size-4 shrink-0 text-muted-foreground/50"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-foreground">
                        {document.title}
                      </p>
                      <p className="truncate text-[9px] text-muted-foreground">
                        {document.fileName}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground xl:col-span-1">
                  {document.categoryLabel}
                </p>
                <p className="truncate text-[11px] text-muted-foreground xl:col-span-2">
                  {document.company?.name ?? "-"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground xl:col-span-2">
                  {document.workspace?.name ?? "-"}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground xl:col-span-1">
                  {formatDate(document.expiryDate)}
                </p>
                <div className="xl:col-span-1">
                  <DocumentStatusBadge status={document.status} />
                </div>
                <div
                  className="flex items-center gap-1.5 xl:col-span-2 xl:justify-end"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
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
        <div className="border-t bg-muted/30 px-4 py-2 text-[9px] uppercase tracking-widest text-muted-foreground/50">
          {filtered.length} registro(s) - Gestao documental
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
