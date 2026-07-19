import { OnlineOnlyNotice } from "@/components/offline/online-only-notice";
import { getUserManagementData } from "@/lib/actions/user-actions";
import { canCurrentUser, getCurrentUserAccess } from "@/lib/authz";
import { redirect } from "next/navigation";
import {
  UsuariosClient,
  type CompanyOption,
  type RoleOption,
  type UserRow,
} from "./usuarios-client";

type UserManagementRecord = Omit<UserRow, "roles"> & {
  roles: Array<{
    role: RoleOption;
  }>;
};

export default async function UsuariosPage() {
  const canManageUsers =
    (await canCurrentUser("users.manage_company")) ||
    (await canCurrentUser("users.create"));
  if (!canManageUsers) redirect("/dashboard");

  const [access, { users, roles, companies, canSelectAnyCompany }] =
    await Promise.all([
      getCurrentUserAccess(),
      getUserManagementData(),
    ]);

  const typedUsers = users as UserManagementRecord[];
  const typedRoles = roles as RoleOption[];

  const rows: UserRow[] = typedUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    company: user.company,
    companyId: user.companyId,
    registration: user.registration,
    department: user.department,
    position: user.position,
    is_active: user.is_active,
    roles: user.roles.map((userRole) => ({
      id: userRole.role.id,
      code: userRole.role.code,
      name: userRole.role.name,
    })),
  }));

  const roleOptions: RoleOption[] = typedRoles.map((role) => ({
    id: role.id,
    code: role.code,
    name: role.name,
  }));
  const companyOptions: CompanyOption[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
  }));

  return (
    <div className="space-y-4">
      <OnlineOnlyNotice moduleName="Usuários administrativos" />
      <UsuariosClient
        initialData={rows}
        roles={roleOptions}
        companies={companyOptions}
        canSelectAnyCompany={canSelectAnyCompany}
        currentUserId={access?.userId ?? null}
        currentUserCompanyId={access?.companyId ?? null}
        currentUserRoleCodes={access?.roleCodes ?? []}
      />
    </div>
  );
}
