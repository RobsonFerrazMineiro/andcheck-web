export type CompanyTypeCode =
  | "CLIENT"
  | "HSE_MANAGER"
  | "SCAFFOLD_COMPANY"
  | "CONTRACTOR";

export const COMPANY_TYPE_LABELS: Record<CompanyTypeCode, string> = {
  CLIENT: "Cliente / Contratante",
  HSE_MANAGER: "Gerenciadora HSE",
  SCAFFOLD_COMPANY: "Empresa de andaimes",
  CONTRACTOR: "Contratada",
};

export const COMPANY_TYPE_BADGE_STYLES: Record<CompanyTypeCode, string> = {
  CLIENT: "border-blue-200 bg-blue-50 text-blue-700",
  HSE_MANAGER: "border-violet-200 bg-violet-50 text-violet-700",
  SCAFFOLD_COMPANY: "border-amber-200 bg-amber-50 text-amber-700",
  CONTRACTOR: "border-slate-200 bg-slate-100 text-slate-600",
};

export function getCompanyTypeLabel(type: string) {
  return COMPANY_TYPE_LABELS[type as CompanyTypeCode] ?? type;
}
