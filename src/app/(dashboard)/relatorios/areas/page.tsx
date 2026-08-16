import { getManagementReportData } from "@/lib/management-reports";
import { typography } from "@/lib/design-system";
import { joinLimited, RankingDetailPage } from "../ranking-detail-page";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AreaRankingItem = {
  name: string;
  scaffolds: number;
  inspections: number;
  ncs: number;
  companies: string[];
  workspaces: string[];
};

type AreaRankingReport = {
  periodLabel: string;
  filters: Record<string, string>;
  rankings: { areas: AreaRankingItem[] };
};

function buildBackHref(filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  return `/relatorios?${params.toString()}`;
}

export default async function RankingAreasPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const report = (await getManagementReportData(params)) as AreaRankingReport;

  return (
    <RankingDetailPage
      title="Ranking de Áreas Operacionais"
      description="Áreas com maior volume operacional no período selecionado."
      periodLabel={report.periodLabel}
      backHref={buildBackHref(report.filters)}
      columns={[
        "Posição",
        "Área",
        "Andaimes",
        "Inspeções",
        "NCs",
        "Empresa",
        "Workspace",
      ]}
      rows={report.rankings.areas.map((item, index) => [
        <span
          key="position"
          className={`${typography.code} text-muted-foreground`}
        >
          {index + 1}.
        </span>,
        <span key="name" className={typography.bodyStrong}>
          {item.name}
        </span>,
        <span key="scaffolds" className={typography.code}>
          {item.scaffolds}
        </span>,
        <span key="inspections" className={typography.code}>
          {item.inspections}
        </span>,
        <span key="ncs" className={typography.code}>
          {item.ncs}
        </span>,
        <span key="companies" className="text-muted-foreground">
          {joinLimited(item.companies)}
        </span>,
        <span key="workspaces" className="text-muted-foreground">
          {joinLimited(item.workspaces)}
        </span>,
      ])}
    />
  );
}
