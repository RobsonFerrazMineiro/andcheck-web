"use client";

import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ImagePlus,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { OfflineDataNotice } from "@/components/offline/offline-data-notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createInspection } from "@/lib/actions/inspection-actions";
import type { ChecklistValue as FormValue } from "@/lib/checklist-template";
import checklistTemplate from "@/lib/checklist-template";
import {
  calculateInspectionResult,
  calculateScaffoldStatus,
} from "@/lib/inspection-outcome";
import { checkServerConnectivity } from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import { fileToDataUrl } from "@/lib/offline/offline-file-client";
import {
  createOfflineId,
  type OfflineCreateInspectionPayload,
} from "@/lib/offline/types";
import { useOfflineSnapshotCache } from "@/lib/offline/use-offline-snapshot-cache";
import { getUploadedFilePreviewUrl } from "@/lib/upload-file";

const ChecklistSection = dynamic(
  () => import("@/components/inspection/checklist-section"),
  {
    loading: () => (
      <div className="bg-card border border-border shadow-sm p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Carregando checklist...
        </p>
      </div>
    ),
  },
);

type ScaffoldOption = {
  id: string;
  code: string;
  location: string;
  area: string;
  company: string | null;
  type: string;
};

type SignaturePolicyOption = {
  id: string;
  name: string;
  company: string | null;
  area: string | null;
  scaffold_type: string | null;
  is_default: boolean;
  requirements: {
    id: string;
    role_code: string;
    label: string | null;
    min_count: number;
    is_required: boolean;
    sort_order: number;
    role: {
      code: string;
      name: string;
    };
  }[];
};

type CollectedSignature = {
  role_code: string;
  role_label: string;
  signer_name: string;
  signer_company?: string;
  signer_position?: string;
  signature_data: string;
};

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Não foi possível processar a assinatura.")),
      "image/png",
    );
  });
}

function statusToPrisma(
  status: string,
): "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA" {
  if (status === "conforme") return "CL_OK";
  if (status === "nao_conforme") return "CL_FAIL";
  return "CL_NA";
}

export function NovaInspecaoForm({
  scaffolds,
  signaturePolicies,
}: {
  scaffolds: ScaffoldOption[];
  signaturePolicies: SignaturePolicyOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const {
    data: cachedScaffolds,
    isOfflineFallback: isScaffoldCacheFallback,
    lastCachedAt: scaffoldsCachedAt,
  } = useOfflineSnapshotCache({
    cacheKey: "inspection:scaffolds",
    initialData: scaffolds,
  });
  const {
    data: cachedSignaturePolicies,
    isOfflineFallback: isPolicyCacheFallback,
    lastCachedAt: policiesCachedAt,
  } = useOfflineSnapshotCache({
    cacheKey: "inspection:signaturePolicies",
    initialData: signaturePolicies,
  });
  const isAuxiliaryCacheFallback =
    isScaffoldCacheFallback || isPolicyCacheFallback;
  const lastAuxiliaryCachedAt = scaffoldsCachedAt ?? policiesCachedAt;

  const [selectedScaffoldId, setSelectedScaffoldId] = useState(
    params.get("scaffold_id") ?? "",
  );
  const [scaffoldSearch, setScaffoldSearch] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [validityDays, setValidityDays] = useState("7");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const submittingRef = useRef(false);
  const [collectedSignatures, setCollectedSignatures] = useState<
    CollectedSignature[]
  >([]);
  const [signatureRoleCode, setSignatureRoleCode] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerCompany, setSignerCompany] = useState("");
  const [signerPosition, setSignerPosition] = useState("");

  // Registro fotográfico
  const [photos, setPhotos] = useState<string[]>([]);
  const photoGalleryInputRef = useRef<HTMLInputElement>(null);
  const photoCameraInputRef = useRef<HTMLInputElement>(null);

  // Assinatura digital
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigDrawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);
  const [registeringSignature, setRegisteringSignature] = useState(false);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    return { c, ctx };
  }, []);

  const clearSignature = useCallback(() => {
    const r = getCtx();
    if (!r) return;
    r.ctx.clearRect(0, 0, r.c.width, r.c.height);
    setHasSig(false);
  }, [getCtx]);

  const sigPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ("touches" in e) {
        const t = e.touches[0];
        return {
          x: (t.clientX - rect.left) * scaleX,
          y: (t.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  useEffect(() => {
    const r = getCtx();
    if (!r) return;
    r.ctx.strokeStyle = "#1a1a2e";
    r.ctx.lineWidth = 2;
    r.ctx.lineCap = "round";
    r.ctx.lineJoin = "round";
  }, [getCtx]);

  const handlePhotoAdd = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      try {
        const { compressImageBlob } = await import("@/lib/compress-image");
        for (const file of files) {
          const compressed = await compressImageBlob(file);
          const photo = await fileToDataUrl(compressed);
          setPhotos((prev) => [...prev, photo]);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível enviar a foto.",
        );
      } finally {
        e.target.value = "";
      }
    },
    [],
  );
  const [checklistValues, setChecklistValues] = useState<FormValue[][]>(
    checklistTemplate.map((cat) =>
      cat.items.map(() => ({ status: "", observation: "" })),
    ),
  );

  const selectedScaffold = cachedScaffolds.find(
    (s) => s.id === selectedScaffoldId,
  );
  const filteredScaffolds = useMemo(() => {
    const term = scaffoldSearch.trim().toLowerCase();
    if (!term) return cachedScaffolds;

    const matches = cachedScaffolds.filter((scaffold) =>
      [scaffold.code, scaffold.location, scaffold.area, scaffold.company]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );

    if (
      selectedScaffold &&
      !matches.some((scaffold) => scaffold.id === selectedScaffold.id)
    ) {
      return [selectedScaffold, ...matches];
    }

    return matches;
  }, [cachedScaffolds, scaffoldSearch, selectedScaffold]);

  const selectedPolicy = useMemo(() => {
    if (!selectedScaffold) return null;

    return (
      cachedSignaturePolicies
        .map((policy) => {
          let score = policy.is_default ? 1 : 0;

          if (policy.company) {
            if (policy.company !== selectedScaffold.company) return null;
            score += 8;
          }

          if (policy.area) {
            if (policy.area !== selectedScaffold.area) return null;
            score += 4;
          }

          if (policy.scaffold_type) {
            if (policy.scaffold_type !== selectedScaffold.type) return null;
            score += 2;
          }

          return { policy, score };
        })
        .filter(
          (item): item is { policy: SignaturePolicyOption; score: number } =>
            Boolean(item),
        )
        .sort((a, b) => b.score - a.score)[0]?.policy ?? null
    );
  }, [cachedSignaturePolicies, selectedScaffold]);

  const requiredSignatures = useMemo(
    () =>
      (selectedPolicy?.requirements ?? [])
        .filter((requirement) => requirement.is_required)
        .sort((a, b) => a.sort_order - b.sort_order),
    [selectedPolicy],
  );

  const pendingSignatures = useMemo(
    () =>
      requiredSignatures.filter((requirement) => {
        const signedCount = collectedSignatures.filter(
          (signature) => signature.role_code === requirement.role_code,
        ).length;
        return signedCount < requirement.min_count;
      }),
    [collectedSignatures, requiredSignatures],
  );

  const signaturesReady = pendingSignatures.length === 0;

  const activeSignatureRoleCode =
    signatureRoleCode || pendingSignatures[0]?.role_code || "";

  const handleScaffoldChange = (value: string) => {
    setSelectedScaffoldId(value);
    setCollectedSignatures([]);
    setSignatureRoleCode("");
    setSignerName("");
    setSignerCompany("");
    setSignerPosition("");
    clearSignature();
  };

  const criticalIssues = useMemo(() => {
    const issues: string[] = [];
    checklistTemplate.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => {
        if (
          item.critical &&
          checklistValues[ci][ii].status === "nao_conforme"
        ) {
          issues.push(item.item);
        }
      });
    });
    return issues;
  }, [checklistValues]);

  const autoResult = useMemo(() => {
    const checklist = checklistTemplate.flatMap((category, categoryIndex) =>
      category.items.map((item, itemIndex) => ({
        critical: item.critical ?? false,
        value: statusToPrisma(
          checklistValues[categoryIndex][itemIndex].status,
        ),
      })),
    );
    return calculateInspectionResult(checklist);
  }, [checklistValues]);

  const isComplete = useMemo(
    () => checklistValues.every((cat) => cat.every((v) => v.status !== "")),
    [checklistValues],
  );
  const canSubmit =
    isComplete &&
    signaturesReady &&
    !!selectedScaffoldId &&
    inspectorName.trim().length > 0 &&
    !savedOffline &&
    !submitting;

  const handleRegisterSignature = async () => {
    const requirement = requiredSignatures.find(
      (item) => item.role_code === activeSignatureRoleCode,
    );

    if (!requirement) {
      toast.error("Selecione o perfil da assinatura.");
      return;
    }

    if (!signerName.trim()) {
      toast.error("Informe o nome de quem está assinando.");
      return;
    }

    if (!hasSig || !canvasRef.current) {
      toast.error("Colete a assinatura digital antes de registrar.");
      return;
    }

    setRegisteringSignature(true);
    try {
      const signatureBlob = await canvasToBlob(canvasRef.current);
      const signatureReference = await fileToDataUrl(signatureBlob);

      setCollectedSignatures((current) => [
        ...current.filter(
          (signature) => signature.role_code !== requirement.role_code,
        ),
        {
          role_code: requirement.role_code,
          role_label: requirement.label ?? requirement.role.name,
          signer_name: signerName.trim(),
          signer_company: signerCompany.trim() || undefined,
          signer_position: signerPosition.trim() || undefined,
          signature_data: signatureReference,
        },
      ]);
      setSignerName("");
      setSignerCompany("");
      setSignerPosition("");
      setSignatureRoleCode("");
      clearSignature();
      toast.success("Assinatura registrada.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a assinatura.",
      );
    } finally {
      setRegisteringSignature(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedScaffold) return;
    // Previne duplo clique via ref (guard extra além do state)
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const toastId = toast.loading("Salvando inspeção...");
    try {
      const checklist = checklistTemplate.flatMap((cat, ci) =>
        cat.items.map((item, ii) => ({
          item_id: `${ci}_${ii}`,
          item_label: item.item,
          category: cat.category,
          value: statusToPrisma(checklistValues[ci][ii].status),
          critical: item.critical ?? false,
          observation: checklistValues[ci][ii].observation || undefined,
          photo: checklistValues[ci][ii].photo || undefined,
        })),
      );
      const payload: OfflineCreateInspectionPayload = {
        scaffold_id: selectedScaffold.id,
        scaffold_code: selectedScaffold.code,
        inspector_name: inspectorName.trim(),
        result: autoResult as
          | "aprovado"
          | "aprovado_com_ressalvas"
          | "reprovado",
        validity_days: autoResult !== "reprovado" ? Number(validityDays) : 0,
        notes: observations.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
        signature: collectedSignatures[0]?.signature_data,
        signatures: collectedSignatures.map((signature) => ({
          role_code: signature.role_code,
          signer_name: signature.signer_name,
          signer_company: signature.signer_company,
          signer_position: signature.signer_position,
          signature_data: signature.signature_data,
        })),
        checklist,
      };

      if ((await checkServerConnectivity()) === "offline") {
        const offlineId = createOfflineId("inspection");
        const scaffoldStatus = calculateScaffoldStatus(payload.result, checklist);
        const validityDate =
          payload.result !== "reprovado" && payload.validity_days > 0
            ? addDays(new Date(), payload.validity_days).toISOString()
            : null;

        await localDb.inspections.put({
          id: offlineId,
          scaffold_id: payload.scaffold_id,
          scaffold_code: payload.scaffold_code,
          date: new Date().toISOString(),
          inspector_name: payload.inspector_name,
          result: payload.result,
          validity_days: payload.validity_days,
          notes: payload.notes ?? null,
          syncStatus: "pending",
        });
        const cachedScaffold = await localDb.scaffolds.get(payload.scaffold_id);
        if (cachedScaffold) {
          await localDb.scaffolds.put({
            ...cachedScaffold,
            status: scaffoldStatus,
            validity_date: validityDate,
            syncStatus: "pending",
          });
        }
        await localDb.syncQueue.enqueue({
          action: "inspection.create",
          entityType: "inspection",
          entityId: offlineId,
          payload,
        });
        toast.success("Inspeção salva offline para sincronização.", {
          id: toastId,
        });
        setSavedOffline(true);
        setSubmitting(false);
        router.replace("/sincronizacao");
        return;
      }

      const created = await createInspection(payload);
      toast.success("Inspeção registrada com sucesso!", { id: toastId });
      router.replace("/inspecoes/" + created.id);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a inspeção. Tente novamente.",
        { id: toastId },
      );
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div className="flex items-center gap-2">
        <Link
          href="/inspecoes"
          className="w-7 h-7 flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
          <Link href="/inspecoes" className="hover:text-foreground">
            Inspeções
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground font-semibold">Nova Inspeção</span>
        </div>
      </div>

      <div className="pb-4 border-b-2 border-border">
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <ClipboardCheck className="size-4" />
          AndCheck ⬢ Inspeções · NR-18 / NR-35 / ABNT NBR 6494
        </div>
        <h1 className="text-[18px] font-bold text-foreground tracking-tight uppercase">
          Nova Inspeção
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Checklist de{" "}
          {checklistTemplate.reduce((a, c) => a + c.items.length, 0)} itens ·
          Resultado calculado automaticamente
        </p>
      </div>

      <OfflineDataNotice
        active={isAuxiliaryCacheFallback}
        label="dados da nova inspeção"
        lastCachedAt={lastAuxiliaryCachedAt}
      />

      <div className="bg-card border border-border shadow-sm p-5 space-y-4">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
          Informações Gerais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Andaime *
            </Label>
            <Select
              value={selectedScaffoldId}
              onValueChange={handleScaffoldChange}
            >
              <SelectTrigger className="h-8 text-[11px] rounded-md">
                <SelectValue placeholder="Selecionar andaime..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                  <Input
                    value={scaffoldSearch}
                    onChange={(event) => setScaffoldSearch(event.target.value)}
                    placeholder="Pesquisar TAG, local, área ou empresa..."
                    className="h-8 text-[11px]"
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </div>
                {filteredScaffolds.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.location}
                  </SelectItem>
                ))}
                {filteredScaffolds.length === 0 && (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">
                    Nenhum andaime encontrado.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Nome do Inspetor *
            </Label>
            <Input
              placeholder="Nome completo"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="h-8 text-[11px] rounded-md"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider font-bold">
            Validade da liberação
          </Label>
          <Select value={validityDays} onValueChange={setValidityDays}>
            <SelectTrigger className="w-40 h-8 text-[11px] rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 dias</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {checklistTemplate.map((cat, catIdx) => (
        <ChecklistSection
          key={cat.category}
          category={cat.category}
          items={cat.items}
          values={checklistValues[catIdx]}
          onChange={(newValues) => {
            const updated = [...checklistValues];
            updated[catIdx] = newValues;
            setChecklistValues(updated);
          }}
        />
      ))}

      {criticalIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
              Liberação bloqueada — {criticalIssues.length} item(ns) crítico(s)
              não conforme(s)
            </p>
          </div>
          <ul className="space-y-1 pl-6">
            {criticalIssues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-red-600"
              >
                <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isComplete && (
        <div
          className={
            "border p-4 flex items-center gap-4 " +
            (autoResult === "aprovado"
              ? "bg-emerald-50 border-emerald-200"
              : autoResult === "reprovado"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200")
          }
        >
          {autoResult === "aprovado" && (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          )}
          {autoResult === "reprovado" && (
            <XCircle className="w-6 h-6 text-red-600 shrink-0" />
          )}
          {autoResult === "aprovado_com_ressalvas" && (
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Resultado calculado
            </p>
            <StatusBadge status={autoResult} size="lg" />
          </div>
          {autoResult !== "reprovado" && (
            <div className="ml-auto text-right">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                Válido até
              </p>
              <p className="text-[13px] font-bold font-mono text-foreground">
                {format(
                  addDays(new Date(), Number(validityDays)),
                  "dd/MM/yyyy",
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border shadow-sm p-5 space-y-3">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
          Registro Fotográfico
        </h3>

        {/* Input de arquivo oculto */}
        <input
          ref={photoGalleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhotoAdd}
        />
        <input
          ref={photoCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoAdd}
        />

        {/* Grid: fotos gerais + fotos de itens não conformes */}
        {(photos.length > 0 ||
          checklistValues.some((cat) => cat.some((v) => v.photo))) && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {/* Fotos gerais */}
            {photos.map((src, i) => (
              <div
                key={`general-${i}`}
                className="relative group aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getUploadedFilePreviewUrl(src)}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-full object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover foto"
                  title="Remover foto"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Fotos de itens não conformes */}
            {checklistTemplate.flatMap((cat, ci) =>
              cat.items.map((item, ii) => {
                const photo = checklistValues[ci]?.[ii]?.photo;
                if (!photo) return null;
                return (
                  <div
                    key={`item-${ci}-${ii}`}
                    className="relative group aspect-square"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getUploadedFilePreviewUrl(photo)}
                      alt={item.item}
                      className="w-full h-full object-cover border-2 border-red-500"
                    />
                    {/* Label do item */}
                    <div className="absolute bottom-0 left-0 right-0 bg-red-600/80 px-1 py-0.5">
                      <p className="text-[8px] text-white font-bold leading-tight truncate">
                        {item.item}
                      </p>
                    </div>
                    {/* Botão remover */}
                    <button
                      type="button"
                      aria-label="Remover foto"
                      title="Remover foto"
                      onClick={() => {
                        const updated = checklistValues.map((c) => [...c]);
                        updated[ci][ii] = {
                          ...updated[ci][ii],
                          photo: undefined,
                        };
                        setChecklistValues(updated);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              }),
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => photoGalleryInputRef.current?.click()}
          className="inline-flex items-center gap-2 h-8 px-4 text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/50 transition-colors"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          Galeria{photos.length > 0 ? ` (${photos.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => photoCameraInputRef.current?.click()}
          className="ml-2 inline-flex items-center gap-2 h-8 px-4 text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/50 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          Camera
        </button>
      </div>

      {/* Assinatura Digital */}
      <div className="bg-card border border-border shadow-sm p-5 space-y-3">
        <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
          Observações Gerais
        </h3>
        <Textarea
          placeholder="Registre observações gerais sobre a inspeção..."
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="text-[11px] rounded-md min-h-20"
        />
      </div>

      <div className="bg-card border border-border shadow-sm px-5 pt-3 pb-3 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Assinaturas obrigatórias
          </h3>
          <button
            type="button"
            onClick={clearSignature}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Política:{" "}
            <span className="font-semibold text-foreground">
              {selectedPolicy?.name ?? "Nenhuma política ativa"}
            </span>
          </p>
          <div className="grid gap-2">
            {requiredSignatures.map((requirement) => {
              const collected = collectedSignatures.find(
                (signature) => signature.role_code === requirement.role_code,
              );
              return (
                <div
                  key={requirement.id}
                  className="flex items-center justify-between gap-3 border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {collected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-foreground truncate">
                        {requirement.label ?? requirement.role.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {collected
                          ? "Assinado por " + collected.signer_name
                          : "Pendente"}
                      </p>
                    </div>
                  </div>
                  {collected && (
                    <button
                      type="button"
                      onClick={() =>
                        setCollectedSignatures((current) =>
                          current.filter(
                            (signature) =>
                              signature.role_code !== requirement.role_code,
                          ),
                        )
                      }
                      className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-red-600"
                    >
                      Remover
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!signaturesReady && (
            <p className="text-[10px] text-red-600 font-semibold">
              Assinaturas pendentes:{" "}
              {pendingSignatures
                .map((item) => item.label ?? item.role.name)
                .join(", ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Perfil da assinatura
            </Label>
            <Select
              value={activeSignatureRoleCode}
              onValueChange={setSignatureRoleCode}
            >
              <SelectTrigger className="h-8 text-[11px] rounded-md">
                <SelectValue placeholder="Selecionar perfil..." />
              </SelectTrigger>
              <SelectContent>
                {requiredSignatures.map((requirement) => (
                  <SelectItem
                    key={requirement.id}
                    value={requirement.role_code}
                  >
                    {requirement.label ?? requirement.role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Nome do assinante
            </Label>
            <Input
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              placeholder="Nome completo"
              className="h-8 text-[11px] rounded-md"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Empresa
            </Label>
            <Input
              value={signerCompany}
              onChange={(event) => setSignerCompany(event.target.value)}
              placeholder="Empresa"
              className="h-8 text-[11px] rounded-md"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider font-bold">
              Cargo / função
            </Label>
            <Input
              value={signerPosition}
              onChange={(event) => setSignerPosition(event.target.value)}
              placeholder="Cargo"
              className="h-8 text-[11px] rounded-md"
            />
          </div>
        </div>

        <div className="relative border border-dashed border-border bg-muted/20">
          <canvas
            ref={canvasRef}
            width={800}
            height={160}
            className="w-full touch-none cursor-crosshair"
            onMouseDown={(e) => {
              const r = getCtx();
              if (!r) return;
              sigDrawing.current = true;
              const pos = sigPos(e, r.c);
              r.ctx.beginPath();
              r.ctx.moveTo(pos.x, pos.y);
            }}
            onMouseMove={(e) => {
              if (!sigDrawing.current) return;
              const r = getCtx();
              if (!r) return;
              const pos = sigPos(e, r.c);
              r.ctx.lineTo(pos.x, pos.y);
              r.ctx.stroke();
              if (!hasSig) setHasSig(true);
            }}
            onMouseUp={() => {
              sigDrawing.current = false;
            }}
            onMouseLeave={() => {
              sigDrawing.current = false;
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              const r = getCtx();
              if (!r) return;
              sigDrawing.current = true;
              const pos = sigPos(e, r.c);
              r.ctx.beginPath();
              r.ctx.moveTo(pos.x, pos.y);
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              if (!sigDrawing.current) return;
              const r = getCtx();
              if (!r) return;
              const pos = sigPos(e, r.c);
              r.ctx.lineTo(pos.x, pos.y);
              r.ctx.stroke();
              if (!hasSig) setHasSig(true);
            }}
            onTouchEnd={() => {
              sigDrawing.current = false;
            }}
          />
          {!hasSig && (
            <p className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground pointer-events-none">
              Assine com o dedo ou mouse acima
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRegisterSignature}
          disabled={registeringSignature}
          className="inline-flex items-center gap-2 h-8 px-4 text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/50 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Registrar assinatura
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-border">
        <Link
          href="/inspecoes"
          aria-disabled={submitting}
          className={`inline-flex items-center justify-center h-8 px-5 text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-muted/50 transition-colors ${
            submitting ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Cancelar
        </Link>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="inline-flex items-center justify-center gap-2 h-8 px-5 text-[10px] font-bold uppercase tracking-widest bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {savedOffline ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Salva para sincronizar
            </>
          ) : submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <ClipboardCheck className="w-3.5 h-3.5" />
              {!isComplete
                ? "Preencha todos os itens"
                : !signaturesReady
                  ? "Colete as assinaturas"
                  : "Registrar Inspeção"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
