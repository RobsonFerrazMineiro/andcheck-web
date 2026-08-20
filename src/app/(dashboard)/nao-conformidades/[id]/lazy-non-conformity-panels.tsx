"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { surface } from "@/lib/design-system";
import type { NonConformityEvidencePreviewProps } from "./non-conformity-evidence-preview";

export const LazyNonConformityEvidencePreview = dynamic(
  () =>
    import("./non-conformity-evidence-preview").then(
      (mod) =>
        mod.NonConformityEvidencePreview as ComponentType<NonConformityEvidencePreviewProps>,
    ),
  {
    loading: () => (
      <div className={`h-16 w-16 ${surface.dashedBox}`} />
    ),
    ssr: false,
  },
);
