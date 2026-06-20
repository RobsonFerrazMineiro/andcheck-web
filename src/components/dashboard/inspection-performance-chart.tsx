"use client";

import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { surface, typography } from "@/lib/design-system";

interface Inspection {
  date: Date;
  result: string;
}

interface Props {
  inspections: Inspection[];
}

export function InspectionPerformanceChart({ inspections }: Props) {
  const chartData = useMemo(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        label: format(date, "dd/MM", { locale: ptBR }),
        dateKey: format(date, "yyyy-MM-dd"),
        aprovados: 0,
        reprovados: 0,
      };
    });

    inspections.forEach((insp) => {
      const key = format(insp.date, "yyyy-MM-dd");
      const day = last7.find((d) => d.dateKey === key);
      if (!day) return;
      if (
        insp.result === "aprovado" ||
        insp.result === "aprovado_com_ressalvas"
      ) {
        day.aprovados++;
      } else if (insp.result === "reprovado") {
        day.reprovados++;
      }
    });

    return last7;
  }, [inspections]);

  const total = chartData.reduce(
    (acc, d) => acc + d.aprovados + d.reprovados,
    0,
  );

  return (
    <div className="bg-card border border-border shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between ${surface.panelHeader}`}>
        <div className="flex items-center gap-2">
          <Activity className={surface.panelHeaderIcon} />
          <span className={surface.panelHeaderTitle}>
            Desempenho de Inspeções
          </span>
          <span className={`hidden sm:inline ${surface.panelHeaderSubtitle}`}>
            · Últimos 7 dias
          </span>
        </div>
        <span className={`${typography.codeMuted} text-slate-400`}>
          {total} total
        </span>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 px-4 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
          <span className={`${typography.metaStrong} text-muted-foreground`}>
            Aprovados
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className={`${typography.metaStrong} text-muted-foreground`}>
            Reprovados
          </span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="flex-1 px-2 pb-3 pt-2 min-h-50">
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={chartData} barGap={3} barCategoryGap="30%">
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
              opacity={0.6}
            />
            <XAxis
              dataKey="label"
              tick={{
                fontSize: 10,
                fill: "var(--muted-foreground)",
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                fontSize: "11px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              labelStyle={{
                fontWeight: 700,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            />
            <Bar
              dataKey="aprovados"
              name="Aprovados"
              fill="#22c55e"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="reprovados"
              name="Reprovados"
              fill="#ef4444"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
