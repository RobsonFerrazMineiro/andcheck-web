"use client";

import { Button } from "@/components/ui/button";
import {
  MobileContextSwitcher,
  type ContextSwitcherData,
} from "@/components/layout/context-switcher";
import {
  NotificationBell,
  type BellNotification,
} from "@/components/notifications/notification-bell";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import {
  Building2,
  LogOut,
  MapPinned,
  Menu,
  Shield,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  adminNavigationItems,
  isVisibleOnDevice,
  mainNavigationItems,
} from "@/components/layout/navigation";

type MobileUserProfile = {
  name: string;
  email: string;
  roleLabel: string;
  companyName: string;
  workspaceName: string;
  sessionStatus: string;
};

export function MobileHeader({
  canManageUsers = false,
  canViewAudit = false,
  canViewNonConformities = false,
  canViewCompanies = false,
  canViewWorkspaces = false,
  canViewDocuments = false,
  context,
  notificationBell,
  userProfile,
}: {
  canManageUsers?: boolean;
  canViewAudit?: boolean;
  canViewNonConformities?: boolean;
  canViewCompanies?: boolean;
  canViewWorkspaces?: boolean;
  canViewDocuments?: boolean;
  context: ContextSwitcherData | null;
  notificationBell: {
    unreadCount: number;
    latest: BellNotification[];
  };
  userProfile: MobileUserProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-40 w-screen max-w-[100vw] overflow-x-hidden border-b border-sidebar-border bg-sidebar lg:hidden">
      <div className="flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden px-4 py-3">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-7 h-7 bg-sidebar-primary flex items-center justify-center shrink-0"
            style={{
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          >
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="hidden min-[520px]:block">
            <span className="font-bold text-[12px] tracking-widest uppercase text-sidebar-foreground">
              AndCheck
            </span>
          </div>
        </Link>

        {context && <MobileContextSwitcher context={context} />}

        <NotificationBell
          unreadCount={notificationBell.unreadCount}
          latest={notificationBell.latest}
          className="shrink-0"
          buttonClassName="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          panelClassName="right-2"
        />

        {userProfile && (
          <MobileUserMenu
            profile={userProfile}
            onNavigate={() => setOpen(false)}
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label={open ? "Fechar menu principal" : "Abrir menu principal"}
          aria-expanded={open}
          aria-controls="mobile-main-navigation"
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {open && (
        <nav
          id="mobile-main-navigation"
          className="px-2 pb-3 space-y-px border-t border-sidebar-border"
        >
          {[...mainNavigationItems, ...adminNavigationItems]
            .filter((item) => isVisibleOnDevice(item, "mobile"))
            .filter((item) => item.path !== "/usuarios" || canManageUsers)
            .filter((item) => item.path !== "/auditoria" || canViewAudit)
            .filter((item) => item.path !== "/empresas" || canViewCompanies)
            .filter((item) => item.path !== "/workspaces" || canViewWorkspaces)
            .filter(
              (item) =>
                item.path !== "/nao-conformidades" || canViewNonConformities,
            )
            .filter((item) => item.path !== "/acervo" || canViewDocuments)
            .map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${
                isActive(item.path)
                  ? "bg-sidebar-primary text-white"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

function MobileUserMenu({
  profile,
  onNavigate,
}: {
  profile: MobileUserProfile;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useDialogFocus(panelRef, open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        aria-label={open ? "Fechar perfil do usuário" : "Abrir perfil do usuário"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="mobile-user-menu-panel"
      >
        <User className="h-4 w-4" />
      </Button>

      {open && (
        <div
          ref={panelRef}
          id="mobile-user-menu-panel"
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby="mobile-user-menu-title"
          className="fixed right-2 top-14 z-50 w-[min(20rem,calc(100vw-1rem))] border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="border-b bg-muted/25 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <User className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p
                  id="mobile-user-menu-title"
                  className="truncate text-sm font-bold"
                >
                  {profile.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {profile.email}
                </p>
                <span className="mt-2 inline-flex rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  {profile.roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <MobileProfileRow
              icon={Building2}
              label="Empresa"
              value={profile.companyName}
            />
            <MobileProfileRow
              icon={MapPinned}
              label="Workspace atual"
              value={profile.workspaceName}
            />
            <MobileProfileRow
              icon={ShieldCheck}
              label="Sessão"
              value={profile.sessionStatus}
              status
            />
          </div>

          <div className="border-t p-2">
            <Link
              href="/perfil"
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <User className="size-3.5" />
              Meu Perfil
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sair do sistema
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileProfileRow({
  icon: Icon,
  label,
  value,
  status = false,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  status?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xs font-semibold">
          {status && (
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" />
          )}
          {value}
        </p>
      </div>
    </div>
  );
}

