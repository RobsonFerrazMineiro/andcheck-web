"use client";

import { useEffect, useRef, useState } from "react";

import { Download, Printer, QrCode } from "lucide-react";

interface ScaffoldQRCardProps {
  scaffoldCode: string;
  tag: string;
  origin: string;
  title?: string;
}

export function ScaffoldQRCard({
  scaffoldCode,
  tag,
  origin,
  title = "QR Code do Andaime",
}: ScaffoldQRCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const url = `${origin}/qr/${tag}`;

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      if (cancelled) return;
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 220,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      QRCode.toDataURL(url, { width: 220, margin: 2 }).then((d) => {
        if (!cancelled) setDataUrl(d);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-${scaffoldCode}.png`;
    a.click();
  };

  return (
    <div className="bg-card border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <QrCode className="w-3.5 h-3.5 text-muted-foreground/60" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
          {title}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 px-6 py-5">
        {/* QR com cantos decorativos laranja */}
        <div className="relative shrink-0">
          {/* cantos */}
          <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent" />
          <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent" />
          <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent" />
          <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent" />
          <div className="p-3 bg-white">
            <canvas ref={canvasRef} className="block" />
          </div>
          {/* código abaixo do QR */}
          <p className="text-center text-[11px] font-bold font-mono text-accent tracking-widest mt-1.5">
            {scaffoldCode}
          </p>
        </div>

        {/* Info + botões */}
        <div className="flex-1 space-y-4 w-full">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              URL pública de escaneamento
            </p>
            <div className="bg-muted/50 border border-border px-3 py-2 rounded-sm">
              <p className="text-[11px] font-mono text-foreground/70 break-all">
                {url}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Ao escanear, o inspetor verá o status atual, validade, responsável
              e última inspeção do andaime.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={!dataUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
