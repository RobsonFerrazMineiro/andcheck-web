import { getManagementReportData } from "@/lib/management-reports";
import { typography } from "@/lib/design-system";
import {
  formatApprovalRate,
  RankingDetailPage,
} from "../ranking-detail-page";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InspectorRankingItem = {
  name: string;
  inspections: number;
  aprovadas: number;
  reprovadas: number;
  ressalvas: number;
  approvalRate: number;
};

type InspectorRankingReport = {
  periodLabel: string;
  filters: Record<string, string>;
  rankings: { inspectors: InspectorRankingItem[] };
};

function buildBackHref(filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  return `/relatorios?${params.toString()}`;
}

export default async function RankingInspetoresPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const report =
    (await getManagementReportData(params)) as InspectorRankingReport;

  return (
    <RankingDetailPage
      title="Ranking de Inspetores"
      description="Produtividade e resultados por inspetor no período selecionado."
      periodLabel={report.periodLabel}
      backHref={buildBackHref(report.filters)}
      columns={[
        "Posição",
        "Inspetor",
        "Inspeções",
        "Aprovações",
        "Reprovações",
        "Com Ressalvas",
        "Taxa de Aprovação",
      ]}
      rows={report.rankings.inspectors.map((item, index) => [
        <span
          key="position"
          className={`${typography.code} text-muted-foreground`}
        >
          {index + 1}.
        </span>,
        <span key="name" className={typography.bodyStrong}>
          {item.name}
        </span>,
        <span key="inspections" className={typography.code}>
          {item.inspections}
        </span>,
        <span key="approved" className={typography.code}>
          {item.aprovadas}
        </span>,
        <span key="failed" className={typography.code}>
          {item.reprovadas}
        </span>,
        <span key="remarks" className={typography.code}>
          {item.ressalvas}
        </span>,
        <span key="approval" className={typography.code}>
          {formatApprovalRate(item.approvalRate)}
        </span>,
      ])}
    />
  );
}
