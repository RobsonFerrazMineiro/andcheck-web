export const NON_CONFORMITY_TREATMENT_EVIDENCE_REQUIRED_MESSAGE =
  "Anexe pelo menos uma evidência da tratativa antes de solicitar a verificação da NC.";

export const NON_CONFORMITY_CRITICAL_EVIDENCE_REQUIRED_MESSAGE =
  "Anexe evidências em todos os itens críticos antes de solicitar a verificação da NC.";

export const NON_CONFORMITY_REVIEW_EVIDENCE_REQUIRED_MESSAGE =
  "Esta NC ainda não possui evidências da tratativa. Solicite ao responsável que anexe as evidências antes de aceitar o encerramento.";

export type NonConformityEvidenceSummary = {
  _count?: {
    evidences?: number | null;
  } | null;
  checklistItems?: Array<{
    checklistEntry?: {
      critical?: boolean | null;
    } | null;
    _count?: {
      evidences?: number | null;
    } | null;
    evidences?: unknown[] | null;
  }> | null;
};

function getItemEvidenceCount(item: NonNullable<NonConformityEvidenceSummary["checklistItems"]>[number]) {
  return item._count?.evidences ?? item.evidences?.length ?? 0;
}

export function getNonConformityTreatmentEvidenceCount(
  nonConformity: NonConformityEvidenceSummary,
) {
  const generalEvidenceCount = nonConformity._count?.evidences ?? 0;
  const itemEvidenceCount =
    nonConformity.checklistItems?.reduce(
      (total, item) => total + getItemEvidenceCount(item),
      0,
    ) ?? 0;

  return generalEvidenceCount + itemEvidenceCount;
}

export function hasNonConformityTreatmentEvidence(
  nonConformity: NonConformityEvidenceSummary,
) {
  return getNonConformityTreatmentEvidenceCount(nonConformity) > 0;
}

export function hasEvidenceForEveryCriticalChecklistItem(
  nonConformity: NonConformityEvidenceSummary,
) {
  const criticalItems =
    nonConformity.checklistItems?.filter(
      (item) => item.checklistEntry?.critical === true,
    ) ?? [];

  return criticalItems.every((item) => getItemEvidenceCount(item) > 0);
}

export function canRequestNonConformityVerification(
  nonConformity: NonConformityEvidenceSummary,
) {
  return (
    hasNonConformityTreatmentEvidence(nonConformity) &&
    hasEvidenceForEveryCriticalChecklistItem(nonConformity)
  );
}
