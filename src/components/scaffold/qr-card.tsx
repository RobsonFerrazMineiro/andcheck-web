"use client";

import { useEffect, useRef, useState } from "react";

import { Download, Printer, QrCode } from "lucide-react";

export interface ScaffoldQRCardProps {
  scaffoldCode: string;
  tag: string;
  origin: string;
  title?: string;
  helperText?: string;
}

export function ScaffoldQRCard({
  scaffoldCode,
  tag,
  origin,
  title = "QR Code do Andaime",
  helperText = "Ao escanear, o inspetor ver? o status atual, validade, responsável e última inspeção do andaime.",
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
    <div className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <QrCode className="h-3.5 w-3.5 text-muted-foreground/60" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
          {title}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 px-6 py-5 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-accent" />
          <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-accent" />
          <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-accent" />
          <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-accent" />
          <div className="bg-white p-3">
            <canvas ref={canvasRef} className="block" />
          </div>
          <p className="mt-1.5 text-center font-mono text-[11px] font-bold tracking-widest text-accent">
            {scaffoldCode}
          </p>
        </div>

        <div className="w-full flex-1 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              URL publica de escaneamento
            </p>
            <div className="rounded-sm border border-border bg-muted/50 px-3 py-2">
              <p className="break-all font-mono text-[11px] text-foreground/70">
                {url}
              </p>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/60">
              {helperText}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={!dataUrl}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 border border-border px-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Download PNG
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 border border-border px-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-muted"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
