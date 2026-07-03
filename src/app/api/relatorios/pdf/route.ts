import { NextRequest } from "next/server";

import { generateManagementReportPdf } from "@/lib/generate-management-report-pdf";
import {
  getManagementReportData,
  resolveManagementReportFilterLabels,
} from "@/lib/management-reports";
import {
  checkRequestRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { sanitizeForLog } from "@/lib/safe-log";

export const runtime = "nodejs";

function searchParamsToRecord(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}

export async function GET(request: NextRequest) {
  try {
    const limit = checkRequestRateLimit(request, {
      key: "management-report-pdf",
      limit: 20,
      windowMs: 10 * 60 * 1_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

    const report = await getManagementReportData(
      searchParamsToRecord(request.nextUrl.searchParams),
    );
    const pdf = generateManagementReportPdf(
      report,
      resolveManagementReportFilterLabels(report),
    );

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="relatorio-gerencial-andcheck.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF gerencial", sanitizeForLog(error));
    return Response.json(
      { error: "Não foi possível gerar o PDF gerencial." },
      { status: 500 },
    );
  }
}
