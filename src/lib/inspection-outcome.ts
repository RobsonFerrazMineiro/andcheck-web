export type InspectionChecklistResult = {
  critical: boolean;
  value: "CL_OK" | "CL_FAIL" | "CL_WARN" | "CL_NA";
};

export type CalculatedInspectionResult =
  | "aprovado"
  | "aprovado_com_ressalvas"
  | "reprovado";

export function hasCriticalChecklistFailure(
  checklist: InspectionChecklistResult[],
) {
  return checklist.some(
    (item) => item.critical && item.value === "CL_FAIL",
  );
}

export function calculateInspectionResult(
  checklist: InspectionChecklistResult[],
): CalculatedInspectionResult {
  if (hasCriticalChecklistFailure(checklist)) return "reprovado";
  const hasNonConformity = checklist.some(
    (item) => item.value === "CL_FAIL" || item.value === "CL_WARN",
  );
  return hasNonConformity ? "aprovado_com_ressalvas" : "aprovado";
}

export function calculateScaffoldStatus(
  result: CalculatedInspectionResult,
  checklist: InspectionChecklistResult[],
) {
  if (result !== "reprovado") return "liberado" as const;
  return hasCriticalChecklistFailure(checklist)
    ? ("interditado" as const)
    : ("reprovado" as const);
}
