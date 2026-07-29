"use client";

import { useMemo } from "react";

import {
  auditItemsToHistoryEvents,
  HistoryDrawerButton,
  normalizeHistoryEvents,
  type AuditTimelineItem,
  type HistoryEvent,
} from "@/components/shared/audit-timeline";

type NonConformityHistoryButtonProps = {
  auditTimeline: AuditTimelineItem[];
  historyEvents: HistoryEvent[];
};

export function NonConformityHistoryButton({
  auditTimeline,
  historyEvents,
}: NonConformityHistoryButtonProps) {
  const events = useMemo(
    () => {
      if (historyEvents.length > 0) {
        return normalizeHistoryEvents(historyEvents);
      }
      return normalizeHistoryEvents(auditItemsToHistoryEvents(auditTimeline));
    },
    [auditTimeline, historyEvents],
  );

  return <HistoryDrawerButton events={events} />;
}
