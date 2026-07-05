import { Suspense } from "react";

import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { getActiveNonConformitiesForInspection } from "@/lib/actions/inspection-actions";
import { getInspectionSignaturePolicies } from "@/lib/actions/signature-policy-actions";
import { canCurrentUser } from "@/lib/authz";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NovaInspecaoForm } from "./nova-inspecao-form";

type Props = {
  searchParams: Promise<{ scaffold_id?: string }>;
};

type InspectionScaffoldOptionRecord = {
  id: string;
  code: string;
  location: string;
  area: string;
  company: string | null;
  type: string;
};

type ActiveNonConformityRecord = {
  id: string;
  code: string;
  scaffoldId: string;
  status: string;
};

type SignaturePolicyRecord = {
  id: string;
  name: string;
  company: string | null;
  area: string | null;
  scaffold_type: string | null;
  is_default: boolean;
  requirements: Array<{
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
  }>;
};

export default async function NovaInspecaoPage({ searchParams }: Props) {
  const canCreateInspection =
    (await canCurrentUser("inspections.create")) ||
    (await canCurrentUser("inspections.finalize"));
  if (!canCreateInspection) redirect("/inspecoes");

  const { scaffold_id: selectedScaffoldId } = await searchParams;
  const [raw, rawPolicies, activeNonConformities] = await Promise.all([
    getScaffolds(),
    getInspectionSignaturePolicies(),
    getActiveNonConformitiesForInspection(),
  ]);
  const scaffoldRecords = raw as InspectionScaffoldOptionRecord[];
  const signaturePolicyRecords = rawPolicies as SignaturePolicyRecord[];
  const activeNonConformityRecords =
    activeNonConformities as ActiveNonConformityRecord[];
  const activeScaffoldIds = new Set(
    activeNonConformityRecords.map((nc) => nc.scaffoldId),
  );
  const blockedNonConformity = selectedScaffoldId
    ? activeNonConformityRecords.find(
        (nc) => nc.scaffoldId === selectedScaffoldId,
      )
    : undefined;

  if (blockedNonConformity && selectedScaffoldId) {
    return (
      <div className="mx-auto max-w-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-wide">
              Nova inspeção bloqueada
            </h1>
            <p className="mt-2 text-sm leading-relaxed">
              Não é possível iniciar nova inspeção enquanto houver não
              conformidade ativa para este andaime.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider">
              <Link
                href={`/nao-conformidades/${blockedNonConformity.id}`}
                className="underline underline-offset-4"
              >
                Ver Não Conformidade
              </Link>
              <Link
                href={`/andaimes/${selectedScaffoldId}`}
                className="underline underline-offset-4"
              >
                Voltar ao andaime
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scaffolds = scaffoldRecords
    .filter((s) => !activeScaffoldIds.has(s.id))
    .map((s) => ({
      id: s.id,
      code: s.code,
      location: s.location,
      area: s.area,
      company: s.company,
      type: s.type,
    }));
  const signaturePolicies = signaturePolicyRecords.map((policy) => ({
    id: policy.id,
    name: policy.name,
    company: policy.company,
    area: policy.area,
    scaffold_type: policy.scaffold_type,
    is_default: policy.is_default,
    requirements: policy.requirements.map((requirement) => ({
      id: requirement.id,
      role_code: requirement.role_code,
      label: requirement.label,
      min_count: requirement.min_count,
      is_required: requirement.is_required,
      sort_order: requirement.sort_order,
      role: {
        code: requirement.role.code,
        name: requirement.role.name,
      },
    })),
  }));
  return (
    <Suspense>
      <NovaInspecaoForm
        scaffolds={scaffolds}
        signaturePolicies={signaturePolicies}
      />
    </Suspense>
  );
}
