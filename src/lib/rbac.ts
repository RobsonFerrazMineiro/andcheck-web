import rbacData from "@/lib/rbac-data.json";

export type CorporateRoleCode = (typeof rbacData.roles)[number]["code"];
export type PermissionCode = (typeof rbacData.permissions)[number]["code"];

export const CORPORATE_ROLES = rbacData.roles;
export const PERMISSIONS = rbacData.permissions;
export const ROLE_PERMISSIONS = rbacData.rolePermissions as Record<
  CorporateRoleCode,
  PermissionCode[] | ["*"]
>;

export function roleHasPermission(
  roleCode: string | null | undefined,
  permissionCode: PermissionCode,
) {
  if (!roleCode) return false;

  const permissions = ROLE_PERMISSIONS[roleCode as CorporateRoleCode];
  if (!permissions) return false;

  const assignedPermissions = permissions as readonly string[];
  return (
    assignedPermissions.includes("*") ||
    assignedPermissions.includes(permissionCode)
  );
}

export function getRoleLabel(roleCode: string | null | undefined) {
  if (!roleCode) return "Sem perfil";

  return (
    CORPORATE_ROLES.find((role) => role.code === roleCode)?.name ?? roleCode
  );
}
