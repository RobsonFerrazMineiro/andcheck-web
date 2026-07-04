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
    expect(screen.getByText("CUSTOM_STATUS")).toBeInTheDocument();
  });
});
