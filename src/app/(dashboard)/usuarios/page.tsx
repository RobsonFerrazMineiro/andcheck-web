import { getUserManagementData } from "@/lib/actions/user-actions";
import { canCurrentUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const canManageUsers =
    (await canCurrentUser("users.manage_company")) ||
    (await canCurrentUser("users.create"));
  if (!canManageUsers) redirect("/dashboard");

  const { users, roles } = await getUserManagementData();

  const rows = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    company: user.company,
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

  const roleOptions = roles.map((role) => ({
    id: role.id,
    code: role.code,
    name: role.name,
  }));

  return <UsuariosClient initialData={rows} roles={roleOptions} />;
}
