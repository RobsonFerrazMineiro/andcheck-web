"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
