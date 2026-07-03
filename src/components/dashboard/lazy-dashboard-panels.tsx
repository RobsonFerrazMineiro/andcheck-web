"use client";

import dynamic from "next/dynamic";
import { Activity, MapPin } from "lucide-react";
import type { ComponentType } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import type { DashboardMapPreviewProps } from "@/components/dashboard/dashboard-map-preview";
import type { InspectionPerformanceChartProps } from "@/components/dashboard/inspection-performance-chart";

export const LazyInspectionPerformanceChart = dynamic(
  () =>
    import("@/components/dashboard/inspection-performance-chart").then(
      (module) => module.InspectionPerformanceChart,
    ),
  {
    ssr: false,
    loading: () => (
      <EmptyState
        icon={Activity}
        title="Carregando desempenho de inspeções"
        description="O gráfico será exibido assim que os dados forem preparados."
        className="h-full min-h-96 border-dashed"
      />
    ),
  },
) as ComponentType<InspectionPerformanceChartProps>;

export const LazyDashboardMapPreview = dynamic(
  () =>
    import("@/components/dashboard/dashboard-map-preview").then(
      (module) => module.DashboardMapPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <EmptyState
        icon={MapPin}
        title="Carregando mapa operacional"
        description="O preview será exibido assim que o mapa for preparado."
        className="h-full min-h-96 border-dashed"
      />
    ),
  },
) as ComponentType<DashboardMapPreviewProps>;
