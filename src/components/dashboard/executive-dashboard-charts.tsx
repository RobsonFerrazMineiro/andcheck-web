"use client";

import { Activity } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import type { ExecutiveDashboardData } from "@/lib/executive-dashboard";
import {
  scaffoldStatusTone,
  SEMANTIC_TONE_HEX,
} from "@/lib/semantic-tones";

const STATUS_COLORS: Record<string, string> = {
  liberado: SEMANTIC_TONE_HEX[scaffoldStatusTone("liberado")],
  em_montagem: SEMANTIC_TONE_HEX[scaffoldStatusTone("em_montagem")],
  pendente_liberacao:
    SEMANTIC_TONE_HEX[scaffoldStatusTone("pendente_liberacao")],
  interditado: SEMANTIC_TONE_HEX[scaffoldStatusTone("interditado")],
  vencido: SEMANTIC_TONE_HEX[scaffoldStatusTone("vencido")],
  desmontado: SEMANTIC_TONE_HEX[scaffoldStatusTone("desmontado")],
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
};

export function EmptyChart({
  label = "Sem dados para o período filtrado.",
}: {
  label?: string;
}) {
  return (
    <EmptyState
      icon={Activity}
      title={label}
      description="Ajuste os filtros ou aguarde novos registros operacionais para compor este indicador."
      className="flex h-full min-h-44 flex-col justify-center border-dashed shadow-none"
    />
  );
}

export function OperationalSeriesChart({
  data,
}: {
  data: ExecutiveDashboardData["series"];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar
          dataKey="inspections"
          name="Inspeções"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="nonConformities"
          name="NCs"
          fill="#d97706"
          radius={[4, 4, 0, 0]}
        />
        <Line
          type="monotone"
          dataKey="released"
          name="Liberados"
          stroke="#16a34a"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="interdictions"
          name="Interdições"
          stroke="#dc2626"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="criticalNotifications"
          name="Notif. críticas"
          fill="#7f1d1d"
          stroke="#7f1d1d"
          fillOpacity={0.18}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function StatusDistributionChart({
  data,
}: {
  data: ExecutiveDashboardData["statusDistribution"];
}) {
  return (
    <ResponsiveContainer width="100%" height={176}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="label"
          innerRadius={42}
          outerRadius={72}
          paddingAngle={2}
        >
          {data.map((item) => (
            <Cell
              key={item.status}
              fill={STATUS_COLORS[item.status] ?? "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function InspectorProductivityChart({
  data,
}: {
  data: ExecutiveDashboardData["productivity"]["byInspector"];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="var(--border)"
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="total"
          name="Inspeções"
          fill="#2563eb"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { STATUS_COLORS };
