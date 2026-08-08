"use client";

import { useEffect } from "react";

const RELEASE_UI_DIAGNOSTICS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_RELEASE_FLOW_DIAGNOSTICS === "true";

type ReleaseFlowMarker = {
  clickedAt?: number;
  serverReturnedAt?: number;
  navigationStartedAt?: number;
  inspectionId?: string;
  scaffoldId?: string;
  scaffoldStatus?: string;
  validityDate?: string | null;
};

export function ReleaseFlowProbe({
  inspectionId,
  scaffoldStatus,
}: {
  inspectionId: string;
  scaffoldStatus?: string;
}) {
  useEffect(() => {
    if (!RELEASE_UI_DIAGNOSTICS_ENABLED) return;

    const raw = sessionStorage.getItem("andcheck:release-flow");
    if (!raw) return;

    try {
      const marker = JSON.parse(raw) as ReleaseFlowMarker;
      if (marker.inspectionId !== inspectionId) return;

      const now = performance.now();
      console.info("[release-ui] status visible", {
        inspectionId,
        expectedStatus: marker.scaffoldStatus,
        visibleStatus: scaffoldStatus,
        serverMs:
          typeof marker.serverReturnedAt === "number" &&
          typeof marker.clickedAt === "number"
            ? Math.round(marker.serverReturnedAt - marker.clickedAt)
            : undefined,
        navigationAndRenderMs:
          typeof marker.navigationStartedAt === "number"
            ? Math.round(now - marker.navigationStartedAt)
            : undefined,
        totalMs:
          typeof marker.clickedAt === "number"
            ? Math.round(now - marker.clickedAt)
            : undefined,
      });
    } finally {
      sessionStorage.removeItem("andcheck:release-flow");
    }
  }, [inspectionId, scaffoldStatus]);

  return null;
}
