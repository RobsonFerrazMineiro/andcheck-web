import { auth } from "@/auth";
import { AuthenticatedCompanyBrand } from "@/components/layout/authenticated-company-brand";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { DesktopContextSwitcher } from "@/components/layout/context-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  canCurrentUser,
  getCurrentUserAccess,
  requireAnyPermission,
} from "@/lib/authz";
import { getNotificationBellData } from "@/lib/actions/notification-actions";
import { getContextSwitcherData } from "@/lib/context-switcher";
import { prisma } from "@/lib/prisma";
import { Activity } from "lucide-react";
import { Toaster } from "sonner";

const NORMS = ["NR-18", "NR-35", "NBR 6494"];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HSE_HYDRO: "HSE Hydro",
  HSE_GERENCIADORA: "HSE Gerenciadora",
  ADMIN_EMPRESA: "Admin Empresa",
  HSE_EMPRESA: "HSE Empresa",
  PLANEJAMENTO: "Planejamento",
  SUPERVISOR: "Supervisor",
  ENCARREGADO: "Encarregado",
  SUPERVISOR_ENCARREGADO: "Supervisor/Encarregado",
  MONTADOR_LIDER: "Montador Líder",
  AUDITOR: "Auditor",
};

const ROLE_PRIORITY = Object.keys(ROLE_LABELS);

function getRoleLabel(roleCodes: string[], legacyRole?: string) {
  const primaryRole = ROLE_PRIORITY.find((roleCode: string) =>
    roleCodes.includes(roleCode),
  );
  if (primaryRole) return ROLE_LABELS[primaryRole];
  if (roleCodes[0]) return roleCodes[0];
  if (legacyRole === "admin") return "Admin";
  if (legacyRole === "inspector") return "Inspetor";
  return "Viewer";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  await requireAnyPermission(["read.all", "read.own_company"]);
  const access = await getCurrentUserAccess();

  const [
    authenticatedCompany,
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
    canViewDocuments,
    canCreateDocuments,
    canUpdateDocuments,
    canArchiveDocuments,
    notificationBell,
  ] = await Promise.all([
    access?.companyId
      ? prisma.company.findUnique({
          where: { id: access.companyId },
          select: { name: true, logoUrl: true },
        })
      : null,
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
    canCurrentUser("documents.view"),
    canCurrentUser("documents.create"),
    canCurrentUser("documents.update"),
    canCurrentUser("documents.archive"),
    getNotificationBellData(),
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
  const canAccessDocuments =
    canViewDocuments ||
    canCreateDocuments ||
    canUpdateDocuments ||
    canArchiveDocuments;
  const userRoleLabel = getRoleLabel(
    access?.roleCodes ?? [],
    (user as { role?: string } | undefined)?.role,
  );
  const activeWorkspaceName =
    contextSwitcher?.workspaces.find(
      (workspace) => workspace.id === contextSwitcher.selectedWorkspaceId,
    )?.name ?? "NÃ£o informado";

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-background">
      <Sidebar
        canManageUsers={canManageUsers}
        canViewAudit={canViewAudit}
        canViewNonConformities={canAccessNonConformities}
        canViewCompanies={canViewCompanies || canManagePermissions}
        canViewWorkspaces={canViewWorkspaces || canManagePermissions}
        canViewDocuments={canAccessDocuments}
      />
      <MobileHeader
        canManageUsers={canManageUsers}
        canViewAudit={canViewAudit}
        canViewNonConformities={canAccessNonConformities}
        canViewCompanies={canViewCompanies || canManagePermissions}
        canViewWorkspaces={canViewWorkspaces || canManagePermissions}
        canViewDocuments={canAccessDocuments}
        context={contextSwitcher}
        userProfile={
          user
            ? {
                name: user.name ?? "UsuÃ¡rio",
                email: user.email ?? "",
                roleLabel: userRoleLabel,
                companyName: authenticatedCompany?.name ?? "AndCheck",
                workspaceName: activeWorkspaceName,
                sessionStatus: "Ativa",
              }
            : null
        }
      />

      <main className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden pt-14 lg:ml-56 lg:pt-0">
        {/* Topbar — apenas desktop */}
        <div className="hidden lg:flex items-center justify-between bg-card border-b border-border px-6 py-2.5 shrink-0">
          <div
            className={`flex min-w-0 items-center ${contextSwitcher?.canSwitchCompany ? "gap-4" : "gap-2"}`}
          >
            <AuthenticatedCompanyBrand
              company={authenticatedCompany}
              divided={Boolean(contextSwitcher)}
            />
            {contextSwitcher && (
              <DesktopContextSwitcher context={contextSwitcher} />
            )}
          </div>
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
            <NotificationBell
              unreadCount={notificationBell.unreadCount}
              latest={notificationBell.latest}
            />
            {user && (
              <UserMenu
                name={user.name ?? "Usuário"}
                email={user.email ?? ""}
                roleLabel={userRoleLabel}
                companyName={authenticatedCompany?.name ?? "AndCheck"}
                workspaceName={
                  contextSwitcher?.workspaces.find(
                    (workspace) =>
                      workspace.id === contextSwitcher.selectedWorkspaceId,
                  )?.name ?? "Não informado"
                }
                sessionStatus="Ativa"
              />
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-hidden p-4 md:p-6">
          {children}
        </div>
        <Toaster richColors position="top-right" closeButton />
      </main>
    </div>
  );
}
