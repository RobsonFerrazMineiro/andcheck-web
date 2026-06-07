import { Suspense } from "react";

import { getScaffolds } from "@/lib/actions/scaffold-actions";
import { getInspectionSignaturePolicies } from "@/lib/actions/signature-policy-actions";
import { canCurrentUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { NovaInspecaoForm } from "./nova-inspecao-form";

export default async function NovaInspecaoPage() {
  const canCreateInspection =
    (await canCurrentUser("inspections.create")) ||
    (await canCurrentUser("inspections.finalize"));
  if (!canCreateInspection) redirect("/inspecoes");

  const [raw, rawPolicies] = await Promise.all([
    getScaffolds(),
    getInspectionSignaturePolicies(),
  ]);
  const scaffolds = raw.map((s) => ({
    id: s.id,
    code: s.code,
    location: s.location,
    area: s.area,
    company: s.company,
    type: s.type,
  }));
  const signaturePolicies = rawPolicies.map((policy) => ({
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
