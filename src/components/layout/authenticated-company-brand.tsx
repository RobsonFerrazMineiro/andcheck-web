"use client";

import { getUploadedFilePreviewUrl } from "@/lib/upload-file";
import { Shield } from "lucide-react";
import { useState } from "react";

type AuthenticatedCompanyBrandProps = {
  company: {
    name: string;
    logoUrl: string | null;
  } | null;
  divided?: boolean;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AuthenticatedCompanyBrand({
  company,
  divided = true,
}: AuthenticatedCompanyBrandProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const logoUrl = company?.logoUrl ?? null;
  const logoAvailable = logoUrl && failedLogoUrl !== logoUrl;
  const previewUrl = logoUrl ? getUploadedFilePreviewUrl(logoUrl) : null;

  return (
    <div
      className={`flex shrink-0 items-center gap-2.5 ${divided ? "border-r border-border pr-4" : ""}`}
    >
      {logoAvailable ? (
        // URLs de logo sao administradas por empresa e podem usar dominios distintos.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl ?? logoUrl}
          alt={`Logo ${company?.name ?? "empresa"}`}
          className="h-8 w-12 shrink-0 border bg-white object-contain p-0.5"
          onError={() => setFailedLogoUrl(logoUrl)}
        />
      ) : company ? (
        <div className="flex size-8 shrink-0 items-center justify-center bg-primary text-[10px] font-bold tracking-wide text-primary-foreground">
          {getInitials(company.name) || "AC"}
        </div>
      ) : (
        <div
          className="flex size-8 shrink-0 items-center justify-center bg-primary"
          style={{
            clipPath:
              "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          }}
        >
          <Shield className="size-4 text-primary-foreground" />
        </div>
      )}

      <div className="min-w-0 max-w-36">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Empresa do usuario
        </p>
        <p className="truncate text-[11px] font-bold text-foreground">
          {company?.name ?? "AndCheck"}
        </p>
      </div>
    </div>
  );
}
