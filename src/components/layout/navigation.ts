import {
  Archive,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Construction,
  FileClock,
  LayoutDashboard,
  Map,
  MapPinned,
  RefreshCw,
  Users,
  type LucideIcon,
} from "lucide-react";

export type DeviceVisibility = {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
};

export type NavigationItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  desc?: string;
  deviceVisibility?: DeviceVisibility;
};

const DEFAULT_DEVICE_VISIBILITY: DeviceVisibility = {
  desktop: true,
  tablet: true,
  mobile: true,
};

const DESKTOP_ONLY: DeviceVisibility = {
  desktop: true,
  tablet: true,
  mobile: false,
};

export const mainNavigationItems: NavigationItem[] = [
  {
    path: "/dashboard",
    label: "Painel Operacional",
    icon: LayoutDashboard,
    desc: "Visão geral e KPIs",
  },
  {
    path: "/dashboard-gerencial",
    label: "Dashboard Executivo",
    icon: BriefcaseBusiness,
    desc: "Indicadores estratégicos e BI",
    deviceVisibility: DESKTOP_ONLY,
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
    label: "Não Conformidades",
    icon: ClipboardList,
    desc: "Controle de tratativas",
  },
  {
    path: "/acervo",
    label: "Acervo de Andaimes",
    icon: Archive,
    desc: "Histórico operacional",
  },
  {
    path: "/mapa",
    label: "Mapa Operacional",
    icon: Map,
    desc: "Localização de ativos",
  },
  {
    path: "/sincronizacao",
    label: "Sincronização",
    icon: RefreshCw,
    desc: "Fila offline",
  },
  {
    path: "/usuarios",
    label: "Usuários",
    icon: Users,
    desc: "Acessos e perfis",
    deviceVisibility: DESKTOP_ONLY,
  },
  {
    path: "/auditoria",
    label: "Auditoria",
    icon: FileClock,
    desc: "Logs e rastreabilidade",
    deviceVisibility: DESKTOP_ONLY,
  },
  {
    path: "/relatorios",
    label: "Relatórios Gerenciais",
    icon: BarChart3,
    desc: "Indicadores e exportações",
    deviceVisibility: DESKTOP_ONLY,
  },
];

export const adminNavigationItems: NavigationItem[] = [
  {
    path: "/empresas",
    label: "Empresas",
    icon: Building2,
    desc: "Cadastro corporativo",
    deviceVisibility: DESKTOP_ONLY,
  },
  {
    path: "/workspaces",
    label: "Workspaces",
    icon: MapPinned,
    desc: "Plantas operacionais",
    deviceVisibility: DESKTOP_ONLY,
  },
];

export function isVisibleOnDevice(
  item: NavigationItem,
  device: keyof DeviceVisibility,
) {
  return (item.deviceVisibility ?? DEFAULT_DEVICE_VISIBILITY)[device];
}
