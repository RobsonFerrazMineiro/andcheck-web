"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { NonConformityEvidencePreviewProps } from "./non-conformity-evidence-preview";

export const LazyNonConformityEvidencePreview = dynamic(
  () =>
    import("./non-conformity-evidence-preview").then(
      (mod) =>
        mod.NonConformityEvidencePreview as ComponentType<NonConformityEvidencePreviewProps>,
    ),
  {
    loading: () => (
      <div className="h-16 w-16 border border-dashed border-border bg-muted/20" />
    ),
    ssr: false,
  },
);
