"use client";

import { logInspectionPdfGenerated } from "@/lib/actions/audit-actions";
import type { InspectionForPDF } from "@/lib/generate-inspection-pdf";
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface PdfDownloadButtonProps {
  inspection: InspectionForPDF;
  className?: string;
}

export function PdfDownloadButton({ inspection, className }: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { generateInspectionPDF } =
        await import("@/lib/generate-inspection-pdf");
      const doc = await generateInspectionPDF(
        inspection,
        window.location.origin,
      );
      const dateStr = new Date(inspection.date)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");
      doc.save(`${inspection.scaffold_code}-${dateStr}.pdf`);
      try {
        await logInspectionPdfGenerated(inspection.id);
      } catch {
        // A geração do PDF não deve falhar por indisponibilidade do log.
      }
    } catch {
      alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 disabled:opacity-60",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {loading ? "Gerando..." : "Exportar PDF"}
    </button>
  );
}
