import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  FolderArchive,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DocumentFileIcon,
  DocumentStatusBadge,
  formatDocumentFileSize,
} from "@/components/document/document-ui";
import { AuditTimeline } from "@/components/shared/audit-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDocumentDetail } from "@/lib/actions/document-actions";
import { AuditEntityType, getEntityAuditTimeline } from "@/lib/audit";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null) {
  if (!value) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    new Date(value),
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default async function DocumentoDetalhePage({ params }: Props) {
  const { id } = await params;
  const result = await getDocumentDetail(id);
  if (!result) notFound();

  const { document } = result;
  const auditTimeline = await getEntityAuditTimeline({
    entityType: AuditEntityType.DOCUMENT,
    entityId: document.id,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AndCheck • Documento Técnico
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{document.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Documento do acervo técnico vinculado ao ciclo de vida dos andaimes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/acervo">
              <ArrowLeft />
              Voltar ao acervo
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href={document.fileUrl} target="_blank" rel="noreferrer">
              <ExternalLink />
              Abrir arquivo
            </a>
          </Button>
          <Button asChild>
            <a href={document.downloadUrl}>
              <Download />
              Baixar
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Dados do documento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="Título" value={document.title} />
            <Info label="Categoria" value={document.categoryLabel} />
            <Info label="Empresa" value={document.company?.name ?? "Não informada"} />
            <Info
              label="Workspace"
              value={document.workspace?.name ?? "Não informado"}
            />
            <Info label="Emissão" value={formatDate(document.issueDate)} />
            <Info label="Validade" value={formatDate(document.expiryDate)} />
            <Info
              label="Criado em"
              value={new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(new Date(document.createdAt))}
            />
            <Info
              label="Atualizado em"
              value={new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(new Date(document.updatedAt))}
            />
            <div className="sm:col-span-2">
              <Info
                label="Descrição"
                value={document.description ?? "Não informada"}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderArchive className="size-4" />
              Arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-background">
                <DocumentFileIcon
                  fileName={document.fileName}
                  mimeType={document.mimeType}
                  className="size-5 text-muted-foreground"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{document.fileName}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {formatDocumentFileSize(document.fileSize)}
                </p>
                <div className="mt-2">
                  <DocumentStatusBadge status={document.status} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="size-4" />
                <span>{document.company?.name ?? "Empresa não informada"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4" />
                <span>Validade: {formatDate(document.expiryDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="size-4" />
                <span>
                  {document.createdBy?.name ??
                    document.createdBy?.email ??
                    "Usuário não informado"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AuditTimeline items={auditTimeline} />
    </div>
  );
}
