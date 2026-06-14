"use client";

import {
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Construction,
  FileClock,
  LayoutDashboard,
  Map,
  Shield,
  Building2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    path: "/dashboard",
    label: "Painel Operacional",
    icon: LayoutDashboard,
    desc: "Visão geral e KPIs",
  },
  {
    path: "/andaimes",
    label: "Andaimes",
    icon: Construction,
    desc: "Registro de ativos",
  },
  {
    path: "/inspecoes",
    label: "Inspeções",
    icon: ClipboardCheck,
    desc: "Histórico técnico",
  },
  {
    path: "/nao-conformidades",
    label: "Nao Conformidades",
    icon: ClipboardList,
    desc: "Controle de tratativas",
  },
  {
    path: "/mapa",
    label: "Mapa Operacional",
    icon: Map,
    desc: "Localização de ativos",
  },
  {
    path: "/usuarios",
    label: "Usuarios",
    icon: Users,
    desc: "Acessos e perfis",
  },
  {
    path: "/auditoria",
    label: "Auditoria",
    icon: FileClock,
    desc: "Logs e rastreabilidade",
  },
];

const adminItems = [
  {
    path: "/empresas",
    label: "Empresas",
    icon: Building2,
    desc: "Cadastro corporativo",
  },
];

const NORMS = ["NR-18", "NR-35", "NBR 6494", "ISO 45001", "ISO 9001"];

export function Sidebar({
  canManageUsers = false,
  canViewAudit = false,
  canViewNonConformities = false,
  canViewCompanies = false,
}: {
  canManageUsers?: boolean;
  canViewAudit?: boolean;
  canViewNonConformities?: boolean;
  canViewCompanies?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-sidebar fixed h-full z-30 border-r border-sidebar-border">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className="w-8 h-8 bg-sidebar-primary flex items-center justify-center shrink-0"
            style={{
              clipPath:
                "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          >
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-widest uppercase text-sidebar-foreground leading-none">
              AndCheck
            </p>
            <p className="text-[9px] text-sidebar-foreground/40 tracking-widest uppercase mt-0.5">
              Sistema EHS · SST
            </p>
          </div>
        </Link>
      </div>

      {/* Environment strip */}
      <div className="px-4 py-2 bg-sidebar-accent/60 border-b border-sidebar-border/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <p className="text-[9px] font-semibold tracking-widest uppercase text-sidebar-foreground/50">
            Ambiente Produção
          </p>
        </div>
      </div>

      {/* Section label */}
      <div className="px-3 pt-4 pb-1">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-sidebar-foreground/25 px-2 mb-2">
          Módulos do Sistema
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-px">
        {navItems
          .filter((item) => item.path !== "/usuarios" || canManageUsers)
          .filter((item) => item.path !== "/auditoria" || canViewAudit)
          .filter(
            (item) =>
              item.path !== "/nao-conformidades" || canViewNonConformities,
          )
          .map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 text-sm font-medium transition-all group relative ${
                active
                  ? "bg-sidebar-primary/90 text-white"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sidebar-primary" />
              )}
              <item.icon className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-tight">
                  {item.label}
                </p>
                <p
                  className={`text-[9px] leading-tight tracking-wide ${
                    active ? "text-white/50" : "text-sidebar-foreground/30"
                  }`}
                >
                  {item.desc}
                </p>
              </div>
              {active && (
                <ChevronRight className="w-3 h-3 text-white/40 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {canViewCompanies && (
        <div className="px-2 pb-4">
          <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-widest text-sidebar-foreground/25">
            Administracao
          </p>
          {adminItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`relative flex items-center gap-2.5 px-2.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-sidebar-primary/90 text-white"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                {active && <div className="absolute inset-y-0 left-0 w-0.5 bg-sidebar-primary" />}
                <item.icon className="size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold leading-tight">{item.label}</p>
                  <p className={`text-[9px] leading-tight tracking-wide ${active ? "text-white/50" : "text-sidebar-foreground/30"}`}>
                    {item.desc}
                  </p>
                </div>
                {active && <ChevronRight className="size-3 shrink-0 text-white/40" />}
              </Link>
            );
          })}
        </div>
      )}

      {/* Normas referenciadas */}
      <div className="mx-3 mb-3 border border-sidebar-border/40 bg-sidebar-accent/30 p-3">
        <p className="text-[8px] font-bold uppercase tracking-widest text-sidebar-foreground/25 mb-2">
          Referências Normativas
        </p>
        <div className="flex flex-wrap gap-1">
          {NORMS.map((n) => (
            <span
              key={n}
              className="text-[8px] px-1.5 py-0.5 bg-sidebar-accent/80 text-sidebar-foreground/45 font-mono border border-sidebar-border/30"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
        <p className="text-[8px] text-sidebar-foreground/20 mt-2 text-center tracking-wider">
          AndCheck v1.0 · Documento Controlado
        </p>
      </div>
    </aside>
  );
}
