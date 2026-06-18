"use client";

import { ArrowLeft, FileText, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createDocument } from "@/lib/actions/document-actions";
import { uploadFile } from "@/lib/upload-file";

type Options = {
  categories: { value: string; label: string }[];
  companies: { id: string; name: string }[];
  workspaces: { id: string; name: string }[];
};

const ACCEPT = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp";
const MAX_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function NovoDocumentoForm({ options }: { options: Options }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(options.categories[0]?.value ?? "ART");
  const [companyId, setCompanyId] = useState(options.companies[0]?.id ?? "");
  const [workspaceId, setWorkspaceId] = useState(options.workspaces[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Selecione um arquivo.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Maximo 25 MB.");
      return;
    }

    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      const uploaded = await uploadFile(file, {
        category: "documents",
        fileName: file.name,
      });
      form.set("category", category);
      form.set("companyId", companyId);
      form.set("workspaceId", workspaceId);
      form.set("fileUrl", uploaded.reference);
      form.set("fileName", file.name);
      form.set("fileSize", String(uploaded.size));
      form.set("mimeType", uploaded.contentType);

      const created = await createDocument(form);
      toast.success("Documento criado com sucesso.");
      router.push(`/documentos/${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar documento.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 border-b-2 border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            AndCheck EHS · Gestao Documental
          </p>
          <h1 className="text-[18px] font-bold uppercase tracking-tight text-foreground">
            Novo Documento
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cadastro de documento corporativo.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-none">
          <Link href="/documentos">
            <ArrowLeft data-icon="inline-start" />
            Voltar
          </Link>
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 border border-border bg-card p-4 shadow-sm lg:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Titulo *
          </label>
          <Input name="title" required className="rounded-none" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Categoria *
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.categories.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Descricao
          </label>
          <Textarea name="description" rows={3} className="rounded-none" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Empresa *
          </label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {options.companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Workspace *
          </label>
          <Select value={workspaceId} onValueChange={setWorkspaceId}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {options.workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Data Emissao
          </label>
          <Input name="issueDate" type="date" className="rounded-none" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Data Validade
          </label>
          <Input name="expiryDate" type="date" className="rounded-none" />
        </div>

        <div className="flex flex-col gap-2 lg:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Arquivo *
          </label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-24 items-center justify-center border border-dashed border-border bg-muted/20 p-4 text-center transition-colors hover:bg-muted/40"
          >
            {file ? (
              <span className="flex flex-col items-center gap-1">
                <FileText className="size-7 text-muted-foreground/50" />
                <span className="text-[12px] font-semibold text-foreground">
                  {file.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {file.type || "tipo nao informado"} · {formatBytes(file.size)}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Upload className="size-4" />
                Selecionar PDF, DOCX, XLSX, PNG, JPG ou WEBP ate 25 MB
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4 lg:col-span-2">
          <Button asChild type="button" variant="outline" className="rounded-none">
            <Link href="/documentos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving} className="rounded-none">
            {saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Upload data-icon="inline-start" />}
            {saving ? "Salvando..." : "Salvar Documento"}
          </Button>
        </div>
      </form>
    </div>
  );
}
