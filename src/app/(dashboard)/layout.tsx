import { auth } from "@/auth";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { DesktopContextSwitcher } from "@/components/layout/context-switcher";
import { canCurrentUser, requireAnyPermission } from "@/lib/authz";
import { getContextSwitcherData } from "@/lib/context-switcher";
import { Activity } from "lucide-react";
import { Toaster } from "sonner";

const NORMS = ["NR-18", "NR-35", "NBR 6494"];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  await requireAnyPermission(["read.all", "read.own_company"]);

  const [
    contextSwitcher,
    canManageCompanyUsers,
    canCreateUsers,
    canViewAuditLog,
    canViewLogs,
    canManagePermissions,
    canViewNonConformities,
    canCreateNonConformities,
    canUpdateNonConformities,
    canCloseNonConformities,
    canAddNonConformityEvidence,
    canViewCompanies,
    canViewWorkspaces,
  ] = await Promise.all([
    getContextSwitcherData(),
    canCurrentUser("users.manage_company"),
    canCurrentUser("users.create"),
    canCurrentUser("audit.view"),
    canCurrentUser("logs.view"),
    canCurrentUser("permissions.manage"),
    canCurrentUser("non_conformities.view"),
    canCurrentUser("non_conformities.create"),
    canCurrentUser("non_conformities.update"),
    canCurrentUser("non_conformities.close"),
    canCurrentUser("non_conformities.add_evidence"),
    canCurrentUser("companies.view"),
    canCurrentUser("workspaces.view"),
  ]);

  const canManageUsers = canManageCompanyUsers || canCreateUsers;
  const canViewAudit =
    canViewAuditLog || canViewLogs || canManagePermissions;
  const canAccessNonConformities =
    canViewNonConformities ||
    canCreateNonConformities ||
    canUpdateNonConformities ||
    canCloseNonConformities ||
    canAddNonConformityEvidence;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        canManageUsers={canManageUsers}
        canViewAudit={canViewAudit}
        canViewNonConformities={canAccessNonConformities}
        canViewCompanies={canViewCompanies || canManagePermissions}
        canViewWorkspaces={canViewWorkspaces || canManagePermissions}
      />
      <MobileHeader
        canManageUsers={canManageUsers}
        canViewAudit={canViewAudit}
        canViewNonConformities={canAccessNonConformities}
        canViewCompanies={canViewCompanies || canManagePermissions}
        canViewWorkspaces={canViewWorkspaces || canManagePermissions}
        context={contextSwitcher}
      />

      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 min-h-screen flex flex-col">
        {/* Topbar — apenas desktop */}
        <div className="hidden lg:flex items-center justify-between bg-card border-b border-border px-6 py-2.5 shrink-0">
          {contextSwitcher && (
            <DesktopContextSwitcher context={contextSwitcher} />
          )}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                Operacional
              </span>
            </div>
            <div className="hidden items-center gap-4 2xl:flex">
              {NORMS.map((n) => (
                <span
                  key={n}
                  className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-wider"
                >
                  {n}
                </span>
              ))}
            </div>
            {user && (
              <UserMenu
                name={user.name ?? "Usuário"}
                email={user.email ?? ""}
                role={(user as { role?: string }).role ?? "viewer"}
              />
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
        <Toaster richColors position="top-right" closeButton />
      </main>
    </div>
  );
}
