import { getManagementReportData } from "@/lib/management-reports";
import {
  formatApprovalRate,
  RankingDetailPage,
} from "../ranking-detail-page";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildBackHref(filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  return `/relatorios?${params.toString()}`;
}

export default async function RankingInspetoresPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const report = await getManagementReportData(params);

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
          className="font-mono text-[11px] font-bold text-muted-foreground"
        >
          {index + 1}.
        </span>,
        <span key="name" className="font-semibold">
          {item.name}
        </span>,
        <span key="inspections" className="font-mono font-semibold">
          {item.inspections}
        </span>,
        <span key="approved" className="font-mono font-semibold">
          {item.aprovadas}
        </span>,
        <span key="failed" className="font-mono font-semibold">
          {item.reprovadas}
        </span>,
        <span key="remarks" className="font-mono font-semibold">
          {item.ressalvas}
        </span>,
        <span key="approval" className="font-mono font-semibold">
          {formatApprovalRate(item.approvalRate)}
        </span>,
      ])}
    />
  );
}
