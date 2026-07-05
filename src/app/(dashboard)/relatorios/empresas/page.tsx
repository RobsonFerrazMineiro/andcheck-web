import { getManagementReportData } from "@/lib/management-reports";
import {
  formatApprovalRate,
  RankingDetailPage,
} from "../ranking-detail-page";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type CompanyRankingItem = {
  name: string;
  scaffolds: number;
  inspections: number;
  ncs: number;
  approvalRate: number;
};

type CompanyRankingReport = {
  periodLabel: string;
  filters: Record<string, string>;
  rankings: { companies: CompanyRankingItem[] };
};

function buildBackHref(filters: Record<string, string>) {
  const params = new URLSearchParams(filters);
  return `/relatorios?${params.toString()}`;
}

export default async function RankingEmpresasPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const report = (await getManagementReportData(params)) as CompanyRankingReport;

  return (
    <RankingDetailPage
      title="Ranking de Empresas"
      description="Comparativo completo de volume operacional por empresa."
      periodLabel={report.periodLabel}
      backHref={buildBackHref(report.filters)}
      columns={[
        "Posição",
        "Empresa",
        "Andaimes",
        "Inspeções",
        "NCs",
        "Taxa de Aprovação",
      ]}
      rows={report.rankings.companies.map((item, index) => [
        <span
          key="position"
          className="font-mono text-[11px] font-bold text-muted-foreground"
        >
          {index + 1}.
        </span>,
        <span key="name" className="font-semibold">
          {item.name}
        </span>,
        <span key="scaffolds" className="font-mono font-semibold">
          {item.scaffolds}
        </span>,
        <span key="inspections" className="font-mono font-semibold">
          {item.inspections}
        </span>,
        <span key="ncs" className="font-mono font-semibold">
          {item.ncs}
        </span>,
        <span key="approval" className="font-mono font-semibold">
          {formatApprovalRate(item.approvalRate)}
        </span>,
      ])}
    />
  );
}
