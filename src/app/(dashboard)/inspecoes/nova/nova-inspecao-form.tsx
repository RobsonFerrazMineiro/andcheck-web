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
import { Button } from "@/components/ui/button";
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
import { control, surface, typography } from "@/lib/design-system";
import {
  calculateInspectionResult,
  calculateScaffoldStatus,
} from "@/lib/inspection-outcome";
import { humanizeCode } from "@/lib/human-readable";
import {
  browserIsOnline,
  checkServerConnectivity,
} from "@/lib/offline/connectivity";
import { localDb } from "@/lib/offline/local-db";
import { fileToDataUrl } from "@/lib/offline/offline-file-client";
import {
  createOfflineId,
  type OfflineCreateInspectionPayload,
} from "@/lib/offline/types";
import { useOfflineSnapshotCache } from "@/lib/offline/use-offline-snapshot-cache";
import { getScaffoldTypeLabel } from "@/lib/scaffold-types";
import { getUploadedFilePreviewUrl } from "@/lib/upload-file";

const ChecklistSection = dynamic(
  () => import("@/components/inspection/checklist-section"),
  {
    loading: () => (
      <div className={`p-4 sm:p-5 ${surface.card}`}>
        <p className={`${typography.panelTitle} text-muted-foreground`}>
          Carregando checklist...
        </p>
      </div>
    ),
  },
);

const RELEASE_UI_DIAGNOSTICS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_RELEASE_FLOW_DIAGNOSTICS === "true";

function logReleaseUi(message: string, detail?: Record<string, unknown>) {
  if (!RELEASE_UI_DIAGNOSTICS_ENABLED) return;
  const detailLabel = detail ? ` ${JSON.stringify(detail)}` : "";
  console.info(`[release-ui] ${message}${detailLabel}`);
}

type ScaffoldOption = {
  id: string;
  code: string;
  location: string;
  area: string;
  companyId: string;
  company: string | null;
  type: string;
  status: string;
  responsible: string;
  height: number;
  width: number | null;
  length: number | null;
  max_load: number | null;
  validity_date: string | null;
  lastInspectionDate: string | null;
  lastInspectionResult: string | null;
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

type SignerOption = {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  legacyCompanyName: string | null;
  department: string | null;
  position: string | null;
  roles: Array<{
    code: string;
    name: string;
  }>;
};

type CollectedSignature = {
  role_code: string;
  role_label: string;
  signer_user_id: string;
  signer_name: string;
  signer_company?: string;
  signer_position?: string;
  signature_data: string;
};

type CurrentUserDefaults = {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  workspaceName: string;
  roleCodes: string[];
  roleName: string;
  position: string;
};

const RECENT_SCAFFOLDS_KEY = "andcheck:intelligence:recent-scaffolds";

function getRecentScaffoldIds() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_SCAFFOLDS_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function rememberRecentScaffold(id: string) {
  if (typeof window === "undefined") return;
  const next = [id, ...getRecentScaffoldIds().filter((item) => item !== id)]
    .slice(0, 8);
  window.localStorage.setItem(RECENT_SCAFFOLDS_KEY, JSON.stringify(next));
}

function formatNullableDate(value: string | null) {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy");
}

const SIGNATURE_REQUIREMENT_ELIGIBLE_ROLES: Record<string, string[]> = {
  SUPERVISOR_ENCARREGADO: [
    "SUPERVISOR",
    "ENCARREGADO",
    "SUPERVISOR_ENCARREGADO",
  ],
  HSE_AUTORIZADO: ["HSE_EMPRESA", "HSE_GERENCIADORA", "HSE_HYDRO"],
};

const OPERATIONAL_SIGNER_COMPANY_SWITCH_ROLES = new Set([
  "SUPER_ADMIN",
  "HSE_GERENCIADORA",
  "HSE_HYDRO",
]);

function normalizeSignatureRequirement(code: string) {
  if (code === "HSE_EMPRESA") return "HSE_AUTORIZADO";
  return code;
}

function signatureRoleMatchesRequirement(roleCode: string, requirementCode: string) {
  if (roleCode === requirementCode) return true;
  const eligibleRoles =
    SIGNATURE_REQUIREMENT_ELIGIBLE_ROLES[
      normalizeSignatureRequirement(requirementCode)
    ];
  return eligibleRoles?.includes(roleCode) ?? false;
}

function signatureRequirementLabel(
  requirement: SignaturePolicyOption["requirements"][number],
) {
  if (normalizeSignatureRequirement(requirement.role_code) === "HSE_AUTORIZADO") {
    return "HSE autorizado";
  }
  return requirement.label ?? requirement.role.name;
}

function signaturePolicyDisplayName(policy: SignaturePolicyOption | null) {
  if (!policy) return "Nenhuma política ativa";
  return policy.name.replace("HSE Empresa", "HSE autorizado");
}

function friendlySignerRoleName(roleCode?: string) {
  const labels: Record<string, string> = {
    SUPERVISOR: "Supervisor",
    ENCARREGADO: "Encarregado",
    SUPERVISOR_ENCARREGADO: "Supervisor/Encarregado",
    HSE_EMPRESA: "HSE da Empresa",
    HSE_GERENCIADORA: "HSE Gerenciadora",
    HSE_HYDRO: "HSE da Contratante",
  };
  return roleCode ? labels[roleCode] ?? humanizeCode(roleCode) : "";
}

function primaryMatchingRoleCode(
  signer: Pick<SignerOption, "roles">,
  requirementCode: string,
) {
  return signer.roles.find((role) =>
    signatureRoleMatchesRequirement(role.code, requirementCode),
  )?.code;
}

function signerPositionForRequirement(
  signer: SignerOption | null,
  requirementCode: string,
) {
  if (!signer) return "";
  return (
    signer.position ||
    friendlySignerRoleName(primaryMatchingRoleCode(signer, requirementCode)) ||
    signer.department ||
    ""
  );
}

function emptySignerMessage(requirementCode: string) {
  const normalizedRequirement = normalizeSignatureRequirement(requirementCode);

  if (normalizedRequirement === "SUPERVISOR_ENCARREGADO") {
    return "Nenhum Supervisor ou Encarregado ativo foi encontrado para a empresa selecionada.";
  }

  if (normalizedRequirement === "HSE_AUTORIZADO") {
    return "Nenhum HSE autorizado foi encontrado neste workspace.";
  }

  return "Nenhum usuário ativo encontrado para este perfil e empresa.";
}

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

function ReadonlyInfo({
  label,
  value,
  className = "",
  compact = false,
}: {
  label: string;
  value: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      <p className={`${typography.metaStrong} text-muted-foreground`}>
        {label}
      </p>
      <p
        className={
          `mt-0.5 ${typography.bodyStrong} text-foreground ` +
          (compact ? "line-clamp-2 leading-snug" : "truncate")
        }
      >
        {value}
      </p>
    </div>
  );
}

export function NovaInspecaoForm({
  scaffolds,
  signaturePolicies,
  signerOptions,
  currentUser,
}: {
  scaffolds: ScaffoldOption[];
  signaturePolicies: SignaturePolicyOption[];
  signerOptions: SignerOption[];
  currentUser: CurrentUserDefaults;
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
  const inspectorName = currentUser.name;
  const [validityDays, setValidityDays] = useState("7");
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const submittingRef = useRef(false);
  const [collectedSignatures, setCollectedSignatures] = useState<
    CollectedSignature[]
  >([]);
  const [signatureRoleCode, setSignatureRoleCode] = useState("");
  const [signerId, setSignerId] = useState("");
  const [signerCompanyId, setSignerCompanyId] = useState("");
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
  const recentScaffoldIds = useMemo(() => getRecentScaffoldIds(), []);
  const filteredScaffolds = useMemo(() => {
    const term = scaffoldSearch.trim().toLowerCase();
    const ranked = cachedScaffolds
      .map((scaffold) => {
        const values = [
          scaffold.code,
          scaffold.location,
          scaffold.area,
          scaffold.company,
          scaffold.type,
          scaffold.status,
          scaffold.responsible,
        ].filter(Boolean);
        const exactOrPrefix = values.some((value) =>
          String(value).toLowerCase().startsWith(term),
        );
        const contains = values.some((value) =>
          String(value).toLowerCase().includes(term),
        );
        if (term && !contains) return null;

        let score = recentScaffoldIds.includes(scaffold.id) ? 30 : 0;
        if (selectedScaffold?.id === scaffold.id) score += 50;
        if (term) score += exactOrPrefix ? 20 : 8;
        if (scaffold.lastInspectionDate) score += 2;

        return { scaffold, score };
      })
      .filter(
        (item): item is { scaffold: ScaffoldOption; score: number } =>
          Boolean(item),
      )
      .sort((a, b) => b.score - a.score || a.scaffold.code.localeCompare(b.scaffold.code))
      .map((item) => item.scaffold);

    if (!term) return ranked;

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

    return ranked.length > 0 ? ranked : matches;
  }, [cachedScaffolds, recentScaffoldIds, scaffoldSearch, selectedScaffold]);

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
  const normalizedActiveSignatureRequirement = normalizeSignatureRequirement(
    activeSignatureRoleCode,
  );

  const isSupervisorRequirement =
    normalizedActiveSignatureRequirement === "SUPERVISOR_ENCARREGADO";
  const canSwitchOperationalSignerCompany = currentUser.roleCodes.some((roleCode) =>
    OPERATIONAL_SIGNER_COMPANY_SWITCH_ROLES.has(roleCode),
  );
  const currentUserMatchesSignatureRole =
    activeSignatureRoleCode.length > 0 &&
    currentUser.roleCodes.some((roleCode) =>
      signatureRoleMatchesRequirement(roleCode, activeSignatureRoleCode),
    );
  const eligibleSignersForRole = activeSignatureRoleCode
    ? signerOptions.filter((signer) =>
        signer.roles.some((role) =>
          signatureRoleMatchesRequirement(role.code, activeSignatureRoleCode),
        ),
      )
    : [];
  const eligibleSignersForRequirement = eligibleSignersForRole.filter(
    (signer) => {
      if (isSupervisorRequirement) {
        if (canSwitchOperationalSignerCompany) return true;
        return (
          Boolean(selectedScaffold?.companyId) &&
          signer.companyId === selectedScaffold?.companyId
        );
      }

      if (currentUserMatchesSignatureRole) {
        return signer.companyId === currentUser.companyId;
      }

      return true;
    },
  );
  const signerCompanyOptions =
    isSupervisorRequirement &&
    !canSwitchOperationalSignerCompany &&
    selectedScaffold?.companyId
      ? [
          {
            id: selectedScaffold.companyId,
            name: selectedScaffold.company ?? "Empresa montadora",
          },
        ]
      : Array.from(
          new Map(
            eligibleSignersForRequirement.map((signer) => [
              signer.companyId,
              {
                id: signer.companyId,
                name: signer.companyName,
              },
            ]),
          ).values(),
        ).sort((a, b) => a.name.localeCompare(b.name));
  const defaultSupervisorCompanyId =
    isSupervisorRequirement &&
    selectedScaffold?.companyId &&
    signerCompanyOptions.some((company) => company.id === selectedScaffold.companyId)
      ? selectedScaffold.companyId
      : "";
  const effectiveSignerCompanyId =
    signerCompanyId &&
    signerCompanyOptions.some((company) => company.id === signerCompanyId)
      ? signerCompanyId
      : defaultSupervisorCompanyId || signerCompanyOptions[0]?.id || "";
  const filteredSignerOptions = eligibleSignersForRole.filter(
    (signer) =>
      eligibleSignersForRequirement.some((eligible) => eligible.id === signer.id) &&
      (!effectiveSignerCompanyId || signer.companyId === effectiveSignerCompanyId),
  );
  const preferredCurrentSigner = filteredSignerOptions.find(
    (signer) => signer.id === currentUser.id,
  );
  const selectedSigner =
    filteredSignerOptions.find((signer) => signer.id === signerId) ??
    preferredCurrentSigner ??
    filteredSignerOptions[0] ??
    null;

  const defaultSignerCompany =
    selectedSigner?.companyName ?? selectedScaffold?.company ?? "";
  const defaultSignerPosition = signerPositionForRequirement(
    selectedSigner,
    activeSignatureRoleCode,
  );

  const handleScaffoldChange = (value: string) => {
    rememberRecentScaffold(value);
    setSelectedScaffoldId(value);
    setCollectedSignatures([]);
    setSignatureRoleCode("");
    setSignerCompanyId("");
    setSignerId("");
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

    if (!effectiveSignerCompanyId) {
      toast.error("Selecione a empresa do assinante.");
      return;
    }

    if (!selectedSigner) {
      toast.error("Selecione o assinante.");
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
          role_label: signatureRequirementLabel(requirement),
          signer_user_id: selectedSigner.id,
          signer_name: selectedSigner.name,
          signer_company: defaultSignerCompany || undefined,
          signer_position: defaultSignerPosition || undefined,
          signature_data: signatureReference,
        },
      ]);
      setSignerId("");
      setSignerCompanyId("");
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
    const releaseUiStartedAt = performance.now();
    logReleaseUi("click.................... 0ms", {
      scaffoldId: selectedScaffold.id,
      scaffoldCode: selectedScaffold.code,
    });
    // Previne duplo clique via ref (guard extra além do state)
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const toastId = toast.loading("Salvando inspeção...");
    logReleaseUi("server action starting", {
      elapsedMs: Math.round(performance.now() - releaseUiStartedAt),
    });
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
          signer_user_id: signature.signer_user_id,
          signer_name: signature.signer_name,
          signer_company: signature.signer_company,
          signer_position: signature.signer_position,
          signature_data: signature.signature_data,
        })),
        checklist,
      };

      const saveInspectionOffline = async () => {
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
      };

      if (!browserIsOnline()) {
        await saveInspectionOffline();
        return;
      }

      const created = await createInspection(payload).catch(async (error) => {
        if (
          !browserIsOnline() ||
          (await checkServerConnectivity({ timeoutMs: 1_500, force: true })) ===
            "offline"
        ) {
          await saveInspectionOffline();
          return null;
        }

        throw error;
      });
      if (!created) return;
      const serverReturnedAt = performance.now();
      logReleaseUi("server returned", {
        elapsedMs: Math.round(serverReturnedAt - releaseUiStartedAt),
        inspectionId: created.inspection.id,
        scaffoldStatus: created.scaffold.status,
        validityDate: created.scaffold.validityDate,
      });
      toast.success("Inspeção registrada com sucesso!", { id: toastId });
      if (RELEASE_UI_DIAGNOSTICS_ENABLED) {
        sessionStorage.setItem(
          "andcheck:release-flow",
          JSON.stringify({
            clickedAt: releaseUiStartedAt,
            serverReturnedAt,
            navigationStartedAt: performance.now(),
            inspectionId: created.inspection.id,
            scaffoldId: created.scaffold.id,
            scaffoldStatus: created.scaffold.status,
            validityDate: created.scaffold.validityDate,
          }),
        );
      }
      logReleaseUi("navigation started", {
        elapsedMs: Math.round(performance.now() - releaseUiStartedAt),
        href: `/inspecoes/${created.id}`,
      });
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
    <div className={`max-w-3xl pb-10 ${surface.pageStackContained}`}>
      <div className="hidden">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/inspecoes" aria-label="Voltar para inspeções">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
        </Button>
        <div className={`${typography.sectionLabel} text-muted-foreground`}>
          <Link href="/inspecoes" className="hover:text-foreground">
            Inspeções
          </Link>
          <span className="mx-1.5">/</span>
          <span className={`${typography.bodyStrong} text-foreground`}>Nova Inspeção</span>
        </div>
      </div>

      <div className={`flex items-center gap-3 ${surface.pageHeader}`}>
        <Button variant="ghost" size="icon" className="w-7 h-7" asChild>
          <Link href="/inspecoes" aria-label="Voltar para inspeÃ§Ãµes">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
        <div
          className={`mb-1 flex items-center gap-2 ${typography.pageEyebrow} text-muted-foreground`}
        >
          <ClipboardCheck className="size-4" />
          AndCheck • Inspeções
        </div>
        <h1 className={`${typography.pageTitle} text-foreground`}>
          Nova Inspeção
        </h1>
        <p className="hidden">
          Checklist de{" "}
          {checklistTemplate.reduce((a, c) => a + c.items.length, 0)} itens •
          Resultado calculado automaticamente • NR-18 / NR-35 / ABNT NBR 6494
        </p>
        </div>
      </div>

      <OfflineDataNotice
        active={isAuxiliaryCacheFallback}
        label="dados da nova inspeção"
        lastCachedAt={lastAuxiliaryCachedAt}
      />

      <div className={`space-y-4 p-4 sm:p-5 ${surface.card}`}>
        <h3 className={`${typography.sectionLabel} ${surface.sectionDivider} text-muted-foreground`}>
          Informações Gerais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className={typography.panelTitle}>
              Andaime *
            </Label>
            <Select
              value={selectedScaffoldId}
              onValueChange={handleScaffoldChange}
            >
              <SelectTrigger className={`w-full min-w-0 overflow-hidden ${control.selectSm}`}>
                <SelectValue
                  placeholder="Selecionar andaime..."
                  className="min-w-0 flex-1 truncate"
                />
              </SelectTrigger>
              <SelectContent
                className="-ml-1.5 !max-h-[min(17rem,50vh)] !w-[calc(100vw-2.25rem)] !min-w-0 max-w-[27rem] overflow-hidden sm:ml-0 sm:!w-[var(--radix-select-trigger-width)] sm:max-w-none sm:!max-h-80"
                viewportClassName="max-h-[min(15rem,44vh)] !min-w-0 overflow-y-auto sm:max-h-72"
              >
                <div className={surface.panelHeaderSticky}>
                  <Input
                    value={scaffoldSearch}
                    onChange={(event) => setScaffoldSearch(event.target.value)}
                    placeholder="Pesquisar TAG, local, área ou empresa..."
                    className={`h-8 ${typography.sectionDescription}`}
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </div>
                {filteredScaffolds.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="min-w-0 [&>span:last-child]:min-w-0 [&>span:last-child]:truncate"
                  >
                    {s.code} — {s.location}
                  </SelectItem>
                ))}
                {filteredScaffolds.length === 0 && (
                  <div className={`px-3 py-2 ${typography.sectionDescription} text-muted-foreground`}>
                    Nenhum andaime encontrado.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={typography.panelTitle}>
              Nome do Inspetor *
            </Label>
            <Input
              placeholder="Nome completo"
              value={inspectorName}
              readOnly
              className={`${control.inputSm} ${surface.readonlyInset}`}
            />
            <p className={`${typography.bodyMuted} text-muted-foreground`}>
              Preenchido pela sessao ativa.
            </p>
          </div>
        </div>
        {selectedScaffold && (
          <>
            <div className={`space-y-3 p-3 lg:hidden ${surface.subtleBox}`}>
              <div className="grid grid-cols-[1fr_auto] items-start gap-3 sm:grid-cols-[1fr_auto_auto]">
                <ReadonlyInfo label="TAG" value={selectedScaffold.code} />
                <ReadonlyInfo
                  label="Status"
                  value={humanizeCode(selectedScaffold.status)}
                />
                <ReadonlyInfo
                  label="Tipo"
                  value={getScaffoldTypeLabel(selectedScaffold.type)}
                  className="col-span-2 sm:col-span-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                <ReadonlyInfo label="Area" value={selectedScaffold.area} compact />
                <ReadonlyInfo
                  label="Localizacao"
                  value={selectedScaffold.location}
                  compact
                />
                <ReadonlyInfo
                  label="Empresa"
                  value={selectedScaffold.company ?? "-"}
                  compact
                />
                <ReadonlyInfo
                  label="Responsavel"
                  value={selectedScaffold.responsible}
                  compact
                />
                <ReadonlyInfo
                  label="Dimensoes"
                  value={[
                    `${selectedScaffold.height} m alt.`,
                    selectedScaffold.width
                      ? `${selectedScaffold.width} m larg.`
                      : null,
                    selectedScaffold.length
                      ? `${selectedScaffold.length} m comp.`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                  compact
                />
                <ReadonlyInfo
                  label="Carga"
                  value={
                    selectedScaffold.max_load
                      ? `${selectedScaffold.max_load} kg`
                      : "-"
                  }
                />
                <ReadonlyInfo
                  label="Validade"
                  value={formatNullableDate(selectedScaffold.validity_date)}
                />
                <ReadonlyInfo
                  label="Ultima inspecao"
                  value={formatNullableDate(selectedScaffold.lastInspectionDate)}
                />
              </div>
            </div>
            <div className={`hidden space-y-3 p-3 lg:block ${surface.subtleBox}`}>
              <div className={`grid grid-cols-3 gap-x-8 gap-y-3 ${surface.sectionDivider}`}>
                <ReadonlyInfo label="TAG" value={selectedScaffold.code} />
                <ReadonlyInfo
                  label="Status"
                  value={humanizeCode(selectedScaffold.status)}
                />
                <ReadonlyInfo
                  label="Tipo"
                  value={getScaffoldTypeLabel(selectedScaffold.type)}
                />
              </div>
              <div className="grid grid-cols-3 gap-x-8 gap-y-3">
                <ReadonlyInfo label="Area" value={selectedScaffold.area} compact />
                <ReadonlyInfo
                  label="Localizacao"
                  value={selectedScaffold.location}
                  compact
                />
                <ReadonlyInfo
                  label="Empresa"
                  value={selectedScaffold.company ?? "-"}
                  compact
                />
                <ReadonlyInfo
                  label="Responsavel"
                  value={selectedScaffold.responsible}
                  compact
                />
                <ReadonlyInfo
                  label="Dimensoes"
                  value={[
                    `${selectedScaffold.height} m alt.`,
                    selectedScaffold.width
                      ? `${selectedScaffold.width} m larg.`
                      : null,
                    selectedScaffold.length
                      ? `${selectedScaffold.length} m comp.`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                  compact
                />
                <ReadonlyInfo
                  label="Carga maxima"
                  value={
                    selectedScaffold.max_load
                      ? `${selectedScaffold.max_load} kg`
                      : "-"
                  }
                />
                <ReadonlyInfo
                  label="Validade"
                  value={formatNullableDate(selectedScaffold.validity_date)}
                />
                <ReadonlyInfo
                  label="Ultima inspecao"
                  value={formatNullableDate(selectedScaffold.lastInspectionDate)}
                />
              </div>
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label className={typography.panelTitle}>
            Validade da liberação
          </Label>
          <Select value={validityDays} onValueChange={setValidityDays}>
            <SelectTrigger className={`w-40 ${control.selectSm}`}>
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
        <div className={`space-y-2 p-4 ${surface.dangerAlert}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
            <p className={`${typography.metaStrong} text-destructive`}>
              Liberação bloqueada — {criticalIssues.length} item(ns) crítico(s)
              não conforme(s)
            </p>
          </div>
          <ul className="space-y-1 pl-6">
            {criticalIssues.map((issue, i) => (
              <li
                key={i}
                className={`flex items-start gap-1.5 ${typography.sectionDescription} text-destructive`}
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
            "flex items-center gap-4 p-4 " +
            (autoResult === "aprovado"
              ? surface.successAlert
              : autoResult === "reprovado"
                ? surface.dangerAlert
                : surface.warningAlertMuted)
          }
        >
          {autoResult === "aprovado" && (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          )}
          {autoResult === "reprovado" && (
            <XCircle className="w-6 h-6 shrink-0 text-destructive" />
          )}
          {autoResult === "aprovado_com_ressalvas" && (
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          )}
          <div>
            <p className={`${typography.sectionLabel} mb-1 text-muted-foreground`}>
              Resultado calculado
            </p>
            <StatusBadge status={autoResult} size="lg" />
          </div>
          {autoResult !== "reprovado" && (
            <div className="ml-auto text-right">
              <p className={`${typography.sectionLabel} text-muted-foreground`}>
                Válido até
              </p>
              <p className={`${typography.code} text-foreground`}>
                {format(
                  addDays(new Date(), Number(validityDays)),
                  "dd/MM/yyyy",
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <div className={`space-y-3 p-4 sm:p-5 ${surface.card}`}>
        <h3 className={`${typography.sectionLabel} ${surface.sectionDivider} text-muted-foreground`}>
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
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="absolute right-1 top-1 size-5 bg-red-600 text-white opacity-0 group-hover:opacity-100"
                  aria-label="Remover foto"
                  title="Remover foto"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
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
                      <p className={`truncate leading-tight text-white ${typography.badge}`}>
                        {item.item}
                      </p>
                    </div>
                    {/* Botão remover */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-xs"
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
                      className="absolute right-1 top-1 size-5 bg-red-600 text-white opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              }),
            )}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => photoGalleryInputRef.current?.click()}
          className={typography.panelTitle}
        >
          <ImagePlus className="w-3.5 h-3.5" />
          Galeria{photos.length > 0 ? ` (${photos.length})` : ""}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => photoCameraInputRef.current?.click()}
          className={`ml-2 ${typography.panelTitle}`}
        >
          <Camera className="w-3.5 h-3.5" />
          Camera
        </Button>
      </div>

      {/* Assinatura Digital */}
      <div className={`space-y-3 p-4 sm:p-5 ${surface.card}`}>
        <h3 className={`${typography.sectionLabel} ${surface.sectionDivider} text-muted-foreground`}>
          Observações Gerais
        </h3>
        <Textarea
          placeholder="Registre observações gerais sobre a inspeção..."
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className={`min-h-20 rounded-md ${typography.sectionDescription}`}
        />
      </div>

      <div className={`space-y-4 px-4 pb-3 pt-3 sm:px-5 ${surface.card}`}>
        <div className={`flex items-center justify-between ${surface.sectionDivider}`}>
          <h3 className={`${typography.sectionLabel} text-muted-foreground`}>
            Assinaturas obrigatórias
          </h3>
        </div>

        <div className="space-y-2">
          <p className={`${typography.sectionDescription} text-muted-foreground`}>
            Política:{" "}
            <span className={`${typography.bodyStrong} text-foreground`}>
              {signaturePolicyDisplayName(selectedPolicy)}
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
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${surface.subtleBox}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {collected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <p className={`${typography.bodyStrong} truncate text-foreground`}>
                        {signatureRequirementLabel(requirement)}
                      </p>
                      <p className={`truncate ${typography.bodyMuted} text-muted-foreground`}>
                        {collected
                          ? "Assinado por " + collected.signer_name
                          : "Pendente"}
                      </p>
                    </div>
                  </div>
                  {collected && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setCollectedSignatures((current) =>
                          current.filter(
                            (signature) =>
                              signature.role_code !== requirement.role_code,
                          ),
                        )
                      }
                      className={`${typography.sectionLabel} text-muted-foreground hover:text-destructive`}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {!signaturesReady && (
            <p className={`${typography.bodyStrong} text-destructive`}>
              Assinaturas pendentes:{" "}
              {pendingSignatures
                .map((item) => signatureRequirementLabel(item))
                .join(", ")}
            </p>
          )}
        </div>

        {requiredSignatures.length > 0 ? (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className={typography.panelTitle}>
              Perfil da assinatura
            </Label>
            <Select
              value={activeSignatureRoleCode}
              onValueChange={(value) => {
                setSignatureRoleCode(value);
                setSignerCompanyId("");
                setSignerId("");
                setSignerPosition("");
              }}
            >
              <SelectTrigger className={control.selectSm}>
                <SelectValue placeholder="Selecionar perfil..." />
              </SelectTrigger>
              <SelectContent>
                {requiredSignatures.map((requirement) => (
                  <SelectItem
                    key={requirement.id}
                    value={requirement.role_code}
                  >
                    {signatureRequirementLabel(requirement)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={typography.panelTitle}>
              Empresa
            </Label>
            <Select
              value={effectiveSignerCompanyId}
              onValueChange={(value) => {
                setSignerCompanyId(value);
                setSignerId("");
                setSignerPosition("");
              }}
              disabled={
                !activeSignatureRoleCode ||
                signerCompanyOptions.length === 0 ||
                (isSupervisorRequirement && !canSwitchOperationalSignerCompany)
              }
            >
              <SelectTrigger className={control.selectSm}>
                <SelectValue placeholder="Selecionar empresa..." />
              </SelectTrigger>
              <SelectContent>
                {signerCompanyOptions.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={typography.panelTitle}>
              Nome do assinante
            </Label>
            <Select
              value={selectedSigner?.id ?? ""}
              onValueChange={(value) => {
                const signer = filteredSignerOptions.find(
                  (option) => option.id === value,
                );
                setSignerId(value);
                setSignerPosition(
                  signerPositionForRequirement(signer ?? null, activeSignatureRoleCode),
                );
              }}
              disabled={!effectiveSignerCompanyId || filteredSignerOptions.length === 0}
            >
              <SelectTrigger className={control.selectSm}>
                <SelectValue placeholder="Selecionar assinante..." />
              </SelectTrigger>
              <SelectContent>
                {filteredSignerOptions.map((signer) => (
                  <SelectItem key={signer.id} value={signer.id}>
                    {signer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={typography.panelTitle}>
              Cargo / função
            </Label>
            <Input
              value={signerPosition || defaultSignerPosition}
              readOnly
              placeholder="Cargo"
              className={`${control.inputSm} ${surface.readonlyInset}`}
            />
          </div>
        </div>
        {activeSignatureRoleCode && filteredSignerOptions.length === 0 && (
          <p className={`${typography.bodyStrong} text-amber-700`}>
            {emptySignerMessage(activeSignatureRoleCode)}
          </p>
        )}

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            className={`ml-auto ${typography.sectionLabel} text-muted-foreground hover:text-foreground`}
          >
            <RotateCcw className="size-3" />
            Limpar
          </Button>
          <div className={`relative ${surface.dashedBox}`}>
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
            <p className={`pointer-events-none absolute inset-0 flex items-center justify-center ${typography.bodyMuted} text-muted-foreground`}>
              Assine com o dedo ou mouse acima
            </p>
          )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRegisterSignature}
          disabled={registeringSignature}
          className={typography.panelTitle}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Registrar assinatura
        </Button>
          </>
        ) : (
          <div className={`p-4 ${surface.dashedBox}`}>
            <p className={`${typography.sectionDescription} text-muted-foreground`}>
              Selecione um andaime com política ativa para coletar assinaturas.
            </p>
          </div>
        )}
      </div>

      <div className={`flex flex-col justify-end gap-3 sm:flex-row ${surface.actionFooterPlain}`}>
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className={`${typography.panelTitle} ${
            submitting ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Link href="/inspecoes" aria-disabled={submitting}>
            Cancelar
          </Link>
        </Button>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={typography.panelTitle}
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
        </Button>
      </div>
    </div>
  );
}
