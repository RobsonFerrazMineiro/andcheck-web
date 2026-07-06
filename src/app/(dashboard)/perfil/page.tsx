import { getMyProfile } from "@/lib/actions/profile-actions";
import { getRoleLabel } from "@/lib/rbac";
import { PerfilClient, type ProfileSnapshot } from "./perfil-client";

export default async function PerfilPage() {
  const profile = await getMyProfile();
  const roleLabels =
    profile.roleNames.length > 0
      ? profile.roleNames
      : profile.roleCodes.map((roleCode: string) => getRoleLabel(roleCode));

  const snapshot: ProfileSnapshot = {
    name: profile.name,
    email: profile.email,
    companyName: profile.companyName,
    workspaceName: profile.workspaceName,
    isActive: profile.isActive,
    roleLabels,
    createdAt: profile.createdAt.toISOString(),
    lastAccessAt: profile.lastAccessAt?.toISOString() ?? null,
  };

  return <PerfilClient initialProfile={snapshot} />;
}
