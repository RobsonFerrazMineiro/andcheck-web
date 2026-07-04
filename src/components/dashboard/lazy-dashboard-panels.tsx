"use client";

import dynamic from "next/dynamic";
import { Activity, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import type { DashboardMapPreviewProps } from "@/components/dashboard/dashboard-map-preview";
import type { InspectionPerformanceChartProps } from "@/components/dashboard/inspection-performance-chart";

const InspectionPerformanceChartDynamic = dynamic(
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
);

const DashboardMapPreviewDynamic = dynamic(
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
);

function useNearViewport() {
  const ref = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    if (nearViewport) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [nearViewport]);

  return { ref, nearViewport };
}

export function LazyInspectionPerformanceChart(
  props: InspectionPerformanceChartProps,
) {
  const { ref, nearViewport } = useNearViewport();

  if (!nearViewport) {
    return (
      <div ref={ref}>
        <EmptyState
          icon={Activity}
          title="Carregando desempenho de inspecoes"
          description="O grafico sera exibido assim que entrar na area de visualizacao."
          className="h-full min-h-96 border-dashed"
        />
      </div>
    );
  }

  return <InspectionPerformanceChartDynamic {...props} />;
}

export function LazyDashboardMapPreview(props: DashboardMapPreviewProps) {
  const { ref, nearViewport } = useNearViewport();

  if (!nearViewport) {
    return (
      <div ref={ref}>
        <EmptyState
          icon={MapPin}
          title="Carregando mapa operacional"
          description="O preview sera exibido assim que entrar na area de visualizacao."
          className="h-full min-h-96 border-dashed"
        />
      </div>
    );
  }

  return <DashboardMapPreviewDynamic {...props} />;
}
