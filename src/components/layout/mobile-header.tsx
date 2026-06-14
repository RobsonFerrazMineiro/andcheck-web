"use client";

import { Button } from "@/components/ui/button";
import {
  MobileContextSwitcher,
  type ContextSwitcherData,
} from "@/components/layout/context-switcher";
import {
  ClipboardCheck,
  ClipboardList,
  Construction,
  FileClock,
  LayoutDashboard,
  Map,
  MapPinned,
  Menu,
  Shield,
  Users,
  Building2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "Painel Operacional", icon: LayoutDashboard },
  { path: "/andaimes", label: "Andaimes", icon: Construction },
  { path: "/inspecoes", label: "Inspeções", icon: ClipboardCheck },
  { path: "/nao-conformidades", label: "Nao Conformidades", icon: ClipboardList },
  { path: "/mapa", label: "Mapa Operacional", icon: Map },
  { path: "/usuarios", label: "Usuarios", icon: Users },
  { path: "/auditoria", label: "Auditoria", icon: FileClock },
  { path: "/empresas", label: "Empresas", icon: Building2 },
  { path: "/workspaces", label: "Workspaces", icon: MapPinned },
];

export function MobileHeader({
  canManageUsers = false,
  canViewAudit = false,
  canViewNonConformities = false,
  canViewCompanies = false,
  canViewWorkspaces = false,
  context,
}: {
  canManageUsers?: boolean;
  canViewAudit?: boolean;
  canViewNonConformities?: boolean;
  canViewCompanies?: boolean;
  canViewWorkspaces?: boolean;
  context: ContextSwitcherData | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
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
          <div>
            <span className="font-bold text-[12px] tracking-widest uppercase text-sidebar-foreground">
              AndCheck
            </span>
            <span className="text-[9px] text-sidebar-foreground/35 ml-1.5 tracking-wider uppercase">
              SST
            </span>
          </div>
        </Link>

        {context && <MobileContextSwitcher context={context} />}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="text-sidebar-foreground w-8 h-8 hover:bg-sidebar-accent"
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {open && (
        <nav className="px-2 pb-3 space-y-px border-t border-sidebar-border">
          {navItems
            .filter((item) => item.path !== "/usuarios" || canManageUsers)
            .filter((item) => item.path !== "/auditoria" || canViewAudit)
            .filter((item) => item.path !== "/empresas" || canViewCompanies)
            .filter((item) => item.path !== "/workspaces" || canViewWorkspaces)
            .filter(
              (item) =>
                item.path !== "/nao-conformidades" || canViewNonConformities,
            )
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
