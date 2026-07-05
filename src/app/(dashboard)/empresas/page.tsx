import { getCompanyManagementData } from "@/lib/actions/company-actions";
import { canCurrentUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import {
  EmpresasClient,
  type CompanyRow,
  type CompanyType,
} from "./empresas-client";

type CompanyManagementRecord = Omit<CompanyRow, "type" | "workspaceNames" | "users" | "scaffolds"> & {
  type: CompanyType;
  workspaceLinks: Array<{ workspace: { name: string } }>;
  _count: { users: number; scaffolds: number };
};

type WorkspaceOption = { id: string; name: string };

export default async function EmpresasPage() {
  const [canManage, canView] = await Promise.all([
    canCurrentUser("companies.manage"),
    canCurrentUser("companies.view"),
  ]);
  if (!canManage && !canView) redirect("/dashboard");

  const { companies, workspaces } = await getCompanyManagementData();
  const typedCompanies = companies as CompanyManagementRecord[];
  const typedWorkspaces = workspaces as WorkspaceOption[];

  return (
    <EmpresasClient
      canManage={canManage}
      initialCompanies={typedCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        code: company.code,
        type: company.type,
        active: company.active,
        description: company.description,
        logoUrl: company.logoUrl,
        workspaceNames: company.workspaceLinks.map(
          (link) => link.workspace.name,
        ),
        users: company._count.users,
        scaffolds: company._count.scaffolds,
      }))}
      workspaces={typedWorkspaces}
    />
  );
}
