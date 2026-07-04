import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationBell } from "@/components/notifications/notification-bell";

vi.mock("@/lib/actions/notification-actions", () => ({
  markNotificationAsRead: vi.fn(),
}));

const latest = [
  {
    id: "notification-1",
    title: "Andaime vencido",
    message: "O andaime AND-2026-0001 esta vencido.",
    severity: "CRITICAL",
    status: "PENDING",
    entityType: "SCAFFOLD",
    entityId: "scaffold-1",
    createdAt: new Date("2026-07-03T12:00:00Z"),
  },
];

describe("NotificationBell", () => {
  it("opens the latest notifications and closes on outside click", async () => {
    render(<NotificationBell unreadCount={1} latest={latest} />);

    fireEvent.click(screen.getByRole("button", { name: /abrir/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Andaime vencido")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes the panel when the user presses escape", async () => {
    render(<NotificationBell unreadCount={1} latest={latest} />);

    fireEvent.click(screen.getByRole("button", { name: /abrir/i }));
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
