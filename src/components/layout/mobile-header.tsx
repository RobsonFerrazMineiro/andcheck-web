"use client";

import { Button } from "@/components/ui/button";
import {
  MobileContextSwitcher,
  type ContextSwitcherData,
} from "@/components/layout/context-switcher";
import {
  Archive,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  ClipboardList,
  Construction,
  FileClock,
  LayoutDashboard,
  Map,
  MapPinned,
  Menu,
  Shield,
  User,
  Users,
  Building2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "Painel Operacional", icon: LayoutDashboard },
  { path: "/dashboard-gerencial", label: "Dashboard Executivo", icon: BriefcaseBusiness },
  { path: "/andaimes", label: "Andaimes", icon: Construction },
  { path: "/inspecoes", label: "Inspeções", icon: ClipboardCheck },
  { path: "/nao-conformidades", label: "Não Conformidades", icon: ClipboardList },
  { path: "/acervo", label: "Acervo de Andaimes", icon: Archive },
  { path: "/mapa", label: "Mapa Operacional", icon: Map },
  { path: "/usuarios", label: "Usuários", icon: Users },
  { path: "/auditoria", label: "Auditoria", icon: FileClock },
  { path: "/relatorios", label: "Relatórios Gerenciais", icon: BarChart3 },
  { path: "/empresas", label: "Empresas", icon: Building2 },
  { path: "/workspaces", label: "Workspaces", icon: MapPinned },
  { path: "/perfil", label: "Meu Perfil", icon: User },
];

export function MobileHeader({
  canManageUsers = false,
  canViewAudit = false,
  canViewNonConformities = false,
  canViewCompanies = false,
  canViewWorkspaces = false,
  canViewDocuments = false,
  context,
}: {
  canManageUsers?: boolean;
  canViewAudit?: boolean;
  canViewNonConformities?: boolean;
  canViewCompanies?: boolean;
  canViewWorkspaces?: boolean;
  canViewDocuments?: boolean;
  context: ContextSwitcherData | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-40 w-screen max-w-[100vw] overflow-hidden border-b border-sidebar-border bg-sidebar lg:hidden">
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

        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            aria-label="Abrir meu perfil"
          >
            <User className="h-4 w-4" />
          </Link>
        </Button>

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
          {navItems
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
