"use server";

import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/authz";

const policyInclude = {
  requirements: {
    include: { role: true },
    orderBy: { sort_order: "asc" as const },
  },
};

export async function getInspectionSignaturePolicies() {
  await requireAnyPermission([
    "inspections.create",
    "inspections.finalize",
    "signature_policies.manage",
  ]);

  return prisma.inspectionSignaturePolicy.findMany({
    orderBy: [{ is_default: "desc" }, { name: "asc" }],
    include: policyInclude,
  });
}

export async function resolveInspectionSignaturePolicyForScaffold(
  scaffoldId: string,
) {
  await requireAnyPermission([
    "inspections.create",
    "inspections.finalize",
    "signature_policies.manage",
  ]);

  const scaffold = await prisma.scaffold.findUnique({
    where: { id: scaffoldId },
    select: {
      company: true,
      area: true,
      type: true,
    },
  });

  if (!scaffold) return null;

  const policies = await prisma.inspectionSignaturePolicy.findMany({
    where: { is_active: true },
    include: policyInclude,
  });

  const matchingPolicies = policies
    .map((policy) => {
      let score = policy.is_default ? 1 : 0;

      if (policy.company) {
        if (policy.company !== scaffold.company) return null;
        score += 8;
      }

      if (policy.area) {
        if (policy.area !== scaffold.area) return null;
        score += 4;
      }

      if (policy.scaffold_type) {
        if (policy.scaffold_type !== scaffold.type) return null;
        score += 2;
      }

      return { policy, score };
    })
    .filter((item): item is { policy: (typeof policies)[number]; score: number } =>
      Boolean(item),
    )
    .sort((a, b) => b.score - a.score);

  return matchingPolicies[0]?.policy ?? null;
}
