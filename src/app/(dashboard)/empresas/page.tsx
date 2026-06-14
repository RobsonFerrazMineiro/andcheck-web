import { getCompanyManagementData } from "@/lib/actions/company-actions";
import { canCurrentUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { EmpresasClient } from "./empresas-client";

export default async function EmpresasPage() {
  const [canManage, canView] = await Promise.all([
    canCurrentUser("companies.manage"),
    canCurrentUser("companies.view"),
  ]);
  if (!canManage && !canView) redirect("/dashboard");

  const { companies, workspaces } = await getCompanyManagementData();

  return (
    <EmpresasClient
      canManage={canManage}
      initialCompanies={companies.map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code,
        type: company.type,
        active: company.active,
        description: company.description,
        logoUrl: company.logoUrl,
        workspaceId: company.workspaceId,
        workspaceName: company.workspace.name,
        users: company._count.users,
        scaffolds: company._count.scaffolds,
      }))}
      workspaces={workspaces}
    />
  );
}
