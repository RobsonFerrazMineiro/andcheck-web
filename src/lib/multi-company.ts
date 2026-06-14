import { prisma } from "@/lib/prisma";

export const DEFAULT_COMPANY_ID = "company-hydro-alunorte";
export const DEFAULT_WORKSPACE_ID = "workspace-hydro-murucupi";

export async function resolveTenantContext({
  company,
  workspace,
}: {
  company?: string | null;
  workspace?: string | null;
}) {
  const [companyRecord, workspaceRecord] = await Promise.all([
    company && company !== DEFAULT_COMPANY_ID
      ? prisma.company.findFirst({
          where: {
            OR: [
              { id: company },
              { name: { equals: company, mode: "insensitive" } },
              { tradeName: { equals: company, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        })
      : null,
    workspace && workspace !== DEFAULT_WORKSPACE_ID
      ? prisma.workspace.findFirst({
          where: {
            OR: [
              { id: workspace },
              { name: { equals: workspace, mode: "insensitive" } },
              { code: { equals: workspace, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        })
      : null,
  ]);

  return {
    companyId: companyRecord?.id ?? DEFAULT_COMPANY_ID,
    workspaceId: workspaceRecord?.id ?? DEFAULT_WORKSPACE_ID,
  };
}
