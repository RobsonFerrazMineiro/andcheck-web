"use client";

import { useMemo } from "react";

import {
  auditItemsToHistoryEvents,
  HistoryDrawerButton,
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
    () =>
      [...auditItemsToHistoryEvents(auditTimeline), ...historyEvents].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [auditTimeline, historyEvents],
  );

  return <HistoryDrawerButton events={events} />;
}
