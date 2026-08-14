import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("renders known scaffold status labels", () => {
    render(<StatusBadge status="liberado" />);
    expect(screen.getByText("LIBERADO")).toBeInTheDocument();
  });

  it("renders fallback labels for unknown statuses", () => {
    render(<StatusBadge status="custom_status" />);
    expect(screen.getByText("CUSTOM STATUS")).toBeInTheDocument();
  });

  it("renders sync queue status labels", () => {
    render(
      <div>
        <StatusBadge status="pending" />
        <StatusBadge status="syncing" />
        <StatusBadge status="synced" />
        <StatusBadge status="failed" />
        <StatusBadge status="conflict" />
      </div>,
    );

    expect(screen.getByText("PENDENTE")).toBeInTheDocument();
    expect(screen.getByText("ENVIANDO")).toBeInTheDocument();
    expect(screen.getByText("SINCRONIZADO")).toBeInTheDocument();
    expect(screen.getByText("FALHA")).toBeInTheDocument();
    expect(screen.getByText("CONFLITO")).toBeInTheDocument();
  });
});
