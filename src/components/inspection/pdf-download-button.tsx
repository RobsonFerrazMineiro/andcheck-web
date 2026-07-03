"use client";

import { logInspectionPdfGenerated } from "@/lib/actions/audit-actions";
import type { InspectionForPDF } from "@/lib/generate-inspection-pdf";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface PdfDownloadButtonProps {
  inspection: InspectionForPDF;
}

export function PdfDownloadButton({ inspection }: PdfDownloadButtonProps) {
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
      className="flex items-center gap-1.5 h-8 px-4 bg-accent text-accent-foreground
                 text-[10px] font-bold uppercase tracking-widest hover:bg-accent/90
                 disabled:opacity-60 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {loading ? "Gerando..." : "Exportar PDF"}
    </button>
  );
}
