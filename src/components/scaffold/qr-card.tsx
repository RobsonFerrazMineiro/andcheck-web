"use client";

import { useEffect, useRef, useState } from "react";

import { Download, QrCode } from "lucide-react";

interface ScaffoldQRCardProps {
  scaffoldCode: string;
  tag: string;
  origin: string; // ex: "https://andcheck.com.br"
}

export function ScaffoldQRCard({
  scaffoldCode,
  tag,
  origin,
}: ScaffoldQRCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const url = `${origin}/qr/${tag}`;

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      if (cancelled) return;
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 200,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      QRCode.toDataURL(url, { width: 200, margin: 2 }).then((d) => {
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
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b-2 border-border">
        <QrCode className="w-3.5 h-3.5 text-muted-foreground/60" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground">
          Etiqueta QR
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 px-6 py-5">
        {/* QR Canvas */}
        <div className="p-3 bg-white shadow-md">
          <canvas ref={canvasRef} className="block" />
        </div>

        {/* Código */}
        <div className="text-center">
          <p className="text-[22px] font-black font-mono tracking-widest text-foreground">
            {scaffoldCode}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5 break-all">
            {url}
          </p>
        </div>

        {/* Ações */}
        <div className="flex gap-2 w-full">
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="flex-1 inline-flex items-center justify-center gap-2 h-8 px-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar PNG
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-2 h-8 px-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
