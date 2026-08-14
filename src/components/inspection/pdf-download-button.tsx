"use client";

import { logInspectionPdfGenerated } from "@/lib/actions/audit-actions";
import { Button } from "@/components/ui/button";
import type { InspectionForPDF } from "@/lib/generate-inspection-pdf";
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
    <Button
      type="button"
      variant="ghost"
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {loading ? "Gerando..." : "Exportar PDF"}
    </Button>
  );
}
