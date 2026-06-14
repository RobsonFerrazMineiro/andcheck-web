import { getWorkspaceManagementData } from "@/lib/actions/workspace-actions";
import { canCurrentUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { WorkspacesClient } from "./workspaces-client";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspacesPage({ searchParams }: Props) {
  const [canManage, canView] = await Promise.all([
    canCurrentUser("workspaces.manage"),
    canCurrentUser("workspaces.view"),
  ]);
  if (!canManage && !canView) redirect("/dashboard");

  const [{ workspaces, ownerCompanies }, params] = await Promise.all([
    getWorkspaceManagementData(),
    searchParams ??
      Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const editValue = params.edit;
  const initialEditingId = Array.isArray(editValue) ? editValue[0] : editValue;

  return (
    <WorkspacesClient
      canManage={canManage}
      initialEditingId={initialEditingId}
      ownerCompanies={ownerCompanies}
      initialWorkspaces={workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        code: workspace.code,
        ownerCompanyId: workspace.ownerCompanyId,
        ownerCompanyName: workspace.ownerCompany.name,
        city: workspace.city,
        state: workspace.state,
        address: workspace.address,
        latitude: workspace.latitude,
        longitude: workspace.longitude,
        description: workspace.description,
        active: workspace.active,
        companies: workspace.companyLinks.length,
        scaffolds: workspace._count.scaffolds,
      }))}
    />
  );
}
