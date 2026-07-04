import { render, screen } from "@testing-library/react";
import { Bell } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders title, description and optional action", () => {
    render(
      <EmptyState
        icon={Bell}
        title="Nenhum registro"
        description="Crie um novo registro para iniciar."
        action={<button type="button">Criar</button>}
      />,
    );

    expect(screen.getByText("Nenhum registro")).toBeInTheDocument();
    expect(screen.getByText("Crie um novo registro para iniciar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar" })).toBeInTheDocument();
  });
});
