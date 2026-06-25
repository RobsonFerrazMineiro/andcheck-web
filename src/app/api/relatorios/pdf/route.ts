import { NextRequest } from "next/server";

import { generateManagementReportPdf } from "@/lib/generate-management-report-pdf";
import { getManagementReportData } from "@/lib/management-reports";

export const runtime = "nodejs";

function searchParamsToRecord(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}

function resolveFilterLabels(report: Awaited<ReturnType<typeof getManagementReportData>>) {
  const company =
    report.filters.companyId === "all"
      ? "Todas as empresas"
      : report.options.companies.find((item) => item.id === report.filters.companyId)
          ?.name ?? "Empresa selecionada";
  const workspace =
    report.filters.workspaceId === "all"
      ? "Todos os workspaces"
      : report.options.workspaces.find(
          (item) => item.id === report.filters.workspaceId,
        )?.name ?? "Workspace selecionado";
  const area = report.filters.area === "all" ? "Todas as areas" : report.filters.area;

  return { company, workspace, area };
}

export async function GET(request: NextRequest) {
  try {
    const report = await getManagementReportData(
      searchParamsToRecord(request.nextUrl.searchParams),
    );
    const pdf = generateManagementReportPdf(report, resolveFilterLabels(report));

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="relatorio-gerencial-andcheck.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF gerencial", error);
    return Response.json(
      { error: "Não foi possível gerar o PDF gerencial." },
      { status: 500 },
    );
  }
}
